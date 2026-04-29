// Google Ads YouTube campaign creator.
// Promotes an already-uploaded YouTube video as a paid VIDEO campaign.
//
// POST /functions/v1/google-ads-campaign
// Body: {
//   video_upload_id: string,        // must already have youtube_video_id
//   campaign_id?: string,           // link to a campaigns row
//   daily_budget_gbp: number,
//   targeting?: { keywords?: string[]; topic_ids?: string[]; channel_ids?: string[] },
//   final_url: string,              // landing page (e.g. product URL)
//   campaign_name?: string,
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findActiveGoogleAdsAccount, getFreshGoogleToken } from '../_shared/google-oauth.ts'
import { getIntegrationKey } from '../_shared/integration-credentials.ts'
import {
  createCampaignBudget,
  createVideoCampaign,
  createVideoAdGroup,
  createYoutubeVideoAsset,
  createResponsiveVideoAd,
  addAdGroupKeywords,
  addAdGroupTopicIds,
  addAdGroupYoutubeChannels,
  type GoogleAdsAuth,
} from '../_shared/google-ads-client.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface VideoUploadRow {
  id: string
  campaign_id: string | null
  youtube_video_id: string | null
  selected_variant_id: string | null
}

interface VariantRow {
  id: string
  meta: { title?: string; description?: string }
  copy_text: string
  call_to_action: string | null
}

interface Body {
  video_upload_id: string
  campaign_id?: string
  daily_budget_gbp: number
  targeting?: { keywords?: string[]; topic_ids?: string[]; channel_ids?: string[] }
  final_url: string
  campaign_name?: string
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: Body
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }

  if (!body.video_upload_id) return jsonResponse({ error: 'video_upload_id is required' }, 422)
  if (!body.daily_budget_gbp || body.daily_budget_gbp <= 0) {
    return jsonResponse({ error: 'daily_budget_gbp must be a positive number' }, 422)
  }
  if (!body.final_url || !body.final_url.startsWith('http')) {
    return jsonResponse({ error: 'final_url is required and must be an absolute URL' }, 422)
  }

  const { data: video } = await client
    .from('video_uploads')
    .select('id, campaign_id, youtube_video_id, selected_variant_id')
    .eq('id', body.video_upload_id)
    .single<VideoUploadRow>()
  if (!video) return jsonResponse({ error: 'Video not found' }, 404)
  if (!video.youtube_video_id) {
    return jsonResponse(
      { error: 'Video has not been uploaded to YouTube yet. Publish organically first.' },
      422,
    )
  }

  const adsAcct = await findActiveGoogleAdsAccount(client)
  if (!adsAcct) {
    return jsonResponse(
      { error: 'No Google Ads account connected. Connect Google on /channels first.' },
      422,
    )
  }

  // Resolve developer token + manager / customer IDs from integration_credentials
  const developerToken = await getIntegrationKey(client, {
    provider: 'google_ads',
    envVars: ['GOOGLE_ADS_DEVELOPER_TOKEN'],
    credentialField: 'developer_token',
  })
  const managerCustomerId = await getIntegrationKey(client, {
    provider: 'google_ads',
    envVars: ['GOOGLE_ADS_MANAGER_CUSTOMER_ID'],
    credentialField: 'manager_customer_id',
  })
  const customerId = await getIntegrationKey(client, {
    provider: 'google_ads',
    envVars: ['GOOGLE_ADS_CUSTOMER_ID'],
    credentialField: 'customer_id',
  }) || adsAcct.account_id  // fall back to the connected account ID

  if (!developerToken || !managerCustomerId) {
    return jsonResponse(
      {
        error:
          'Google Ads developer token or manager customer ID missing. Add them in /integrations under "Google Ads".',
      },
      422,
    )
  }

  // Fresh access token
  const { access_token } = await getFreshGoogleToken(client, adsAcct.id)

  // Pick variant headlines / descriptions
  let headline = body.campaign_name ?? 'Blake Mill'
  let description = 'New shirt. Have a look.'
  if (video.selected_variant_id) {
    const { data: variant } = await client
      .from('content_variants')
      .select('id, meta, copy_text, call_to_action')
      .eq('id', video.selected_variant_id)
      .maybeSingle<VariantRow>()
    if (variant) {
      headline = variant.meta?.title ?? variant.call_to_action ?? headline
      description = variant.meta?.description ?? variant.copy_text ?? description
    }
  }

  const auth: GoogleAdsAuth = {
    accessToken: access_token,
    developerToken,
    managerCustomerId: managerCustomerId.replace(/-/g, ''),
    customerId: customerId.replace(/-/g, ''),
  }

  const dailyBudgetMicros = Math.round(body.daily_budget_gbp * 1_000_000)

  // Persist a draft campaign row up front so we can update it if the API call fails partway through
  const { data: draftRow, error: draftErr } = await client
    .from('youtube_ad_campaigns')
    .insert({
      campaign_id: body.campaign_id ?? video.campaign_id ?? null,
      video_upload_id: video.id,
      google_customer_id: auth.customerId,
      daily_budget_micros: dailyBudgetMicros,
      targeting: body.targeting ?? {},
      status: 'submitting',
    })
    .select('id')
    .single()
  if (draftErr || !draftRow) return jsonResponse({ error: draftErr?.message ?? 'Could not insert draft' }, 500)

  try {
    const budgetName = `${body.campaign_name ?? 'YT'} budget · ${new Date().toISOString().slice(0, 10)}`
    const budget = await createCampaignBudget(auth, { name: budgetName, amountMicros: dailyBudgetMicros })

    const campaignName = body.campaign_name ?? `Blake Mill YT · ${new Date().toISOString().slice(0, 10)}`
    const campaign = await createVideoCampaign(auth, { name: campaignName, budgetResource: budget.resourceName })

    const adGroup = await createVideoAdGroup(auth, {
      name: `${campaignName} ad group`,
      campaignResource: campaign.resourceName,
    })

    const videoAsset = await createYoutubeVideoAsset(auth, {
      name: `${campaignName} video`,
      youtubeVideoId: video.youtube_video_id!,
    })

    const ad = await createResponsiveVideoAd(auth, {
      adGroupResource: adGroup.resourceName,
      videoAssetResource: videoAsset.resourceName,
      headline,
      description,
      finalUrl: body.final_url,
    })

    const targeting = body.targeting ?? {}
    if (targeting.keywords?.length) await addAdGroupKeywords(auth, { adGroupResource: adGroup.resourceName, keywords: targeting.keywords })
    if (targeting.topic_ids?.length) await addAdGroupTopicIds(auth, { adGroupResource: adGroup.resourceName, topicIds: targeting.topic_ids })
    if (targeting.channel_ids?.length) await addAdGroupYoutubeChannels(auth, { adGroupResource: adGroup.resourceName, channelIds: targeting.channel_ids })

    await client
      .from('youtube_ad_campaigns')
      .update({
        google_campaign_id: campaign.resourceName,
        google_ad_group_id: adGroup.resourceName,
        google_ad_id: ad.resourceName,
        status: 'active',  // we ENABLED the ad group; campaign itself stays PAUSED until reviewed
      })
      .eq('id', draftRow.id)

    return jsonResponse({
      youtube_ad_campaign_id: draftRow.id,
      google_campaign_id: campaign.resourceName,
      google_ad_group_id: adGroup.resourceName,
      google_ad_id: ad.resourceName,
      status: 'submitted',
      note: 'Campaign was created in PAUSED state. Review and unpause in Google Ads to start spending.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await client
      .from('youtube_ad_campaigns')
      .update({ status: 'error', status_detail: message })
      .eq('id', draftRow.id)
    return jsonResponse({ error: message, youtube_ad_campaign_id: draftRow.id }, 500)
  }
})

// Minimal Google Ads REST client (v17). Just enough surface to create a
// VIDEO campaign with a single ad group, a YouTubeVideoAsset, a responsive
// video ad, and basic ad-group criteria (keywords + topics).
//
// Docs: https://developers.google.com/google-ads/api/rest/overview
//
// Auth: Bearer access_token (Google OAuth, scope `adwords`) +
//       'developer-token' header + 'login-customer-id' header for
//       manager-account access.

const API_VERSION = 'v17'
const BASE = `https://googleads.googleapis.com/${API_VERSION}`

export interface GoogleAdsAuth {
  accessToken: string
  developerToken: string
  managerCustomerId: string  // MCC (login-customer-id header)
  customerId: string          // the operating customer
}

export interface AdsResourceRef { resourceName: string }

interface MutateResponse {
  results?: Array<{ resourceName: string }>
  partialFailureError?: { message?: string }
}

async function call(auth: GoogleAdsAuth, path: string, body: unknown): Promise<MutateResponse> {
  const url = `${BASE}/customers/${auth.customerId}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.accessToken}`,
      'developer-token': auth.developerToken,
      'login-customer-id': auth.managerCustomerId,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Ads API error (${res.status} ${path}): ${text}`)
  }
  return await res.json() as MutateResponse
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export async function createCampaignBudget(
  auth: GoogleAdsAuth,
  args: { name: string; amountMicros: number },
): Promise<AdsResourceRef> {
  const r = await call(auth, '/campaignBudgets:mutate', {
    operations: [{
      create: {
        name: args.name,
        amountMicros: String(args.amountMicros),
        deliveryMethod: 'STANDARD',
        explicitlyShared: false,
      },
    }],
  })
  const ref = r.results?.[0]
  if (!ref) throw new Error('createCampaignBudget: no resourceName returned')
  return ref
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export async function createVideoCampaign(
  auth: GoogleAdsAuth,
  args: { name: string; budgetResource: string },
): Promise<AdsResourceRef> {
  const r = await call(auth, '/campaigns:mutate', {
    operations: [{
      create: {
        name: args.name,
        status: 'PAUSED',                          // start paused for safety
        advertisingChannelType: 'VIDEO',
        campaignBudget: args.budgetResource,
        manualCpv: {},                              // simplest video bidding
      },
    }],
  })
  const ref = r.results?.[0]
  if (!ref) throw new Error('createVideoCampaign: no resourceName returned')
  return ref
}

// ---------------------------------------------------------------------------
// Ad group
// ---------------------------------------------------------------------------

export async function createVideoAdGroup(
  auth: GoogleAdsAuth,
  args: { name: string; campaignResource: string },
): Promise<AdsResourceRef> {
  const r = await call(auth, '/adGroups:mutate', {
    operations: [{
      create: {
        name: args.name,
        campaign: args.campaignResource,
        status: 'ENABLED',
        type: 'VIDEO_RESPONSIVE',
        cpvBidMicros: '50000',                      // £0.05 default
      },
    }],
  })
  const ref = r.results?.[0]
  if (!ref) throw new Error('createVideoAdGroup: no resourceName returned')
  return ref
}

// ---------------------------------------------------------------------------
// YouTube video asset
// ---------------------------------------------------------------------------

export async function createYoutubeVideoAsset(
  auth: GoogleAdsAuth,
  args: { name: string; youtubeVideoId: string },
): Promise<AdsResourceRef> {
  const r = await call(auth, '/assets:mutate', {
    operations: [{
      create: {
        name: args.name,
        type: 'YOUTUBE_VIDEO',
        youtubeVideoAsset: { youtubeVideoId: args.youtubeVideoId },
      },
    }],
  })
  const ref = r.results?.[0]
  if (!ref) throw new Error('createYoutubeVideoAsset: no resourceName returned')
  return ref
}

// ---------------------------------------------------------------------------
// Responsive video ad
// ---------------------------------------------------------------------------

export async function createResponsiveVideoAd(
  auth: GoogleAdsAuth,
  args: {
    adGroupResource: string
    videoAssetResource: string
    headline: string
    description: string
    finalUrl: string
  },
): Promise<AdsResourceRef> {
  const r = await call(auth, '/adGroupAds:mutate', {
    operations: [{
      create: {
        adGroup: args.adGroupResource,
        status: 'ENABLED',
        ad: {
          finalUrls: [args.finalUrl],
          videoResponsiveAd: {
            videos: [{ asset: args.videoAssetResource }],
            headlines: [{ text: args.headline.slice(0, 90) }],
            descriptions: [{ text: args.description.slice(0, 70) }],
            longHeadlines: [{ text: args.headline.slice(0, 90) }],
            callToActions: [{ text: 'SHOP_NOW' }],
          },
        },
      },
    }],
  })
  const ref = r.results?.[0]
  if (!ref) throw new Error('createResponsiveVideoAd: no resourceName returned')
  return ref
}

// ---------------------------------------------------------------------------
// Targeting criteria — keywords + topics
// ---------------------------------------------------------------------------

export async function addAdGroupKeywords(
  auth: GoogleAdsAuth,
  args: { adGroupResource: string; keywords: string[] },
): Promise<void> {
  if (args.keywords.length === 0) return
  await call(auth, '/adGroupCriteria:mutate', {
    operations: args.keywords.slice(0, 20).map((kw) => ({
      create: {
        adGroup: args.adGroupResource,
        status: 'ENABLED',
        keyword: { text: kw, matchType: 'BROAD' },
      },
    })),
  })
}

/**
 * Topic targeting requires Google Ads "topic" IDs (verticals.googleapis.com
 * style). For v1 we only accept pre-resolved IDs. Caller is responsible for
 * looking them up — the UI ships with a small static menswear list.
 */
export async function addAdGroupTopicIds(
  auth: GoogleAdsAuth,
  args: { adGroupResource: string; topicIds: string[] },
): Promise<void> {
  if (args.topicIds.length === 0) return
  await call(auth, '/adGroupCriteria:mutate', {
    operations: args.topicIds.slice(0, 20).map((id) => ({
      create: {
        adGroup: args.adGroupResource,
        status: 'ENABLED',
        topic: { topicConstant: `topicConstants/${id}` },
      },
    })),
  })
}

/** YouTube channel placements (Ken's "industry buyer" channel-targeting use case). */
export async function addAdGroupYoutubeChannels(
  auth: GoogleAdsAuth,
  args: { adGroupResource: string; channelIds: string[] },
): Promise<void> {
  if (args.channelIds.length === 0) return
  await call(auth, '/adGroupCriteria:mutate', {
    operations: args.channelIds.slice(0, 50).map((channelId) => ({
      create: {
        adGroup: args.adGroupResource,
        status: 'ENABLED',
        youtubeChannel: { channelId },
      },
    })),
  })
}

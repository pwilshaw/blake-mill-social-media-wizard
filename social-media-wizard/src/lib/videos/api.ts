// Frontend wrappers for /videos page.

import { supabase } from '@/lib/supabase'
import type {
  ContentVariant,
  VideoUpload,
  YoutubeAdCampaign,
  YoutubeAdTargeting,
} from '@/lib/types'

const VIDEOS_BUCKET = 'videos'

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listVideos(): Promise<VideoUpload[]> {
  const { data, error } = await supabase
    .from('video_uploads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as VideoUpload[]
}

export async function listVariantsForCampaign(campaignId: string): Promise<ContentVariant[]> {
  const { data, error } = await supabase
    .from('content_variants')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('platform', 'youtube')
    .order('variant_number')
  if (error) throw new Error(error.message)
  return (data ?? []) as ContentVariant[]
}

export async function listAdCampaigns(): Promise<YoutubeAdCampaign[]> {
  const { data, error } = await supabase
    .from('youtube_ad_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as YoutubeAdCampaign[]
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function uploadVideo(args: {
  file: File
  campaignId?: string | null
}): Promise<VideoUpload> {
  const ext = args.file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const upload = await supabase.storage
    .from(VIDEOS_BUCKET)
    .upload(path, args.file, { upsert: false, contentType: args.file.type || 'video/mp4' })
  if (upload.error) throw new Error(upload.error.message)
  const { data: urlData } = supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('video_uploads')
    .insert({
      campaign_id: args.campaignId ?? null,
      storage_path: path,
      storage_url: urlData.publicUrl,
      file_name: args.file.name,
      size_bytes: args.file.size,
      status: 'uploaded',
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as VideoUpload
}

export async function deleteVideo(video: VideoUpload): Promise<void> {
  try {
    await supabase.storage.from(VIDEOS_BUCKET).remove([video.storage_path])
  } catch {
    /* best-effort */
  }
  const { error } = await supabase.from('video_uploads').delete().eq('id', video.id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Variant generation (reuses generate-content)
// ---------------------------------------------------------------------------

export async function generateVideoVariants(args: {
  video_upload_id: string
  campaign_id: string
  shirt_ids: string[]
  variant_count: number
}): Promise<{ variants: ContentVariant[] }> {
  const { data, error } = await supabase.functions.invoke<{ variants: ContentVariant[] }>(
    'generate-content',
    {
      method: 'POST',
      body: {
        campaign_id: args.campaign_id,
        shirt_ids: args.shirt_ids,
        platform: 'youtube',
        variant_count: args.variant_count,
      },
    },
  )
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

export async function publishToYouTube(args: {
  video_upload_id: string
  variant_id?: string
  privacy_status?: 'private' | 'unlisted' | 'public'
}): Promise<{ youtube_video_id: string; youtube_url: string }> {
  const { data, error } = await supabase.functions.invoke<{
    youtube_video_id: string
    youtube_url: string
  }>('youtube-upload', { method: 'POST', body: args })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

// ---------------------------------------------------------------------------
// Promote as paid YouTube ad
// ---------------------------------------------------------------------------

export async function promoteAsAd(args: {
  video_upload_id: string
  daily_budget_gbp: number
  final_url: string
  targeting: YoutubeAdTargeting
  campaign_name?: string
  campaign_id?: string
}): Promise<{ youtube_ad_campaign_id: string; google_campaign_id: string; status: string }> {
  const { data, error } = await supabase.functions.invoke<{
    youtube_ad_campaign_id: string
    google_campaign_id: string
    status: string
  }>('google-ads-campaign', {
    method: 'POST',
    body: {
      video_upload_id: args.video_upload_id,
      daily_budget_gbp: args.daily_budget_gbp,
      final_url: args.final_url,
      targeting: {
        keywords: args.targeting.keywords ?? [],
        topic_ids: args.targeting.topics ?? [],
        channel_ids: args.targeting.channels ?? [],
      },
      campaign_name: args.campaign_name,
      campaign_id: args.campaign_id,
    },
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

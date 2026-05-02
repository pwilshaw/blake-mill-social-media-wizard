import { supabase } from './supabase'
import type { DiscoveredCreator } from './types'

export interface DiscoverCreatorsResponse {
  query: string
  count: number
  creators: DiscoveredCreator[]
}

export async function discoverYouTubeCreators(input: {
  query: string
  limit?: number
  min_subs?: number
  max_subs?: number
}): Promise<DiscoverCreatorsResponse> {
  const { data, error } = await supabase.functions.invoke<DiscoverCreatorsResponse>(
    'discover-youtube-creators',
    { method: 'POST', body: input },
  )
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

export interface ScrapeCompetitorPostsResponse {
  scraped_handles: number
  posts_upserted: number
  message?: string
  results?: Array<{
    handle: string
    platform: string
    upserted: number
    error?: string
  }>
}

export async function scrapeCompetitorPosts(input: {
  competitor_handle_id?: string
  limit?: number
} = {}): Promise<ScrapeCompetitorPostsResponse> {
  const { data, error } = await supabase.functions.invoke<ScrapeCompetitorPostsResponse>(
    'scrape-competitor-posts',
    { method: 'POST', body: input },
  )
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

import { supabase } from './supabase'

export interface PlatformAgg {
  platform: string
  posts: number
  impressions: number
  clicks: number
  engagement: number
  spend: number
  ctr: number
  engagement_rate: number
}

export interface DayAgg {
  day: string
  posts: number
  engagement_rate: number
}

export interface OrganicPaidSplit {
  organic_posts: number
  organic_impressions: number
  organic_engagement: number
  organic_engagement_rate: number
  paid_posts: number
  paid_impressions: number
  paid_engagement: number
  paid_spend: number
  paid_engagement_rate: number
}

export interface AngleAgg {
  angle: string
  posts: number
  avg_engagement_rate: number
}

export interface TopPost {
  id: string
  platform: string
  published_at: string | null
  impressions: number
  clicks: number
  engagement: number
  engagement_rate: number
  copy: string
  cta: string | null
}

export interface InsightsResponse {
  analysis: string
  days: number
  total_posts: number
  by_platform: PlatformAgg[]
  by_day_of_week: DayAgg[]
  organic_paid: OrganicPaidSplit
  by_angle: AngleAgg[]
  top_posts: TopPost[]
}

export async function fetchInsights(days: number): Promise<InsightsResponse> {
  const { data, error } = await supabase.functions.invoke<InsightsResponse>(
    'analyse-post-history',
    { method: 'POST', body: { days } },
  )
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

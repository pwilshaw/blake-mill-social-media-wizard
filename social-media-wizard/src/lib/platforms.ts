import type { Platform } from './types'

export const PLATFORM_META: Record<Platform, { label: string; color: string; bgColor: string }> = {
  facebook: { label: 'Facebook', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  instagram: { label: 'Instagram', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  linkedin: { label: 'LinkedIn', color: 'text-sky-700', bgColor: 'bg-sky-50' },
  tiktok: { label: 'TikTok', color: 'text-foreground', bgColor: 'bg-muted' },
  google_ads: { label: 'Google Ads', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  snapchat: { label: 'Snapchat', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  shopify: { label: 'Shopify', color: 'text-lime-700', bgColor: 'bg-lime-50' },
}

export const ALL_PLATFORMS: Platform[] = [
  'facebook',
  'instagram',
  'google_ads',
  'tiktok',
  'snapchat',
  'linkedin',
]

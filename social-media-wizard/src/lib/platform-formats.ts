// T076 — Platform format definitions for all supported social channels

import type { Platform } from '@/lib/types'

export interface PlatformFormat {
  name: string
  aspect_ratios: string[]
  character_limit: number
  hashtag_limit: number
}

export interface PlatformDefinition {
  formats: PlatformFormat[]
  /** Lucide icon name to use in UI */
  icon: string
}

export const PLATFORM_FORMATS: Record<Platform, PlatformDefinition> = {
  facebook: {
    icon: 'facebook',
    formats: [
      {
        name: 'Post',
        aspect_ratios: ['1:1', '4:5', '16:9'],
        character_limit: 63206,
        hashtag_limit: 10,
      },
      {
        name: 'Link',
        aspect_ratios: ['1.91:1'],
        character_limit: 63206,
        hashtag_limit: 5,
      },
      {
        name: 'Carousel',
        aspect_ratios: ['1:1'],
        character_limit: 2200,
        hashtag_limit: 10,
      },
    ],
  },

  instagram: {
    icon: 'instagram',
    formats: [
      {
        name: 'Feed',
        aspect_ratios: ['1:1', '4:5'],
        character_limit: 2200,
        hashtag_limit: 30,
      },
      {
        name: 'Carousel',
        aspect_ratios: ['1:1', '4:5'],
        character_limit: 2200,
        hashtag_limit: 30,
      },
      {
        name: 'Stories',
        aspect_ratios: ['9:16'],
        character_limit: 2200,
        hashtag_limit: 10,
      },
      {
        name: 'Reels',
        aspect_ratios: ['9:16'],
        character_limit: 2200,
        hashtag_limit: 30,
      },
    ],
  },

  linkedin: {
    icon: 'linkedin',
    formats: [
      {
        name: 'Post',
        aspect_ratios: ['1:1', '1.91:1'],
        character_limit: 3000,
        hashtag_limit: 5,
      },
      {
        name: 'Article',
        aspect_ratios: ['1.91:1'],
        character_limit: 110000,
        hashtag_limit: 5,
      },
    ],
  },

  tiktok: {
    icon: 'video',
    formats: [
      {
        name: 'Video Description',
        aspect_ratios: ['9:16'],
        character_limit: 2200,
        hashtag_limit: 20,
      },
    ],
  },

  google_ads: {
    icon: 'search',
    formats: [
      {
        name: 'Responsive Search Ad',
        aspect_ratios: [],
        character_limit: 90,
        hashtag_limit: 0,
      },
      {
        name: 'Display Ad',
        aspect_ratios: ['1:1', '1.91:1', '4:5'],
        character_limit: 90,
        hashtag_limit: 0,
      },
    ],
  },

  snapchat: {
    icon: 'ghost',
    formats: [
      {
        name: 'Snap Ad',
        aspect_ratios: ['9:16'],
        character_limit: 200,
        hashtag_limit: 3,
      },
      {
        name: 'Story Ad',
        aspect_ratios: ['9:16'],
        character_limit: 200,
        hashtag_limit: 3,
      },
    ],
  },

  shopify: {
    icon: 'shopping-bag',
    formats: [
      {
        name: 'Product',
        aspect_ratios: ['1:1', '4:5'],
        character_limit: 5000,
        hashtag_limit: 0,
      },
    ],
  },

  youtube: {
    icon: 'video',
    formats: [
      {
        name: 'Video',
        // Pre-rendered videos at standard 16:9 widescreen.
        aspect_ratios: ['16:9'],
        // Description: up to 5000 chars. Tags up to 30 items.
        character_limit: 5000,
        hashtag_limit: 30,
      },
      {
        name: 'Short',
        aspect_ratios: ['9:16'],
        character_limit: 5000,
        hashtag_limit: 30,
      },
    ],
  },
}

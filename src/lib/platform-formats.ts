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
}

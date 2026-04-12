// T040 — Carousel slide preview with platform frame
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CreativeAsset } from '@/lib/types'

interface CarouselPreviewProps {
  assets: CreativeAsset[]
  platform?: 'facebook' | 'instagram'
}

const PLATFORM_FRAME: Record<'facebook' | 'instagram', string> = {
  facebook: 'bg-[#1877F2] text-white',
  instagram: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white',
}

const PLATFORM_LABEL: Record<'facebook' | 'instagram', string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
}

const ASPECT_RATIO_CLASSES: Record<string, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
}

export function CarouselPreview({ assets, platform = 'instagram' }: CarouselPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (assets.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
        No slides to preview.
      </div>
    )
  }

  const current = assets[currentIndex]
  const aspectClass = ASPECT_RATIO_CLASSES[current.aspect_ratio] ?? 'aspect-square'
  const frameGradient = PLATFORM_FRAME[platform]

  function goBack() {
    setCurrentIndex((i) => (i - 1 + assets.length) % assets.length)
  }

  function goForward() {
    setCurrentIndex((i) => (i + 1) % assets.length)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') goBack()
    if (e.key === 'ArrowRight') goForward()
  }

  return (
    <div
      className="rounded-xl border bg-card overflow-hidden shadow-sm select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`${PLATFORM_LABEL[platform]} carousel preview`}
    >
      {/* Platform header bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 ${frameGradient}`}>
        <span className="text-xs font-bold tracking-wide">
          {PLATFORM_LABEL[platform]}
        </span>
        <span className="ml-auto text-xs font-medium opacity-80">
          {currentIndex + 1}/{assets.length}
        </span>
      </div>

      {/* Slide image */}
      <div className="relative w-full bg-muted">
        <div className={`relative w-full ${aspectClass} overflow-hidden`}>
          {current.generated_image_url ? (
            <img
              src={current.generated_image_url}
              alt={current.overlay_text ?? `Slide ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-200"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="m3 15 5-5 4 4 3-3 6 6" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
              <span className="text-sm">Image pending</span>
            </div>
          )}

          {/* Overlay text */}
          {current.overlay_text && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-4">
              <p className="text-white text-sm font-medium leading-snug line-clamp-3">
                {current.overlay_text}
              </p>
            </div>
          )}

          {/* Navigation arrows */}
          <button
            type="button"
            onClick={goBack}
            disabled={assets.length <= 1}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={assets.length <= 1}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Dot indicators + aspect ratio */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex gap-1.5">
          {assets.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? 'w-4 bg-foreground'
                  : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {current.aspect_ratio}
        </span>
      </div>
    </div>
  )
}

// T077 — Multi-select channel picker with platform icons and format info

import type { ChannelAccount, Platform } from '@/lib/types'
import { PLATFORM_FORMATS } from '@/lib/platform-formats'
import { useApp } from '@/contexts/AppContext'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChannelSelectorProps {
  selectedChannels: string[]
  onChannelsChange: (ids: string[]) => void
}

// ---------------------------------------------------------------------------
// Platform icon (inline SVG paths keyed by icon name)
// ---------------------------------------------------------------------------

function PlatformIcon({ platform }: { platform: Platform }) {
  switch (platform) {
    case 'facebook':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
        </svg>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Format requirements pill list
// ---------------------------------------------------------------------------

function FormatRequirements({ account }: { account: ChannelAccount }) {
  const platformDef = PLATFORM_FORMATS[account.platform as Platform]
  if (!platformDef) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {platformDef.formats.map((format) => (
        <span
          key={format.name}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {format.name} · {format.character_limit.toLocaleString()} chars
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChannelSelector({ selectedChannels, onChannelsChange }: ChannelSelectorProps) {
  const { channels, loading } = useApp()

  function handleToggle(channelId: string) {
    if (selectedChannels.includes(channelId)) {
      onChannelsChange(selectedChannels.filter((id) => id !== channelId))
    } else {
      onChannelsChange([...selectedChannels, channelId])
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading channels…</div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        No connected channels. Add a channel in Settings.
      </div>
    )
  }

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Select channels</legend>
      {channels.map((channel) => {
        const isSelected = selectedChannels.includes(channel.id)
        return (
          <label
            key={channel.id}
            htmlFor={`channel-${channel.id}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-muted/50',
            )}
          >
            <input
              id={`channel-${channel.id}`}
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggle(channel.id)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={channel.platform as Platform} />
                <span className="text-sm font-medium text-foreground truncate">
                  {channel.account_name}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {channel.platform}
                </span>
              </div>
              <FormatRequirements account={channel} />
            </div>
          </label>
        )
      })}
    </fieldset>
  )
}

// Visual post preview — shows how content will appear on each platform
import type { Platform } from '@/lib/types'

interface PostPreviewProps {
  platform: Platform
  copyText: string
  hashtags: string[]
  callToAction: string | null
  productImage?: string
  accountName?: string
  accountAvatar?: string
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}

// ----------------------------------------------------------------
// Instagram Feed Preview
// ----------------------------------------------------------------

function InstagramPreview({ copyText, hashtags, productImage, accountName }: PostPreviewProps) {
  const handle = accountName?.toLowerCase().replace(/\s+/g, '') ?? 'blakemill'
  const caption = copyText + (hashtags.length > 0
    ? '\n\n' + hashtags.map((h) => `#${h}`).join(' ')
    : '')

  return (
    <div className="w-full max-w-[360px] rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 via-pink-500 to-purple-600 p-[2px]">
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
            <span className="text-[9px] font-bold text-foreground">BM</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-black">{handle}</p>
          <p className="text-[10px] text-gray-500">Sponsored</p>
        </div>
        <div className="ml-auto text-gray-400">•••</div>
      </div>

      {/* Image */}
      {productImage ? (
        <img src={productImage} alt="" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-4xl text-gray-300">📸</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-4">
          <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </div>
        <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="text-xs font-semibold text-black">1,247 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-xs text-black leading-relaxed">
          <span className="font-semibold">{handle}</span>{' '}
          {truncate(caption, 200)}
        </p>
        {caption.length > 200 && (
          <p className="text-xs text-gray-400 mt-0.5">more</p>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Facebook Post Preview
// ----------------------------------------------------------------

function FacebookPreview({ copyText, hashtags, callToAction, productImage, accountName }: PostPreviewProps) {
  const name = accountName ?? 'Blake Mill'
  const fullText = copyText + (hashtags.length > 0
    ? '\n\n' + hashtags.map((h) => `#${h}`).join(' ')
    : '')

  return (
    <div className="w-full max-w-[420px] rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-sm font-bold text-white">BM</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-black">{name}</p>
          <p className="text-xs text-gray-500">Just now · 🌍</p>
        </div>
        <div className="ml-auto text-gray-400">•••</div>
      </div>

      {/* Copy */}
      <div className="px-4 pb-3">
        <p className="text-sm text-black leading-relaxed whitespace-pre-line">
          {truncate(fullText, 300)}
        </p>
        {fullText.length > 300 && (
          <button className="text-sm text-blue-600 font-medium mt-1">See more</button>
        )}
      </div>

      {/* Image */}
      {productImage ? (
        <img src={productImage} alt="" className="w-full aspect-[1.91/1] object-cover" />
      ) : (
        <div className="w-full aspect-[1.91/1] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-4xl text-gray-300">📸</span>
        </div>
      )}

      {/* CTA bar */}
      {callToAction && (
        <div className="border-t border-gray-200 px-4 py-2.5 flex items-center justify-between bg-gray-50">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">blakemill.co.uk</p>
            <p className="text-sm font-semibold text-black">{callToAction}</p>
          </div>
          <button className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white">
            {callToAction}
          </button>
        </div>
      )}

      {/* Reactions bar */}
      <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="inline-block h-5 w-5 rounded-full bg-blue-500 text-[10px] text-white flex items-center justify-center">👍</span>
            <span className="inline-block h-5 w-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">❤️</span>
          </div>
          <span className="text-xs text-gray-500 ml-1">42</span>
        </div>
        <span className="text-xs text-gray-500">8 comments · 3 shares</span>
      </div>

      {/* Action buttons */}
      <div className="border-t border-gray-200 grid grid-cols-3 divide-x divide-gray-200">
        {['👍 Like', '💬 Comment', '↗️ Share'].map((action) => (
          <button key={action} className="py-2 text-center text-xs font-medium text-gray-600 hover:bg-gray-50">
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// TikTok Preview
// ----------------------------------------------------------------

function TikTokPreview({ copyText, hashtags, productImage, accountName }: PostPreviewProps) {
  const handle = '@' + (accountName?.toLowerCase().replace(/\s+/g, '') ?? 'blakemill')
  const caption = truncate(copyText, 100) + ' ' + hashtags.slice(0, 5).map((h) => `#${h}`).join(' ')

  return (
    <div className="w-full max-w-[280px] rounded-2xl border border-border bg-black overflow-hidden shadow-sm relative" style={{ aspectRatio: '9/16' }}>
      {/* Video background */}
      {productImage ? (
        <img src={productImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900" />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Right action bar */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        {[
          { icon: '❤️', count: '2.4K' },
          { icon: '💬', count: '89' },
          { icon: '🔖', count: '156' },
          { icon: '↗️', count: '43' },
        ].map((action) => (
          <div key={action.icon} className="flex flex-col items-center gap-0.5">
            <span className="text-lg">{action.icon}</span>
            <span className="text-[10px] text-white font-medium">{action.count}</span>
          </div>
        ))}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-12 p-3 space-y-2">
        <p className="text-sm font-bold text-white">{handle}</p>
        <p className="text-xs text-white/90 leading-relaxed">{caption}</p>
        {/* Music bar */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">🎵</span>
          <p className="text-[10px] text-white/70">Original sound - {handle}</p>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// LinkedIn Preview
// ----------------------------------------------------------------

function LinkedInPreview({ copyText, hashtags, productImage, accountName }: PostPreviewProps) {
  const name = accountName ?? 'Blake Mill'
  const fullText = copyText + (hashtags.length > 0
    ? '\n\n' + hashtags.map((h) => `#${h}`).join(' ')
    : '')

  return (
    <div className="w-full max-w-[420px] rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-sky-700 flex items-center justify-center">
          <span className="text-sm font-bold text-white">BM</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-black">{name}</p>
          <p className="text-[11px] text-gray-500">Founder & Owner · Just now</p>
        </div>
      </div>
      <div className="px-4 pb-3">
        <p className="text-sm text-black leading-relaxed whitespace-pre-line">{truncate(fullText, 250)}</p>
      </div>
      {productImage && (
        <img src={productImage} alt="" className="w-full aspect-[1.91/1] object-cover" />
      )}
      <div className="border-t border-gray-200 grid grid-cols-4 divide-x divide-gray-200">
        {['👍 Like', '💬 Comment', '🔄 Repost', '📤 Send'].map((a) => (
          <button key={a} className="py-2.5 text-center text-[11px] font-medium text-gray-600">{a}</button>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Main preview switcher
// ----------------------------------------------------------------

export function SocialPostPreview(props: PostPreviewProps) {
  switch (props.platform) {
    case 'instagram':
      return <InstagramPreview {...props} />
    case 'facebook':
      return <FacebookPreview {...props} />
    case 'tiktok':
      return <TikTokPreview {...props} />
    case 'linkedin':
      return <LinkedInPreview {...props} />
    default:
      return <FacebookPreview {...props} />
  }
}

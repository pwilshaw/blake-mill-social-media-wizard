// T059 — Channel Connector
// Platform selection with OAuth initiation + Shopify store domain input.

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import type { ChannelAccount, Platform } from '@/lib/types'

interface Props {
  onConnect: (platform: string, meta?: { shop_domain?: string }) => void
  accounts?: ChannelAccount[]
  onDisconnect?: (accountId: string) => void
}

interface PlatformConfig {
  id: Platform | 'shopify'
  label: string
  icon: React.ReactNode
  brandColor: string
  requiresDomain?: boolean
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'shopify' as Platform,
    label: 'Shopify',
    brandColor: '#96BF48',
    requiresDomain: true,
    icon: <ShoppingBag className="size-5" />,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    brandColor: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.271h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    brandColor: '#E1306C',
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: 'google_ads',
    label: 'Google Ads',
    brandColor: '#4285F4',
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    brandColor: '#000000',
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.79 1.52V6.76a4.85 4.85 0 01-1.02-.07z" />
      </svg>
    ),
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    brandColor: '#FFFC00',
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.4-.15.53-.104.669-.054.227.08.349.26.404.404.054.142.074.486-.32.81-.358.293-.771.447-1.206.574-.15.045-.3.09-.449.135l-.019.003c-.196.065-.403.13-.602.21-.18.07-.34.155-.45.29a.658.658 0 00-.104.47c.225 2.104 1.502 3.437 2.76 4.088.57.296 1.091.378 1.42.424.161.021.267.038.32.063.142.062.18.167.196.257.013.067-.011.193-.126.33-.367.426-1.126.617-1.416.673-.12.024-.179.044-.216.088-.034.04-.054.103-.084.233l-.003.01c-.158.642-.38.873-.634.877-.06 0-.12-.009-.18-.015-.075-.01-.12-.02-.224-.02-.178 0-.392.04-.622.082-.419.076-.975.17-1.478.044-.9-.229-1.564-.704-2.279-1.218-.498-.36-.979-.708-1.568-.94a4.856 4.856 0 00-1.37-.335 4.86 4.86 0 00-1.369.336c-.59.232-1.07.58-1.568.94-.715.514-1.38.989-2.28 1.218-.503.127-1.058.032-1.477-.044-.23-.042-.444-.082-.622-.082-.104 0-.149.01-.224.02-.06.006-.12.015-.18.015-.254-.004-.476-.235-.634-.877l-.003-.01c-.03-.13-.05-.193-.084-.232-.037-.044-.096-.064-.216-.088-.29-.056-1.049-.247-1.416-.673-.115-.137-.14-.263-.126-.33.016-.09.054-.195.196-.257.053-.025.16-.042.32-.063.329-.046.85-.128 1.42-.424 1.258-.65 2.535-1.984 2.76-4.087a.658.658 0 00-.104-.471c-.11-.135-.27-.22-.45-.29a12.89 12.89 0 00-.601-.21l-.02-.003a12.88 12.88 0 01-.449-.135c-.435-.127-.848-.28-1.206-.574-.394-.324-.374-.668-.32-.81.055-.144.177-.324.404-.404.14-.05.269-.096.67.054.262.094.62.23.921.214.198 0 .326-.045.401-.09a6.968 6.968 0 01-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C7.86 1.069 11.216.793 12.206.793z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    brandColor: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
]

function StatusDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-block size-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
      aria-hidden="true"
    />
  )
}

export function ChannelConnector({ onConnect, accounts = [], onDisconnect }: Props) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const [shopDomain, setShopDomain] = useState('')
  const [showShopInput, setShowShopInput] = useState(false)

  function getAccountForPlatform(platform: string): ChannelAccount | undefined {
    return accounts.find((a) => a.platform === platform && a.is_active)
  }

  async function handleConnect(cfg: PlatformConfig) {
    if (cfg.requiresDomain) {
      setShowShopInput(true)
      return
    }
    setConnecting(cfg.id)
    try {
      await onConnect(cfg.id)
    } finally {
      setConnecting(null)
    }
  }

  function handleShopifyConnect() {
    const domain = shopDomain.trim()
    if (!domain) return

    // Normalize: add .myshopify.com if they just typed the store name
    const normalized = domain.includes('.myshopify.com')
      ? domain
      : `${domain.replace(/\.myshopify\.com$/, '')}.myshopify.com`

    setConnecting('shopify')
    onConnect('shopify', { shop_domain: normalized })
  }

  return (
    <div className="space-y-4">
      {/* Shopify domain input */}
      {showShopInput && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: '#96BF48' }}
            >
              <ShoppingBag className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Connect Shopify Store</p>
              <p className="text-xs text-muted-foreground">
                Enter the store's myshopify.com domain to install the app
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShopifyConnect()}
                placeholder="your-store"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-32 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                .myshopify.com
              </span>
            </div>
            <button
              type="button"
              onClick={handleShopifyConnect}
              disabled={!shopDomain.trim() || connecting === 'shopify'}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {connecting === 'shopify' ? 'Connecting…' : 'Install App'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowShopInput(false)
                setShopDomain('')
              }}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            This will redirect you to Shopify to authorize the app. You'll be brought back here after approval.
          </p>
        </div>
      )}

      {/* Platform grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_CONFIGS.map((cfg) => {
          const account = getAccountForPlatform(cfg.id)
          const isConnected = account !== undefined
          const isConnecting = connecting === cfg.id

          return (
            <div
              key={cfg.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20"
            >
              {/* Platform icon */}
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
                style={{
                  backgroundColor: cfg.brandColor,
                  color: cfg.brandColor === '#FFFC00' ? '#000' : '#fff',
                }}
              >
                {cfg.icon}
              </span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                  <StatusDot isActive={isConnected} />
                </div>
                {isConnected && account ? (
                  <p className="truncate text-xs text-muted-foreground">{account.account_name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not connected</p>
                )}
              </div>

              {/* Action */}
              {isConnected && account ? (
                <button
                  type="button"
                  onClick={() => onDisconnect?.(account.id)}
                  className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect(cfg)}
                  disabled={isConnecting}
                  className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isConnecting ? 'Connecting…' : 'Connect'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

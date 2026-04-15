// Channel page/ad account selection after OAuth callback
// Shows all Facebook Pages, Ad Accounts, and Instagram accounts the user manages.

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Loader2, Megaphone, FileText } from 'lucide-react'

interface MetaPage {
  id: string
  name: string
  access_token: string
  category?: string
  instagram_business_account?: {
    id: string
    username: string
  }
}

interface MetaAdAccount {
  id: string
  name: string
  account_id: string
  account_status: number
  business_name?: string
  currency?: string
}

type SelectableItem = {
  id: string
  type: 'page' | 'ad_account'
  name: string
  subtitle: string
  pageToken?: string
  igAccount?: { id: string; username: string }
}

const AD_STATUS_LABELS: Record<number, string> = {
  1: 'Active',
  2: 'Disabled',
  3: 'Unsettled',
  7: 'Pending Review',
  8: 'Pending Closure',
  9: 'In Grace Period',
  100: 'Pending',
  101: 'Temp Unavailable',
}

export default function ChannelSelectPages() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [items, setItems] = useState<SelectableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const userToken = searchParams.get('token') ?? ''

  useEffect(() => {
    if (!userToken) {
      setError('No access token provided. Please try connecting again.')
      setLoading(false)
      return
    }

    async function fetchAll() {
      const allItems: SelectableItem[] = []

      try {
        // Fetch Pages
        const pagesRes = await fetch(
          `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username}&limit=100&access_token=${userToken}`
        )
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json()
          for (const page of (pagesData.data ?? []) as MetaPage[]) {
            allItems.push({
              id: `page:${page.id}`,
              type: 'page',
              name: page.name,
              subtitle: `Facebook Page${page.category ? ` · ${page.category}` : ''}`,
              pageToken: page.access_token,
              igAccount: page.instagram_business_account,
            })
          }
        }

        // Fetch Ad Accounts
        const adsRes = await fetch(
          `https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name,account_id,account_status,business_name,currency&limit=100&access_token=${userToken}`
        )
        if (adsRes.ok) {
          const adsData = await adsRes.json()
          for (const ad of (adsData.data ?? []) as MetaAdAccount[]) {
            const statusLabel = AD_STATUS_LABELS[ad.account_status] ?? 'Unknown'
            allItems.push({
              id: `ad:${ad.id}`,
              type: 'ad_account',
              name: ad.name || `Ad Account ${ad.account_id}`,
              subtitle: `Ad Account${ad.business_name ? ` · ${ad.business_name}` : ''} · ${statusLabel} · ${ad.currency ?? 'GBP'}`,
            })
          }
        }

        setItems(allItems)

        if (allItems.length === 0) {
          setError('No Facebook Pages or Ad Accounts found. Make sure you have admin access and granted all permissions during login.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [userToken])

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(items.map((i) => i.id)))
  }

  async function handleConnect() {
    setSaving(true)
    try {
      const selectedItems = items.filter((i) => selected.has(i.id))
      let connectedCount = 0

      for (const item of selectedItems) {
        if (item.type === 'page') {
          const pageId = item.id.replace('page:', '')
          // Store Facebook Page
          await supabase.from('channel_accounts').upsert(
            {
              platform: 'facebook',
              account_id: pageId,
              account_name: item.name,
              access_token: item.pageToken ?? userToken,
              token_expires_at: '2099-01-01T00:00:00Z',
              is_active: true,
            },
            { onConflict: 'platform,account_id' }
          )
          connectedCount++

          // Auto-connect linked Instagram
          if (item.igAccount) {
            await supabase.from('channel_accounts').upsert(
              {
                platform: 'instagram',
                account_id: item.igAccount.id,
                account_name: `@${item.igAccount.username}`,
                access_token: item.pageToken ?? userToken,
                token_expires_at: '2099-01-01T00:00:00Z',
                is_active: true,
              },
              { onConflict: 'platform,account_id' }
            )
            connectedCount++
          }
        } else if (item.type === 'ad_account') {
          const adId = item.id.replace('ad:', '')
          // Store Ad Account as a Facebook channel (for ads management)
          await supabase.from('channel_accounts').upsert(
            {
              platform: 'facebook',
              account_id: adId,
              account_name: `${item.name} (Ads)`,
              access_token: userToken,
              token_expires_at: '2099-01-01T00:00:00Z',
              is_active: true,
            },
            { onConflict: 'platform,account_id' }
          )
          connectedCount++
        }
      }

      navigate(`/channels?connected=${connectedCount}+accounts`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connections')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your pages and ad accounts...</p>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Connect Accounts</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
        <button
          onClick={() => navigate('/channels')}
          className="text-sm text-primary hover:underline"
        >
          Back to Channels
        </button>
      </div>
    )
  }

  const pages = items.filter((i) => i.type === 'page')
  const adAccounts = items.filter((i) => i.type === 'ad_account')
  const selectedPages = items.filter((i) => i.type === 'page' && selected.has(i.id))
  const igCount = selectedPages.filter((i) => i.igAccount).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Select Accounts to Connect</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which Facebook Pages, Ad Accounts, and Instagram accounts to connect.
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={selectAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          Select all ({items.length})
        </button>
        <p className="text-xs text-muted-foreground">
          {selected.size} selected
          {igCount > 0 && ` + ${igCount} Instagram`}
        </p>
      </div>

      {/* Pages section */}
      {pages.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <FileText className="h-3.5 w-3.5" />
            Facebook Pages ({pages.length})
          </h2>
          <div className="space-y-2">
            {pages.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isSelected={selected.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ad Accounts section */}
      {adAccounts.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Megaphone className="h-3.5 w-3.5" />
            Ad Accounts ({adAccounts.length})
          </h2>
          <div className="space-y-2">
            {adAccounts.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isSelected={selected.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connect button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConnect}
          disabled={selected.size === 0 || saving}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving
            ? 'Connecting...'
            : `Connect ${selected.size} account${selected.size !== 1 ? 's' : ''}`}
        </button>
        <button
          onClick={() => navigate('/channels')}
          className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ItemCard({
  item,
  isSelected,
  onToggle,
}: {
  item: SelectableItem
  isSelected: boolean
  onToggle: () => void
}) {
  const bgColor = item.type === 'page' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
  const badge = item.type === 'page' ? 'Facebook Page' : 'Ad Account'
  const badgeColor = item.type === 'page' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card hover:border-primary/30'
      }`}
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border'
        }`}
      >
        {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
      </div>

      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgColor} text-sm font-bold`}>
        {item.name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}>
            {badge}
          </span>
          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
        </div>
        {item.igAccount && (
          <p className="mt-1 text-xs text-pink-600">
            + Instagram: @{item.igAccount.username}
          </p>
        )}
      </div>
    </button>
  )
}

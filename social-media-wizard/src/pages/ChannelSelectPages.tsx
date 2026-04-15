// Channel page/account selection after OAuth callback
// Shows all Facebook Pages + Instagram accounts the user manages
// and lets them choose which to connect.

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Loader2 } from 'lucide-react'

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

export default function ChannelSelectPages() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [pages, setPages] = useState<MetaPage[]>([])
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

    async function fetchPages() {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username}&limit=100&access_token=${userToken}`
        )
        if (!res.ok) throw new Error('Failed to fetch pages')
        const data = await res.json()
        setPages(data.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pages')
      } finally {
        setLoading(false)
      }
    }

    fetchPages()
  }, [userToken])

  function togglePage(pageId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(pages.map((p) => p.id)))
  }

  async function handleConnect() {
    setSaving(true)
    try {
      const selectedPages = pages.filter((p) => selected.has(p.id))

      for (const page of selectedPages) {
        // Store Facebook Page connection
        await supabase.from('channel_accounts').upsert(
          {
            platform: 'facebook',
            account_id: page.id,
            account_name: page.name,
            access_token: page.access_token,
            token_expires_at: '2099-01-01T00:00:00Z', // Page tokens from long-lived user tokens don't expire
            is_active: true,
          },
          { onConflict: 'platform,account_id' }
        )

        // If page has an Instagram business account, store that too
        if (page.instagram_business_account) {
          await supabase.from('channel_accounts').upsert(
            {
              platform: 'instagram',
              account_id: page.instagram_business_account.id,
              account_name: `${page.instagram_business_account.username} (via ${page.name})`,
              access_token: page.access_token, // Instagram uses the page token
              token_expires_at: '2099-01-01T00:00:00Z',
              is_active: true,
            },
            { onConflict: 'platform,account_id' }
          )
        }
      }

      navigate(`/channels?connected=${selectedPages.length}+accounts`)
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
        <p className="text-sm text-muted-foreground">Loading your pages and accounts...</p>
      </div>
    )
  }

  if (error) {
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

  if (pages.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Connect Accounts</h1>
        <div className="rounded-lg border border-border py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No Facebook Pages found.</p>
          <p className="text-xs text-muted-foreground">
            Make sure you're an admin of the pages you want to connect,
            and that you granted page permissions during login.
          </p>
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

  const igCount = pages.filter((p) => p.instagram_business_account && selected.has(p.id)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Select Accounts to Connect</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which Facebook Pages (and their linked Instagram accounts) to connect to the wizard.
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={selectAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          Select all ({pages.length})
        </button>
        <p className="text-xs text-muted-foreground">
          {selected.size} page{selected.size !== 1 ? 's' : ''} selected
          {igCount > 0 && ` + ${igCount} Instagram account${igCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Page list */}
      <div className="space-y-2">
        {pages.map((page) => {
          const isSelected = selected.has(page.id)
          const hasIg = Boolean(page.instagram_business_account)

          return (
            <button
              key={page.id}
              type="button"
              onClick={() => togglePage(page.id)}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border'
                }`}
              >
                {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
              </div>

              {/* Page icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">
                {page.name.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{page.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    Facebook Page
                  </span>
                  {page.category && (
                    <span className="text-xs text-muted-foreground">{page.category}</span>
                  )}
                </div>
                {hasIg && (
                  <p className="mt-1 text-xs text-pink-600">
                    + Instagram: @{page.instagram_business_account!.username}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

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

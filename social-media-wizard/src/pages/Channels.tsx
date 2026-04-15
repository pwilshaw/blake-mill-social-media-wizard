// T067 — Channels page
// Lists connected channels with status. Add channel flow via ChannelConnector.
// Per-channel settings (default budget limit).

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ChannelConnector } from '@/components/channels/ChannelConnector'
import { PLATFORM_META } from '@/lib/platforms'
import type { ChannelAccount } from '@/lib/types'

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function fetchChannels(): Promise<ChannelAccount[]> {
  const { data, error } = await supabase
    .from('channel_accounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ChannelAccount[]
}

async function initiateOAuth(platform: string): Promise<{ oauth_url: string }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channels/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ platform }),
  })
  if (!res.ok) {
    const err = await res.json() as { error?: string; setup_required?: boolean }
    if (err.setup_required) {
      throw new Error(`${platform} is not configured yet. API keys need to be added.`)
    }
    throw new Error(err.error ?? 'OAuth initiation failed')
  }
  return res.json()
}

async function fetchPlatformStatus(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channels/status`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

async function disconnectChannel(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channels?id=${id}`,
    {
      method: 'DELETE',
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    }
  )
  if (!res.ok) {
    const err = await res.json() as { error?: string }
    throw new Error(err.error ?? 'Disconnect failed')
  }
}

async function updateDefaultBudget(id: string, limit: number | null): Promise<void> {
  const { error } = await supabase
    .from('channel_accounts')
    .update({ default_budget_limit: limit })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Token expiry helpers
// ---------------------------------------------------------------------------

function tokenExpiryLabel(expiresAt: string): { label: string; isExpired: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Token expired', isExpired: true }
  if (days < 7) return { label: `Expires in ${days}d`, isExpired: false }
  return { label: `Expires ${new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, isExpired: false }
}

// ---------------------------------------------------------------------------
// Per-channel settings row
// ---------------------------------------------------------------------------

function ChannelRow({ account, onDisconnect }: { account: ChannelAccount; onDisconnect: (id: string) => void }) {
  const queryClient = useQueryClient()
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(
    account.default_budget_limit !== null ? String(account.default_budget_limit) : ''
  )

  const { mutate: savebudget, isPending } = useMutation({
    mutationFn: () => {
      const val = budgetInput.trim() === '' ? null : parseFloat(budgetInput)
      return updateDefaultBudget(account.id, val)
    },
    onSuccess: () => {
      setEditingBudget(false)
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })

  const expiry = tokenExpiryLabel(account.token_expires_at)
  const platformInfo = PLATFORM_META[account.platform] ?? { label: account.platform, color: 'text-foreground', bgColor: 'bg-muted' }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{account.account_name}</p>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${platformInfo.color} ${platformInfo.bgColor}`}>{platformInfo.label}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              account.is_active
                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {account.is_active ? 'Active' : 'Inactive'}
          </span>
          <span
            className={`text-xs ${expiry.isExpired ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {expiry.label}
          </span>
        </div>
      </div>

      {/* Default budget */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Default monthly budget:</span>
        {editingBudget ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">£</span>
            <input
              type="number"
              min="0"
              step="1"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-24 rounded border border-input bg-background px-2 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="No limit"
            />
            <button
              type="button"
              onClick={() => savebudget()}
              disabled={isPending}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingBudget(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">
              {account.default_budget_limit !== null
                ? `£${account.default_budget_limit.toLocaleString()}`
                : 'No limit'}
            </span>
            <button
              type="button"
              onClick={() => setEditingBudget(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Disconnect */}
      <div className="border-t border-border pt-2 flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Disconnect ${account.account_name}?`)) {
              onDisconnect(account.id)
            }
          }}
          className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Channels() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Handle OAuth callback redirects (all platforms)
  useEffect(() => {
    const connected = searchParams.get('connected')
    const shopifyConnected = searchParams.get('shopify')
    const error = searchParams.get('error')

    if (connected) {
      setSuccessMessage(`${connected} connected successfully.`)
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      setSearchParams({}, { replace: true })
    } else if (shopifyConnected === 'connected') {
      const shop = searchParams.get('shop') ?? 'your store'
      setSuccessMessage(`Shopify store "${shop}" connected successfully.`)
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      setSearchParams({}, { replace: true })
    } else if (error) {
      setOauthError(decodeURIComponent(error))
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, queryClient])

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannels,
    retry: false,
  })

  const { data: platformStatus = {} } = useQuery({
    queryKey: ['channels', 'status'],
    queryFn: fetchPlatformStatus,
    staleTime: 1000 * 60 * 5,
  })

  const { mutate: doDisconnect } = useMutation({
    mutationFn: disconnectChannel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  })

  async function handleConnect(platform: string, meta?: { shop_domain?: string }) {
    setOauthError(null)
    try {
      // Shopify uses a direct redirect to the OAuth edge function
      if (platform === 'shopify' && meta?.shop_domain) {
        const shopifyAuthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-auth?shop=${encodeURIComponent(meta.shop_domain)}`
        window.location.href = shopifyAuthUrl
        return
      }

      const { oauth_url } = await initiateOAuth(platform)
      window.location.href = oauth_url
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  const connectedAccounts = accounts.filter((a) => a.is_active)
  const hasAccounts = accounts.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Channels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage connected social media accounts.
          {connectedAccounts.length > 0 && ` ${connectedAccounts.length} active.`}
        </p>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* OAuth error */}
      {oauthError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{oauthError}</p>
        </div>
      )}

      {/* Platform connections */}
      <section aria-label="Connect a channel" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Platforms</h2>
        <ChannelConnector
          onConnect={handleConnect}
          accounts={accounts}
          platformStatus={platformStatus}
        />
      </section>

      {/* Connected channels list */}
      <section aria-label="Connected channels" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Connected accounts</h2>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading channels…</p>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">Load failed</p>
            <p className="text-xs text-muted-foreground mt-1">
              No channels connected yet. Connect your first platform below.
            </p>
          </div>
        )}

        {!isLoading && !hasAccounts && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">No channels connected yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Connect a platform above to get started.</p>
          </div>
        )}

        {!isLoading && hasAccounts && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <ChannelRow key={account.id} account={account} onDisconnect={(id) => doDisconnect(id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

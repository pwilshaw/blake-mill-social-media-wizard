import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Key, Check, Trash2 } from 'lucide-react'

interface KlaviyoCredentials {
  api_key?: string
}

async function fetchKlaviyoCredentials(): Promise<KlaviyoCredentials | null> {
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('credentials')
    .eq('provider', 'klaviyo')
    .maybeSingle<{ credentials: KlaviyoCredentials }>()
  if (error) throw new Error(error.message)
  return data?.credentials ?? null
}

async function saveKlaviyoCredentials(apiKey: string): Promise<void> {
  const { error } = await supabase
    .from('integration_credentials')
    .upsert(
      { provider: 'klaviyo', credentials: { api_key: apiKey } },
      { onConflict: 'provider' },
    )
  if (error) throw new Error(error.message)
}

async function removeKlaviyoCredentials(): Promise<void> {
  const { error } = await supabase
    .from('integration_credentials')
    .delete()
    .eq('provider', 'klaviyo')
  if (error) throw new Error(error.message)
}

function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

export function KlaviyoConnector() {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)

  const credsQuery = useQuery({ queryKey: ['integration', 'klaviyo'], queryFn: fetchKlaviyoCredentials })

  const saveMutation = useMutation({
    mutationFn: saveKlaviyoCredentials,
    onSuccess: () => {
      setInput('')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['integration', 'klaviyo'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeKlaviyoCredentials,
    onSuccess: () => {
      setInput('')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['integration', 'klaviyo'] })
    },
  })

  const existingKey = credsQuery.data?.api_key ?? ''
  const isConnected = Boolean(existingKey)

  function handleSave() {
    const trimmed = input.trim()
    if (!trimmed) return
    saveMutation.mutate(trimmed)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Klaviyo connection</h3>
        {isConnected && !editing && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
            <Check className="h-3 w-3" />
            Connected
          </span>
        )}
      </div>

      {credsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : isConnected && !editing ? (
        <div className="flex items-center justify-between gap-3">
          <code className="text-xs text-muted-foreground font-mono">{maskKey(existingKey)}</code>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setInput(''); setEditing(true) }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Remove the saved Klaviyo API key?')) removeMutation.mutate()
              }}
              disabled={removeMutation.isPending}
              className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Paste a Klaviyo Private API Key (starts with{' '}
            <code className="font-mono">pk_</code>). Create one in Klaviyo → Account → Settings → API Keys. It needs read access to Segments and Profiles.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="pk_..."
              autoComplete="off"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Klaviyo API key"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!input.trim() || saveMutation.isPending}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save key'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => { setInput(''); setEditing(false) }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          {saveMutation.error && (
            <p className="text-xs text-destructive">{(saveMutation.error as Error).message}</p>
          )}
          {removeMutation.error && (
            <p className="text-xs text-destructive">{(removeMutation.error as Error).message}</p>
          )}
        </div>
      )}
    </div>
  )
}

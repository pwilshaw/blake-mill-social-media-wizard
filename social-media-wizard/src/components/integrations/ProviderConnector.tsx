import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Check, Trash2, ExternalLink } from 'lucide-react'
import type { ComponentType } from 'react'

export interface ProviderSpec {
  provider: string
  label: string
  description: string
  docsUrl?: string
  icon?: ComponentType<{ className?: string }>
  placeholder?: string
  credentialField?: string // default 'api_key'
}

interface Credentials {
  [key: string]: string | undefined
}

async function fetchCreds(provider: string): Promise<Credentials | null> {
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('credentials')
    .eq('provider', provider)
    .maybeSingle<{ credentials: Credentials }>()
  if (error) throw new Error(error.message)
  return data?.credentials ?? null
}

async function saveCreds(provider: string, credentials: Credentials): Promise<void> {
  const { error } = await supabase
    .from('integration_credentials')
    .upsert({ provider, credentials }, { onConflict: 'provider' })
  if (error) throw new Error(error.message)
}

async function removeCreds(provider: string): Promise<void> {
  const { error } = await supabase
    .from('integration_credentials')
    .delete()
    .eq('provider', provider)
  if (error) throw new Error(error.message)
}

function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

export function ProviderConnector({ spec }: { spec: ProviderSpec }) {
  const queryClient = useQueryClient()
  const field = spec.credentialField ?? 'api_key'
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)

  const query = useQuery({
    queryKey: ['integration', spec.provider],
    queryFn: () => fetchCreds(spec.provider),
  })

  const saveMutation = useMutation({
    mutationFn: (val: string) => saveCreds(spec.provider, { [field]: val }),
    onSuccess: () => {
      setInput('')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['integration', spec.provider] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: () => removeCreds(spec.provider),
    onSuccess: () => {
      setInput('')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['integration', spec.provider] })
    },
  })

  const existing = query.data?.[field] ?? ''
  const isConnected = Boolean(existing)
  const Icon = spec.icon

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {Icon ? <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /> : null}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{spec.label}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{spec.description}</p>
          </div>
        </div>
        {isConnected && !editing && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200 shrink-0">
            <Check className="h-3 w-3" />
            Connected
          </span>
        )}
      </div>

      {query.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : isConnected && !editing ? (
        <div className="flex items-center justify-between gap-3">
          <code className="text-xs text-muted-foreground font-mono">{maskKey(existing)}</code>
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
                if (window.confirm(`Remove the saved ${spec.label} key?`)) removeMutation.mutate()
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={spec.placeholder ?? 'Paste API key'}
              autoComplete="off"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={`${spec.label} API key`}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const trimmed = input.trim()
                  if (trimmed) saveMutation.mutate(trimmed)
                }}
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
          {spec.docsUrl && (
            <a
              href={spec.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Where do I get this?
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
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

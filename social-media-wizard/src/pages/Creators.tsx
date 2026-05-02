import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Tv2, Plus, Check, ExternalLink, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { discoverYouTubeCreators } from '@/lib/competitor-creator-api'
import type { CreatorShortlistRow, CreatorStatus, DiscoveredCreator } from '@/lib/types'

const STATUS_OPTIONS: { value: CreatorStatus; label: string }[] = [
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'partnered', label: 'Partnered' },
  { value: 'declined', label: 'Declined' },
]

export default function Creators() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [minSubs, setMinSubs] = useState('5000')
  const [maxSubs, setMaxSubs] = useState('500000')
  const queryClient = useQueryClient()

  const shortlistQuery = useQuery({
    queryKey: ['creator_shortlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_shortlist')
        .select('*')
        .order('subscriber_count', { ascending: false, nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as CreatorShortlistRow[]
    },
  })

  const discoveryQuery = useQuery({
    enabled: submittedQuery.length > 0,
    queryKey: ['discover_youtube_creators', submittedQuery, minSubs, maxSubs],
    queryFn: () => discoverYouTubeCreators({
      query: submittedQuery,
      limit: 25,
      min_subs: minSubs ? Number(minSubs) : undefined,
      max_subs: maxSubs ? Number(maxSubs) : undefined,
    }),
    staleTime: 5 * 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: async (c: DiscoveredCreator) => {
      const { error } = await supabase.from('creator_shortlist').insert({
        platform: 'youtube',
        channel_id: c.channel_id,
        channel_name: c.channel_name,
        channel_url: c.channel_url,
        subscriber_count: c.subscriber_count,
        video_count: c.video_count,
        view_count: c.view_count,
        country: c.country,
        description: c.description,
        status: 'shortlisted',
      })
      if (error && !error.message.includes('duplicate')) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator_shortlist'] }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CreatorStatus }) => {
      const { error } = await supabase
        .from('creator_shortlist')
        .update({ status })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator_shortlist'] }),
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('creator_shortlist').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator_shortlist'] }),
  })

  const shortlistedIds = new Set(
    (shortlistQuery.data ?? []).map((r) => r.channel_id).filter(Boolean) as string[],
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Tv2 className="h-6 w-6 text-red-600" /> Creator discovery
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find YouTube creators to partner with. Shortlist them, track outreach, and the Acquisition agent will reference your shortlist in its briefs.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSubmittedQuery(query.trim())
        }}
        className="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-muted-foreground">Search query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. menswear shirt review, classic style"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Min subs</label>
            <input
              type="number"
              value={minSubs}
              onChange={(e) => setMinSubs(e.target.value)}
              className="mt-1 block w-32 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Max subs</label>
            <input
              type="number"
              value={maxSubs}
              onChange={(e) => setMaxSubs(e.target.value)}
              className="mt-1 block w-32 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || discoveryQuery.isFetching}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {discoveryQuery.isFetching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {discoveryQuery.error && (
          <p className="text-sm text-destructive">{(discoveryQuery.error as Error).message}</p>
        )}
      </form>

      {discoveryQuery.data && discoveryQuery.data.creators.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {discoveryQuery.data.count} creator{discoveryQuery.data.count === 1 ? '' : 's'} found
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {discoveryQuery.data.creators.map((c) => {
              const alreadyAdded = c.channel_id ? shortlistedIds.has(c.channel_id) : false
              return (
                <div key={c.channel_id ?? c.channel_url ?? c.channel_name} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.channel_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.subscriber_count?.toLocaleString() ?? '—'} subs · {c.video_count ?? '—'} videos
                        {c.country ? ` · ${c.country}` : ''}
                      </p>
                    </div>
                    {c.channel_url && (
                      <a
                        href={c.channel_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Open channel"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{c.description}</p>
                  )}
                  <button
                    onClick={() => addMutation.mutate(c)}
                    disabled={alreadyAdded || addMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {alreadyAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> On shortlist
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Add to shortlist
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {submittedQuery && discoveryQuery.data && discoveryQuery.data.creators.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No creators matched. Try a broader query or relax the subscriber range.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Your shortlist</h2>
          <span className="text-xs text-muted-foreground">
            {shortlistQuery.data?.length ?? 0} creator{shortlistQuery.data?.length === 1 ? '' : 's'}
          </span>
        </div>
        {shortlistQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading shortlist…</div>
        ) : (shortlistQuery.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Empty. Search above and click &ldquo;Add to shortlist&rdquo; on creators worth tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left font-semibold">Channel</th>
                  <th className="px-3 py-2 text-right font-semibold">Subs</th>
                  <th className="px-3 py-2 text-right font-semibold">Videos</th>
                  <th className="px-3 py-2 text-left font-semibold">Country</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-5 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(shortlistQuery.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-5 py-2">
                      <div className="font-medium">{r.channel_name}</div>
                      {r.channel_url && (
                        <a
                          href={r.channel_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline"
                        >
                          Open channel ↗
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.subscriber_count?.toLocaleString() ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.video_count ?? '—'}</td>
                    <td className="px-3 py-2">{r.country ?? '—'}</td>
                    <td className="px-3 py-2">
                      <select
                        value={r.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: r.id, status: e.target.value as CreatorStatus })}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-2 text-right">
                      <button
                        onClick={() => removeMutation.mutate(r.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove from shortlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

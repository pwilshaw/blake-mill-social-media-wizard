import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, RefreshCw, Trash2, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { scrapeCompetitorPosts } from '@/lib/competitor-creator-api'
import type { CompetitorHandle, CompetitorPlatform, CompetitorPost } from '@/lib/types'

const PLATFORMS: { value: CompetitorPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
]

interface CompetitorPostJoined extends CompetitorPost {
  competitor_handles: { handle: string; platform: string; label: string | null } | null
}

export default function Competitors() {
  const [platform, setPlatform] = useState<CompetitorPlatform>('instagram')
  const [handle, setHandle] = useState('')
  const [label, setLabel] = useState('')
  const queryClient = useQueryClient()

  const handlesQuery = useQuery({
    queryKey: ['competitor_handles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_handles')
        .select('*')
        .order('platform', { ascending: true })
        .order('handle', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as CompetitorHandle[]
    },
  })

  const postsQuery = useQuery({
    queryKey: ['competitor_posts'],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400_000).toISOString()
      const { data, error } = await supabase
        .from('competitor_posts')
        .select('*, competitor_handles!inner(handle, platform, label)')
        .gte('published_at', since)
        .order('engagement_rate_pct', { ascending: false, nullsFirst: false })
        .limit(40)
      if (error) throw new Error(error.message)
      return (data ?? []) as CompetitorPostJoined[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const cleaned = handle.trim().replace(/^@/, '').replace(/^https?:\/\//, '')
      if (!cleaned) throw new Error('Handle required')
      const { error } = await supabase.from('competitor_handles').insert({
        platform,
        handle: cleaned,
        label: label.trim() || null,
        is_active: true,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setHandle('')
      setLabel('')
      queryClient.invalidateQueries({ queryKey: ['competitor_handles'] })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('competitor_handles')
        .update({ is_active })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competitor_handles'] }),
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('competitor_handles').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor_handles'] })
      queryClient.invalidateQueries({ queryKey: ['competitor_posts'] })
    },
  })

  const scrapeAllMutation = useMutation({
    mutationFn: () => scrapeCompetitorPosts({ limit: 25 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor_handles'] })
      queryClient.invalidateQueries({ queryKey: ['competitor_posts'] })
    },
  })

  const scrapeOneMutation = useMutation({
    mutationFn: (id: string) => scrapeCompetitorPosts({ competitor_handle_id: id, limit: 25 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor_handles'] })
      queryClient.invalidateQueries({ queryKey: ['competitor_posts'] })
    },
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> Competitor monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track competitor handles across IG, YouTube, TikTok and Facebook. The Social Media agent reads the last 14 days when briefing the &ldquo;Competitor pulse&rdquo; template.
          </p>
        </div>
        <button
          onClick={() => scrapeAllMutation.mutate()}
          disabled={scrapeAllMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${scrapeAllMutation.isPending ? 'animate-spin' : ''}`} />
          Scrape all
        </button>
      </div>

      {scrapeAllMutation.data && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
          Scraped {scrapeAllMutation.data.scraped_handles} handle{scrapeAllMutation.data.scraped_handles === 1 ? '' : 's'} · upserted {scrapeAllMutation.data.posts_upserted} post{scrapeAllMutation.data.posts_upserted === 1 ? '' : 's'}.
        </div>
      )}
      {scrapeAllMutation.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {(scrapeAllMutation.error as Error).message}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          addMutation.mutate()
        }}
        className="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <h2 className="text-sm font-semibold text-foreground">Add a competitor</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as CompetitorPlatform)}
              className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Handle</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="hawesandcurtis (no @)"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Hawes & Curtis"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!handle.trim() || addMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {addMutation.error && (
          <p className="text-xs text-destructive">{(addMutation.error as Error).message}</p>
        )}
      </form>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Tracked handles</h2>
        </div>
        {handlesQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (handlesQuery.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No competitors yet. Add one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left font-semibold">Platform</th>
                  <th className="px-3 py-2 text-left font-semibold">Handle</th>
                  <th className="px-3 py-2 text-left font-semibold">Label</th>
                  <th className="px-3 py-2 text-left font-semibold">Last scraped</th>
                  <th className="px-3 py-2 text-left font-semibold">Active</th>
                  <th className="px-5 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(handlesQuery.data ?? []).map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-5 py-2 capitalize">{h.platform}</td>
                    <td className="px-3 py-2 font-mono text-xs">{h.handle}</td>
                    <td className="px-3 py-2">{h.label ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {h.last_scraped_at ? new Date(h.last_scraped_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={h.is_active}
                        onChange={(e) => toggleActiveMutation.mutate({ id: h.id, is_active: e.target.checked })}
                      />
                    </td>
                    <td className="px-5 py-2 text-right space-x-2">
                      <button
                        onClick={() => scrapeOneMutation.mutate(h.id)}
                        disabled={scrapeOneMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${scrapeOneMutation.isPending && scrapeOneMutation.variables === h.id ? 'animate-spin' : ''}`} />
                        Scrape
                      </button>
                      <button
                        onClick={() => removeMutation.mutate(h.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove competitor"
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

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Top competitor posts (last 14 days)</h2>
        </div>
        {postsQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading posts…</div>
        ) : (postsQuery.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No posts yet. Add competitors above and click &ldquo;Scrape all&rdquo; to fetch.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(postsQuery.data ?? []).map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold capitalize text-foreground">
                      {p.competitor_handles?.label || p.competitor_handles?.handle}
                    </span>
                    <span>· {p.competitor_handles?.platform}</span>
                    {p.published_at && (
                      <span>· {new Date(p.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    )}
                    <span>· {p.views.toLocaleString()} views</span>
                    <span>· {p.likes.toLocaleString()} likes</span>
                    <span>· {p.comments.toLocaleString()} comments</span>
                    {p.engagement_rate_pct != null && (
                      <span className="ml-auto font-semibold text-foreground">
                        {Number(p.engagement_rate_pct).toFixed(2)}% eng.
                      </span>
                    )}
                  </div>
                  {p.content && (
                    <p className="mt-1 text-sm text-foreground line-clamp-2">{p.content}</p>
                  )}
                </div>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Open post"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

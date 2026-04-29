import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Megaphone, X } from 'lucide-react'
import { promoteAsAd } from '@/lib/videos/api'
import type { VideoUpload } from '@/lib/types'

interface Props {
  video: VideoUpload
  onClose: () => void
  onSubmitted: () => void
}

const TOPIC_PRESETS: { id: string; label: string }[] = [
  { id: '1098', label: 'Fashion & Style' },
  { id: '959', label: 'Lifestyles' },
  { id: '69', label: 'Apparel' },
  { id: '986', label: 'Brand-name Apparel' },
  { id: '1058', label: 'Casual Apparel' },
]

export function PromoteAdDialog({ video, onClose, onSubmitted }: Props) {
  const [budget, setBudget] = useState('10')
  const [finalUrl, setFinalUrl] = useState('https://blakemill.com')
  const [keywordsRaw, setKeywordsRaw] = useState('mens shirts, independent menswear, blake mill')
  const [channelsRaw, setChannelsRaw] = useState('')
  const [topicIds, setTopicIds] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('')

  const submit = useMutation({
    mutationFn: () => promoteAsAd({
      video_upload_id: video.id,
      daily_budget_gbp: Number(budget),
      final_url: finalUrl,
      campaign_name: campaignName || undefined,
      campaign_id: video.campaign_id ?? undefined,
      targeting: {
        keywords: keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean),
        topics: topicIds,
        channels: channelsRaw.split(',').map((c) => c.trim()).filter(Boolean),
      },
    }),
    onSuccess: () => onSubmitted(),
  })

  function toggleTopic(id: string) {
    setTopicIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])
  }

  const canSubmit = Number(budget) > 0 && finalUrl.startsWith('http') && !submit.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-lg w-[92vw] max-w-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Promote as YouTube ad</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Creates a paid YouTube video campaign in Google Ads referencing the YouTube-uploaded video. Campaign starts <strong>paused</strong> in Google Ads — review and unpause there to start spending.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Daily budget (£)">
            <div className="relative">
              <span className="absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">£</span>
              <input
                type="number"
                min="1"
                step="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </Field>
          <Field label="Campaign name (optional)">
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Limited drop · April"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>

        <Field label="Landing page URL">
          <input
            value={finalUrl}
            onChange={(e) => setFinalUrl(e.target.value)}
            placeholder="https://blakemill.com/products/..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Keywords (comma-separated)">
          <input
            value={keywordsRaw}
            onChange={(e) => setKeywordsRaw(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Topics">
          <div className="flex flex-wrap gap-2">
            {TOPIC_PRESETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTopic(t.id)}
                aria-pressed={topicIds.includes(t.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  topicIds.includes(t.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="YouTube channel placements (comma-separated channel IDs, optional)">
          <input
            value={channelsRaw}
            onChange={(e) => setChannelsRaw(e.target.value)}
            placeholder="UCxxxxxx, UCyyyyy"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Optional — target your ad to play before videos on specific creators' channels (Ken's "industry buyer" use case).
          </p>
        </Field>

        {submit.error && (
          <p className="text-xs text-destructive">{(submit.error as Error).message}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
          <button
            type="button"
            onClick={() => submit.mutate()}
            disabled={!canSubmit}
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submit.isPending ? 'Submitting…' : 'Create campaign (paused)'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

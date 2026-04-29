import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wand2, Check } from 'lucide-react'
import { generateVideoVariants, listVariantsForCampaign } from '@/lib/videos/api'
import { supabase } from '@/lib/supabase'
import type { ContentVariant, ShirtProduct, VideoUpload } from '@/lib/types'

interface Props {
  video: VideoUpload
  onPickAndPublish: (variant_id: string) => void
}

async function fetchCampaignShirts(campaignId: string): Promise<ShirtProduct[]> {
  const { data, error } = await supabase
    .from('campaign_shirts')
    .select('shirt_products(*)')
    .eq('campaign_id', campaignId)
  if (error) throw new Error(error.message)
  // Supabase typing returns the joined relation as an array even for foreign-
  // key joins. Flatten + filter null.
  const rows = (data ?? []) as unknown as Array<{ shirt_products: ShirtProduct | ShirtProduct[] | null }>
  return rows
    .flatMap((r) => Array.isArray(r.shirt_products) ? r.shirt_products : r.shirt_products ? [r.shirt_products] : [])
    .filter((s): s is ShirtProduct => s !== null)
}

export function VideoVariantPanel({ video, onPickAndPublish }: Props) {
  const queryClient = useQueryClient()
  const [variantCount, setVariantCount] = useState(3)

  const variantsQuery = useQuery<ContentVariant[], Error>({
    queryKey: ['youtube_variants', video.campaign_id],
    queryFn: () => video.campaign_id ? listVariantsForCampaign(video.campaign_id) : Promise.resolve([]),
    enabled: Boolean(video.campaign_id),
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!video.campaign_id) throw new Error('Video must be linked to a campaign first.')
      const shirts = await fetchCampaignShirts(video.campaign_id)
      if (shirts.length === 0) throw new Error('Campaign has no shirts attached.')
      return generateVideoVariants({
        video_upload_id: video.id,
        campaign_id: video.campaign_id,
        shirt_ids: shirts.map((s) => s.id),
        variant_count: variantCount,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube_variants', video.campaign_id] }),
  })

  if (!video.campaign_id) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Link this video to a campaign to generate variants. (Not yet wired in the upload flow — for now, attach via DB or an upcoming campaign tie-in.)
      </div>
    )
  }

  const variants = variantsQuery.data ?? []
  const selectedVariantId = video.selected_variant_id

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Title / description / tags variants
        </p>
        <div className="flex items-center gap-2">
          <select
            value={variantCount}
            onChange={(e) => setVariantCount(Number(e.target.value))}
            className="rounded border border-input bg-background px-2 py-0.5 text-[11px]"
          >
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} angles</option>)}
          </select>
          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Wand2 className="h-3 w-3" />
            {generateMutation.isPending ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {generateMutation.error && (
        <p className="text-xs text-destructive">{(generateMutation.error as Error).message}</p>
      )}

      {variants.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No variants yet. Click Generate to ask Claude for {variantCount} angles.
        </p>
      ) : (
        <ul className="space-y-2">
          {variants.map((v) => (
            <li key={v.id} className="rounded-md border border-border p-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {v.meta?.title ?? '(no title)'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {v.angle_label ?? `variant ${v.variant_number}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPickAndPublish(v.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {selectedVariantId === v.id ? <Check className="h-3 w-3" /> : null}
                  Use & publish
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {v.meta?.description ?? v.copy_text}
              </p>
              {(v.meta?.tags ?? v.hashtags).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(v.meta?.tags ?? v.hashtags).slice(0, 8).map((t: string) => (
                    <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

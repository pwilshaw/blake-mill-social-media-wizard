// T025 — Campaign CRUD hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Campaign, CampaignStatus } from '@/lib/types'

// ----------------------------------------------------------------
// Query helpers
// ----------------------------------------------------------------

async function fetchCampaigns(status?: CampaignStatus): Promise<Campaign[]> {
  let query = supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (status !== undefined) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as Campaign[]
}

interface CampaignDetail extends Campaign {
  content_variants_count: number
}

async function fetchCampaignDetail(id: string): Promise<CampaignDetail> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, content_variants(count)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  const raw = data as Campaign & { content_variants: { count: number }[] }
  const count = raw.content_variants?.[0]?.count ?? 0

  return {
    ...raw,
    content_variants_count: count,
  }
}

type CreateCampaignInput = Pick<
  Campaign,
  'name' | 'campaign_type' | 'target_segments' | 'channels'
> & Partial<Pick<Campaign, 'budget_limit' | 'scheduled_start' | 'scheduled_end' | 'trigger_rule_id'>>

type UpdateCampaignInput = { id: string } & Partial<
  Pick<
    Campaign,
    | 'name'
    | 'status'
    | 'campaign_type'
    | 'target_segments'
    | 'channels'
    | 'scheduled_start'
    | 'scheduled_end'
    | 'budget_limit'
    | 'auto_approved'
    | 'trigger_rule_id'
  >
>

// ----------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------

export function useCampaignsList(status?: CampaignStatus) {
  return useQuery<Campaign[], Error>({
    queryKey: ['campaigns', 'list', status ?? 'all'],
    queryFn: () => fetchCampaigns(status),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useCampaignDetail(id: string) {
  return useQuery<CampaignDetail, Error>({
    queryKey: ['campaigns', 'detail', id],
    queryFn: () => fetchCampaignDetail(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation<Campaign, Error, CreateCampaignInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...input,
          status: 'draft' as CampaignStatus,
          budget_spent: 0,
          auto_approved: false,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Campaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()

  return useMutation<Campaign, Error, UpdateCampaignInput>({
    mutationFn: async ({ id, ...fields }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Campaign
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'detail', updated.id] })
    },
  })
}

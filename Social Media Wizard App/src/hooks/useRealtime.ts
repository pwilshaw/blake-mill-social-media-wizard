import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type TableName =
  | 'campaigns'
  | 'content_variants'
  | 'channel_posts'
  | 'engagement_replies'
  | 'performance_snapshots'
  | 'spend_logs'
  | 'budget_rules'

interface UseRealtimeOptions {
  table: TableName
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  onInsert?: (payload: Record<string, unknown>) => void
  onUpdate?: (payload: Record<string, unknown>) => void
  onDelete?: (payload: Record<string, unknown>) => void
  onChange?: (payload: Record<string, unknown>) => void
}

export function useRealtime({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  useEffect(() => {
    let channel: RealtimeChannel

    const config: Record<string, string> = {
      event,
      schema: 'public',
      table,
    }
    if (filter) config.filter = filter

    channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes' as never,
        config,
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          onChange?.(payload.new)
          if (payload.eventType === 'INSERT') onInsert?.(payload.new)
          if (payload.eventType === 'UPDATE') onUpdate?.(payload.new)
          if (payload.eventType === 'DELETE') onDelete?.(payload.old)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, event, filter, onInsert, onUpdate, onDelete, onChange])
}

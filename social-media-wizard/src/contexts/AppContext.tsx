import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChannelAccount, BudgetRule } from '@/lib/types'

interface AppState {
  channels: ChannelAccount[]
  globalBudget: BudgetRule | null
  loading: boolean
  refreshChannels: () => Promise<void>
  refreshBudget: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [channels, setChannels] = useState<ChannelAccount[]>([])
  const [globalBudget, setGlobalBudget] = useState<BudgetRule | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshChannels() {
    const { data } = await supabase
      .from('channel_accounts')
      .select('*')
      .eq('is_active', true)
    setChannels(data ?? [])
  }

  async function refreshBudget() {
    const { data } = await supabase
      .from('budget_rules')
      .select('*')
      .eq('scope', 'global')
      .limit(1)
      .maybeSingle()
    setGlobalBudget(data ?? null)
  }

  useEffect(() => {
    Promise.all([refreshChannels(), refreshBudget()]).finally(() =>
      setLoading(false)
    )
  }, [])

  return (
    <AppContext.Provider
      value={{ channels, globalBudget, loading, refreshChannels, refreshBudget }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

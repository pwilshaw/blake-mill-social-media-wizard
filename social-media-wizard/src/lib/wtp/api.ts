// Supabase + edge function wrappers for the WTP conjoint study.

import { supabase } from '@/lib/supabase'
import type {
  WtpStudy,
  WtpConfig,
  WtpResponse,
  WtpResults,
  PersonaKey,
} from '@/lib/types'
import type { GeneratedPair } from './pair-builder'

// ---------------------------------------------------------------------------
// DB CRUD
// ---------------------------------------------------------------------------

export async function listStudies(): Promise<WtpStudy[]> {
  const { data, error } = await supabase
    .from('wtp_studies')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as WtpStudy[]
}

export async function fetchStudy(id: string): Promise<WtpStudy | null> {
  const { data, error } = await supabase
    .from('wtp_studies')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as WtpStudy) ?? null
}

export async function createStudy(payload: {
  name: string
  persona_key: PersonaKey
  system_message: string
  config: WtpConfig
}): Promise<WtpStudy> {
  const { data, error } = await supabase
    .from('wtp_studies')
    .insert({
      name: payload.name,
      persona_key: payload.persona_key,
      system_message: payload.system_message,
      config: payload.config,
      status: 'running',
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as WtpStudy
}

export async function finalizeStudy(
  id: string,
  patch: {
    responses: WtpResponse[]
    results: WtpResults
    status: WtpStudy['status']
  },
): Promise<WtpStudy> {
  const { data, error } = await supabase
    .from('wtp_studies')
    .update({
      responses: patch.responses,
      results: patch.results,
      status: patch.status,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as WtpStudy
}

export async function deleteStudy(id: string): Promise<void> {
  const { error } = await supabase.from('wtp_studies').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Edge function call: simulate one pair
// ---------------------------------------------------------------------------

export interface ConsiderationArgs {
  system_message: string
  product_name: string
  pair: GeneratedPair
  features: { id: string; label: string }[]
  outside_option: string
}

export interface ConsiderationResult {
  choice: 'option_1' | 'option_2' | 'outside' | 'parse_error'
  reason: string | null
  raw_text: string
  ms: number
}

export async function runConsideration(args: ConsiderationArgs): Promise<ConsiderationResult> {
  const { data, error } = await supabase.functions.invoke<ConsiderationResult>(
    'wtp-consideration',
    { method: 'POST', body: args },
  )
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

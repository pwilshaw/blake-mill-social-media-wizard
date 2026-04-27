// Frontend wrappers for the agent workforce.

import { supabase } from '@/lib/supabase'
import type {
  AgentKey,
  AgentSettings,
  AgentTemplate,
  TeamMessage,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listMessages(limit = 100): Promise<TeamMessage[]> {
  const { data, error } = await supabase
    .from('team_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).reverse() as TeamMessage[]
}

export async function listAgentSettings(): Promise<AgentSettings[]> {
  const { data, error } = await supabase
    .from('agent_settings')
    .select('*')
    .order('agent_key')
  if (error) throw new Error(error.message)
  return (data ?? []) as AgentSettings[]
}

export async function listTemplates(): Promise<AgentTemplate[]> {
  const { data, error } = await supabase
    .from('agent_templates')
    .select('*')
    .order('agent_key')
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as AgentTemplate[]
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function postBossMessage(
  content: string,
): Promise<{ boss_message_id: string; routed_to: AgentKey[]; router_reason: string }> {
  const { data, error } = await supabase.functions.invoke<{
    boss_message_id: string
    routed_to: AgentKey[]
    router_reason: string
  }>('team-message', { method: 'POST', body: { content } })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

export async function runTemplate(
  templateId: string,
): Promise<{ message_id: string; content: string }> {
  const { data, error } = await supabase.functions.invoke<{
    message_id: string
    content: string
  }>('run-template', { method: 'POST', body: { template_id: templateId } })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Empty response')
  return data
}

export async function updateAgentSettings(
  agent_key: AgentKey,
  patch: Partial<Pick<AgentSettings, 'system_prompt' | 'custom_rules' | 'is_active' | 'avatar_url'>>,
): Promise<void> {
  const { error } = await supabase
    .from('agent_settings')
    .update(patch)
    .eq('agent_key', agent_key)
  if (error) throw new Error(error.message)
}

const AVATAR_BUCKET = 'brand-assets'
const AVATAR_PREFIX = 'agent-avatars'

export async function uploadAgentAvatar(agent_key: AgentKey, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${AVATAR_PREFIX}/${agent_key}-${Date.now()}.${ext}`
  const upload = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upload.error) throw new Error(upload.error.message)
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  await updateAgentSettings(agent_key, { avatar_url: data.publicUrl })
  return data.publicUrl
}

export async function clearAgentAvatar(agent_key: AgentKey): Promise<void> {
  await updateAgentSettings(agent_key, { avatar_url: null })
}

export async function updateTemplate(
  id: string,
  patch: Partial<Pick<AgentTemplate, 'name' | 'description' | 'prompt_template' | 'custom_rules' | 'cron_expr' | 'is_active'>>,
): Promise<void> {
  const { error } = await supabase
    .from('agent_templates')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Realtime subscription
// ---------------------------------------------------------------------------

export function subscribeToMessages(onChange: () => void): () => void {
  const channel = supabase
    .channel('team_messages_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'team_messages' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

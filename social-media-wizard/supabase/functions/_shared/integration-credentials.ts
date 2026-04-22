// Shared helper: resolve an API key for a given provider.
// Priority: edge-function env-var secret > integration_credentials DB row (UI-managed).
//
// Usage:
//   const apiKey = await getIntegrationKey(client, {
//     provider: 'weatherapi',
//     envVars: ['WEATHERAPI_KEY'],
//     credentialField: 'api_key',
//   })

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GetKeyOpts {
  provider: string
  envVars: string[]
  credentialField?: string
}

export async function getIntegrationKey(
  client: SupabaseClient,
  opts: GetKeyOpts,
): Promise<string> {
  for (const name of opts.envVars) {
    const v = Deno.env.get(name)
    if (v) return v
  }
  const field = opts.credentialField ?? 'api_key'
  const { data } = await client
    .from('integration_credentials')
    .select('credentials')
    .eq('provider', opts.provider)
    .maybeSingle<{ credentials: Record<string, string> }>()
  return data?.credentials?.[field] ?? ''
}

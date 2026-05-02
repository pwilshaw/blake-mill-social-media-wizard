// Shared Apify client. Resolves the API token via env var or the
// integration_credentials table (provider='apify', credential field 'token'),
// runs an actor synchronously and returns the dataset items.
//
// Apify URL pattern: https://api.apify.com/v2/acts/<owner>~<actor>/run-sync-get-dataset-items
// where the slash in the actor id is encoded as `~`.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getIntegrationKey } from './integration-credentials.ts'

const BASE = 'https://api.apify.com/v2'

export async function getApifyToken(client: SupabaseClient): Promise<string> {
  const token = await getIntegrationKey(client, {
    provider: 'apify',
    envVars: ['APIFY_TOKEN', 'APIFY_API_TOKEN'],
    credentialField: 'token',
  })
  if (!token) {
    throw new Error('Apify token not configured. Add it under /integrations or as an APIFY_TOKEN secret.')
  }
  return token
}

/** Convert "owner/actor" to Apify's URL form "owner~actor". */
export function actorPath(actorId: string): string {
  return actorId.replace('/', '~')
}

export interface ApifyRunOptions {
  /** Timeout for the run (seconds). Default 120. Apify max for sync runs is 300. */
  timeoutSecs?: number
  /** Memory size (MB). Default 1024. Affects cost. */
  memoryMbytes?: number
}

/**
 * Run an actor synchronously and return its default-dataset items.
 * Items shape varies per actor — caller knows what to expect.
 */
export async function runActor<T = unknown>(
  token: string,
  actorId: string,
  input: unknown,
  opts: ApifyRunOptions = {},
): Promise<T[]> {
  const params = new URLSearchParams({ token })
  if (opts.timeoutSecs) params.set('timeout', String(Math.min(300, opts.timeoutSecs)))
  if (opts.memoryMbytes) params.set('memory', String(opts.memoryMbytes))

  const url = `${BASE}/acts/${actorPath(actorId)}/run-sync-get-dataset-items?${params.toString()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify actor ${actorId} failed (HTTP ${res.status}): ${text.slice(0, 600)}`)
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error(`Apify actor ${actorId} returned non-array dataset: ${JSON.stringify(data).slice(0, 200)}`)
  }
  return data as T[]
}

// Refresh + cache Google OAuth access tokens for channel_accounts.
// Used by youtube-upload and google-ads-campaign before any Google API call.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SAFETY_WINDOW_MS = 5 * 60_000  // refresh if <5min remains

interface ChannelAccountRow {
  id: string
  platform: string
  account_id: string
  account_name: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string
}

export interface GoogleAccessToken {
  access_token: string
  channel_account: ChannelAccountRow
}

export async function getFreshGoogleToken(
  client: SupabaseClient,
  channel_account_id: string,
): Promise<GoogleAccessToken> {
  const { data, error } = await client
    .from('channel_accounts')
    .select('id, platform, account_id, account_name, access_token, refresh_token, token_expires_at')
    .eq('id', channel_account_id)
    .single<ChannelAccountRow>()
  if (error || !data) {
    throw new Error(`Channel account ${channel_account_id} not found: ${error?.message ?? ''}`)
  }

  const expiresAt = new Date(data.token_expires_at).getTime()
  if (expiresAt - Date.now() > SAFETY_WINDOW_MS) {
    return { access_token: data.access_token, channel_account: data }
  }

  if (!data.refresh_token) {
    throw new Error(
      `Google channel account ${data.account_name} has no refresh token. Reconnect it on /channels.`,
    )
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set as edge-function secrets.')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token refresh failed (HTTP ${res.status}): ${text}`)
  }
  const refreshed = (await res.json()) as { access_token: string; expires_in: number }

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await client
    .from('channel_accounts')
    .update({
      access_token: refreshed.access_token,
      token_expires_at: newExpiresAt,
    })
    .eq('id', data.id)

  return {
    access_token: refreshed.access_token,
    channel_account: { ...data, access_token: refreshed.access_token, token_expires_at: newExpiresAt },
  }
}

/** Find the active YouTube channel account, if any. */
export async function findActiveYouTubeAccount(
  client: SupabaseClient,
): Promise<ChannelAccountRow | null> {
  const { data } = await client
    .from('channel_accounts')
    .select('*')
    .eq('platform', 'youtube')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ChannelAccountRow>()
  return data ?? null
}

/** Find the active Google Ads channel account, if any. */
export async function findActiveGoogleAdsAccount(
  client: SupabaseClient,
): Promise<ChannelAccountRow | null> {
  const { data } = await client
    .from('channel_accounts')
    .select('*')
    .eq('platform', 'google_ads')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ChannelAccountRow>()
  return data ?? null
}

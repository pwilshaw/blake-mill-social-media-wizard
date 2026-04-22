// T050 — Event check cron Edge Function
// Fetches UK events from PredictHQ + Ticketmaster, matches to trigger keywords, creates campaigns.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getIntegrationKey } from '../_shared/integration-credentials.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface NormalisedEvent {
  id: string
  title: string
  category: string
  date: string
  source: 'predicthq' | 'ticketmaster'
}

interface TriggerRecord {
  id: string
  name: string
  trigger_type: string
  conditions: Record<string, unknown>
  matched_shirts: string[]
  content_template_id: string | null
  cooldown_hours: number
  is_active: boolean
  last_fired_at: string | null
}

function isOnCooldown(trigger: TriggerRecord): boolean {
  if (!trigger.last_fired_at) return false
  const lastFired = new Date(trigger.last_fired_at).getTime()
  const cooldownMs = trigger.cooldown_hours * 60 * 60 * 1000
  return Date.now() - lastFired < cooldownMs
}

function eventMatchesTrigger(event: NormalisedEvent, conditions: Record<string, unknown>): boolean {
  const keywords = Array.isArray(conditions.keywords) ? (conditions.keywords as string[]) : []
  if (keywords.length === 0) return false

  return keywords.some(
    (kw) =>
      event.title.toLowerCase().includes(kw.toLowerCase()) ||
      event.category.toLowerCase().includes(kw.toLowerCase()),
  )
}

async function fetchPredictHQEvents(apiToken: string): Promise<NormalisedEvent[]> {
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const params = new URLSearchParams({
    country: 'GB',
    'start.gte': today,
    'start.lte': future,
    limit: '50',
    sort: 'rank',
  })

  const res = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    console.error(`PredictHQ error: ${res.status} ${await res.text()}`)
    return []
  }

  const data = await res.json() as {
    results: Array<{
      id: string
      title: string
      category: string
      start: string
    }>
  }

  return (data.results ?? []).map((e) => ({
    id: `phq_${e.id}`,
    title: e.title,
    category: e.category,
    date: e.start.split('T')[0],
    source: 'predicthq' as const,
  }))
}

async function fetchTicketmasterEvents(apiKey: string): Promise<NormalisedEvent[]> {
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const params = new URLSearchParams({
    apikey: apiKey,
    countryCode: 'GB',
    startDateTime: `${today}T00:00:00Z`,
    endDateTime: `${future}T23:59:59Z`,
    size: '50',
    sort: 'relevance,desc',
  })

  const res = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
  )

  if (!res.ok) {
    console.error(`Ticketmaster error: ${res.status} ${await res.text()}`)
    return []
  }

  const data = await res.json() as {
    _embedded?: {
      events: Array<{
        id: string
        name: string
        classifications?: Array<{ segment?: { name: string } }>
        dates?: { start?: { localDate?: string } }
      }>
    }
  }

  const events = data._embedded?.events ?? []

  return events.map((e) => ({
    id: `tm_${e.id}`,
    title: e.name,
    category: e.classifications?.[0]?.segment?.name ?? 'general',
    date: e.dates?.start?.localDate ?? today,
    source: 'ticketmaster' as const,
  }))
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed — use POST' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const [predictHQToken, ticketmasterKey] = await Promise.all([
    getIntegrationKey(client, { provider: 'predicthq', envVars: ['PREDICTHQ_API_TOKEN'] }),
    getIntegrationKey(client, { provider: 'ticketmaster', envVars: ['TICKETMASTER_API_KEY'] }),
  ])

  if (!predictHQToken && !ticketmasterKey) {
    return jsonResponse(
      { error: 'No event provider configured. Add a PredictHQ or Ticketmaster key in Integrations.' },
      500,
    )
  }

  try {
    // -------------------------------------------------------
    // 1. Fetch events from both sources in parallel
    // -------------------------------------------------------
    const [predictHQEvents, ticketmasterEvents] = await Promise.all([
      predictHQToken ? fetchPredictHQEvents(predictHQToken) : Promise.resolve([]),
      ticketmasterKey ? fetchTicketmasterEvents(ticketmasterKey) : Promise.resolve([]),
    ])

    // Deduplicate by title+date (crude but effective across sources)
    const allEvents: NormalisedEvent[] = [...predictHQEvents, ...ticketmasterEvents]
    const seen = new Set<string>()
    const uniqueEvents = allEvents.filter((e) => {
      const key = `${e.title.toLowerCase()}|${e.date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // -------------------------------------------------------
    // 2. Load active event triggers
    // -------------------------------------------------------
    const { data: triggers, error: triggersError } = await client
      .from('contextual_triggers')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'event')

    if (triggersError) {
      return jsonResponse({ error: triggersError.message }, 500)
    }

    const activeTriggers = (triggers ?? []) as TriggerRecord[]

    // -------------------------------------------------------
    // 3. Match events to triggers
    // -------------------------------------------------------
    type TriggerMatch = {
      trigger: TriggerRecord
      events: NormalisedEvent[]
    }

    const matches: TriggerMatch[] = []

    for (const trigger of activeTriggers) {
      if (isOnCooldown(trigger)) continue

      const matched = uniqueEvents.filter((e) =>
        eventMatchesTrigger(e, trigger.conditions),
      )

      if (matched.length > 0) {
        matches.push({ trigger, events: matched })
      }
    }

    // -------------------------------------------------------
    // 4. Create campaigns for matched triggers
    // -------------------------------------------------------
    const createdCampaignIds: string[] = []

    for (const { trigger, events: matchedEvents } of matches) {
      // Use the earliest matched event date as the campaign start
      const sortedDates = matchedEvents
        .map((e) => e.date)
        .sort()
      const campaignName = `${trigger.name} — ${matchedEvents[0].title}`

      const { data: campaign, error: campaignError } = await client
        .from('campaigns')
        .insert({
          name: campaignName,
          status: 'draft',
          campaign_type: 'event_triggered',
          channels: [],
          target_segments: [],
          budget_spent: 0,
          auto_approved: false,
          trigger_rule_id: trigger.id,
          scheduled_start: sortedDates[0],
          scheduled_end: sortedDates[sortedDates.length - 1],
        })
        .select('id')
        .single()

      if (campaignError) {
        console.error(`Failed to create campaign for trigger ${trigger.id}:`, campaignError.message)
        continue
      }

      createdCampaignIds.push((campaign as { id: string }).id)

      // Link shirts to campaign
      if (trigger.matched_shirts.length > 0) {
        const shirtLinks = trigger.matched_shirts.map((shirtId, i) => ({
          campaign_id: (campaign as { id: string }).id,
          shirt_product_id: shirtId,
          is_primary: i === 0,
        }))

        await client.from('campaign_shirts').insert(shirtLinks)
      }

      // Update last_fired_at
      await client
        .from('contextual_triggers')
        .update({ last_fired_at: new Date().toISOString() })
        .eq('id', trigger.id)
    }

    // -------------------------------------------------------
    // 5. Return summary
    // -------------------------------------------------------
    return jsonResponse({
      events_fetched: {
        predicthq: predictHQEvents.length,
        ticketmaster: ticketmasterEvents.length,
        unique: uniqueEvents.length,
      },
      triggers_evaluated: activeTriggers.length,
      triggers_fired: matches.length,
      campaigns_created: createdCampaignIds.length,
      campaign_ids: createdCampaignIds,
      fired_trigger_names: matches.map((m) => m.trigger.name),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})

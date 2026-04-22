// T049 — Weather check cron Edge Function
// Fetches UK 7-day forecast, evaluates active weather triggers, creates campaigns for matches.

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

interface WeatherDay {
  date: string
  maxtemp_c: number
  mintemp_c: number
  avgtemp_c: number
  condition_text: string
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

function weatherMatchesTrigger(day: WeatherDay, conditions: Record<string, unknown>): boolean {
  const tempMin = typeof conditions.temp_min === 'number' ? conditions.temp_min : null
  const tempMax = typeof conditions.temp_max === 'number' ? conditions.temp_max : null
  const conditionKeyword = typeof conditions.condition === 'string' ? conditions.condition : null

  if (tempMin !== null && day.avgtemp_c < tempMin) return false
  if (tempMax !== null && day.avgtemp_c > tempMax) return false
  if (
    conditionKeyword &&
    !day.condition_text.toLowerCase().includes(conditionKeyword.toLowerCase())
  ) {
    return false
  }

  return true
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

  const weatherApiKey = await getIntegrationKey(client, {
    provider: 'weatherapi',
    envVars: ['WEATHERAPI_KEY'],
  })
  if (!weatherApiKey) {
    return jsonResponse({ error: 'WeatherAPI key not configured. Add one in Integrations.' }, 500)
  }

  try {
    // -------------------------------------------------------
    // 1. Fetch UK 7-day forecast from WeatherAPI
    // -------------------------------------------------------
    const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=London,UK&days=7&aqi=no&alerts=no`
    const weatherRes = await fetch(weatherUrl)

    if (!weatherRes.ok) {
      const text = await weatherRes.text()
      return jsonResponse({ error: `WeatherAPI error: ${text}` }, 502)
    }

    const weatherData = await weatherRes.json() as {
      forecast: {
        forecastday: Array<{
          date: string
          day: {
            maxtemp_c: number
            mintemp_c: number
            avgtemp_c: number
            condition: { text: string }
          }
        }>
      }
    }

    const forecast: WeatherDay[] = weatherData.forecast.forecastday.map((d) => ({
      date: d.date,
      maxtemp_c: d.day.maxtemp_c,
      mintemp_c: d.day.mintemp_c,
      avgtemp_c: d.day.avgtemp_c,
      condition_text: d.day.condition.text,
    }))

    // -------------------------------------------------------
    // 2. Load active weather triggers
    // -------------------------------------------------------
    const { data: triggers, error: triggersError } = await client
      .from('contextual_triggers')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'weather')

    if (triggersError) {
      return jsonResponse({ error: triggersError.message }, 500)
    }

    const activeTriggers = (triggers ?? []) as TriggerRecord[]

    // -------------------------------------------------------
    // 3. Evaluate each trigger against forecast
    // -------------------------------------------------------
    const firedTriggers: Array<{ trigger: TriggerRecord; matchedDates: string[] }> = []

    for (const trigger of activeTriggers) {
      if (isOnCooldown(trigger)) continue

      const matchedDates = forecast
        .filter((day) => weatherMatchesTrigger(day, trigger.conditions))
        .map((day) => day.date)

      if (matchedDates.length > 0) {
        firedTriggers.push({ trigger, matchedDates })
      }
    }

    // -------------------------------------------------------
    // 4. Create campaigns for matched triggers
    // -------------------------------------------------------
    const createdCampaignIds: string[] = []

    for (const { trigger, matchedDates } of firedTriggers) {
      const campaignName = `${trigger.name} — ${matchedDates[0]}`

      const { data: campaign, error: campaignError } = await client
        .from('campaigns')
        .insert({
          name: campaignName,
          status: 'draft',
          campaign_type: 'weather_triggered',
          channels: [],
          target_segments: [],
          budget_spent: 0,
          auto_approved: false,
          trigger_rule_id: trigger.id,
          scheduled_start: matchedDates[0],
          scheduled_end: matchedDates[matchedDates.length - 1],
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
      forecast_days: forecast.length,
      triggers_evaluated: activeTriggers.length,
      triggers_fired: firedTriggers.length,
      campaigns_created: createdCampaignIds.length,
      campaign_ids: createdCampaignIds,
      fired_trigger_names: firedTriggers.map((f) => f.trigger.name),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})

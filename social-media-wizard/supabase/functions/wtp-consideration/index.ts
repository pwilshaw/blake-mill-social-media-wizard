// WTP Conjoint — one simulated consideration.
// POST /functions/v1/wtp-consideration
//
// Body: {
//   system_message: string
//   product_name: string
//   pair: { pair_id, option_1, option_2, first_shown }
//   features: { id, label }[]
//   outside_option: string
// }
//
// Calls Claude Sonnet 4.6 at temperature=1.0 with a strict JSON-only response
// schema. Parses defensively. Always returns a well-shaped result so the
// frontend can continue through transient failures.

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

interface PairOption {
  price: number
  features: Record<string, boolean>
}

interface Body {
  system_message: string
  product_name: string
  pair: {
    pair_id: string
    option_1: PairOption
    option_2: PairOption
    first_shown: 1 | 2
  }
  features: { id: string; label: string }[]
  outside_option: string
}

function buildFeatureLine(opt: PairOption, features: { id: string; label: string }[]): string {
  if (features.length === 0) return '(no additional features)'
  return features
    .map((f) => `${f.label}: ${opt.features[f.id] ? 'Yes' : 'No'}`)
    .join(', ')
}

function buildUserPrompt(body: Body): string {
  const { pair, features, outside_option } = body
  const first = pair.first_shown === 1 ? pair.option_1 : pair.option_2
  const second = pair.first_shown === 1 ? pair.option_2 : pair.option_1

  return `You are browsing plan options. You see two options:

1. £${first.price}/mo — ${buildFeatureLine(first, features)}

2. £${second.price}/mo — ${buildFeatureLine(second, features)}

You also have the option to ${outside_option}.

Would you purchase either option? If so, which one?

Respond with ONLY valid JSON, no preamble, no markdown, matching:
{"choice":"option_1"|"option_2"|"outside","reason":"<one short sentence>"}

Where "option_1" refers to the first option shown above and "option_2" refers to the second.`
}

interface ClaudeChoice {
  choice: 'option_1' | 'option_2' | 'outside' | 'parse_error'
  reason: string | null
}

function parseClaudeResponse(raw: string): ClaudeChoice {
  const match = raw.match(/\{[\s\S]*?\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (parsed.choice === 'option_1' || parsed.choice === 'option_2' || parsed.choice === 'outside') {
        return {
          choice: parsed.choice,
          reason: typeof parsed.reason === 'string' ? parsed.reason : null,
        }
      }
    } catch {
      /* fall through */
    }
  }
  // String-match fallback
  const lower = raw.toLowerCase()
  if (/\boption[_\s-]*1\b/.test(lower)) return { choice: 'option_1', reason: null }
  if (/\boption[_\s-]*2\b/.test(lower)) return { choice: 'option_2', reason: null }
  if (/\bnot purchas|\bfree plan\b|\bcurrent setup\b|\boutside\b/.test(lower)) {
    return { choice: 'outside', reason: null }
  }
  return { choice: 'parse_error', reason: null }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const anthropicKey = await getIntegrationKey(client, {
    provider: 'anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
  })
  if (!anthropicKey) {
    return jsonResponse({ error: 'Anthropic API key not configured. Add one in Integrations.' }, 500)
  }

  let body: Body
  try {
    body = await req.json() as Body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.system_message || !body.pair || !Array.isArray(body.features)) {
    return jsonResponse({ error: 'system_message, pair, features are required' }, 422)
  }

  const started = Date.now()
  const userPrompt = buildUserPrompt(body)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        temperature: 1.0,
        system: body.system_message,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return jsonResponse({
        choice: 'parse_error',
        reason: null,
        raw_text: `Claude API error ${res.status}: ${errText}`,
        ms: Date.now() - started,
      })
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const raw_text = data.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = parseClaudeResponse(raw_text)

    return jsonResponse({
      choice: parsed.choice,
      reason: parsed.reason,
      raw_text,
      ms: Date.now() - started,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({
      choice: 'parse_error',
      reason: null,
      raw_text: `fetch error: ${message}`,
      ms: Date.now() - started,
    })
  }
})

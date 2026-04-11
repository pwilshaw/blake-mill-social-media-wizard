// T054 — Deno Edge Function: parse survey CSV and create/update CustomerSegment records
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// ----------------------------------------------------------------
// CSV parsing
// ----------------------------------------------------------------

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

// ----------------------------------------------------------------
// Field extraction helpers
// ----------------------------------------------------------------

function extractAgeRange(
  row: Record<string, string>,
  mappings: Array<{ csvHeader: string; mappedField: string | null }>
): string | null {
  const ageHeader = mappings.find((m) => m.mappedField === 'age')?.csvHeader
  const dobHeader = mappings.find((m) => m.mappedField === 'dob')?.csvHeader

  if (ageHeader && row[ageHeader]) {
    const age = parseInt(row[ageHeader], 10)
    if (!isNaN(age)) {
      const decade = Math.floor(age / 10) * 10
      return `${decade}–${decade + 9}`
    }
  }

  if (dobHeader && row[dobHeader]) {
    const dob = new Date(row[dobHeader])
    if (!isNaN(dob.getTime())) {
      const age = new Date().getFullYear() - dob.getFullYear()
      const decade = Math.floor(age / 10) * 10
      return `${decade}–${decade + 9}`
    }
  }

  return null
}

function extractStylePreference(
  row: Record<string, string>,
  mappings: Array<{ csvHeader: string; mappedField: string | null }>
): 'bold' | 'subtle' | 'mixed' | null {
  const header = mappings.find((m) => m.mappedField === 'boldness_score')?.csvHeader
  if (!header || !row[header]) return null

  const score = parseFloat(row[header])
  if (isNaN(score)) return null
  if (score <= 2) return 'subtle'
  if (score <= 3) return 'mixed'
  return 'bold'
}

function extractPurchaseIntent(
  row: Record<string, string>,
  mappings: Array<{ csvHeader: string; mappedField: string | null }>
): 'high' | 'medium' | 'low' | null {
  const header = mappings.find((m) => m.mappedField === 'purchase_intent')?.csvHeader
  if (!header || !row[header]) return null

  const raw = row[header].toLowerCase().trim()
  if (raw === 'high' || raw === '3') return 'high'
  if (raw === 'medium' || raw === 'mid' || raw === '2') return 'medium'
  if (raw === 'low' || raw === '1') return 'low'
  return null
}

function extractOccasions(
  row: Record<string, string>,
  mappings: Array<{ csvHeader: string; mappedField: string | null }>
): string[] {
  const header = mappings.find((m) => m.mappedField === 'wear_occasions')?.csvHeader
  if (!header || !row[header]) return []

  return row[header]
    .split(/[;|]/)
    .map((o) => o.trim())
    .filter((o) => o.length > 0)
}

// ----------------------------------------------------------------
// Handler
// ----------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const mappingsRaw = formData.get('mappings')

    if (!file || typeof file === 'string') {
      return jsonResponse({ error: 'CSV file required as form field "file"' }, 400)
    }

    const mappings: Array<{ csvHeader: string; mappedField: string | null }> = mappingsRaw
      ? JSON.parse(String(mappingsRaw))
      : []

    const csvText = await (file as Blob).text()
    const rows = parseCsv(csvText)

    if (rows.length === 0) {
      return jsonResponse({ segments_created: 0 })
    }

    // ----------------------------------------------------------------
    // Aggregate rows into segments by name field
    // ----------------------------------------------------------------

    const nameHeader = mappings.find((m) => m.mappedField === 'name')?.csvHeader

    // Each row may represent a respondent; group by style_preference + age_range
    // to create meaningful segments, or use the name column if present.
    const segmentMap = new Map<
      string,
      {
        name: string
        age_range: string | null
        style_preference: 'bold' | 'subtle' | 'mixed' | null
        purchase_intent: 'high' | 'medium' | 'low' | null
        purchase_occasions: Set<string>
        member_count: number
      }
    >()

    for (const row of rows) {
      const stylePref = extractStylePreference(row, mappings)
      const ageRange = extractAgeRange(row, mappings)
      const intent = extractPurchaseIntent(row, mappings)
      const occasions = extractOccasions(row, mappings)

      // Derive segment key and name
      let segmentName: string
      if (nameHeader && row[nameHeader]) {
        segmentName = row[nameHeader]
      } else {
        const parts: string[] = []
        if (ageRange) parts.push(ageRange)
        if (stylePref) parts.push(stylePref.charAt(0).toUpperCase() + stylePref.slice(1))
        segmentName = parts.length > 0 ? parts.join(' — ') : 'Survey Respondents'
      }

      const key = segmentName.toLowerCase()

      if (segmentMap.has(key)) {
        const existing = segmentMap.get(key)!
        existing.member_count += 1
        occasions.forEach((o) => existing.purchase_occasions.add(o))
        // Keep first non-null values for intent/style/age if not already set
        if (!existing.purchase_intent && intent) existing.purchase_intent = intent
        if (!existing.style_preference && stylePref) existing.style_preference = stylePref
        if (!existing.age_range && ageRange) existing.age_range = ageRange
      } else {
        segmentMap.set(key, {
          name: segmentName,
          age_range: ageRange,
          style_preference: stylePref,
          purchase_intent: intent,
          purchase_occasions: new Set(occasions),
          member_count: 1,
        })
      }
    }

    const records = Array.from(segmentMap.values()).map((s) => ({
      name: s.name,
      source: 'survey' as const,
      age_range: s.age_range,
      style_preference: s.style_preference,
      purchase_intent: s.purchase_intent,
      purchase_occasions: Array.from(s.purchase_occasions),
      member_count: s.member_count,
      klaviyo_segment_id: null,
      last_synced_at: new Date().toISOString(),
    }))

    const { error } = await client
      .from('customer_segments')
      .upsert(records, { onConflict: 'name,source' })

    if (error) return jsonResponse({ error: error.message }, 500)

    return jsonResponse({ segments_created: records.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})

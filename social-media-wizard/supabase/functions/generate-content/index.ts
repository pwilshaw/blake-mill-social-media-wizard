// T033 — Generate Content Edge Function (DEPTH Method)
// POST /functions/v1/generate-content
// Body: { campaign_id: string, shirt_ids: string[], platform: string, context_overrides?: object }

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShirtProduct {
  id: string
  name: string
  description: string | null
  price: number
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock'
  images: string[]
  style_boldness: number | null
  colour_family: string | null
  contextual_tags: string[]
}

interface UncertainClaim {
  claim: string
  explanation: string
}

interface DepthScores {
  clarity: number
  persuasion: number
  actionability: number
  accuracy: number
}

interface ContentVariantInsert {
  campaign_id: string
  platform: string
  copy_text: string
  hashtags: string[]
  call_to_action: string | null
  approval_status: 'pending'
  depth_score_clarity: number
  depth_score_persuasion: number
  depth_score_actionability: number
  depth_score_accuracy: number
  uncertain_claims: UncertainClaim[]
}

// ---------------------------------------------------------------------------
// Platform character limits
// ---------------------------------------------------------------------------

const PLATFORM_LIMITS: Record<string, { copy: number; hashtags: number }> = {
  facebook: { copy: 2200, hashtags: 10 },
  instagram: { copy: 2200, hashtags: 30 },
  linkedin: { copy: 3000, hashtags: 5 },
  tiktok: { copy: 2200, hashtags: 20 },
}

// ---------------------------------------------------------------------------
// DEPTH method prompt construction (inlined — cannot import from src/)
// ---------------------------------------------------------------------------

function buildDepthPrompt(
  shirt: ShirtProduct,
  platform: string,
  contextOverrides: Record<string, unknown>,
): string {
  const limits = PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.facebook
  const tags = shirt.contextual_tags.length > 0 ? shirt.contextual_tags.join(', ') : 'none'
  const boldness = shirt.style_boldness != null
    ? `${shirt.style_boldness}/5 (1 = very subtle, 5 = very bold)`
    : 'not specified'
  const contextNote = Object.keys(contextOverrides).length > 0
    ? `\nAdditional context: ${JSON.stringify(contextOverrides)}`
    : ''

  return `You are generating social media content for Blake Mill, an independent men's shirt brand known for wit, cultural awareness, and irreverent but tasteful design.

## The DEPTH Method

You must apply the DEPTH method when generating this content. Work through all five stages:

**D — Define Multiple Perspectives**
Generate the copy from three expert perspectives simultaneously:
1. Behavioural Psychologist: Focus on psychological triggers (social proof, identity, belonging, aspiration). Define the emotional hook and the core desire this shirt satisfies.
2. Direct Response Copywriter: Focus on conversion. Clear benefit, compelling offer, urgent or specific call to action. No fluff.
3. Data Analyst: Ground the copy in specifics — price, product name, concrete details. Avoid vague superlatives. Flag anything that cannot be verified as UNCERTAIN.

**E — Establish Success Metrics**
Before writing, define what "good" looks like for this post:
- Target CTR for ${platform}: what level of engagement would count as a success?
- Which psychological trigger should drive clicks?
- What is the single most important action the reader should take?

**P — Provide Context Layers**
Consider:
- Platform: ${platform} (max copy: ${limits.copy} chars, max hashtags: ${limits.hashtags})
- Product: "${shirt.name}" — £${shirt.price}
- Description: ${shirt.description ?? 'Not available'}
- Style boldness: ${boldness}
- Colour family: ${shirt.colour_family ?? 'not specified'}
- Contextual tags: ${tags}${contextNote}

**T — Task Breakdown**
Produce the following outputs:
1. copy_text: The post copy (within character limit for ${platform})
2. hashtags: An array of relevant hashtags (max ${limits.hashtags}, no # prefix)
3. call_to_action: A single short CTA string (e.g. "Shop now", "Find yours today") or null if not appropriate
4. uncertain_claims: An array of { "claim": string, "explanation": string } for any factual claims you cannot verify (e.g. "best shirt for summer" is subjective — flag it)

**H — Human Feedback Loop (Self-Assessment)**
After generating the content, score yourself honestly (1–10) on:
- clarity: How clear and easy to understand is the message?
- persuasion: How compelling and emotionally engaging is it?
- actionability: How clearly does it direct the reader to take an action?
- accuracy: How factually grounded and honest is the content?

## Output Format

Return ONLY valid JSON. No markdown, no explanation, no preamble:

{
  "copy_text": "...",
  "hashtags": ["hashtag1", "hashtag2"],
  "call_to_action": "...",
  "uncertain_claims": [
    { "claim": "...", "explanation": "..." }
  ],
  "depth_scores": {
    "clarity": 8,
    "persuasion": 7,
    "actionability": 9,
    "accuracy": 10
  }
}

Generate high-quality content now. Be witty, be direct, be Blake Mill.`
}

function buildImprovementPrompt(
  previous: {
    copy_text: string
    hashtags: string[]
    call_to_action: string | null
    uncertain_claims: UncertainClaim[]
    depth_scores: DepthScores
  },
  shirt: ShirtProduct,
  platform: string,
): string {
  const weakDimensions = Object.entries(previous.depth_scores)
    .filter(([, score]) => score < 8)
    .map(([dim, score]) => `${dim} (current score: ${score}/10)`)
    .join(', ')

  const limits = PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.facebook

  return `You previously generated social media content for Blake Mill that scored below 8 on the following DEPTH dimensions: ${weakDimensions}.

Here is the previous output:
${JSON.stringify(previous, null, 2)}

Product: "${shirt.name}" | Platform: ${platform} (max copy: ${limits.copy} chars, max hashtags: ${limits.hashtags})

Please rewrite to improve the weak dimensions while keeping or improving the strong ones. Ensure every dimension scores 8 or above in the revised version.

Return ONLY valid JSON in this exact format:

{
  "copy_text": "...",
  "hashtags": ["hashtag1", "hashtag2"],
  "call_to_action": "...",
  "uncertain_claims": [
    { "claim": "...", "explanation": "..." }
  ],
  "depth_scores": {
    "clarity": 9,
    "persuasion": 9,
    "actionability": 9,
    "accuracy": 10
  }
}`
}

// ---------------------------------------------------------------------------
// Claude API call
// ---------------------------------------------------------------------------

interface ClaudeGeneratedContent {
  copy_text: string
  hashtags: string[]
  call_to_action: string | null
  uncertain_claims: UncertainClaim[]
  depth_scores: DepthScores
}

async function callClaude(prompt: string, anthropicKey: string): Promise<ClaudeGeneratedContent> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errorText}`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>
  }

  const rawText = data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  // Strip any accidental markdown code fences before parsing
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: ClaudeGeneratedContent
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${cleaned.slice(0, 200)}`)
  }

  // Validate required fields
  if (
    typeof parsed.copy_text !== 'string' ||
    !Array.isArray(parsed.hashtags) ||
    !parsed.depth_scores
  ) {
    throw new Error(`Unexpected Claude response shape: ${cleaned.slice(0, 200)}`)
  }

  return parsed
}

// ---------------------------------------------------------------------------
// Score guard: returns true if all DEPTH dimensions are ≥ 8
// ---------------------------------------------------------------------------

function allScoresMeetThreshold(scores: DepthScores, threshold = 8): boolean {
  return (
    scores.clarity >= threshold &&
    scores.persuasion >= threshold &&
    scores.actionability >= threshold &&
    scores.accuracy >= threshold
  )
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!anthropicKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  // Parse body
  let body: {
    campaign_id: string
    shirt_ids: string[]
    platform: string
    context_overrides?: Record<string, unknown>
  }

  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { campaign_id, shirt_ids, platform, context_overrides = {} } = body

  // Input validation
  if (!campaign_id || typeof campaign_id !== 'string') {
    return jsonResponse({ error: 'campaign_id is required' }, 422)
  }
  if (!Array.isArray(shirt_ids) || shirt_ids.length === 0) {
    return jsonResponse({ error: 'shirt_ids must be a non-empty array' }, 422)
  }
  if (!platform || typeof platform !== 'string') {
    return jsonResponse({ error: 'platform is required' }, 422)
  }
  if (!PLATFORM_LIMITS[platform]) {
    return jsonResponse(
      { error: `Unsupported platform "${platform}". Must be one of: ${Object.keys(PLATFORM_LIMITS).join(', ')}` },
      422,
    )
  }

  // Verify campaign exists
  const { data: campaign, error: campaignError } = await client
    .from('campaigns')
    .select('id, name')
    .eq('id', campaign_id)
    .single()

  if (campaignError || !campaign) {
    return jsonResponse({ error: 'Campaign not found' }, 404)
  }

  // Fetch all requested shirts and validate stock status
  const { data: shirts, error: shirtsError } = await client
    .from('shirt_products')
    .select('id, name, description, price, stock_status, images, style_boldness, colour_family, contextual_tags')
    .in('id', shirt_ids)

  if (shirtsError) {
    return jsonResponse({ error: shirtsError.message }, 500)
  }

  // Check all requested IDs were found
  const foundIds = new Set((shirts ?? []).map((s: ShirtProduct) => s.id))
  const missingIds = shirt_ids.filter((id) => !foundIds.has(id))
  if (missingIds.length > 0) {
    return jsonResponse(
      { error: `Shirt(s) not found: ${missingIds.join(', ')}` },
      404,
    )
  }

  // FR-018: Never promote out-of-stock products
  const outOfStock = (shirts ?? []).filter(
    (s: ShirtProduct) => s.stock_status === 'out_of_stock',
  )
  if (outOfStock.length > 0) {
    return jsonResponse(
      {
        error: 'Cannot generate content for out-of-stock products',
        out_of_stock_shirts: outOfStock.map((s: ShirtProduct) => ({
          id: s.id,
          name: s.name,
          stock_status: s.stock_status,
        })),
      },
      400,
    )
  }

  // Generate content for each shirt
  const createdVariants: ContentVariantInsert[] = []
  const generationErrors: Array<{ shirt_id: string; shirt_name: string; error: string }> = []

  for (const shirt of shirts as ShirtProduct[]) {
    try {
      // First pass: generate content with DEPTH method
      const firstPassPrompt = buildDepthPrompt(shirt, platform, context_overrides)
      let generated = await callClaude(firstPassPrompt, anthropicKey)

      // Second pass: improve any dimension scoring below 8
      if (!allScoresMeetThreshold(generated.depth_scores)) {
        const improvementPrompt = buildImprovementPrompt(generated, shirt, platform)
        const improved = await callClaude(improvementPrompt, anthropicKey)

        // Use improved version; if it's still below threshold it's still the best we have
        generated = improved
      }

      createdVariants.push({
        campaign_id,
        platform,
        copy_text: generated.copy_text,
        hashtags: generated.hashtags,
        call_to_action: generated.call_to_action ?? null,
        approval_status: 'pending',
        depth_score_clarity: Math.min(10, Math.max(1, Math.round(generated.depth_scores.clarity))),
        depth_score_persuasion: Math.min(10, Math.max(1, Math.round(generated.depth_scores.persuasion))),
        depth_score_actionability: Math.min(10, Math.max(1, Math.round(generated.depth_scores.actionability))),
        depth_score_accuracy: Math.min(10, Math.max(1, Math.round(generated.depth_scores.accuracy))),
        uncertain_claims: generated.uncertain_claims ?? [],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      generationErrors.push({ shirt_id: shirt.id, shirt_name: shirt.name, error: message })
    }
  }

  if (createdVariants.length === 0) {
    return jsonResponse(
      {
        error: 'Content generation failed for all shirts',
        details: generationErrors,
      },
      500,
    )
  }

  // Persist all successfully generated variants
  const { data: inserted, error: insertError } = await client
    .from('content_variants')
    .insert(createdVariants)
    .select()

  if (insertError) {
    return jsonResponse({ error: insertError.message }, 500)
  }

  return jsonResponse(
    {
      variants: inserted,
      generation_errors: generationErrors.length > 0 ? generationErrors : undefined,
    },
    201,
  )
})

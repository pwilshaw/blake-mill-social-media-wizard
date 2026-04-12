// T035 — Content Variants Edge Function
// GET  /functions/v1/content-variants?campaign_id=<uuid>&approval_status=<status>
// PATCH /functions/v1/content-variants?id=<uuid>  Body: { approval_status: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Valid approval_status values (mirrors the DB enum)
// ---------------------------------------------------------------------------

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'

const VALID_APPROVAL_STATUSES: ApprovalStatus[] = [
  'pending',
  'approved',
  'rejected',
  'revision_requested',
]

// ---------------------------------------------------------------------------
// Allowed status transitions
//
// Rules (derived from spec):
//   pending           → approved | rejected | revision_requested
//   revision_requested → pending | approved | rejected
//   approved          → rejected | revision_requested        (owner can change mind)
//   rejected          → pending | approved | revision_requested (can be reconsidered)
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  pending: ['approved', 'rejected', 'revision_requested'],
  revision_requested: ['pending', 'approved', 'rejected'],
  approved: ['rejected', 'revision_requested'],
  rejected: ['pending', 'approved', 'revision_requested'],
}

function isValidTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return typeof value === 'string' && VALID_APPROVAL_STATUSES.includes(value as ApprovalStatus)
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  try {
    // -----------------------------------------------------------------------
    // GET /content-variants
    //   ?campaign_id=<uuid>        — filter by campaign (optional)
    //   ?approval_status=<status>  — filter by approval status (optional)
    // -----------------------------------------------------------------------
    if (req.method === 'GET') {
      const campaignId = url.searchParams.get('campaign_id')
      const approvalStatus = url.searchParams.get('approval_status')

      // Validate approval_status filter if provided
      if (approvalStatus !== null && !isApprovalStatus(approvalStatus)) {
        return jsonResponse(
          {
            error: `Invalid approval_status filter "${approvalStatus}". Must be one of: ${VALID_APPROVAL_STATUSES.join(', ')}`,
          },
          400,
        )
      }

      let query = client
        .from('content_variants')
        .select('*')
        .order('created_at', { ascending: false })

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      if (approvalStatus) {
        query = query.eq('approval_status', approvalStatus)
      }

      const { data, error } = await query

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -----------------------------------------------------------------------
    // PATCH /content-variants?id=<uuid>
    //   Body: { approval_status: "approved" | "rejected" | "revision_requested" | "pending" }
    // -----------------------------------------------------------------------
    if (req.method === 'PATCH') {
      if (!id) {
        return jsonResponse({ error: 'id query param is required' }, 400)
      }

      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      const { approval_status } = body

      if (!isApprovalStatus(approval_status)) {
        return jsonResponse(
          {
            error: `Invalid approval_status "${approval_status}". Must be one of: ${VALID_APPROVAL_STATUSES.join(', ')}`,
          },
          422,
        )
      }

      // Fetch the current variant to validate the transition
      const { data: current, error: fetchError } = await client
        .from('content_variants')
        .select('id, approval_status')
        .eq('id', id)
        .single()

      if (fetchError) {
        const httpStatus = fetchError.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: fetchError.message }, httpStatus)
      }

      const currentStatus = current.approval_status as ApprovalStatus

      // Guard: reject invalid state transitions
      if (!isValidTransition(currentStatus, approval_status)) {
        return jsonResponse(
          {
            error: `Invalid status transition: "${currentStatus}" → "${approval_status}"`,
            current_status: currentStatus,
            requested_status: approval_status,
            allowed_from_current: ALLOWED_TRANSITIONS[currentStatus],
          },
          422,
        )
      }

      // Apply the update
      const { data: updated, error: updateError } = await client
        .from('content_variants')
        .update({ approval_status })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        const httpStatus = updateError.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: updateError.message }, httpStatus)
      }

      return jsonResponse(updated)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})

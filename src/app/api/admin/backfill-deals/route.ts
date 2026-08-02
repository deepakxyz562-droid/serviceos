/**
 * POST /api/admin/backfill-deals
 * ==============================
 *
 * Admin/Owner endpoint to backfill Deals for Leads that are missing them.
 * Calls `ensureDealsForTenant(tenantId)` which:
 *   1. Finds all non-deleted Leads for the tenant.
 *   2. Finds all `leadId`s that already have a Deal.
 *   3. Creates a Deal for each Lead that doesn't have one (idempotent —
 *      safe to call repeatedly).
 *
 * AUTHORIZATION
 * -------------
 *   - `owner`, `admin`, or `superadmin` roles may call this endpoint.
 *   - Non-superadmins can ONLY backfill their own tenant (the
 *     `tenantId` is taken from their auth session, never from the
 *     request body or query — prevents cross-tenant abuse).
 *   - Superadmins may pass `?tenantId=xxx` to backfill a specific
 *     tenant (e.g. for support / migration purposes).
 *
 * RESPONSE
 * --------
 *   200 OK:  { success: true, created: <n>, skipped: <n>, tenantId: "<id>" }
 *   400 Bad Request:  { error: "No tenantId available for backfill" }
 *   401 Unauthorized: { error: "Authentication required" }
 *   403 Forbidden:    { error: "Insufficient permissions" }
 *
 * SUPABASE SAFETY
 * ---------------
 * Delegates to `ensureDealsForTenant`, which uses only `findMany` +
 * `create` (no compound-unique upsert, no raw SQL).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { ensureDealsForTenant } from '@/lib/lead-deal-sync'

// Roles allowed to invoke the backfill. Mirrors the role set used by the
// other admin endpoints (`/api/admin/*`) and the tenant settings routes.
const ALLOWED_ROLES = new Set(['owner', 'admin', 'superadmin'])

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────────
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    // ─── Authorization ───────────────────────────────────────────────
    // Allow owner / admin / superadmin. Reject employees, customers,
    // and any other role outright — backfill is a tenant-admin action.
    if (!ALLOWED_ROLES.has(authUser.role)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          message: 'Only owner, admin, or superadmin roles may backfill Deals.',
        },
        { status: 403 },
      )
    }

    // ─── Tenant resolution ──────────────────────────────────────────
    // Non-superadmins ALWAYS backfill their own tenant (from the auth
    // session). Superadmins may override with `?tenantId=xxx` to backfill
    // a specific tenant (support / migration use case). We never trust a
    // `tenantId` from the request body for non-superadmins.
    let tenantId: string | null = null

    if (authUser.isSuperAdmin) {
      const queryTenantId = request.nextUrl.searchParams.get('tenantId')
      if (queryTenantId && typeof queryTenantId === 'string') {
        tenantId = queryTenantId
      } else {
        tenantId = authUser.tenantId
      }
    } else {
      tenantId = authUser.tenantId
    }

    if (!tenantId) {
      return NextResponse.json(
        {
          error: 'No tenantId available for backfill',
          message:
            authUser.isSuperAdmin
              ? 'Superadmin must pass ?tenantId=xxx to specify the tenant to backfill.'
              : 'Your account is not associated with a tenant.',
        },
        { status: 400 },
      )
    }

    // ─── Backfill ────────────────────────────────────────────────────
    // `ensureDealsForTenant` is idempotent — safe to call repeatedly.
    // It never throws (catches all errors internally and returns partial
    // counts), but we wrap in try/catch as a final safety net so a
    // Prisma connection error never surfaces as a 500 to the caller.
    let result: { created: number; skipped: number }
    try {
      result = await ensureDealsForTenant(tenantId)
    } catch (err) {
      console.error('[BackfillDeals] ensureDealsForTenant threw:', err)
      return NextResponse.json(
        {
          success: false,
          error: 'Backfill failed',
          message: err instanceof Error ? err.message : 'Unknown error',
          tenantId,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      tenantId,
    })
  } catch (error) {
    console.error('[BackfillDeals] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to backfill deals' },
      { status: 500 },
    )
  }
}

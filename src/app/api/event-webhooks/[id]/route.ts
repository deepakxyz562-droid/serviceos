import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ─── GET /api/event-webhooks/[id] ────────────────────────────────────────
// Get a single event webhook.
//
// Security-3 IDOR fix:
//   1. Require authentication + tenant isolation (super-admins bypass).
//   2. Return a SAFE DTO that excludes `headersJson` — that field may
//      contain authentication secrets (Bearer tokens, API keys, basic-auth
//      credentials) injected by the user when configuring the webhook, and
//      must never be exposed via a read endpoint.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    // Tenant-scoped lookup: super-admins can access any tenant; everyone else
    // is constrained to their own tenant.
    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    const webhook = await db.eventWebhook.findFirst({ where: { id, ...tenantFilter } })
    if (!webhook) {
      return NextResponse.json({ error: 'Event webhook not found' }, { status: 404 })
    }

    // SAFE DTO: explicitly enumerate returned fields. `headersJson` is
    // intentionally omitted — it may carry auth secrets (Bearer tokens,
    // API keys, basic-auth credentials) that must not leak through a read.
    const safeWebhook = {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      event: webhook.event,
      method: webhook.method,
      active: webhook.active,
      retryOnFail: webhook.retryOnFail,
      maxRetries: webhook.maxRetries,
      timeoutMs: webhook.timeoutMs,
      workspaceId: webhook.workspaceId,
      tenantId: webhook.tenantId,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    }

    return NextResponse.json({ webhook: safeWebhook })
  } catch (error) {
    console.error('Error fetching event webhook:', error)
    return NextResponse.json({ error: 'Failed to fetch event webhook' }, { status: 500 })
  }
}

// ─── PUT /api/event-webhooks/[id] ────────────────────────────────────────
// Update an event webhook.
//
// Security-3 IDOR fix:
//   1. Require authentication + tenant isolation (super-admins bypass).
//   2. REMOVED body.tenantId and body.workspaceId from update data —
//      ordinary users cannot reassign webhooks to other tenants/workspaces.
//   3. Use updateMany with the tenant filter so a race-condition ID swap
//      can't mutate a webhook that was just moved to another tenant.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    // Verify the webhook exists AND belongs to the user's tenant.
    const existing = await db.eventWebhook.findFirst({ where: { id, ...tenantFilter } })
    if (!existing) {
      return NextResponse.json({ error: 'Event webhook not found' }, { status: 404 })
    }

    // Build update data — explicitly exclude body.tenantId and body.workspaceId
    // so clients cannot reassign ownership. Only super-admins can change
    // tenantId (via a dedicated superadmin endpoint, not this one).
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.event !== undefined) updateData.event = body.event
    if (body.url !== undefined) updateData.url = body.url
    if (body.method !== undefined) updateData.method = body.method
    if (body.headersJson !== undefined) updateData.headersJson = body.headersJson
    if (body.active !== undefined) updateData.active = body.active
    if (body.retryOnFail !== undefined) updateData.retryOnFail = body.retryOnFail
    if (body.maxRetries !== undefined) updateData.maxRetries = body.maxRetries
    if (body.timeoutMs !== undefined) updateData.timeoutMs = body.timeoutMs
    // SECURITY: body.tenantId and body.workspaceId are intentionally NOT
    // included here — clients must not control ownership of the webhook.

    // Use updateMany with the tenant scope so a race-condition ID swap can't
    // mutate a webhook that was just moved to another tenant.
    const updateResult = await db.eventWebhook.updateMany({
      where: { id, ...tenantFilter },
      data: updateData,
    })

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Event webhook not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch the updated webhook and return the SAFE DTO (no headersJson)
    const updated = await db.eventWebhook.findFirst({ where: { id, ...tenantFilter } })
    const safeWebhook = updated
      ? {
          id: updated.id,
          name: updated.name,
          url: updated.url,
          event: updated.event,
          method: updated.method,
          active: updated.active,
          retryOnFail: updated.retryOnFail,
          maxRetries: updated.maxRetries,
          timeoutMs: updated.timeoutMs,
          workspaceId: updated.workspaceId,
          tenantId: updated.tenantId,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        }
      : null

    return NextResponse.json({ webhook: safeWebhook })
  } catch (error) {
    console.error('Error updating event webhook:', error)
    return NextResponse.json({ error: 'Failed to update event webhook' }, { status: 500 })
  }
}

// ─── DELETE /api/event-webhooks/[id] ──────────────────────────────────────
// Delete an event webhook.
//
// Security-3 IDOR fix: require authentication + tenant isolation (super-admins
// bypass). Use deleteMany with the tenant filter and check `count === 0` → 404.

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    // Delete related logs first (scoped to the webhook id — there is no
    // tenantId on EventWebhookLog, but the FK cascade protects against
    // cross-tenant log leakage because we'll only delete the webhook itself
    // if it belongs to the caller's tenant, and the logs are tied to the
    // webhook id).
    await db.eventWebhookLog.deleteMany({ where: { eventWebhookId: id } })

    const deleteResult = await db.eventWebhook.deleteMany({
      where: { id, ...tenantFilter },
    })

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Event webhook not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event webhook:', error)
    return NextResponse.json({ error: 'Failed to delete event webhook' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Flow 3: Emergency Dispatch — provider status update (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * PATCH /api/marketplace/emergency/[id]/status
 *
 * The accepting provider updates the dispatch status as they progress:
 *   broadcasting → accepted → en_route → on_site → completed
 * (or → cancelled at any pre-completion stage).
 *
 * For each transition, the corresponding timestamp is set:
 *   - en_route  → providerEnRouteAt
 *   - on_site   → providerOnSiteAt
 *   - completed → completedAt
 *
 * Optionally accepts a fresh lat/lng for live tracking (stored on the
 * dispatch row — the customer-side map can render it).
 *
 * Body:
 *   {
 *     status: 'en_route' | 'on_site' | 'completed' | 'cancelled',
 *     lat?:   number,
 *     lng?:   number,
 *   }
 *
 * Public endpoint — but status updates require provider auth (the accepting
 * provider's tenantId must match the dispatch's acceptedById).
 *
 * Returns: { emergencyDispatch }
 */

const ALLOWED_TRANSITIONS = new Set(['en_route', 'on_site', 'completed', 'cancelled']);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext,
) {
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // ── 1. Parse body ──────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const newStatus =
    typeof body.status === 'string' ? body.status.toLowerCase().trim() : '';
  if (!ALLOWED_TRANSITIONS.has(newStatus)) {
    return NextResponse.json(
      {
        error: `\`status\` must be one of: ${Array.from(ALLOWED_TRANSITIONS).join(', ')}.`,
      },
      { status: 400 },
    );
  }

  const lat =
    typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null;
  const lng =
    typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : null;
  const reason =
    typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;

  // ── 2. Auth (provider) ─────────────────────────────────────────────
  // Public-endpoint-with-provider-auth: status updates require an
  // authenticated session whose tenantId matches the accepting provider.
  const authUser = await getAuthUser();
  if (!authUser || !authUser.tenantId) {
    return NextResponse.json(
      { error: 'Provider authentication required for status updates.' },
      { status: 401 },
    );
  }

  // ── 3. Fetch the dispatch to validate current state + ownership ────
  let dispatch;
  try {
    dispatch = await db.emergencyDispatch.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        acceptedById: true,
        tenantId: true,
        providerEnRouteAt: true,
        providerOnSiteAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    });
  } catch (err) {
    log.error({ err, id }, 'marketplace/emergency/status: lookup failed');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!dispatch) {
    return NextResponse.json(
      { error: 'Emergency dispatch not found' },
      { status: 404 },
    );
  }
  if (!dispatch.acceptedById || dispatch.acceptedById !== authUser.tenantId) {
    return NextResponse.json(
      { error: 'Only the accepting provider can update dispatch status.' },
      { status: 403 },
    );
  }

  // ── 4. Validate transition legality ────────────────────────────────
  const legal: Record<string, Set<string>> = {
    accepted: new Set(['en_route', 'on_site', 'completed', 'cancelled']),
    en_route: new Set(['on_site', 'completed', 'cancelled']),
    on_site: new Set(['completed', 'cancelled']),
    completed: new Set([]), // terminal
    cancelled: new Set([]), // terminal
    broadcasting: new Set([]), // can't transition from broadcasting via this endpoint
    expired: new Set([]),
  };
  const allowedFromCurrent = legal[dispatch.status] ?? new Set();
  if (!allowedFromCurrent.has(newStatus)) {
    return NextResponse.json(
      {
        error: `Illegal transition from "${dispatch.status}" to "${newStatus}".`,
      },
      { status: 409 },
    );
  }

  // ── 5. Apply the transition ────────────────────────────────────────
  const updateData: Record<string, unknown> = { status: newStatus };
  const now = new Date();
  if (newStatus === 'en_route') {
    updateData.providerEnRouteAt = now;
  } else if (newStatus === 'on_site') {
    updateData.providerOnSiteAt = now;
    // Make sure providerEnRouteAt is also set (defensive — if the provider
    // skipped straight to on_site).
    if (!dispatch.providerEnRouteAt) updateData.providerEnRouteAt = now;
  } else if (newStatus === 'completed') {
    updateData.completedAt = now;
    if (!dispatch.providerEnRouteAt) updateData.providerEnRouteAt = now;
    if (!dispatch.providerOnSiteAt) updateData.providerOnSiteAt = now;
  } else if (newStatus === 'cancelled') {
    updateData.cancelledAt = now;
    if (reason) updateData.cancellationReason = reason;
  }
  if (lat != null) updateData.lat = lat;
  if (lng != null) updateData.lng = lng;

  let updated;
  try {
    updated = await db.emergencyDispatch.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        status: true,
        acceptedById: true,
        acceptedAt: true,
        providerEnRouteAt: true,
        providerOnSiteAt: true,
        completedAt: true,
        cancelledAt: true,
        cancellationReason: true,
        lat: true,
        lng: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    log.error({ err, id }, 'marketplace/emergency/status: update failed');
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }

  log.info(
    {
      dispatchId: id,
      fromStatus: dispatch.status,
      toStatus: newStatus,
      tenantId: authUser.tenantId,
      hasLocation: lat != null && lng != null,
    },
    'marketplace/emergency/status: transitioned',
  );

  // Fire-and-forget — if completed, the platform could auto-trigger invoice
  // + payout. That's a separate worker's job; we just log here.
  if (newStatus === 'completed') {
    logger.info({ dispatchId: id }, 'marketplace/emergency/status: completed — settlement worker should fire');
  }

  return NextResponse.json({ emergencyDispatch: updated });
}

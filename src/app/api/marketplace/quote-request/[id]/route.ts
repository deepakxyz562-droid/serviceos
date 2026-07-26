import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Flow 2: Quote Request — get / patch (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET    /api/marketplace/quote-request/[id]    — get a job request; increments viewCount
 * PATCH  /api/marketplace/quote-request/[id]    — update (cancel, expire)
 *
 * Public endpoint. PATCH is intentionally permissive (no auth) because the
 * marketplace customer is not an authenticated user; we rely on the customer
 * having the opaque jobRequestId (which they received in their original
 * request response). The body must include `action: 'cancel' | 'expire'` or
 * explicit `status` field.
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
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

  try {
    // Fetch + increment viewCount atomically.
    const jobRequest = await db.jobRequest.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        quotes: {
          select: {
            id: true,
            title: true,
            total: true,
            currency: true,
            validUntil: true,
            status: true,
            tenantId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    log.info({ jobRequestId: id, status: jobRequest.status }, 'marketplace/quote-request: fetched');
    return NextResponse.json({ jobRequest });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('RecordNotFound') || msg.includes('P2025')) {
      return NextResponse.json({ error: 'Job request not found' }, { status: 404 });
    }
    log.error({ err, id }, 'marketplace/quote-request: fetch failed');
    return NextResponse.json({ error: 'Failed to fetch job request' }, { status: 500 });
  }
}

const ALLOWED_ACTIONS = new Set(['cancel', 'expire']);
const ALLOWED_STATUS = new Set(['open', 'quoted', 'accepted', 'expired', 'cancelled', 'closed']);

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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action =
    typeof body.action === 'string' ? body.action.toLowerCase().trim() : null;
  const explicitStatus =
    typeof body.status === 'string' ? body.status.toLowerCase().trim() : null;
  const reason =
    typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;

  // Resolve the new status from action OR explicit status.
  let newStatus: string | null = null;
  if (action && ALLOWED_ACTIONS.has(action)) {
    newStatus = action === 'cancel' ? 'cancelled' : 'expired';
  } else if (explicitStatus && ALLOWED_STATUS.has(explicitStatus)) {
    newStatus = explicitStatus;
  }

  if (!newStatus) {
    return NextResponse.json(
      {
        error:
          'Provide `action: "cancel" | "expire"` or a valid `status` (open | quoted | accepted | expired | cancelled | closed).',
      },
      { status: 400 },
    );
  }

  try {
    // Fetch first to validate current state — we don't allow re-opening an
    // already-terminal request via this public endpoint.
    const existing = await db.jobRequest.findUnique({
      where: { id },
      select: { status: true, acceptedQuoteId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Job request not found' }, { status: 404 });
    }

    const terminalStates = new Set(['accepted', 'expired', 'cancelled', 'closed']);
    if (terminalStates.has(existing.status)) {
      return NextResponse.json(
        { error: `Job request is already in terminal state "${existing.status}" and cannot be modified.` },
        { status: 409 },
      );
    }
    // Can't accept via PATCH — that's the /accept endpoint's job.
    if (newStatus === 'accepted') {
      return NextResponse.json(
        { error: 'Use POST /api/marketplace/quote-request/[id]/accept to accept a quote.' },
        { status: 400 },
      );
    }

    const updated = await db.jobRequest.update({
      where: { id },
      data: {
        status: newStatus,
        metadataJson: JSON.stringify({
          patchedAt: new Date().toISOString(),
          ...(reason ? { reason } : {}),
          fromStatus: existing.status,
        }),
      },
    });

    log.info({ jobRequestId: id, newStatus, fromStatus: existing.status }, 'marketplace/quote-request: patched');
    return NextResponse.json({ jobRequest: updated });
  } catch (err) {
    log.error({ err, id }, 'marketplace/quote-request: patch failed');
    return NextResponse.json({ error: 'Failed to update job request' }, { status: 500 });
  }
}

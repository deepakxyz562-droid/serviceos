import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Flow 3: Emergency Dispatch — status (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET /api/marketplace/emergency/[id]
 *
 * Returns the emergency dispatch status — used by the customer-facing
 * tracking page to poll for provider acceptance + live ETA.
 *
 * Public endpoint (the customer polls this with the opaque dispatchId they
 * received when they submitted the emergency).
 *
 * Returns: { emergencyDispatch }
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
    const emergencyDispatch = await db.emergencyDispatch.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        industry: true,
        address: true,
        lat: true,
        lng: true,
        status: true,
        acceptedById: true,
        acceptedAt: true,
        providerEnRouteAt: true,
        providerOnSiteAt: true,
        completedAt: true,
        cancelledAt: true,
        estimatedArrivalMins: true,
        actualArrivalMins: true,
        estimatedCost: true,
        finalCost: true,
        currency: true,
        paymentStatus: true,
        // Don't leak provider-internal fields like broadcastToIds
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!emergencyDispatch) {
      return NextResponse.json(
        { error: 'Emergency dispatch not found' },
        { status: 404 },
      );
    }

    log.info(
      { dispatchId: id, status: emergencyDispatch.status },
      'marketplace/emergency: status fetched',
    );

    return NextResponse.json({ emergencyDispatch });
  } catch (err) {
    log.error({ err, id }, 'marketplace/emergency: fetch failed');
    return NextResponse.json(
      { error: 'Failed to fetch emergency dispatch' },
      { status: 500 },
    );
  }
}

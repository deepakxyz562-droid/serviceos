import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { estimatePrice, PriceEstimateInput } from '@/lib/smart-pricing';
import { withRequestId } from '@/lib/logger';

/**
 * POST /api/pricing/estimate
 * Calculate an estimated price for a service based on tenant pricing rules.
 *
 * Body: PriceEstimateInput = {
 *   serviceId?, urgency?, scheduledAt?, distanceKm?, estimatedDurationMins?
 * }
 * (tenantId is resolved from the authenticated user)
 */
export async function POST(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const body = await request.json();
    const input: PriceEstimateInput = {
      tenantId: authUser.tenantId,
      serviceId: body.serviceId,
      urgency: body.urgency,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      distanceKm: body.distanceKm,
      estimatedDurationMins: body.estimatedDurationMins,
    };

    const estimate = await estimatePrice(input);
    if (!estimate) {
      return NextResponse.json(
        { error: 'No pricing information available for this service' },
        { status: 404 }
      );
    }

    log.info({ serviceId: input.serviceId, urgency: input.urgency, low: estimate.low, high: estimate.high }, 'Price estimate generated');

    return NextResponse.json({ estimate });
  } catch (err) {
    log.error({ err }, 'Price estimate failed');
    return NextResponse.json({ error: 'Failed to generate estimate' }, { status: 500 });
  }
}

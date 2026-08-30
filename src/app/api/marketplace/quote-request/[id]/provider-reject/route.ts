import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';

/**
 * POST /api/marketplace/quote-request/[id]/provider-reject
 *
 * Provider rejects a marketplace quote request.
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext,
) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 },
    );
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  const { id: jobRequestId } = await ctx.params;
  if (!jobRequestId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const jobRequest = await db.jobRequest.findUnique({
      where: { id: jobRequestId },
      select: { id: true, tenantId: true, status: true, metadataJson: true },
    });

    if (!jobRequest) {
      return NextResponse.json(
        { error: 'Quote request not found' },
        { status: 404 },
      );
    }

    if (jobRequest.tenantId && jobRequest.tenantId !== authUser.tenantId) {
      return NextResponse.json(
        { error: 'This quote request is assigned to another provider' },
        { status: 403 },
      );
    }

    if (jobRequest.status === 'provider_rejected') {
      return NextResponse.json(
        { error: 'This quote request has already been rejected' },
        { status: 409 },
      );
    }

    await db.jobRequest.update({
      where: { id: jobRequestId },
      data: {
        status: 'provider_rejected',
        metadataJson: JSON.stringify({
          ...((JSON.parse(jobRequest.metadataJson || '{}') as object) || {}),
          providerRejectedAt: new Date().toISOString(),
          providerRejectedBy: authUser.id,
        }),
      },
    });

    logger.info(
      { component: 'marketplace-quote-reject', jobRequestId, tenantId: authUser.tenantId },
      'Provider rejected quote request',
    );

    return NextResponse.json({
      ok: true,
      message: 'Quote request rejected.',
    });
  } catch (error) {
    log.error({ err: error, jobRequestId }, 'marketplace/quote-request/provider-reject: error');
    return NextResponse.json(
      { error: 'Failed to reject quote request' },
      { status: 500 },
    );
  }
}

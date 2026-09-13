import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/quotes/[id]/decline
 *
 * Declines/rejects a quote.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: quoteId } = await params;
    const isCustomer = user.role === 'customer';
    const isSuperAdmin = Boolean(user.isSuperAdmin || user.role === 'superadmin');

    const quote = await db.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (isCustomer && quote.customerId && quote.customerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!isCustomer && !isSuperAdmin && user.tenantId && quote.tenantId && quote.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updated = await db.quote.update({
      where: { id: quoteId },
      data: {
        status: 'rejected',
      },
    });

    try {
      await EventBus.emit(
        'quote.rejected',
        {
          quoteId: quote.id,
          customerId: quote.customerId || null,
          tenantId: quote.tenantId || null,
          fromStatus: quote.status,
          toStatus: 'rejected',
          resourceType: 'quote',
          resourceId: quote.id,
        },
        { tenantId: quote.tenantId || undefined },
      );
    } catch (eventErr) {
      console.error('[Quote Decline] quote.rejected event failed:', eventErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Quote declined.',
      quote: updated,
    });
  } catch (error: any) {
    console.error('[Quote Decline] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decline quote' },
      { status: 500 },
    );
  }
}

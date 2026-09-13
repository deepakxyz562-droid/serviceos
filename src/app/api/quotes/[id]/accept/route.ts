import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { acceptQuoteAndCreateJob } from '@/lib/quote-acceptance';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/quotes/[id]/accept
 *
 * Accepts a quote and automatically converts it into an operational Job.
 * Can be called by:
 * - Customer from Customer Portal or review link
 * - Admin or Employee from CRM
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

    const result = await acceptQuoteAndCreateJob(quoteId, {
      customerId: isCustomer ? user.id : undefined,
      tenantId: !isCustomer && !isSuperAdmin ? user.tenantId : undefined,
      isSuperAdmin,
    });

    return NextResponse.json({
      success: true,
      message: 'Quote approved successfully and job created.',
      quote: result.quote,
      job: result.job,
    });
  } catch (error: any) {
    console.error('[Quote Accept] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to accept quote';
    const status = message.includes('denied') ? 403 : message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

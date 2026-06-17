import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/customers/[id]/portal/disable
 *
 * Disable portal access for a customer. Clears passwordHash + activation token
 * so the customer can no longer log in, but PRESERVES the customer record and
 * all their bookings/jobs/invoices/conversations.
 *
 * Portal can be re-enabled later via /portal/enable.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!['owner', 'admin', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can disable portal access' },
        { status: 403 }
      );
    }

    const { id: customerId } = await params;

    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Invalidate pending invitations
    await db.invitation.updateMany({
      where: { customerId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    await db.customer.update({
      where: { id: customerId },
      data: {
        portalEnabled: false,
        invitationStatus: 'disabled',
        passwordHash: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        // NOTE: we do NOT clear activatedAt — it's a historical fact
      },
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        portalEnabled: false,
        invitationStatus: 'disabled',
      },
    });
  } catch (error) {
    console.error('[Customer Portal Disable Error]', error);
    return NextResponse.json(
      { error: 'Failed to disable customer portal' },
      { status: 500 }
    );
  }
}

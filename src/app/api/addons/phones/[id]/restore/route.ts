import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/addons/phones/[id]/restore
 * ─────────────────────────────────────────────────────────────────────────
 * Cancel a pending release (during the 30-day grace period).
 *
 * The number goes back to ACTIVE. If the number was already released on Twilio
 * (past the grace period), this returns an error.
 *
 * Auth: owner only.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can restore phone numbers' }, { status: 403 });
    }

    const { id } = await params;

    const phoneNumber = await db.phoneNumber.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    if (phoneNumber.status !== 'release_pending') {
      return NextResponse.json(
        { error: `Cannot restore — current status is ${phoneNumber.status}` },
        { status: 400 },
      );
    }

    await db.phoneNumber.update({
      where: { id: phoneNumber.id },
      data: {
        status: 'active',
        releaseScheduledAt: null,
        releaseAfter: null,
      },
    });

    console.log(`[phones/restore] ${phoneNumber.number} → active (release cancelled)`);

    return NextResponse.json({ ok: true, status: 'active' });
  } catch (error) {
    console.error('[POST /api/addons/phones/[id]/restore] error:', error);
    return NextResponse.json({ error: 'Failed to restore phone number' }, { status: 500 });
  }
}

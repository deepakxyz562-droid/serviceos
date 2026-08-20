import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/addons/phones/[id]/release
 * ─────────────────────────────────────────────────────────────────────────
 * Start the release process for a phone number (30-day grace period).
 *
 * The number stays ACTIVE during the grace period (calls route to fallback).
 * After 30 days, a cron job releases the number on Twilio and marks it RELEASED.
 *
 * If the tenant reactivates before the grace period ends, they call
 * POST /api/addons/phones/[id]/restore.
 *
 * Auth: owner only.
 */

const RELEASE_GRACE_PERIOD_DAYS = 30;

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
      return NextResponse.json({ error: 'Only owners can release phone numbers' }, { status: 403 });
    }

    const { id } = await params;

    // Verify the phone number belongs to this tenant
    const phoneNumber = await db.phoneNumber.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    if (phoneNumber.status === 'released') {
      return NextResponse.json({ error: 'Phone number is already released' }, { status: 400 });
    }

    if (phoneNumber.status === 'release_pending') {
      return NextResponse.json({ error: 'Release already in progress' }, { status: 400 });
    }

    // Schedule the release (30-day grace period)
    const now = new Date();
    const releaseAfter = new Date(now.getTime() + RELEASE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await db.phoneNumber.update({
      where: { id: phoneNumber.id },
      data: {
        status: 'release_pending',
        releaseScheduledAt: now,
        releaseAfter,
      },
    });

    console.log(
      `[phones/release] ${phoneNumber.number} → release_pending (grace until ${releaseAfter.toISOString()})`,
    );

    return NextResponse.json({
      ok: true,
      status: 'release_pending',
      releaseAfter: releaseAfter.toISOString(),
      graceDays: RELEASE_GRACE_PERIOD_DAYS,
    });
  } catch (error) {
    console.error('[POST /api/addons/phones/[id]/release] error:', error);
    return NextResponse.json({ error: 'Failed to release phone number' }, { status: 500 });
  }
}

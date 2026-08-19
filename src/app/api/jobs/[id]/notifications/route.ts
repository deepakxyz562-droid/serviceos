import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canSeeJobVerificationPin } from '@/lib/auth/permissions';

/**
 * GET /api/jobs/[id]/notifications
 *
 * Returns the notification history for a job (from NotificationLog).
 * Used by the Customer Verification card to show when/how the PIN was sent.
 *
 * Auth: requires authentication + canSeeJobVerificationPin role.
 * (Technicians and viewers don't need to see notification history — it
 * contains delivery metadata that's only relevant to dispatchers/managers.)
 *
 * Returns: { notifications: NotificationLog[] }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!canSeeJobVerificationPin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const notifications = await db.notificationLog.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
      take: 20, // last 20 notifications for this job
      select: {
        id: true,
        type: true,
        recipient: true,
        recipientName: true,
        subject: true,
        status: true,
        createdAt: true,
        // NOTE: `message` is intentionally NOT selected — it may contain the
        // PIN value. Only metadata (which has the PIN stripped — see Phase 2)
        // is safe to return.
        metadataJson: true,
      },
    });

    return NextResponse.json({ notifications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    console.error('[job notifications] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

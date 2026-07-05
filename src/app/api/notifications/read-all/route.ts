import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/notifications/read-all
 *
 * Mark every non-archived, unread notification for the current user
 * as read. Sets isRead=true and readAt=now() in bulk.
 *
 * Response: { updated: number }
 */
export async function POST(_request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const result = await db.appNotification.updateMany({
      where: {
        tenantId: user.tenantId,
        recipientId: user.id,
        isRead: false,
        isArchived: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('[notifications] read-all POST failed:', error);
    return NextResponse.json(
      { error: 'Failed to mark all as read' },
      { status: 500 }
    );
  }
}

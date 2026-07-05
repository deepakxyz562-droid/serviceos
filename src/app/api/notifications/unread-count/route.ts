import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/notifications/unread-count
 *
 * Lightweight endpoint for the header bell badge / polling. Returns
 * just the count of unread, non-archived notifications for the current
 * user — no row data, no joins, minimal payload.
 *
 * Response: { unreadCount: number }
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const unreadCount = await db.appNotification.count({
      where: {
        tenantId: user.tenantId,
        recipientId: user.id,
        isRead: false,
        isArchived: false,
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('[notifications] unread-count GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}

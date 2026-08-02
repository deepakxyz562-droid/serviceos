import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { cache } from '@/lib/cache';
import { cachedJson } from '@/lib/cache-headers';

// Cache unread-count for 30s. This endpoint is polled every 60s by the
// header bell badge (header.tsx). With 1000 users polling, that's 1000
// PostgREST calls/min. Caching at 30s TTL halves the load (every other
// poll hits cache). Cache is busted when notifications are marked read
// (via cache.invalidateByPrefix('unread:userId')).
const UNREAD_TTL = 30_000;

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

    const cacheKey = `unread:${user.id}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== undefined) {
      return cachedJson({ unreadCount: cached });
    }

    const unreadCount = await db.appNotification.count({
      where: {
        tenantId: user.tenantId,
        recipientId: user.id,
        isRead: false,
        isArchived: false,
      },
    });

    cache.set(cacheKey, unreadCount, UNREAD_TTL);
    return cachedJson({ unreadCount });
  } catch (error) {
    console.error('[notifications] unread-count GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}

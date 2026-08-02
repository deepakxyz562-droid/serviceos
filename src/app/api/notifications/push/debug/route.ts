import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isWebPushConfigured } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/push/debug
 *
 * Return debug info about the current user's push subscription state. Used
 * by the settings card to show whether a subscription row actually exists
 * in the DB (independent of the browser's ServiceWorker subscription state),
 * and to help diagnose "I clicked enable but nothing happens" tickets.
 *
 * Includes ALL subscription rows (active + deactivated) for the user, with
 * the endpoint truncated for privacy. `keysJson` is never returned.
 *
 * Response:
 *   {
 *     vapidConfigured: boolean,
 *     activeSubscriptions: number,
 *     totalSubscriptions: number,
 *     subscriptions: Array<{
 *       id: string,
 *       endpointPreview: string,   // first 60 chars + '...'
 *       userAgent: string | null,
 *       isActive: boolean,
 *       createdAt: Date
 *     }>
 *   }
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!user.tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      );
    }

    // All rows for this user (active + deactivated), newest first.
    const allSubs = await db.pushSubscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = await db.pushSubscription.count({
      where: { userId: user.id, isActive: true },
    });

    const subscriptions = allSubs.map((sub) => ({
      id: sub.id,
      endpointPreview:
        (sub.endpoint?.length ?? 0) > 60
          ? sub.endpoint.substring(0, 60) + '...'
          : sub.endpoint,
      userAgent: sub.userAgent,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
    }));

    return NextResponse.json({
      vapidConfigured: isWebPushConfigured(),
      activeSubscriptions: activeCount,
      totalSubscriptions: allSubs.length,
      subscriptions,
    });
  } catch (error) {
    console.error('[push/debug] GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch push debug info' },
      { status: 500 }
    );
  }
}

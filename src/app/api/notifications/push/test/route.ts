import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isWebPushConfigured } from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/web-push-send';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/push/test
 *
 * Send a real test Web Push notification to all of the current user's active
 * push subscriptions. Used by the settings card / debug UI so a user can
 * confirm end-to-end that VAPID + subscription + service worker + push
 * delivery are all wired up correctly.
 *
 * No request body. The payload is hard-coded here so the endpoint can't be
 * abused to send arbitrary messages.
 *
 * Responses:
 *   200 { ok: true, result }            — push fan-out completed (check
 *                                         result.sent / result.failed for
 *                                         per-device outcome)
 *   401 { error: 'Authentication required' }
 *   400 { error: 'Tenant context required' }
 *   503 { error: 'Web Push is not configured...' }  — missing VAPID keys
 *   500 { error: 'Failed to send test push' }       — unexpected error
 */
export async function POST() {
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
    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: 'Web Push is not configured on the server (missing VAPID keys)' },
        { status: 503 }
      );
    }

    const result = await sendWebPushToUser(user.id, user.tenantId, {
      title: 'ServiceOS Test Notification',
      body: 'If you can see this, push notifications are working correctly!',
      url: '/',
      tag: 'serviceos-test-push',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });

    if (result.notConfigured) {
      return NextResponse.json(
        { error: 'Web Push not configured', result },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[push/test] POST failed:', error);
    return NextResponse.json(
      { error: 'Failed to send test push' },
      { status: 500 }
    );
  }
}

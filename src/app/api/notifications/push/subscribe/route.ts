import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isWebPushConfigured } from '@/lib/notifications';

/**
 * POST /api/notifications/push/subscribe
 *
 * Persist a Web Push subscription for the authenticated user. Called from the
 * browser after `pushManager.subscribe()` succeeds. We upsert on
 * `[userId, endpoint]` so re-subscribing the same device doesn't create
 * duplicate rows.
 *
 * Body:
 *   {
 *     endpoint: string,
 *     keys: { p256dh: string, auth: string },
 *     expirationTime?: number | null
 *   }
 *
 * NOTE: tenantId is required by the PushSubscription model. If the user has
 * no tenant (shouldn't happen for employees, but possible for seed/admin
 * accounts), we 400 so the client can show a helpful message.
 */
export async function POST(request: NextRequest) {
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
        { error: 'Tenant context required to register push notifications' },
        { status: 400 }
      );
    }
    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: 'Web Push is not configured on the server (missing VAPID keys)' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { endpoint, keys, expirationTime } = body || {};

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'endpoint is required' },
        { status: 400 }
      );
    }
    if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
      return NextResponse.json(
        { error: 'keys.p256dh and keys.auth are required' },
        { status: 400 }
      );
    }

    const keysJson = JSON.stringify({
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    // userAgent for debugging which device/browser owns each subscription.
    const userAgent = request.headers.get('user-agent') || null;

    const sub = await db.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint,
        },
      },
      update: {
        keysJson,
        userAgent,
        isActive: true,
        tenantId: user.tenantId,
      },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        endpoint,
        keysJson,
        userAgent,
        isActive: true,
      },
    });

    return NextResponse.json({ id: sub.id, ok: true }, { status: 201 });
  } catch (error) {
    console.error('[push/subscribe] POST failed:', error);
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/push/subscribe
 *
 * Deactivate (soft-delete) a push subscription for the current user. We
 * keep the row (isActive=false) rather than hard-deleting so we can audit
 * device churn, but either way the subscription won't receive pushes.
 *
 * Body: { endpoint: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { endpoint } = body || {};

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'endpoint is required' },
        { status: 400 }
      );
    }

    // Only touch rows owned by the current user (the unique constraint
    // includes userId, so this is safe even without a tenantId check).
    await db.pushSubscription
      .updateMany({
        where: { userId: user.id, endpoint },
        data: { isActive: false },
      })
      .catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[push/subscribe] DELETE failed:', error);
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/push/subscribe
 *
 * Returns whether the current user has at least one active push subscription
 * (used by the settings card to show status without hitting the SW).
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

    const count = await db.pushSubscription.count({
      where: { userId: user.id, isActive: true },
    });

    return NextResponse.json({
      configured: isWebPushConfigured(),
      activeSubscriptions: count,
    });
  } catch (error) {
    console.error('[push/subscribe] GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to check push status' },
      { status: 500 }
    );
  }
}

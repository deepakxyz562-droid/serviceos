import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isWebPushConfigured } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

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
 *
 * Error codes (returned as `code` field for client-side branching):
 *   AUTH_REQUIRED    — 401, no session / session expired
 *   NO_TENANT        — 400, user has no tenantId (superadmin/seed account)
 *   NOT_CONFIGURED   — 503, VAPID keys missing on server
 *   VALIDATION       — 400, missing/invalid endpoint or keys
 *   DB_ERROR         — 500, Prisma error (unique constraint, connection, etc.)
 *   UNKNOWN          — 500, unexpected error
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    if (!user.tenantId) {
      return NextResponse.json(
        {
          error: 'Your account is not linked to a company. Contact your admin to enable push notifications.',
          code: 'NO_TENANT',
        },
        { status: 400 }
      );
    }
    if (!isWebPushConfigured()) {
      return NextResponse.json(
        {
          error: 'Push notifications are not configured on the server (missing VAPID keys)',
          code: 'NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { endpoint, keys, expirationTime } = body || {};

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'endpoint is required', code: 'VALIDATION' },
        { status: 400 }
      );
    }
    if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
      return NextResponse.json(
        { error: 'keys.p256dh and keys.auth are required', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const keysJson = JSON.stringify({
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    // userAgent for debugging which device/browser owns each subscription.
    const userAgent = request.headers.get('user-agent') || null;

    try {
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
    } catch (dbErr) {
      // Log the FULL Prisma error so Vercel logs show the exact failure
      // reason (error code, meta, message). Without this, the generic
      // "Failed to save push subscription" message is useless for debugging.
      const prismaErr = dbErr as {
        code?: string;
        meta?: unknown;
        message?: string;
      };
      console.error('[push/subscribe] DB error:', {
        code: prismaErr.code,
        meta: prismaErr.meta,
        message: prismaErr.message,
        userId: user.id,
        endpointPreview: endpoint.slice(0, 60),
      });

      // Map known Prisma error codes to user-friendly messages.
      let errorMsg = 'Failed to save push subscription';
      if (prismaErr.code === 'P2002') {
        // Unique constraint — shouldn't happen (we upsert), but handle it.
        errorMsg = 'This device is already registered. Try disabling and re-enabling push.';
      } else if (prismaErr.code === 'P1001') {
        errorMsg = 'Database connection error. Please try again in a moment.';
      } else if (prismaErr.code?.startsWith('P1')) {
        errorMsg = `Database error (${prismaErr.code}). Please try again.`;
      }

      return NextResponse.json(
        { error: errorMsg, code: 'DB_ERROR', dbCode: prismaErr.code },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[push/subscribe] POST failed:', error);
    return NextResponse.json(
      { error: 'Failed to save push subscription', code: 'UNKNOWN' },
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
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { endpoint } = body || {};

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'endpoint is required', code: 'VALIDATION' },
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
      { error: 'Failed to remove push subscription', code: 'UNKNOWN' },
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
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
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
      { error: 'Failed to check push status', code: 'UNKNOWN' },
      { status: 500 }
    );
  }
}

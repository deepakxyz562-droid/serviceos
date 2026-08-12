import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isWebPushConfigured } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/push/subscribe
 *
 * Persist a push subscription for the authenticated user. Supports TWO formats:
 *
 * 1. Web Push (browser/PWA):
 *    { endpoint: string, keys: { p256dh, auth }, expirationTime? }
 *    Requires VAPID keys to be configured on the server.
 *
 * 2. Expo Push (native mobile app):
 *    { platform: 'ios'|'android', token: string, expoPushToken: string }
 *    Does NOT require VAPID keys — Expo handles push delivery internally.
 *    We store the Expo token as a synthetic endpoint: `expo://{token}`.
 *
 * We look up an existing row by `[userId, endpoint]` and update-or-create
 * it so re-subscribing the same device doesn't create duplicate rows.
 *
 * NOTE: We do NOT use Prisma's compound-unique `upsert()` because the Supabase
 * REST adapter (used in production) cannot resolve the `userId_endpoint`
 * constraint name. We use findFirst → update | create instead.
 *
 * NOTE: tenantId is required by the PushSubscription model. If the user has
 * no tenant (shouldn't happen for employees, but possible for seed/admin
 * accounts), we 400 so the client can show a helpful message.
 *
 * Error codes (returned as `code` field for client-side branching):
 *   AUTH_REQUIRED    — 401, no session / session expired
 *   NO_TENANT        — 400, user has no tenantId (superadmin/seed account)
 *   NOT_CONFIGURED   — 503, VAPID keys missing (Web Push only)
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

    const body = await request.json();
    const { endpoint, keys, expirationTime, expoPushToken, platform } = body || {};

    // ── Determine subscription type ──────────────────────────────────
    // Expo native apps send { expoPushToken, platform, token }.
    // Browsers (PWA) send { endpoint, keys: { p256dh, auth } }.
    const isExpoToken =
      typeof expoPushToken === 'string' && expoPushToken.length > 0;

    let finalEndpoint: string;
    let keysJson: string;

    if (isExpoToken) {
      // Expo push tokens don't use VAPID — skip the isWebPushConfigured() check.
      // Store as a synthetic endpoint so the same [userId, endpoint] dedup logic
      // works for both Web Push and Expo subscriptions.
      finalEndpoint = `expo://${expoPushToken}`;
      keysJson = JSON.stringify({
        type: 'expo',
        platform: typeof platform === 'string' ? platform : 'unknown',
        token: expoPushToken,
      });
    } else {
      // Web Push path — require VAPID + valid endpoint + keys
      if (!isWebPushConfigured()) {
        return NextResponse.json(
          {
            error: 'Push notifications are not configured on the server (missing VAPID keys)',
            code: 'NOT_CONFIGURED',
          },
          { status: 503 }
        );
      }

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

      finalEndpoint = endpoint;
      keysJson = JSON.stringify({
        p256dh: keys.p256dh,
        auth: keys.auth,
        ...(typeof expirationTime === 'number' ? { expirationTime } : {}),
      });
    }

    // userAgent for debugging which device/browser owns each subscription.
    const userAgent = request.headers.get('user-agent') || null;

    // NOTE: We deliberately AVOID Prisma's compound-unique `upsert()` here.
    // The `userId_endpoint` compound unique constraint is a Prisma-level
    // abstraction. The Supabase REST adapter (used on Vercel) does NOT
    // understand compound-unique constraint NAMES — it tries to use
    // `userId_endpoint` as a literal `onConflict` column, which PostgREST
    // rejects ("column userId_endpoint does not exist"), causing every
    // subscribe call to fail with "Failed to save push subscription".
    //
    // Instead we do a manual findFirst → update | create. This works
    // identically across Prisma (SQLite/Postgres) and the Supabase REST
    // adapter because it only uses simple column filters.
    try {
      const existing = await db.pushSubscription.findFirst({
        where: { userId: user.id, endpoint: finalEndpoint },
        select: { id: true },
      });

      let savedId: string;
      if (existing) {
        const updated = await db.pushSubscription.update({
          where: { id: existing.id },
          data: {
            keysJson,
            userAgent,
            isActive: true,
            tenantId: user.tenantId,
          },
          select: { id: true },
        });
        savedId = updated.id;
      } else {
        const created = await db.pushSubscription.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            endpoint: finalEndpoint,
            keysJson,
            userAgent,
            isActive: true,
          },
          select: { id: true },
        });
        savedId = created.id;
      }

      return NextResponse.json({ id: savedId, ok: true }, { status: 201 });
    } catch (dbErr) {
      // Log the FULL error so Vercel logs show the exact failure reason.
      // Capture both Prisma-shaped errors ({ code, meta }) and plain Error
      // objects thrown by the Supabase adapter (no .code property — just
      // .message). The Supabase adapter throws errors like:
      //   "Failed to upsert PushSubscription: ... table does not exist"
      // which previously fell through to the generic default message.
      const dbError = dbErr as {
        code?: string;
        meta?: unknown;
        message?: string;
      };
      const rawMessage = dbError.message || String(dbErr);
      console.error('[push/subscribe] DB error:', {
        code: dbError.code,
        meta: dbError.meta,
        message: rawMessage,
        userId: user.id,
        endpointPreview: finalEndpoint.slice(0, 60),
      });

      // Map known error patterns to user-friendly messages. Include the
      // raw message as `details` so the client toast can show the ACTUAL
      // failure reason (e.g. "table PushSubscription does not exist") —
      // this is critical for diagnosing Supabase-adapter issues where the
      // table hasn't been created yet.
      let errorMsg = 'Failed to save push subscription';
      if (dbError.code === 'P2002') {
        errorMsg = 'This device is already registered. Try disabling and re-enabling push.';
      } else if (dbError.code === 'P1001') {
        errorMsg = 'Database connection error. Please try again in a moment.';
      } else if (dbError.code?.startsWith('P1')) {
        errorMsg = `Database error (${dbError.code}). Please try again.`;
      } else if (rawMessage.includes('does not exist') || rawMessage.includes('Could not find')) {
        errorMsg = 'Push notifications table is not set up on the server yet.';
      } else if (rawMessage.includes('not in Supabase')) {
        errorMsg = 'Push notifications are not configured in the database backend.';
      }

      return NextResponse.json(
        {
          error: errorMsg,
          code: 'DB_ERROR',
          dbCode: dbError.code,
          // Truncate the raw message so we don't leak huge payloads, but
          // keep enough to diagnose. This is shown in the client toast.
          details: rawMessage.slice(0, 300),
        },
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
 * Body (Web Push):  { endpoint: string }
 * Body (Expo):      { expoPushToken: string }  OR  { token: string }
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
    const { endpoint, expoPushToken, token } = body || {};

    // Normalise: Expo tokens can arrive as `expoPushToken` or `token`.
    // Convert to the same synthetic endpoint format used in POST.
    let finalEndpoint: string | undefined =
      typeof endpoint === 'string' ? endpoint : undefined;
    if (!finalEndpoint) {
      const expoToken =
        typeof expoPushToken === 'string'
          ? expoPushToken
          : typeof token === 'string'
            ? token
            : undefined;
      if (expoToken) {
        finalEndpoint = `expo://${expoToken}`;
      }
    }

    if (!finalEndpoint) {
      return NextResponse.json(
        { error: 'endpoint is required', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    // Only touch rows owned by the current user (the unique constraint
    // includes userId, so this is safe even without a tenantId check).
    await db.pushSubscription
      .updateMany({
        where: { userId: user.id, endpoint: finalEndpoint },
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

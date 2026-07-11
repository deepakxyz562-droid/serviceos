/**
 * ServiceOS — Web Push sending helper.
 *
 * Wraps the `web-push` npm library so the rest of the app can send push
 * notifications without dealing with VAPID config / subscription storage.
 *
 *   sendWebPushToUser({ userId, tenantId, title, body, ... })
 *     → loads all active PushSubscription rows for that user
 *     → calls web-push sendNotification() for each
 *     → deactivates any subscription whose endpoint 410s (expired)
 *
 * VAPID keys are read from env (NEXT_PUBLIC_VAPID_PUBLIC_KEY +
 * VAPID_PRIVATE_KEY + VAPID_SUBJECT). If any are missing, the function
 * returns a no-op result so callers can feature-detect without throwing.
 */

import webpush, { type PushSubscription as WpSubscription } from 'web-push';
import { db } from '@/lib/db';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@serviceos.local';

  if (!publicKey || !privateKey) {
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface SendPushPayload {
  title: string;
  body: string;
  /** URL to open when the notification is clicked. Defaults to "/". */
  url?: string;
  /** Notification type tag — used to group/replace notifications. */
  tag?: string;
  /** Optional arbitrary data object forwarded to the SW. */
  data?: Record<string, unknown>;
  /** If true, the notification stays on screen until the user dismisses it. */
  requireInteraction?: boolean;
  /** Optional icon URL (defaults to /icon-192.png). */
  icon?: string;
  /** Optional badge URL for Android notification tray. */
  badge?: string;
}

export interface SendPushResult {
  sent: number;
  failed: number;
  deactivated: number;
  /** True when VAPID keys are not configured (no-op). */
  notConfigured: boolean;
}

/**
 * Send a Web Push notification to every active device subscription for a
 * given user. Safe to call even when VAPID isn't configured — it returns
 * { notConfigured: true } and does nothing.
 */
export async function sendWebPushToUser(
  userId: string,
  tenantId: string | null | undefined,
  payload: SendPushPayload
): Promise<SendPushResult> {
  ensureConfigured();
  if (!configured) {
    return { sent: 0, failed: 0, deactivated: 0, notConfigured: true };
  }
  if (!userId) {
    return { sent: 0, failed: 0, deactivated: 0, notConfigured: false };
  }

  // Load all active subscriptions for this user. tenantId is optional but
  // lets us scope the query (and avoid a full-table scan on large tenants).
  const where: { userId: string; isActive: boolean; tenantId?: string } = {
    userId,
    isActive: true,
  };
  if (tenantId) where.tenantId = tenantId;

  const subs = await db.pushSubscription.findMany({ where });
  if (subs.length === 0) {
    return { sent: 0, failed: 0, deactivated: 0, notConfigured: false };
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || 'serviceos-notification',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    requireInteraction: payload.requireInteraction ?? false,
    data: payload.data || {},
  });

  let sent = 0;
  let failed = 0;
  let deactivated = 0;

  await Promise.all(
    subs.map(async (sub) => {
      // Reconstruct the PushSubscription object web-push expects.
      let keys: { p256dh?: string; auth?: string } = {};
      try {
        keys = sub.keysJson ? JSON.parse(sub.keysJson) : {};
      } catch {
        keys = {};
      }
      const pushSub: WpSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: keys.p256dh || '',
          auth: keys.auth || '',
        },
      };

      try {
        await webpush.sendNotification(pushSub, message);
        sent++;
      } catch (err) {
        failed++;
        const status =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        // 404 / 410 = subscription is gone forever → deactivate it so we
        // don't keep retrying a dead endpoint. 429 / 403 = temporary; keep.
        if (status === 404 || status === 410) {
          try {
            await db.pushSubscription.update({
              where: { id: sub.id },
              data: { isActive: false },
            });
            deactivated++;
          } catch {
            /* non-fatal */
          }
        }
      }
    })
  );

  // Log delivery results so operators can see push outcomes in Vercel logs.
  // This is critical for debugging "push not received" reports — without it,
  // sendWebPushToUser silently returns { sent: 0 } and the caller has no idea
  // whether subscriptions exist or if sends are failing.
  console.info('[web-push] Delivery result', {
    userId,
    tenantId: tenantId || null,
    subscriptions: subs.length,
    sent,
    failed,
    deactivated,
  });

  return { sent, failed, deactivated, notConfigured: false };
}

/**
 * Convenience: does the running server have VAPID configured?
 */
export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
  ) && Boolean(process.env.VAPID_PRIVATE_KEY);
}

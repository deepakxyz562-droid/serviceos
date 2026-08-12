/**
 * Fieseros — Web Push + Expo Push sending helper.
 *
 * Wraps the `web-push` npm library so the rest of the app can send push
 * notifications without dealing with VAPID config / subscription storage.
 *
 *   sendWebPushToUser({ userId, tenantId, title, body, ... })
 *     → loads all active PushSubscription rows for that user
 *     → for each subscription:
 *         • Web Push (PWA): calls web-push sendNotification() — needs VAPID
 *         • Expo Push (mobile): POSTs to https://exp.host/--/api/v2/push/send
 *     → deactivates any subscription whose endpoint 410s (expired)
 *
 * VAPID keys are read from env (NEXT_PUBLIC_VAPID_PUBLIC_KEY +
 * VAPID_PRIVATE_KEY + VAPID_SUBJECT). If any are missing or malformed, the
 * function returns a no-op result with a `configError` message so callers
 * can surface the problem instead of crashing.
 *
 * EXPO PUSH (native mobile app): Expo push tokens do NOT use VAPID. They are
 * stored with endpoint `expo://<token>`. When VAPID is not configured, Web
 * Push subs are skipped (as before) but Expo subs are still sent — so the
 * mobile app can receive pushes even if the server has no VAPID keys. This
 * is purely additive: the PWA Web Push path is byte-for-byte identical to
 * the previous behavior.
 */

import webpush, { type PushSubscription as WpSubscription } from 'web-push';
import { db } from '@/lib/db';

let configured = false;
let configError: string | null = null;

// ── Expo Push (native mobile app) ───────────────────────────────────────
// Expo push tokens are stored with endpoint `expo://<token>` (see
// /api/notifications/push/subscribe). They are delivered via Expo's push
// service, NOT the Web Push protocol — so the `web-push` library can't
// send to them. This helper POSTs to Expo's push API.
//
// This is COMPLETELY SEPARATE from the Web Push (PWA) path below. Adding
// it does not change any line of the Web Push sending logic.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushReceipt[];
  errors?: { code?: string; message?: string }[];
}

/**
 * Send a push notification to a single Expo push token via Expo's push API.
 * Returns { success, status, error } — same shape as the Web Push per-device
 * result so the caller can merge them uniformly.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */
async function sendExpoPush(
  expoToken: string,
  payload: SendPushPayload
): Promise<{ success: boolean; status: number; error?: string }> {
  // Expo accepts an array of messages; we send one at a time for simplicity
  // and so we can deactivate the specific subscription on 404/410.
  const body = JSON.stringify([
    {
      to: expoToken,
      title: payload.title,
      body: payload.body,
      data: { url: payload.url || '/', ...(payload.data || {}) },
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    },
  ]);

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Accept-Encoding must be set to avoid Expo returning gzip on some
        // Node.js versions where gzip decompression isn't automatic.
        'Accept-Encoding': 'gzip, deflate',
      },
      body,
    });

    const status = res.status;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, status, error: text.slice(0, 300) || `HTTP ${status}` };
    }

    const json = (await res.json().catch(() => ({}))) as ExpoPushResponse;

    // Expo returns 200 even if individual receipts have errors. Check the
    // first receipt (we only sent one message).
    const receipt = json.data?.[0];
    if (receipt?.status === 'error') {
      const errCode = receipt.details?.error || 'unknown';
      const errMsg = receipt.message || errCode;
      // Map Expo error codes to HTTP-like status for the deactivation logic.
      // "DeviceNotRegistered" → 410 (subscription is dead, deactivate it).
      const mappedStatus = errCode === 'DeviceNotRegistered' ? 410 : 400;
      return { success: false, status: mappedStatus, error: `${errCode}: ${errMsg}` };
    }

    return { success: true, status: 200 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, status: 0, error: msg.slice(0, 300) };
  }
}

/** Extract the raw Expo push token from a stored `expo://<token>` endpoint. */
function extractExpoToken(endpoint: string): string | null {
  if (!endpoint.startsWith('expo://')) return null;
  return endpoint.slice(7) || null;
}

/**
 * Configure the web-push library with VAPID keys. Safe to call repeatedly.
 * Captures any validation error (e.g. malformed key) into `configError`
 * instead of throwing — so callers can feature-detect without try/catch.
 */
function ensureConfigured(): void {
  if (configured || configError) return;

  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@fieseros.local';

  if (!publicKey) {
    configError = 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set';
    return;
  }
  if (!privateKey) {
    configError = 'VAPID_PRIVATE_KEY is not set';
    return;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (err) {
    // Most common: "VAPID public key must be ... bytes long" or
    // "VAPID private key must be ... bytes long" (wrong base64url / wrong
    // key length). Surface the message so the operator knows which key
    // is bad.
    configError =
      err && typeof err === 'object' && 'message' in err
        ? `Invalid VAPID config: ${(err as { message: string }).message}`
        : `Invalid VAPID config: ${String(err)}`;
    console.error('[web-push] VAPID configuration failed:', configError);
  }
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

/** Per-device delivery outcome — used for diagnostics (test endpoint). */
export interface PushDeviceResult {
  /** First 60 chars of the subscription endpoint (for device identification). */
  endpointPreview: string;
  /** HTTP status from the push service (0 = network/unknown error). */
  status: number;
  /** True if sendNotification resolved without throwing. */
  success: boolean;
  /** True if the subscription was deactivated (404/410). */
  deactivated: boolean;
  /** Error body/message from the push service, when available. */
  error?: string;
}

export interface SendPushResult {
  sent: number;
  failed: number;
  deactivated: number;
  /** True when VAPID keys are not configured (no-op). */
  notConfigured: boolean;
  /** VAPID configuration error message (when notConfigured due to bad keys). */
  configError?: string;
  /** Per-device results — only populated by sendWebPushToUserWithDiagnostics(). */
  devices?: PushDeviceResult[];
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
  return sendWebPushToUserInternal(userId, tenantId, payload, false);
}

/**
 * Same as sendWebPushToUser() but also returns per-device diagnostic
 * results (endpoint preview + status + error). Used by the test endpoint
 * so the UI can show exactly which device failed and why.
 */
export async function sendWebPushToUserWithDiagnostics(
  userId: string,
  tenantId: string | null | undefined,
  payload: SendPushPayload
): Promise<SendPushResult> {
  return sendWebPushToUserInternal(userId, tenantId, payload, true);
}

async function sendWebPushToUserInternal(
  userId: string,
  tenantId: string | null | undefined,
  payload: SendPushPayload,
  collectDiagnostics: boolean
): Promise<SendPushResult> {
  ensureConfigured();
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
    // No subs at all — return the same notConfigured shape as before so
    // callers that check `notConfigured` still work.
    return {
      sent: 0,
      failed: 0,
      deactivated: 0,
      notConfigured: !configured,
      configError: !configured ? configError || undefined : undefined,
    };
  }

  // Split subscriptions into Web Push (PWA) and Expo Push (mobile).
  // Expo endpoints are stored as `expo://<token>` (see /api/notifications/push/subscribe).
  // Everything else (https://fcm.googleapis.com/..., https://android.googleapis.com/...,
  // https://updates.push.services.mozilla.com/...) is a standard Web Push endpoint.
  const expoSubs = subs.filter((s) => s.endpoint.startsWith('expo://'));
  const webPushSubs = subs.filter((s) => !s.endpoint.startsWith('expo://'));

  // If VAPID (Web Push) is not configured AND there are no Expo subs,
  // return the same notConfigured result as before — PWA behavior unchanged.
  if (!configured && expoSubs.length === 0) {
    return {
      sent: 0,
      failed: 0,
      deactivated: 0,
      notConfigured: true,
      configError: configError || undefined,
    };
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || 'fieseros-notification',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    requireInteraction: payload.requireInteraction ?? false,
    data: payload.data || {},
  });

  let sent = 0;
  let failed = 0;
  let deactivated = 0;
  const devices: PushDeviceResult[] = collectDiagnostics ? [] : [];

  // ── Web Push (PWA) — UNCHANGED path ────────────────────────────────
  // This entire block is byte-for-byte identical to the previous behavior.
  // It only runs when VAPID is configured AND there are Web Push subs.
  // Expo subs are handled separately below.
  if (configured && webPushSubs.length > 0) {
    // Per-push options: TTL (4 hours — long enough for offline devices to
    // receive when they come back online, short enough to avoid stale
    // notifications) + high urgency so APNs (iOS) and FCM (Android) deliver
    // immediately rather than coalescing.
    const pushOptions: webpush.RequestOptions = {
      TTL: 60 * 60 * 4, // 4 hours in seconds
      urgency: 'high',
      contentEncoding: 'aes128gcm',
    };

    await Promise.all(
      webPushSubs.map(async (sub) => {
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

        const endpointPreview = sub.endpoint.slice(0, 60);
        let success = false;
        let status = 0;
        let errMsg: string | undefined;
        let didDeactivate = false;

        try {
          await webpush.sendNotification(pushSub, message, pushOptions);
          success = true;
          sent++;
        } catch (err) {
          failed++;
          const errObj = err as {
            statusCode?: number;
            body?: string | { message?: string };
            message?: string;
          };
          status = errObj.statusCode || 0;
          // Extract a human-readable error body. web-push errors include a
          // `body` field with the push service's response (e.g. APNs
          // "BadDeviceToken" or "Unregistered").
          if (typeof errObj.body === 'string') {
            errMsg = errObj.body.slice(0, 300);
          } else if (errObj.body && typeof errObj.body.message === 'string') {
            errMsg = errObj.body.message.slice(0, 300);
          } else if (errObj.message) {
            errMsg = errObj.message.slice(0, 300);
          }

          // 404 / 410 = subscription is gone forever → deactivate it so we
          // don't keep retrying a dead endpoint. 429 / 403 = temporary; keep.
          if (status === 404 || status === 410) {
            try {
              await db.pushSubscription.update({
                where: { id: sub.id },
                data: { isActive: false },
              });
              deactivated++;
              didDeactivate = true;
            } catch {
              /* non-fatal */
            }
          }

          // Log per-subscription failures with enough detail to diagnose
          // "push not received" reports. Without this, the operator only
          // sees an aggregate count and can't tell WHICH device failed or WHY.
          console.warn('[web-push] Per-device send failed', {
            userId,
            endpointPreview,
            status,
            error: errMsg,
          });
        }

        if (collectDiagnostics) {
          devices.push({
            endpointPreview,
            status,
            success,
            deactivated: didDeactivate,
            error: errMsg,
          });
        }
      })
    );
  }

  // ── Expo Push (mobile) — NEW path ──────────────────────────────────
  // Expo push tokens don't use VAPID. They are sent via Expo's push API.
  // This runs regardless of whether VAPID is configured, so mobile push
  // works even on servers without Web Push (VAPID) keys.
  if (expoSubs.length > 0) {
    await Promise.all(
      expoSubs.map(async (sub) => {
        const expoToken = extractExpoToken(sub.endpoint);
        if (!expoToken) {
          // Malformed endpoint — shouldn't happen, but skip gracefully.
          if (collectDiagnostics) {
            devices.push({
              endpointPreview: sub.endpoint.slice(0, 60),
              status: 0,
              success: false,
              deactivated: false,
              error: 'Malformed Expo endpoint',
            });
          }
          failed++;
          return;
        }

        const endpointPreview = sub.endpoint.slice(0, 60);
        const result = await sendExpoPush(expoToken, payload);

        if (result.success) {
          sent++;
        } else {
          failed++;
          // 404 / 410 = device unregistered → deactivate (same logic as Web Push).
          if (result.status === 404 || result.status === 410) {
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
          console.warn('[expo-push] Per-device send failed', {
            userId,
            endpointPreview,
            status: result.status,
            error: result.error,
          });
        }

        if (collectDiagnostics) {
          devices.push({
            endpointPreview,
            status: result.status,
            success: result.success,
            deactivated: result.status === 404 || result.status === 410,
            error: result.error,
          });
        }
      })
    );
  }

  // Log delivery results so operators can see push outcomes in Vercel logs.
  console.info('[web-push] Delivery result', {
    userId,
    tenantId: tenantId || null,
    subscriptions: subs.length,
    sent,
    failed,
    deactivated,
  });

  return {
    sent,
    failed,
    deactivated,
    notConfigured: false,
    ...(collectDiagnostics ? { devices } : {}),
  };
}

/**
 * Convenience: does the running server have VAPID configured?
 */
export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
  ) && Boolean(process.env.VAPID_PRIVATE_KEY);
}

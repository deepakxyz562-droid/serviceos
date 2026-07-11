/**
 * push-client.ts — Browser-side helpers for Web Push (VAPID key fetch + base64
 * conversion).
 *
 * WHY THIS EXISTS
 * ---------------
 * The classic Next.js pattern reads the VAPID public key from
 * `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`, which is inlined into the client
 * bundle at BUILD time. On Vercel/Netlify, that means adding the env var in
 * the dashboard doesn't help an already-deployed build — you must trigger a
 * new deploy for the var to land in the bundle.
 *
 * This module implements a HYBRID approach so operators don't hit that
 * gotcha:
 *
 *   1. FAST PATH — if `NEXT_PUBLIC_VAPID_PUBLIC_KEY` was present at build
 *      time, it's already inlined; return it synchronously. Zero network
 *      round-trips, zero UI flashes.
 *
 *   2. RUNTIME FALLBACK — otherwise, fetch the public key from
 *      `/api/notifications/push/vapid-public-key`, which reads it from the
 *      server env at request time. Works the instant the var is added — no
 *      redeploy needed.
 *
 * The result is cached for the lifetime of the page so repeated callers
 * (the settings card, the auto-subscribe hook, the enable banner) share a
 * single fetch.
 */

/** Module-level cache so all callers share one fetch per page load. */
let cachedKey: string | null | undefined = undefined;
let inFlight: Promise<string | null> | null = null;

/**
 * Convert a base64-url-encoded VAPID public key into the Uint8Array form that
 * `pushManager.subscribe({ applicationServerKey })` requires. Works on both
 * client (window.atob) and server (Buffer) — though we only ever call it from
 * the client.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw =
    typeof window !== 'undefined'
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * Resolve the VAPID public key for the current client.
 *
 * Resolution order:
 *   1. If the build-time-inlined `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is present,
 *      return it immediately (synchronous fast path — no fetch).
 *   2. Otherwise fetch `/api/notifications/push/vapid-public-key` once and
 *      cache the result for the rest of the page session.
 *
 * Returns `null` when no key is configured anywhere (server returns null AND
 * no build-time value). Callers should treat `null` as "push not configured"
 * and surface a friendly message.
 */
export async function getVapidPublicKey(): Promise<string | null> {
  // Fast path: build-time inlined value. When this is present we never hit
  // the network, which keeps the settings-card render synchronous.
  const inlined = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (inlined) return inlined;

  // Already resolved (or resolved to null) for this page session?
  if (cachedKey !== undefined) return cachedKey;

  // In-flight? Await the existing promise instead of kicking off a duplicate.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(
        '/api/notifications/push/vapid-public-key?XTransformPort=3000',
        { cache: 'no-store' }
      );
      if (!res.ok) {
        cachedKey = null;
        return null;
      }
      const data = (await res.json()) as { publicKey?: string | null };
      cachedKey = data.publicKey || null;
      return cachedKey;
    } catch (err) {
      console.warn('[push] Failed to fetch VAPID public key:', err);
      cachedKey = null;
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Synchronous peek at the build-time-inlined key, if any. Used to initialize
 * component state so the UI doesn't flash the "not configured" warning before
 * the runtime fetch resolves — when the build-time value is present, we know
 * immediately that push is configured.
 *
 * Returns `null` when the build-time value is absent (which does NOT mean
 * push is unconfigured — the runtime fetch may still return a key).
 */
export function getInlinedVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

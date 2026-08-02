import { NextResponse } from 'next/server';

/**
 * GET /api/notifications/push/vapid-public-key
 *
 * Returns the VAPID public key at RUNTIME (read from server env on every
 * request) so the browser can subscribe to Web Push without relying on the
 * `NEXT_PUBLIC_VAPID_PUBLIC_KEY` build-time inlining.
 *
 * Why this exists
 * ---------------
 * `NEXT_PUBLIC_*` vars are inlined into the client JS bundle at BUILD time.
 * On Vercel/Netlify, adding the env var in the dashboard does NOT retro-
 * actively populate already-built bundles — you'd have to trigger a new
 * deploy. That's a painful gotcha for operators.
 *
 * This endpoint reads the public key from `process.env` at request time, so
 * the moment the var is added (and the serverless function cold-starts with
 * the new env), the browser can fetch it — no redeploy required.
 *
 * Auth
 * ----
 * No auth required. The VAPID *public* key is, by design, safe to expose to
 * any client (it's already inlined into the client bundle in the classic
 * setup). The *private* key never leaves the server.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    null;

  return NextResponse.json(
    { publicKey },
    {
      headers: {
        // Public key is safe to cache briefly — cuts a round-trip on repeat
        // visits. 5 min is short enough that a newly-configured key shows up
        // quickly without forcing a full page reload.
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}

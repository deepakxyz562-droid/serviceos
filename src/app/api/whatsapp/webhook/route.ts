import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * /api/whatsapp/webhook — DEPRECATED (410 Gone)
 * ─────────────────────────────────────────────────────────────────────────
 * This was the legacy WhatsApp inbound webhook route. It has been superseded
 * by /api/whatsapp/callback, which:
 *   - Verifies the X-Hub-Signature-256 header (fail-closed — rejects unsigned
 *     payloads, required for Meta App Review)
 *   - Routes inbound messages through the O1 Omnichannel canonical path
 *     (UnifiedMessage + Conversation + ChannelConnection)
 *   - Supports both template and free-form message handling
 *
 * Point your Meta App Dashboard webhook URL at:
 *   https://yourdomain.com/api/whatsapp/callback
 *
 * This route now returns 410 Gone so callers know to update their config.
 * The GET verification endpoint is preserved (read-only) so existing Meta
 * webhook subscriptions don't break during the migration window.
 */

// GET — Webhook verification (kept for backward compat with existing
// Meta subscriptions that still point at /webhook.)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error('[whatsapp/webhook] WHATSAPP_VERIFY_TOKEN not set — rejecting verification');
    return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 500 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — DEPRECATED. Returns 410 Gone.
// Use /api/whatsapp/callback instead (it verifies X-Hub-Signature-256).
export async function POST() {
  return NextResponse.json(
    {
      error: 'This webhook endpoint is deprecated.',
      migratedTo: '/api/whatsapp/callback',
      reason:
        'This legacy route did not verify the X-Hub-Signature-256 header and was a spoofing risk. Update your Meta App Dashboard webhook URL to /api/whatsapp/callback.',
    },
    { status: 410 },
  );
}

import { NextRequest, NextResponse } from 'next/server'
import {
  normalizeEspEvents,
  verifyEspSignature,
  applyCanonicalEvent,
  type EspProvider,
} from '@/lib/email-webhooks'

/**
 * POST /api/webhooks/email/[provider]
 *
 * ESP webhook ingestion endpoint. Each EmailProvider's webhook should be
 * configured to POST events here with the matching provider name:
 *
 *   SendGrid  → /api/webhooks/email/sendgrid
 *   Resend    → /api/webhooks/email/resend
 *   Mailgun   → /api/webhooks/email/mailgun
 *   Postmark  → /api/webhooks/email/postmark
 *   Amazon SES→ /api/webhooks/email/ses   (via SNS HTTPS subscription)
 *   Brevo     → /api/webhooks/email/brevo
 *
 * The endpoint:
 *   1. Reads the raw body (NOT the parsed JSON) — signature verification
 *      requires the exact bytes the ESP sent.
 *   2. Verifies the per-ESP signature/secret (when the matching env var is
 *      set; otherwise the request is accepted for local dev).
 *   3. Normalizes the ESP-specific JSON shape into a canonical event list.
 *   4. Applies each event (update CampaignMessage + Campaign counters +
 *      EmailEvent ledger; for complaints/unsubscribes, also calls
 *      applyUnsubscribe() to update Contact/Customer consent state).
 *
 * Always returns 200 OK with a summary — ESPs will retry on non-2xx and we
 * don't want duplicate event application on a transient DB error.
 *
 * Auth: NO session/auth — this is a public endpoint hit by external ESPs.
 * Security is provided by per-ESP signature verification (env-var-driven).
 */
const VALID_PROVIDERS: EspProvider[] = [
  'sendgrid',
  'resend',
  'mailgun',
  'postmark',
  'ses',
  'brevo',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await params
  const provider = String(rawProvider || '').toLowerCase() as EspProvider

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { ok: false, error: `Unknown ESP provider: ${rawProvider}` },
      { status: 404 },
    )
  }

  // ── Read the raw body — signature verification needs the exact bytes ──
  const bodyText = await request.text()

  // ── Signature verification (skipped when the matching env var is unset) ──
  const verified = verifyEspSignature(provider, bodyText, request.headers)
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: 'Signature verification failed' },
      { status: 401 },
    )
  }

  // ── Parse the JSON body ──
  let parsed: unknown
  try {
    parsed = JSON.parse(bodyText)
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 },
    )
  }

  // ── Normalize ──
  const events = normalizeEspEvents(provider, parsed)
  if (events.length === 0) {
    return NextResponse.json({ ok: true, applied: 0, skipped: 0 })
  }

  // ── Apply each event (best-effort, sequential) ──
  let applied = 0
  let failed = 0
  for (const ev of events) {
    try {
      await applyCanonicalEvent(ev)
      applied++
    } catch (err) {
      console.warn(`[email-webhooks] apply failed for ${ev.type} → ${ev.recipientEmail}:`, err)
      failed++
    }
  }

  return NextResponse.json({
    ok: true,
    provider,
    received: events.length,
    applied,
    failed,
  })
}

/**
 * GET /api/webhooks/email/[provider]
 *
 * Returns a tiny HTML page describing the webhook URL — useful for ESP
 * configuration UIs that require an HTTP 200 on GET before saving the
 * webhook subscription (Postmark does this).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  return new NextResponse(
    `<!doctype html><html><body style="font-family:monospace;padding:24px">
<h3>ESP Webhook endpoint</h3>
<p>Provider: <strong>${provider}</strong></p>
<p>Method: POST</p>
<p>This endpoint is live and ready to receive events.</p>
</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

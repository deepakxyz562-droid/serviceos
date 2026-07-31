import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { applyUnsubscribe, recordEmailEvent } from '@/lib/email-consent'

/**
 * Public unsubscribe endpoint — NO AUTH.
 *
 * Two access modes (RFC 8058 One-Click Unsubscribe compliant):
 *
 *   GET  /api/public/unsubscribe?t=TOKEN
 *     Returns a minimal HTML landing page showing the recipient's subscription
 *     status with a "Confirm Unsubscribe" button. This is what a human sees
 *     when they click the unsubscribe link in an email.
 *
 *   POST /api/public/unsubscribe?t=TOKEN
 *     Immediately marks the recipient as unsubscribed. This covers BOTH:
 *       - RFC 8058 one-click: the ESP POSTs automatically when the user clicks
 *         the "Unsubscribe" button Gmail/Outlook render in the UI.
 *       - Form submit: the landing page's confirm button POSTs here.
 *     Returns a confirmation HTML page (or JSON if Accept: application/json).
 *
 * The token is looked up in EmailUnsubscribeToken. Once consumed, the token's
 * usedAt is set so it can't be replayed, but the endpoint is idempotent —
 * repeated POSTs just re-confirm the already-unsubscribed state.
 */

function htmlPage(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px;display:flex;min-height:100vh;box-sizing:border-box;align-items:center;justify-content:center}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;max-width:480px;width:100%;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  h1{font-size:20px;margin:0 0 12px}
  p{font-size:14px;line-height:1.6;color:#475569;margin:0 0 16px}
  .btn{display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;border:none;cursor:pointer}
  .btn:hover{background:#0d5f58}
  .muted{font-size:12px;color:#94a3b8;margin-top:16px}
</style>
</head>
<body>
<div class="card">${bodyHtml}</div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('t')
  if (!token) {
    return new NextResponse(
      htmlPage('Invalid Link', '<h1>Invalid link</h1><p>This unsubscribe link is missing a token. Please use the unsubscribe link from your email.</p>'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  let email = 'your email address'
  let alreadyUnsubscribed = false
  try {
    const row = await db.emailUnsubscribeToken.findUnique({ where: { token } })
    if (row) {
      email = row.recipientEmail
      alreadyUnsubscribed = !!row.usedAt
    }
  } catch {
    /* ignore */
  }

  const body = alreadyUnsubscribed
    ? `<h1>You're already unsubscribed</h1><p>You will not receive further marketing emails at <strong>${email}</strong>.</p>`
    : `<h1>Unsubscribe from marketing emails</h1><p>Confirm that you no longer want to receive marketing emails at <strong>${email}</strong>. You'll still receive transactional messages (invoices, quotes, appointment reminders) about your account.</p><form method="POST" action="/api/public/unsubscribe?t=${encodeURIComponent(token)}"><button class="btn" type="submit">Unsubscribe me</button></form><p class="muted">This link is unique to you. Do not forward this email.</p>`

  return new NextResponse(
    htmlPage('Unsubscribe', body),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('t')

  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 })
  }

  let recipientEmail = ''
  let campaignId: string | null = null
  let tenantId: string | null = null

  try {
    const row = await db.emailUnsubscribeToken.findUnique({ where: { token } })
    if (!row) {
      return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 404 })
    }
    recipientEmail = row.recipientEmail
    campaignId = row.campaignId
    tenantId = row.tenantId

    // Idempotently mark the token as consumed.
    if (!row.usedAt) {
      try {
        await db.emailUnsubscribeToken.update({
          where: { id: row.id },
          data: { usedAt: new Date() },
        })
      } catch { /* non-fatal */ }
    }
  } catch (err) {
    console.error('[unsubscribe] token lookup failed:', err)
    return NextResponse.json({ ok: false, error: 'lookup failed' }, { status: 500 })
  }

  // Apply the opt-out across Contact + Customer tables.
  await applyUnsubscribe(recipientEmail, 'unsubscribe_page')

  // Record the engagement event.
  await recordEmailEvent({
    type: 'unsubscribe',
    campaignId,
    recipientEmail,
    token,
    tenantId,
    userAgent: request.headers.get('user-agent'),
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  })

  // If the caller wants JSON (ESP webhook), return JSON; otherwise return HTML.
  const accept = request.headers.get('accept') || ''
  if (accept.includes('application/json')) {
    return NextResponse.json({ ok: true, unsubscribed: recipientEmail })
  }

  return new NextResponse(
    htmlPage(
      'Unsubscribed',
      `<h1>You're unsubscribed</h1><p>You will no longer receive marketing emails at <strong>${recipientEmail}</strong>.</p><p class="muted">You may still receive transactional messages about your account (invoices, quotes, appointment reminders).</p>`,
    ),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

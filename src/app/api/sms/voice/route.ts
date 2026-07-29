import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/sms/voice
 *
 * Twilio voice webhook endpoint. When someone CALLS one of our tenant-owned
 * phone numbers, Twilio POSTs form-encoded data and expects TwiML back telling
 * it what to do with the call.
 *
 * Behaviour:
 *   • If the called number has `forwardToPhone` set → return TwiML with a
 *     <Dial> that forwards the call to that number.
 *   • Else if `forwardToVoicemail` is true → return TwiML with a <Say>
 *     voicemail greeting + a <Record> verb.
 *   • Else → return a generic greeting (<Say>) + <Hangup>.
 *
 * Auth: NONE — public webhook (called by Twilio). Safe because we only act
 * on phone numbers we own (verified by `To` matching a PhoneNumber row).
 *
 * Content-Type: text/xml (TwiML).
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const params = new URLSearchParams(rawBody)
    const to = params.get('To') || ''
    const from = params.get('From') || ''
    const callSid = params.get('CallSid') || ''

    if (!to) {
      return new NextResponse(
        '<Response><Say>Invalid request: missing To number.</Say></Response>',
        { status: 400, headers: { 'Content-Type': 'text/xml' } },
      )
    }

    const phoneRow = await db.phoneNumber.findUnique({ where: { number: to } })

    if (!phoneRow) {
      // Not one of our numbers — return empty TwiML so Twilio doesn't retry.
      console.warn('[/api/sms/voice] Voice call to unknown number:', to)
      return new NextResponse('<Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Update lastUsedAt (best-effort)
    try {
      await db.phoneNumber.update({
        where: { id: phoneRow.id },
        data: { lastUsedAt: new Date() },
      })
    } catch (err) {
      console.warn('[/api/sms/voice] lastUsedAt update failed:', err)
    }

    // ── Forward ─────────────────────────────────────────────────────────
    if (phoneRow.forwardToPhone) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(to)}">${escapeXml(phoneRow.forwardToPhone)}</Dial>
</Response>`
      // Record the call attempt on the customer timeline if we can match the
      // caller to a Customer. Best-effort — never blocks the TwiML response.
      void logVoiceActivity(phoneRow.tenantId, from, to, 'voice_call_forwarded', `Call from ${from} forwarded to ${phoneRow.forwardToPhone}`, callSid).catch(() => {})
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // ── Voicemail ───────────────────────────────────────────────────────
    if (phoneRow.forwardToVoicemail) {
      const businessName = phoneRow.displayName || 'ServiceOS'
      const greeting = `Hello, you have reached ${businessName}. Please leave a message after the beep.`
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(greeting)}</Say>
  <Record maxLength="120" playBeep="true" transcribe="true" />
</Response>`
      void logVoiceActivity(phoneRow.tenantId, from, to, 'voice_voicemail_left', `Voicemail left by ${from}`, callSid).catch(() => {})
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // ── Generic greeting ────────────────────────────────────────────────
    const businessName = phoneRow.displayName || 'ServiceOS'
    const greeting = `Hello, you have reached ${businessName}. The person you are trying to reach is unavailable. Please send a text message to this number, or try again later. Goodbye.`
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(greeting)}</Say>
  <Hangup />
</Response>`
    void logVoiceActivity(phoneRow.tenantId, from, to, 'voice_call_missed', `Missed call from ${from}`, callSid).catch(() => {})
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[/api/sms/voice] Error:', err)
    // Return valid empty TwiML so Twilio doesn't retry
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}

/**
 * Log a voice event to the ActivityLog (best-effort, fire-and-forget). Only
 * logs if the caller can be matched to a Customer by phone.
 */
async function logVoiceActivity(
  tenantId: string | null,
  from: string,
  to: string,
  action: string,
  description: string,
  callSid: string,
): Promise<void> {
  if (!tenantId) return
  const customer = await db.customer.findFirst({
    where: { phone: from },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true },
  })
  if (!customer) return

  await db.activityLog.create({
    data: {
      tenantId,
      actorType: 'system',
      action,
      entityType: 'customer',
      entityId: customer.id,
      entityName: customer.name,
      description,
      metadataJson: JSON.stringify({ from, to, callSid }),
      severity: 'info',
    },
  })
}

/**
 * GET /api/sms/voice — health/info endpoint for monitoring.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/sms/voice',
    description: 'Twilio voice webhook endpoint. POST receives form-encoded voice call events and returns TwiML.',
    auth: 'none (public webhook)',
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { normalizeClickDestination, recordTokenClickEvent } from '@/lib/email-consent'

/**
 * Click-redirect endpoint — NO AUTH.
 *
 * Every external http(s) link in a marketing email body is rewritten to:
 *   /api/email/click/[token]?u=<original-url-encoded>
 *
 * On GET we record a 'click' EmailEvent, bump the campaign's clickedCount
 * (once per recipient), then 302 redirect to the original URL (or 200 JSON
 * when `beacon=1` is passed by native App Link / Universal Link opens).
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const url = new URL(request.url)
  const rawDestination = url.searchParams.get('u')

  if (!rawDestination) {
    return NextResponse.json({ ok: false, error: 'missing u param' }, { status: 400 })
  }

  const destination = normalizeClickDestination(rawDestination)
  if (!destination) {
    return NextResponse.json({ ok: false, error: 'invalid destination url' }, { status: 400 })
  }

  await recordTokenClickEvent({
    token,
    destination,
    userAgent: request.headers.get('user-agent'),
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  })

  if (url.searchParams.get('beacon') === '1') {
    return NextResponse.json({ ok: true })
  }

  // Always redirect — don't punish the user for a tracking failure.
  return NextResponse.redirect(destination, { status: 302 })
}

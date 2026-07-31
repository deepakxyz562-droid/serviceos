import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recordEmailEvent } from '@/lib/email-consent'

/**
 * Click-redirect endpoint — NO AUTH.
 *
 * Every http(s) link in a marketing email body is rewritten to:
 *   /api/email/click/[token]?u=<original-url-encoded>
 *
 * On GET we record a 'click' EmailEvent, bump the campaign's clickedCount
 * (once per recipient), then 302 redirect to the original URL.
 *
 *   GET /api/email/click/[token]?u=https%3A%2F%2Fexample.com%2Fpromo
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const url = new URL(request.url)
  const destination = url.searchParams.get('u')

  if (!destination) {
    return NextResponse.json({ ok: false, error: 'missing u param' }, { status: 400 })
  }

  try {
    const row = await db.emailUnsubscribeToken.findUnique({ where: { token } })
    if (row) {
      await recordEmailEvent({
        type: 'click',
        campaignId: row.campaignId,
        recipientEmail: row.recipientEmail,
        token,
        url: destination,
        tenantId: row.tenantId,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      })

      if (row.campaignId) {
        try {
          const updated = await db.campaignMessage.updateMany({
            where: {
              campaignId: row.campaignId,
              recipientEmail: row.recipientEmail,
              clickedAt: null,
            },
            data: { clickedAt: new Date() },
          })
          if (updated.count > 0) {
            await db.campaign.update({
              where: { id: row.campaignId },
              data: { clickedCount: { increment: 1 } },
            })
          }
        } catch {
          /* non-fatal */
        }
      }
    }
  } catch (err) {
    console.error('[email/click] failed:', err)
  }

  // Always redirect — don't punish the user for a tracking failure.
  return NextResponse.redirect(destination, { status: 302 })
}

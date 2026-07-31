import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recordEmailEvent } from '@/lib/email-consent'

/**
 * Open-pixel endpoint — NO AUTH.
 *
 * Email clients fetch this 1x1 transparent PNG when a recipient opens a
 * marketing email. We record an 'open' EmailEvent and bump the campaign's
 * readCount (idempotent per token — only the FIRST open bumps the counter,
 * subsequent opens are recorded as events but don't inflate the metric).
 *
 *   GET /api/email/open/[token]/pixel.png
 */

// 1x1 transparent PNG (base64-decoded into a static buffer).
const PIXEL_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const PIXEL_BYTES = Buffer.from(PIXEL_B64, 'base64')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  try {
    const row = await db.emailUnsubscribeToken.findUnique({ where: { token } })
    if (row) {
      // Record the raw event always.
      await recordEmailEvent({
        type: 'open',
        campaignId: row.campaignId,
        recipientEmail: row.recipientEmail,
        token,
        tenantId: row.tenantId,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      })

      // Bump the campaign aggregate ONCE (only when there's no CampaignMessage
      // already marked read for this token, to avoid double-counting opens from
      // preview panes that load the image multiple times).
      if (row.campaignId) {
        try {
          // Use a conditional update via updateMany on CampaignMessage: only
          // update rows where readAt is null. If 0 rows updated, the open was
          // already counted — don't bump the Campaign.readCount.
          const updated = await db.campaignMessage.updateMany({
            where: {
              campaignId: row.campaignId,
              recipientEmail: row.recipientEmail,
              readAt: null,
            },
            data: { readAt: new Date(), status: 'read' },
          })
          if (updated.count > 0) {
            await db.campaign.update({
              where: { id: row.campaignId },
              data: { readCount: { increment: 1 } },
            })
          }
        } catch {
          /* non-fatal */
        }
      }
    }
  } catch (err) {
    console.error('[email/open] failed:', err)
  }

  return new NextResponse(PIXEL_BYTES, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

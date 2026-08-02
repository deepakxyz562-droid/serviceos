import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/credits/email-usage
 * Returns the current email usage status for the authenticated user's tenant.
 * Used to display "132 / 500" quota in the Communication Settings UI.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        emailQuota: true,
        emailUsageCount: true,
        ownEmailProviderConnected: true,
        status: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({
        emailQuota: 500,
        emailUsageCount: 0,
        ownEmailProviderConnected: false,
      })
    }

    return NextResponse.json({
      emailQuota: subscription.emailQuota,
      emailUsageCount: subscription.emailUsageCount,
      ownEmailProviderConnected: subscription.ownEmailProviderConnected,
    })
  } catch (error) {
    console.error('[Credits] Failed to get email usage:', error)
    return NextResponse.json({ error: 'Failed to get email usage' }, { status: 500 })
  }
}

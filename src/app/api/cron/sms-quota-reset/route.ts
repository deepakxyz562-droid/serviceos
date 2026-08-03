import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * POST /api/cron/sms-quota-reset
 *
 * Runs monthly on the 1st at 00:05 UTC. Resets every subscription's
 * smsUsageCount back to 0 so tenants get their fresh monthly SMS quota.
 *
 * Also resets emailUsageCount for consistency (email quota uses the same
 * monthly cycle).
 *
 * Auth: shared secret (CRON_SECRET env).
 *
 * Schedule: 5 0 1 * *  curl -X POST https://your-app/api/cron/sms-quota-reset \
 *                   -H "x-cron-secret: $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request)
    if (!auth.ok) return auth.response

    const result = await db.subscription.updateMany({
      data: {
        smsUsageCount: 0,
        emailUsageCount: 0,
      },
    })

    console.log(
      `[cron:sms-quota-reset] Reset SMS + email usage counters for ${result.count} subscription(s).`
    )

    return NextResponse.json({
      success: true,
      resetCount: result.count,
      resetAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[cron:sms-quota-reset] Failed:', error)
    return NextResponse.json(
      { error: 'Failed to reset SMS quota', detail: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

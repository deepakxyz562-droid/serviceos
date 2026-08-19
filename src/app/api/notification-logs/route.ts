import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notification-logs
 * Fetch recent notification logs for the dispatch dashboard.
 * Query params: type, status, limit (default 50), jobId, employeeId
 *
 * Auth required. Non-super-admins only see logs for their own tenant;
 * super_admin can see all (for platform support).
 *
 * SECURITY NOTE: notification log rows contain `subject`, `message`, and
 * `metadataJson` which may include sensitive content such as the customer
 * verification PIN (when a PIN notification was sent, the PIN is embedded
 * in the message text). This endpoint is therefore restricted to
 * authenticated tenant members — never expose it publicly.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Tenant filter: non-super-admins can only see their own tenant's logs.
    // super_admin can see all (for platform support).
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const jobId = searchParams.get('jobId')
    const employeeId = searchParams.get('employeeId')

    const where: Record<string, unknown> = {}
    if (!user.isSuperAdmin && user.tenantId) {
      where.tenantId = user.tenantId
    }
    if (type) where.type = type
    if (status) where.status = status
    if (jobId) where.jobId = jobId
    if (employeeId) where.employeeId = employeeId

    const logs = await db.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching notification logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notification-logs
 *
 * DEPRECATED (410 Gone) — as of the PIN notification pipeline refactor.
 *
 * The previous "resend" action (body.id) was a no-op: it created a new log
 * row with status 'sent' without actually re-sending any notification.
 * Real resends now go through the dedicated endpoint:
 *   POST /api/jobs/[id]/resend-pin  (returns { ok: true, channel } only)
 *
 * Creating raw notification log rows is now an internal-only operation
 * performed by the notification pipeline itself (notifyCustomerVerificationPin
 * and related functions write to NotificationLog directly).
 *
 * This endpoint is kept as a 410 to avoid breaking old clients while
 * signalling that the contract has changed.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Use POST /api/jobs/[id]/resend-pin for PIN resends.',
      deprecated: true,
    },
    { status: 410 }
  )
}

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { issueCustomerMagicLink } from '@/lib/customer-magic-link'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/customer/magic-link
 * ──────────────────────────────────
 * Staff-only endpoint to issue a customer magic-link URL on demand.
 * The primary consumer is server-side libs (invoice-automation,
 * notification-orchestrator, portal enable/resend) which call the
 * `issueCustomerMagicLink` lib directly without an HTTP round-trip.
 * This route exists for cases where the staff UI needs a link generated
 * (e.g. a "Copy portal link" button).
 *
 * Body: { customerId: string, redirect?: string, expiresInHours?: number }
 * Auth: staff roles only (owner / admin / manager / employee / super_admin)
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (
      !['owner', 'admin', 'manager', 'employee', 'super_admin'].includes(
        user.role
      )
    ) {
      return NextResponse.json(
        { error: 'Forbidden. Only staff can issue customer magic links.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { customerId, redirect, expiresInHours } = body as {
      customerId?: string
      redirect?: string
      expiresInHours?: number
    }

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      )
    }

    const result = await issueCustomerMagicLink({
      customerId,
      redirect,
      expiresInHours,
      request,
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      token: result.token,
      expiresAt: result.expiresAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Distinguish "customer not found" from genuine server errors
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('[magic-link/issue]', err)
    return NextResponse.json(
      { error: 'Failed to issue magic link' },
      { status: 500 }
    )
  }
}

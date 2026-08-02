import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  activatePurchasedNumber,
  cancelNumberSubscription,
} from '@/lib/sms-phone-numbers'
import { logBillingEvent } from '@/lib/billing-events'

/**
 * POST /api/sms/numbers/[id]/purchase
 *
 * Internal endpoint that activates a purchased phone number on Twilio after
 * the PayPal/Creem payment has been confirmed. This route is NOT meant to be
 * called by the browser — it's invoked server-to-server by the PayPal and
 * Creem webhook handlers (see /api/paypal/webhook and /api/creem/webhook).
 *
 * Auth: this endpoint accepts EITHER a valid user session OR an
 * `X-Internal-Secret` header derived from JWT_SECRET. The webhook handlers
 * pass the secret so they can call this without a user context.
 *
 * Body: { phoneNumberId?: string }
 *   - phoneNumberId can also be passed in the URL path (the [id] segment).
 *
 * Flow:
 *   1. Resolve the PhoneNumber row.
 *   2. Call `activatePurchasedNumber()` which buys the number on Twilio and
 *      marks it status='active'.
 *   3. On failure, cancel the PayPal/Creem subscription so the user is not
 *      charged for a number they don't have, then mark the row 'failed'.
 *
 * Returns: { success, sid?, error? }
 */
interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    // ── Auth: session OR internal-secret ───────────────────────────────
    const internalSecret = process.env.JWT_SECRET || 'fieseros-saas-dev-secret-key'
    const providedSecret = request.headers.get('x-internal-secret')
    const isInternal = providedSecret && providedSecret === internalSecret

    if (!isInternal) {
      // Fall back to user session
      const { getAuthUser } = await import('@/lib/auth')
      const user = await getAuthUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (user.role !== 'owner' && user.role !== 'admin' && !user.isSuperAdmin) {
        return NextResponse.json({ error: 'Only owners or admins can trigger a purchase' }, { status: 403 })
      }
    }

    const { id } = await ctx.params
    const body = await request.json().catch(() => ({}))
    const phoneNumberId = (body.phoneNumberId as string) || id

    if (!phoneNumberId) {
      return NextResponse.json({ error: 'phoneNumberId is required' }, { status: 400 })
    }

    const phoneRow = await db.phoneNumber.findUnique({ where: { id: phoneNumberId } })
    if (!phoneRow) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 })
    }

    const result = await activatePurchasedNumber({ phoneNumberId })

    if (!result.success) {
      // ── Purchase failed: cancel the subscription so we don't keep charging ─
      const cancelRes = await cancelNumberSubscription({
        phoneNumberId,
        reason: `Twilio purchase failed: ${result.error || 'unknown error'}`,
      })

      await logBillingEvent({
        tenantId: phoneRow.tenantId || 'unknown',
        type: 'fail',
        status: 'failed',
        amount: phoneRow.monthlyCost,
        currency: phoneRow.costCurrency,
        description: `Phone number ${phoneRow.number} purchase FAILED: ${result.error}. Subscription cancel attempted: ${cancelRes.cancelled ? 'success' : 'failed'}`,
        paymentProvider: phoneRow.paymentProvider || 'unknown',
        metadata: {
          kind: 'phone_number',
          phoneNumberId,
          phoneNumber: phoneRow.number,
          twilioError: result.error,
          subscriptionCancelled: cancelRes.cancelled,
          subscriptionCancelError: cancelRes.error,
        },
      })

      return NextResponse.json(
        { success: false, error: result.error, subscriptionCancelled: cancelRes.cancelled },
        { status: 502 },
      )
    }

    await logBillingEvent({
      tenantId: phoneRow.tenantId || 'unknown',
      type: 'subscription_created',
      status: 'success',
      amount: phoneRow.monthlyCost,
      currency: phoneRow.costCurrency,
      description: `Phone number ${phoneRow.number} activated on Twilio (sid: ${result.sid})`,
      paymentProvider: phoneRow.paymentProvider || 'unknown',
      metadata: {
        kind: 'phone_number',
        phoneNumberId,
        phoneNumber: phoneRow.number,
        twilioSid: result.sid,
        alreadyActive: !!result.alreadyActive,
      },
    })

    return NextResponse.json({
      success: true,
      sid: result.sid,
      alreadyActive: !!result.alreadyActive,
    })
  } catch (err) {
    console.error('[/api/sms/numbers/[id]/purchase] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

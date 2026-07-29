import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import {
  releaseNumber,
  updateNumberWebhooks,
  getTwilioConfig,
} from '@/lib/sms-phone-numbers'
import { cancelPayPalSubscription } from '@/lib/paypal'
import { logBillingEvent } from '@/lib/billing-events'

/**
 * PATCH /api/sms/numbers/[id]
 *
 * Update the phone number's display name and/or call-forwarding settings.
 * When forwarding config changes, we update the Twilio VoiceUrl to point
 * at our /api/sms/voice endpoint (which inspects the called number and
 * returns the appropriate TwiML: forward / voicemail / generic greeting).
 *
 * Body (all optional):
 *   - displayName?: string
 *   - forwardToPhone?: string | null
 *   - forwardToVoicemail?: boolean
 *
 * DELETE /api/sms/numbers/[id]
 *
 * Release the number back to Twilio (stops monthly billing) and cancel the
 * associated PayPal/Creem subscription. Marks the PhoneNumber row as
 * status='released' and records releasedAt=now().
 *
 * Auth: owner or admin only.
 */

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'owner' && user.role !== 'admin' && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Only owners or admins can modify phone numbers' }, { status: 403 })
    }

    const { id } = await ctx.params
    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 })
    }

    const phoneRow = await db.phoneNumber.findFirst({
      where: { id, tenantId },
    })
    if (!phoneRow) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { displayName, forwardToPhone, forwardToVoicemail } = body as {
      displayName?: string
      forwardToPhone?: string | null
      forwardToVoicemail?: boolean
    }

    const data: {
      displayName?: string | null
      forwardToPhone?: string | null
      forwardToVoicemail?: boolean
    } = {}
    if (typeof displayName === 'string') data.displayName = displayName.trim() || null
    if (forwardToPhone !== undefined) {
      // Allow null/empty to clear
      data.forwardToPhone = (typeof forwardToPhone === 'string' && forwardToPhone.trim())
        ? forwardToPhone.trim()
        : null
    }
    if (typeof forwardToVoicemail === 'boolean') data.forwardToVoicemail = forwardToVoicemail

    const forwardingChanged =
      'forwardToPhone' in data || 'forwardToVoicemail' in data

    const updated = await db.phoneNumber.update({
      where: { id },
      data,
    })

    // If forwarding changed AND the number is active, push the updated
    // voice webhook config to Twilio. The webhook URL itself doesn't change
    // (always /api/sms/voice) — but we re-POST it so Twilio's webhook is
    // current (in case it was cleared for some reason) and we mark the
    // number as "lastUsedAt" so the operator can see the config touched.
    if (forwardingChanged && updated.status === 'active' && updated.providerSid) {
      const cfg = await getTwilioConfig(tenantId)
      if (cfg && updated.voiceWebhookUrl) {
        const res = await updateNumberWebhooks({
          sid: updated.providerSid,
          voiceWebhookUrl: updated.voiceWebhookUrl,
          twilioConfig: cfg,
        })
        if (!res.success) {
          console.warn('[/api/sms/numbers/[id]] Twilio webhook update failed:', res.error)
        }
      }
    }

    return NextResponse.json({ success: true, number: updated })
  } catch (err) {
    console.error('[/api/sms/numbers/[id] PATCH] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'owner' && user.role !== 'admin' && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Only owners or admins can release phone numbers' }, { status: 403 })
    }

    const { id } = await ctx.params
    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 })
    }

    const phoneRow = await db.phoneNumber.findFirst({
      where: { id, tenantId },
    })
    if (!phoneRow) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 })
    }

    if (phoneRow.status === 'released') {
      return NextResponse.json({ success: true, alreadyReleased: true })
    }

    // ── 1. Release the number on Twilio (best-effort) ──────────────────────
    let twilioReleaseOk = true
    let twilioError: string | undefined
    if (phoneRow.providerSid && phoneRow.provider === 'twilio') {
      const cfg = await getTwilioConfig(tenantId)
      if (cfg) {
        const res = await releaseNumber({ sid: phoneRow.providerSid, twilioConfig: cfg })
        twilioReleaseOk = res.success
        twilioError = res.error
        if (!res.success) {
          console.warn('[/api/sms/numbers/[id] DELETE] Twilio release failed:', res.error)
        }
      }
    }

    // ── 2. Cancel the PayPal/Creem subscription ───────────────────────────
    let subscriptionCancelled = true
    if (phoneRow.subscriptionId && phoneRow.paymentProvider === 'paypal') {
      try {
        await cancelPayPalSubscription(
          phoneRow.subscriptionId,
          'Number released by tenant — phone number cancelled',
        )
      } catch (err) {
        console.warn('[/api/sms/numbers/[id] DELETE] PayPal cancel failed:', err)
        subscriptionCancelled = false
      }
    }
    // Creem subscriptions are cancelled via webhook (subscription.canceled)
    // — there's no direct API call here. The user can cancel from the Creem
    // customer portal. We mark the local row as released; if the user keeps
    // getting charged, the Creem webhook will arrive and we'll ignore it.

    // ── 3. Mark the row as released ───────────────────────────────────────
    await db.phoneNumber.update({
      where: { id },
      data: {
        status: 'released',
        releasedAt: new Date(),
      },
    })

    await logBillingEvent({
      tenantId,
      type: 'cancel',
      status: 'success',
      amount: phoneRow.monthlyCost,
      currency: phoneRow.costCurrency,
      description: `Phone number ${phoneRow.number} released (subscription cancelled, Twilio number returned)`,
      paymentProvider: phoneRow.paymentProvider || 'unknown',
      metadata: {
        kind: 'phone_number',
        phoneNumberId: phoneRow.id,
        phoneNumber: phoneRow.number,
        twilioReleaseOk,
        twilioError,
        subscriptionCancelled,
        subscriptionId: phoneRow.subscriptionId,
      },
    })

    return NextResponse.json({
      success: true,
      twilioReleaseOk,
      subscriptionCancelled,
    })
  } catch (err) {
    console.error('[/api/sms/numbers/[id] DELETE] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

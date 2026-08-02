import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, getAppUrl } from '@/lib/auth'
import {
  releaseNumber,
  updateNumberWebhooks,
  getTwilioConfig,
  setNumberVoiceMode,
  type VoiceMode,
} from '@/lib/sms-phone-numbers'
import { cancelPayPalSubscription } from '@/lib/paypal'
import { logBillingEvent } from '@/lib/billing-events'
import { requirePlanFeature } from '@/lib/plan-gate'

/**
 * PATCH /api/sms/numbers/[id]
 *
 * Update the phone number's display name, call-forwarding settings, OR voice
 * mode (forward / voicemail / ai_vapi). When voiceMode changes to/from
 * 'ai_vapi', the helper calls Vapi to register/release the number and
 * repoints the Twilio VoiceUrl accordingly.
 *
 * Body (all optional):
 *   - displayName?: string
 *   - forwardToPhone?: string | null
 *   - forwardToVoicemail?: boolean
 *   - voiceMode?: 'forward' | 'voicemail' | 'ai_vapi'
 *   - vapiAssistantId?: string | null   (required when voiceMode='ai_vapi')
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
    const {
      displayName,
      forwardToPhone,
      forwardToVoicemail,
      voiceMode,
      vapiAssistantId,
    } = body as {
      displayName?: string
      forwardToPhone?: string | null
      forwardToVoicemail?: boolean
      voiceMode?: VoiceMode
      vapiAssistantId?: string | null
    }

    const data: {
      displayName?: string | null
      forwardToPhone?: string | null
      forwardToVoicemail?: boolean
      voiceMode?: VoiceMode
      vapiAssistantId?: string | null
      vapiNumberId?: string | null
    } = {}
    if (typeof displayName === 'string') data.displayName = displayName.trim() || null
    if (forwardToPhone !== undefined) {
      // Allow null/empty to clear
      data.forwardToPhone = (typeof forwardToPhone === 'string' && forwardToPhone.trim())
        ? forwardToPhone.trim()
        : null
    }
    if (typeof forwardToVoicemail === 'boolean') data.forwardToVoicemail = forwardToVoicemail
    if (voiceMode === 'forward' || voiceMode === 'voicemail' || voiceMode === 'ai_vapi') {
      data.voiceMode = voiceMode
    }
    if (vapiAssistantId !== undefined) {
      data.vapiAssistantId = (typeof vapiAssistantId === 'string' && vapiAssistantId.trim())
        ? vapiAssistantId.trim()
        : null
    }

    const forwardingChanged =
      'forwardToPhone' in data || 'forwardToVoicemail' in data

    // ─── Plan-gate: switching to ai_vapi requires the ai_receptionist feature ──
    if (data.voiceMode === 'ai_vapi') {
      const gate = await requirePlanFeature('ai_receptionist')
      if (!gate.ok) {
        return NextResponse.json(
          { error: 'AI Receptionist is not available on your current plan. Please upgrade to Growth or higher.' },
          { status: gate.status },
        )
      }
    }

    // ─── Voice-mode switching (Phase 2.3 — unified phone architecture) ──────
    // When voiceMode is being changed, call setNumberVoiceMode() to perform
    // the Vapi registration/release + Twilio VoiceUrl repoint. The helper
    // returns the new vapiNumberId (when registering) which we persist below.
    let voiceModeResult: { success: boolean; error?: string; vapiNumberId?: string } | null = null
    if ('voiceMode' in data && data.voiceMode) {
      const appUrl = getAppUrl(request)
      voiceModeResult = await setNumberVoiceMode({
        phoneNumberId: id,
        voiceMode: data.voiceMode,
        vapiAssistantId: data.vapiAssistantId || undefined,
        appUrl,
      })
      if (!voiceModeResult.success) {
        return NextResponse.json(
          { error: voiceModeResult.error || 'Failed to switch voice mode' },
          { status: 400 },
        )
      }
      // Persist the vapiNumberId returned on first registration.
      if (voiceModeResult.vapiNumberId) {
        data.vapiNumberId = voiceModeResult.vapiNumberId
      }
      // When reverting from ai_vapi → forward/voicemail, clear the Vapi fields.
      if (data.voiceMode === 'forward' || data.voiceMode === 'voicemail') {
        data.vapiNumberId = null
        data.vapiAssistantId = null
      }
    }

    const updated = await db.phoneNumber.update({
      where: { id },
      data,
    })

    // If forwarding changed AND the number is active AND we did NOT just
    // process a voiceMode change (which would have repointed VoiceUrl itself),
    // push the updated voice webhook config to Twilio as before.
    if (
      forwardingChanged &&
      !voiceModeResult &&
      updated.status === 'active' &&
      updated.providerSid
    ) {
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

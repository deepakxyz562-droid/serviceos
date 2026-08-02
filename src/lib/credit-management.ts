/**
 * Credit Management Utility
 *
 * Handles WhatsApp credit checking, deduction, and enforcement
 * for the trial credit system.
 *
 * Flow:
 *   Trial → 10 WhatsApp credits (platform shared API)
 *   Credits exhausted → Connect own Meta account OR Upgrade plan
 *   Paid plans → Unlimited messaging with own providers
 */

import { db } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreditCheckResult {
  allowed: boolean
  reason?: string
  remainingCredits: number
  usedCredits: number
  totalCredits: number
  isTrial: boolean
  ownWhatsappConnected: boolean
  platformWhatsappEnabled: boolean
  planStatus: string
  plan: string
}

export interface CreditDeductResult {
  success: boolean
  remainingCredits: number
  error?: string
}

// ── Credit Check ───────────────────────────────────────────────────────────

/**
 * Check if a tenant is allowed to send a WhatsApp message.
 * Returns credit status and whether the send is allowed.
 */
export async function checkWhatsAppCredits(tenantId: string): Promise<CreditCheckResult> {
  const subscription = await db.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription) {
    return {
      allowed: false,
      reason: 'No subscription found. Please contact support.',
      remainingCredits: 0,
      usedCredits: 0,
      totalCredits: 0,
      isTrial: true,
      ownWhatsappConnected: false,
      platformWhatsappEnabled: false,
      planStatus: 'trial',
      plan: 'starter',
    }
  }

  // Auto-detect WhatsApp connection from CommunicationProvider or Credential
  // Only counts as "own" if it's a non-platform (tenant-owned) provider
  if (!subscription.ownWhatsappConnected) {
    const hasWhatsAppProvider = await db.communicationProvider.findFirst({
      where: {
        tenantId,
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
        isPlatform: false, // Only tenant's own provider counts
      },
    })

    // Also check if they have a platform provider AND have configured it
    // (for backward compat: any WA provider without isPlatform flag)
    const hasAnyWhatsAppProvider = !hasWhatsAppProvider ? await db.communicationProvider.findFirst({
      where: {
        tenantId,
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
      },
    }) : null

    const hasWhatsAppCredential = !hasWhatsAppProvider && !hasAnyWhatsAppProvider ? await db.credential.findFirst({
      where: {
        OR: [
          { type: 'whatsapp' },
          { name: { contains: 'whatsapp' } },
        ],
        workspace: { tenantId },
      },
    }) : null

    if (hasWhatsAppProvider) {
      // Auto-update the subscription flag
      await db.subscription.update({
        where: { id: subscription.id },
        data: { ownWhatsappConnected: true },
      })
      subscription.ownWhatsappConnected = true
    } else if (hasAnyWhatsAppProvider) {
      // Has a WA provider but it might be platform or legacy (no isPlatform set)
      // Don't auto-set ownWhatsappConnected — they may be using platform WA
      // But do log for debugging
      console.log(`[Credits] Tenant ${tenantId} has WA provider(s) but none with isPlatform=false. ownWhatsappConnected stays false.`)
    }
  }

  // Auto-detect email provider connection
  if (!subscription.ownEmailProviderConnected) {
    const hasEmailProvider = await db.emailProvider.findFirst({
      where: {
        tenantId,
        status: 'active',
        isPlatform: false, // Customer's own provider
      },
    })

    if (hasEmailProvider) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { ownEmailProviderConnected: true },
      })
      subscription.ownEmailProviderConnected = true
    }
  }

  const isTrial = subscription.status === 'trial'
  const plan = subscription.plan
  const planStatus = subscription.status

  // ── PLATFORM WHATSAPP REMOVED (Issue 5) ──────────────────────────────
  // The platform no longer provides a shared WhatsApp provider. WhatsApp is
  // strictly BYO (user connects their own Meta Cloud API). The only condition
  // under which WhatsApp sends are allowed is `ownWhatsappConnected === true`.
  //
  // Trial users without own WhatsApp → blocked (must upgrade + connect).
  // Paid users without own WhatsApp → blocked (must connect own Meta API).
  // Any user WITH own WhatsApp connected → unlimited (billed via their own
  //   Meta account, not the platform).
  //
  // The legacy `trialWhatsappCredits` / `platformWhatsappEnabled` fields are
  // kept in the schema for backward compat but no longer gate sending.

  if (subscription.ownWhatsappConnected) {
    return {
      allowed: true,
      remainingCredits: -1, // -1 = unlimited (own Meta account)
      usedCredits: subscription.whatsappUsageCount,
      totalCredits: -1,
      isTrial,
      ownWhatsappConnected: true,
      platformWhatsappEnabled: false,
      planStatus,
      plan,
    }
  }

  // No own WhatsApp connected → block with a clear reason.
  const reason = isTrial
    ? 'WhatsApp is available on paid plans with your own Meta Business Account. Upgrade and connect your WhatsApp to send messages.'
    : 'Connect your own WhatsApp Business Account (Meta Cloud API) to send WhatsApp messages. The platform provides Email, SMS, and Push notifications only.';
  return {
    allowed: false,
    reason,
    remainingCredits: 0,
    usedCredits: subscription.whatsappUsageCount,
    totalCredits: 0,
    isTrial,
    ownWhatsappConnected: false,
    platformWhatsappEnabled: false,
    planStatus,
    plan,
  }
}

// ── Credit Deduction ───────────────────────────────────────────────────────

/**
 * Deduct one WhatsApp credit after a successful send.
 * For users using platform WhatsApp (no own connection), decrements trialWhatsappUsed.
 * For all users, increments whatsappUsageCount (analytics).
 *
 * @param tenantId - The tenant to deduct from
 * @param count - Number of credits to deduct
 * @param isOwnUsage - If true, this is own WA usage (only track usage, don't deduct trial credits)
 */
export async function deductWhatsAppCredit(tenantId: string, count: number = 1, isOwnUsage: boolean = false): Promise<CreditDeductResult> {
  try {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return { success: false, remainingCredits: 0, error: 'No subscription found' }
    }

    const updateData: Record<string, unknown> = {
      whatsappUsageCount: { increment: count },
    }

    // For users using platform WhatsApp (not their own), also increment trial usage
    // This applies to both trial AND paid users who haven't connected their own WA
    // If isOwnUsage is true, the caller already determined this is own WA usage — skip trial deduction
    if (!isOwnUsage && !subscription.ownWhatsappConnected) {
      updateData.trialWhatsappUsed = { increment: count }
    }

    await db.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    })

    // Calculate remaining credits
    let remaining: number
    if (subscription.ownWhatsappConnected) {
      remaining = -1 // unlimited when using own WA
    } else {
      remaining = Math.max(0, subscription.trialWhatsappCredits - subscription.trialWhatsappUsed - count)
    }

    return { success: true, remainingCredits: remaining }
  } catch (error) {
    console.error('[Credits] Failed to deduct WhatsApp credit:', error)
    return { success: false, remainingCredits: 0, error: 'Failed to update credits' }
  }
}

// ── Set Own WhatsApp Connected ─────────────────────────────────────────────

/**
 * Mark that a tenant has connected their own WhatsApp Business account.
 * This removes the credit limit for trial users.
 */
export async function setOwnWhatsappConnected(tenantId: string, connected: boolean): Promise<boolean> {
  try {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) return false

    await db.subscription.update({
      where: { id: subscription.id },
      data: { ownWhatsappConnected: connected },
    })

    return true
  } catch (error) {
    console.error('[Credits] Failed to update WhatsApp connection status:', error)
    return false
  }
}

// ── Set Own Email Provider Connected ───────────────────────────────────────

/**
 * Mark that a tenant has connected their own email provider.
 * Required for marketing/broadcast emails.
 */
export async function setOwnEmailProviderConnected(tenantId: string, connected: boolean): Promise<boolean> {
  try {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) return false

    await db.subscription.update({
      where: { id: subscription.id },
      data: { ownEmailProviderConnected: connected },
    })

    return true
  } catch (error) {
    console.error('[Credits] Failed to update email provider connection status:', error)
    return false
  }
}

// ── Super Admin: Update Trial Credits ──────────────────────────────────────

/**
 * Super admin: Set trial WhatsApp credits for a tenant.
 * Can also adjust platform WhatsApp availability.
 */
export async function updateTrialCredits(
  tenantId: string,
  options: {
    trialWhatsappCredits?: number
    platformWhatsappEnabled?: boolean
    ownWhatsappConnected?: boolean
    ownEmailProviderConnected?: boolean
  }
): Promise<boolean> {
  try {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) return false

    const data: Record<string, unknown> = {}
    if (options.trialWhatsappCredits !== undefined) data.trialWhatsappCredits = options.trialWhatsappCredits
    if (options.platformWhatsappEnabled !== undefined) data.platformWhatsappEnabled = options.platformWhatsappEnabled
    if (options.ownWhatsappConnected !== undefined) data.ownWhatsappConnected = options.ownWhatsappConnected
    if (options.ownEmailProviderConnected !== undefined) data.ownEmailProviderConnected = options.ownEmailProviderConnected

    await db.subscription.update({
      where: { id: subscription.id },
      data,
    })

    return true
  } catch (error) {
    console.error('[Credits] Failed to update trial credits:', error)
    return false
  }
}

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
  const isPaid = ['active'].includes(subscription.status)
  const plan = subscription.plan
  const planStatus = subscription.status

  // ── Paid plans: Unlimited if own WhatsApp connected ─────────────────
  if (isPaid && subscription.ownWhatsappConnected) {
    return {
      allowed: true,
      remainingCredits: -1, // -1 = unlimited
      usedCredits: subscription.whatsappUsageCount,
      totalCredits: -1,
      isTrial: false,
      ownWhatsappConnected: true,
      platformWhatsappEnabled: subscription.platformWhatsappEnabled,
      planStatus,
      plan,
    }
  }

  // ── Paid plans without own WhatsApp: still need Meta connection ──────
  if (isPaid && !subscription.ownWhatsappConnected) {
    // Allow platform WhatsApp for paid users who haven't connected yet
    if (subscription.platformWhatsappEnabled) {
      return {
        allowed: true,
        remainingCredits: -1, // unlimited for paid using platform
        usedCredits: subscription.whatsappUsageCount,
        totalCredits: -1,
        isTrial: false,
        ownWhatsappConnected: false,
        platformWhatsappEnabled: true,
        planStatus,
        plan,
      }
    }

    return {
      allowed: false,
      reason: 'Please connect your WhatsApp Business account to send messages.',
      remainingCredits: 0,
      usedCredits: subscription.whatsappUsageCount,
      totalCredits: 0,
      isTrial: false,
      ownWhatsappConnected: false,
      platformWhatsappEnabled: false,
      planStatus,
      plan,
    }
  }

  // ── Trial users: credit-based ────────────────────────────────────────
  if (isTrial) {
    const totalCredits = subscription.trialWhatsappCredits
    const usedCredits = subscription.trialWhatsappUsed
    const remainingCredits = Math.max(0, totalCredits - usedCredits)

    // If own WhatsApp is connected, unlimited trial messaging via own account
    if (subscription.ownWhatsappConnected) {
      return {
        allowed: true,
        remainingCredits: -1,
        usedCredits,
        totalCredits,
        isTrial: true,
        ownWhatsappConnected: true,
        platformWhatsappEnabled: subscription.platformWhatsappEnabled,
        planStatus,
        plan,
      }
    }

    // Platform WhatsApp with remaining credits
    if (remainingCredits > 0 && subscription.platformWhatsappEnabled) {
      return {
        allowed: true,
        remainingCredits,
        usedCredits,
        totalCredits,
        isTrial: true,
        ownWhatsappConnected: false,
        platformWhatsappEnabled: true,
        planStatus,
        plan,
      }
    }

    // Credits exhausted or platform WhatsApp disabled
    return {
      allowed: false,
      reason: remainingCredits <= 0
        ? 'Your trial WhatsApp credits are exhausted. Connect your own WhatsApp Business account or upgrade your plan to continue messaging.'
        : 'Platform WhatsApp is not available. Please connect your own WhatsApp Business account.',
      remainingCredits,
      usedCredits,
      totalCredits,
      isTrial: true,
      ownWhatsappConnected: false,
      platformWhatsappEnabled: subscription.platformWhatsappEnabled,
      planStatus,
      plan,
    }
  }

  // ── Other statuses (paused, cancelled, expired) ──────────────────────
  return {
    allowed: false,
    reason: `Your subscription is ${subscription.status}. Please ${subscription.status === 'paused' ? 'resume' : 'renew'} your subscription to send messages.`,
    remainingCredits: 0,
    usedCredits: subscription.whatsappUsageCount,
    totalCredits: 0,
    isTrial: false,
    ownWhatsappConnected: subscription.ownWhatsappConnected,
    platformWhatsappEnabled: subscription.platformWhatsappEnabled,
    planStatus,
    plan,
  }
}

// ── Credit Deduction ───────────────────────────────────────────────────────

/**
 * Deduct one WhatsApp credit after a successful send.
 * For trial users, decrements trialWhatsappUsed.
 * For all users, increments whatsappUsageCount.
 */
export async function deductWhatsAppCredit(tenantId: string, count: number = 1): Promise<CreditDeductResult> {
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

    // For trial users, also increment trial usage
    if (subscription.status === 'trial') {
      updateData.trialWhatsappUsed = { increment: count }
    }

    await db.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    })

    const remaining = subscription.status === 'trial'
      ? Math.max(0, subscription.trialWhatsappCredits - subscription.trialWhatsappUsed - count)
      : -1 // unlimited for paid

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

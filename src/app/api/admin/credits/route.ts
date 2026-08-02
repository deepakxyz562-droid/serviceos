import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdminRequest } from '@/lib/admin-auth'
import { updateTrialCredits, checkWhatsAppCredits } from '@/lib/credit-management'
import { db } from '@/lib/db'

/**
 * GET /api/admin/credits?tenantId=xxx
 * Get credit status for a specific tenant (super admin only).
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSuperAdminRequest(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const creditStatus = await checkWhatsAppCredits(tenantId)

    // Also get subscription details
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      creditStatus,
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        trialWhatsappCredits: subscription.trialWhatsappCredits,
        trialWhatsappUsed: subscription.trialWhatsappUsed,
        platformWhatsappEnabled: subscription.platformWhatsappEnabled,
        ownWhatsappConnected: subscription.ownWhatsappConnected,
        ownEmailProviderConnected: subscription.ownEmailProviderConnected,
        whatsappUsageCount: subscription.whatsappUsageCount,
        emailUsageCount: subscription.emailUsageCount,
        whatsappQuota: subscription.whatsappQuota,
        emailQuota: subscription.emailQuota,
      } : null,
    })
  } catch (error) {
    console.error('[Admin Credits] GET error:', error)
    return NextResponse.json({ error: 'Failed to get credit status' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/credits
 * Update credit settings for a tenant (super admin only).
 * Body: { tenantId, trialWhatsappCredits?, platformWhatsappEnabled?, ownWhatsappConnected?, ownEmailProviderConnected? }
 */
export async function PUT(request: NextRequest) {
  try {
    if (!isSuperAdminRequest(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { tenantId, ...options } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const success = await updateTrialCredits(tenantId, options)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
    }

    // Return updated status
    const creditStatus = await checkWhatsAppCredits(tenantId)
    return NextResponse.json({ success: true, creditStatus })
  } catch (error) {
    console.error('[Admin Credits] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
  }
}

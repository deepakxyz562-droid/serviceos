import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

/**
 * GET /api/sms/numbers
 *
 * List all dedicated phone numbers owned by the calling tenant. Includes
 * usage stats (messages sent + received this month) computed from the
 * UnifiedMessage table.
 *
 * Auth: any authenticated user (read-only).
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = user.tenantId
    if (!tenantId) {
      return NextResponse.json({ numbers: [] })
    }

    const numbers = await db.phoneNumber.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })

    if (numbers.length === 0) {
      return NextResponse.json({ numbers: [] })
    }

    // Compute usage stats for the current calendar month for each number.
    // We do this in one query per direction (inbound/outbound) grouped by
    // senderId/recipientId, then merge into the number objects.
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const numberStrings = numbers.map((n) => n.number)

    // Inbound: UnifiedMessage where direction='inbound' AND channel='sms'
    // AND senderId is the customer's number; the recipientId is the tenant's
    // phone number. But to be safe, we OR against senderId/recipientId since
    // some flows may set only one.
    const inboundMessages = await db.unifiedMessage.groupBy({
      by: ['recipientId'],
      where: {
        channel: 'sms',
        direction: 'inbound',
        createdAt: { gte: monthStart },
        recipientId: { in: numberStrings },
      },
      _count: true,
    })

    const outboundMessages = await db.unifiedMessage.groupBy({
      by: ['senderId'],
      where: {
        channel: 'sms',
        direction: 'outbound',
        createdAt: { gte: monthStart },
        senderId: { in: numberStrings },
      },
      _count: true,
    })

    const inboundMap = new Map<string, number>(
      inboundMessages.map((r) => [r.recipientId || '', r._count]),
    )
    const outboundMap = new Map<string, number>(
      outboundMessages.map((r) => [r.senderId || '', r._count]),
    )

    const result = numbers.map((n) => ({
      id: n.id,
      number: n.number,
      displayName: n.displayName,
      provider: n.provider,
      providerSid: n.providerSid,
      capabilities: n.capabilities,
      countryCode: n.countryCode,
      areaCode: n.areaCode,
      locality: n.locality,
      monthlyCost: n.monthlyCost,
      costCurrency: n.costCurrency,
      status: n.status,
      paymentProvider: n.paymentProvider,
      subscriptionId: n.subscriptionId,
      forwardToPhone: n.forwardToPhone,
      forwardToVoicemail: n.forwardToVoicemail,
      smsWebhookUrl: n.smsWebhookUrl,
      voiceWebhookUrl: n.voiceWebhookUrl,
      purchasedAt: n.purchasedAt,
      releasedAt: n.releasedAt,
      lastUsedAt: n.lastUsedAt,
      createdAt: n.createdAt,
      usage: {
        sentThisMonth: outboundMap.get(n.number) || 0,
        receivedThisMonth: inboundMap.get(n.number) || 0,
      },
    }))

    return NextResponse.json({ numbers: result })
  } catch (err) {
    console.error('[/api/sms/numbers] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

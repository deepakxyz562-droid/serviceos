import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * POST /api/chat/simulate-test
 *
 * Creates a realistic incoming visitor chat session for live testing.
 * Perfect for evaluating the Text.com operator console, real-time message stream,
 * AI suggested replies, and human claim handoff workflows without external setup.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user?.tenantId && !user?.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = user.tenantId || null
    const workspaceId = user.workspaceId || null

    // Pick an existing form if available
    let formRecord: { id: string; name: string } | null = null
    try {
      formRecord = await db.form.findFirst({
        where: {
          ...(tenantId ? { tenantId } : { workspaceId }),
        },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
      })
    } catch {
      // optional
    }

    const testScenarios = [
      {
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        phone: '+1 (555) 234-5678',
        message: 'Hello! I saw your services online. Are you available this Saturday morning for residential window cleaning? What is your estimated pricing for a 3-bedroom house?',
      },
      {
        name: 'Michael Davis',
        email: 'mdavis88@outlook.com',
        phone: '+1 (555) 876-5432',
        message: 'Hi there, I need an urgent consultation regarding commercial maintenance. Can someone speak with me or give me a call today?',
      },
      {
        name: 'Elena Rostova',
        email: 'elena.rostova@gmail.com',
        phone: '+1 (555) 432-1098',
        message: 'Good afternoon! Do you offer same-day appointments or emergency service? Please let me know your available slots.',
      },
    ]

    const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)]
    const now = new Date()

    const session = await db.publicChatSession.create({
      data: {
        tenantId,
        workspaceId,
        formId: formRecord?.id || null,
        visitorName: scenario.name,
        visitorEmail: scenario.email,
        visitorPhone: scenario.phone,
        status: 'waiting_for_agent',
        unreadCount: 1,
        lastMessageAt: now,
        metadataJson: JSON.stringify({
          source: 'test_simulation',
          browser: 'Chrome 125 (macOS)',
          device: 'Desktop',
          referrer: 'https://google.com/search?q=local+services',
          currentPage: formRecord ? `https://fieseros.com/form/${formRecord.id}` : 'https://fieseros.com/services',
          ip: '198.51.100.42',
          city: 'San Francisco, CA',
        }),
      },
    })

    // Initial system notice
    await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'system',
        body: formRecord ? `Chat session started from ${formRecord.name}` : 'Chat session started from Website Widget',
      },
    })

    // Escalation prompt
    await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'system',
        body: '🔔 Visitor requested live human agent escalation. Status: Waiting for operator.',
      },
    })

    // Visitor opening message
    const visitorMsg = await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'visitor',
        senderName: scenario.name,
        body: scenario.message,
      },
    })

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        visitorName: session.visitorName,
        visitorEmail: session.visitorEmail,
        visitorPhone: session.visitorPhone,
        status: session.status,
        unreadCount: 1,
        lastMessageAt: session.lastMessageAt,
        createdAt: session.createdAt,
        formId: session.formId,
        formName: formRecord?.name || null,
        lastMessage: {
          body: visitorMsg.body,
          senderType: 'visitor',
          createdAt: visitorMsg.createdAt,
        },
      },
    })
  } catch (error) {
    console.error('[/api/chat/simulate-test] error:', error)
    return NextResponse.json({ error: 'Failed to create test session' }, { status: 500 })
  }
}

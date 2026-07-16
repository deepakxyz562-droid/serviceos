/**
 * Admin Chat — list active visitor chat sessions for the current tenant.
 *
 * GET /api/chat/sessions?status=active|closed|all
 *
 * Returns sessions ordered by lastMessageAt DESC (most recent first).
 * Each session includes the last message for preview.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'active'

  try {
    const where: Record<string, unknown> = { tenantId: user.tenantId }
    if (status !== 'all') {
      where.status = status
    }

    const sessions = await db.publicChatSession.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, senderType: true, createdAt: true },
        },
      },
    })

    const result = sessions.map((s) => ({
      id: s.id,
      visitorName: s.visitorName,
      visitorPhone: s.visitorPhone,
      visitorEmail: s.visitorEmail,
      status: s.status,
      unreadCount: s.unreadCount,
      lastMessageAt: s.lastMessageAt,
      createdAt: s.createdAt,
      lastMessage: s.messages[0] || null,
    }))

    return NextResponse.json({ sessions: result })
  } catch (err) {
    console.error('[chat/sessions] error:', err)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

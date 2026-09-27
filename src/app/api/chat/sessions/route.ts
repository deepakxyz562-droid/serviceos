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
  if (!user?.tenantId && !user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'active'
  const qTenantId = searchParams.get('tenantId')
  const qWorkspaceId = searchParams.get('workspaceId')

  try {
    const where: Record<string, unknown> = {}

    if (user.isSuperAdmin && (qTenantId || qWorkspaceId)) {
      if (qTenantId) where.tenantId = qTenantId
      if (qWorkspaceId) where.workspaceId = qWorkspaceId
    } else {
      const orConds: Record<string, unknown>[] = []
      if (user.tenantId) orConds.push({ tenantId: user.tenantId })
      if (user.workspaceId) orConds.push({ workspaceId: user.workspaceId })

      if (orConds.length > 1) {
        where.OR = orConds
      } else if (orConds.length === 1) {
        Object.assign(where, orConds[0])
      }
    }

    if (status === 'active') {
      where.status = { in: ['active', 'claimed', 'waiting_for_agent'] }
    } else if (status !== 'all') {
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
        form: {
          select: { id: true, name: true },
        },
      },
    })

    console.log(`[chat/sessions] tenantId=${user.tenantId} workspaceId=${user.workspaceId} status=${status} found=${sessions.length}`)

    const result = sessions.map((s) => {
      const sessionMessages = (s as { messages?: Array<{ body: string; senderType: string; createdAt: string }> }).messages
      const sortedMessages = sessionMessages
        ? [...sessionMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : []
      const formData = s as { form?: { id: string; name: string } | null }
      return {
        id: s.id,
        visitorName: s.visitorName,
        visitorPhone: s.visitorPhone,
        visitorEmail: s.visitorEmail,
        status: s.status,
        unreadCount: s.unreadCount,
        lastMessageAt: s.lastMessageAt,
        createdAt: s.createdAt,
        lastMessage: sortedMessages[0] || null,
        formId: s.formId,
        formName: formData?.form?.name || null,
        workspaceId: s.workspaceId,
        metadataJson: s.metadataJson || '{}',
      }
    })

    return NextResponse.json({ sessions: result })
  } catch (err) {
    console.error('[chat/sessions] error:', err)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

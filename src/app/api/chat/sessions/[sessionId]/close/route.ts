/**
 * Admin Chat — close a chat session.
 *
 * POST /api/chat/sessions/[sessionId]/close
 *   → Marks the session as closed (status='closed'), appends a `system`
 *     message noting the chat ended, and returns `{ success, status }`.
 *
 * Mirrors the auth + tenant-scoping pattern of the sibling `/claim` route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await getAuthUser()
  if (!user?.tenantId && !user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  try {
    const orConds: Record<string, unknown>[] = []
    if (user.tenantId) orConds.push({ tenantId: user.tenantId })
    if (user.workspaceId) orConds.push({ workspaceId: user.workspaceId })

    const session = await db.publicChatSession.findFirst({
      where: {
        id: sessionId,
        ...(user.isSuperAdmin ? {} : orConds.length > 1 ? { OR: orConds } : orConds[0] || {}),
      },
    })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await db.publicChatSession.update({
      where: { id: sessionId },
      data: { status: 'closed' },
    })

    await db.publicChatMessage.create({
      data: {
        sessionId,
        senderType: 'system',
        body: 'Chat ended by agent',
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, status: 'closed' })
  } catch (err) {
    console.error('[chat/close] error:', err)
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 })
  }
}

/**
 * Admin Chat — claim or close a chat session.
 *
 * POST /api/chat/sessions/[sessionId]/claim
 *   → Marks session as claimed by the current admin (status='claimed', claimedById=...)
 *
 * POST /api/chat/sessions/[sessionId]/claim?action=close
 *   → Closes the session (status='closed')
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await getAuthUser()
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'claim'

  try {
    const session = await db.publicChatSession.findFirst({
      where: { id: sessionId, tenantId: user.tenantId },
    })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (action === 'close') {
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
    }

    // Default: claim
    await db.publicChatSession.update({
      where: { id: sessionId },
      data: {
        status: 'claimed',
        claimedById: user.employeeId || null,
      },
    })

    return NextResponse.json({ success: true, status: 'claimed' })
  } catch (err) {
    console.error('[chat/claim] error:', err)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

/**
 * Admin Chat — get messages for a session + send admin reply.
 *
 * GET  /api/chat/sessions/[sessionId]/messages?since=ISO_DATE
 *   → Returns all messages (or messages after `since`), ordered ASC.
 *     Marks visitor messages as read (sets readAt).
 *
 * POST /api/chat/sessions/[sessionId]/messages
 *   body: { body: string }
 *   → Saves admin message, resets unreadCount, marks session as claimed.
 *     The socket.io service broadcasts to the visitor in real time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await getAuthUser()
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')

  try {
    // Verify the session belongs to the admin's tenant.
    const session = await db.publicChatSession.findFirst({
      where: { id: sessionId, tenantId: user.tenantId },
    })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { sessionId }
    if (since) {
      where.createdAt = { gt: new Date(since) }
    }

    const messages = await db.publicChatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 500,
    })

    // Mark unread visitor messages as read.
    await db.publicChatMessage.updateMany({
      where: {
        sessionId,
        senderType: 'visitor',
        readAt: null,
      },
      data: { readAt: new Date() },
    }).catch(() => {})

    // Reset unread count for the session.
    if (session.unreadCount > 0) {
      await db.publicChatSession.update({
        where: { id: sessionId },
        data: { unreadCount: 0 },
      }).catch(() => {})
    }

    return NextResponse.json({ messages })
  } catch (err) {
    console.error('[chat/messages GET] error:', err)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await getAuthUser()
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  let body: { body?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!text || text.length > 5000) {
    return NextResponse.json({ error: 'Message body required (max 5000 chars)' }, { status: 400 })
  }

  try {
    // Verify session belongs to tenant.
    const session = await db.publicChatSession.findFirst({
      where: { id: sessionId, tenantId: user.tenantId },
    })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.status === 'closed') {
      return NextResponse.json({ error: 'Session is closed' }, { status: 400 })
    }

    // Create the admin message.
    const message = await db.publicChatMessage.create({
      data: {
        sessionId,
        senderType: 'admin',
        senderId: user.employeeId || user.id,
        senderName: user.name || user.email,
        body: text,
      },
    })

    // Update session: reset unread, bump lastMessageAt, mark as claimed.
    await db.publicChatSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
        unreadCount: 0,
        status: 'claimed',
        claimedById: user.employeeId || null,
      },
    })

    // Note: real-time delivery to the visitor is handled by the socket.io
    // service. The visitor's widget polls as a fallback if socket.io is down.

    return NextResponse.json({ message })
  } catch (err) {
    console.error('[chat/messages POST] error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

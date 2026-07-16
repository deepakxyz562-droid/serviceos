/**
 * Public Chat — visitor closes a chat session.
 *
 * POST /api/public/chat/[sessionId]/close
 *
 * Unauthenticated. Sets session.status='closed' and creates a system
 * message noting the visitor ended the chat.
 *
 * Body: (none required)
 *
 * Returns: { success: true }
 *
 * Idempotent: closing an already-closed session is a no-op (still returns
 * success) so the widget can call this on page unload without worrying
 * about double-calls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' }

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  // Look up the session.
  let session: { id: string; status: string } | null = null
  try {
    session = await db.publicChatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true },
    })
  } catch (err) {
    console.error('[public-chat/close] lookup error:', err)
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 500, headers: CORS_HEADERS },
    )
  }

  if (!session) {
    return NextResponse.json(
      { error: 'Chat session not found' },
      { status: 404, headers: CORS_HEADERS },
    )
  }

  // Idempotent: if already closed, just return success without re-writing
  // the system message.
  if (session.status === 'closed') {
    return NextResponse.json(
      { success: true },
      { headers: CORS_HEADERS },
    )
  }

  try {
    await db.publicChatSession.update({
      where: { id: session.id },
      data: { status: 'closed' },
    })

    await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'system',
        body: 'Chat ended by visitor',
      },
    })

    return NextResponse.json(
      { success: true },
      { headers: CORS_HEADERS },
    )
  } catch (err) {
    console.error('[public-chat/close] update error:', err)
    return NextResponse.json(
      { error: 'Could not close chat session. Please try again.' },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}

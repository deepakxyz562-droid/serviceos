import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { toAgentId, toAgentName, fromAgentId, fromAgentName, reason } = body

    if (!toAgentId || !toAgentName) {
      return NextResponse.json(
        { error: 'toAgentId and toAgentName are required' },
        { status: 400 }
      )
    }

    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const [assignment] = await db.$transaction([
      db.conversationAssignment.create({
        data: {
          conversationId: id,
          toAgentId,
          toAgentName,
          fromAgentId: fromAgentId ?? null,
          fromAgentName: fromAgentName ?? null,
          reason: reason ?? null,
          type: 'assign',
        },
      }),
      db.conversation.update({
        where: { id },
        data: {
          assignedToId: toAgentId,
          assignedToName: toAgentName,
        },
      }),
    ])

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Failed to assign conversation:', error)
    return NextResponse.json(
      { error: 'Failed to assign conversation' },
      { status: 500 }
    )
  }
}

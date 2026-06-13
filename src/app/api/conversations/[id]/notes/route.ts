import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const notes = await db.conversationNote.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Failed to get notes:', error)
    return NextResponse.json(
      { error: 'Failed to get notes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { authorName, body: noteBody, mentions } = body

    if (!authorName || !noteBody) {
      return NextResponse.json(
        { error: 'authorName and body are required' },
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

    const note = await db.conversationNote.create({
      data: {
        conversationId: id,
        authorName,
        body: noteBody,
        mentions: mentions ? JSON.stringify(mentions) : '[]',
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Failed to add note:', error)
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}

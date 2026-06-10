import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const chatbot = await db.chatbot.findUnique({
      where: { id },
    })

    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 })
    }

    return NextResponse.json({ data: chatbot })
  } catch (error) {
    console.error('Error fetching chatbot:', error)
    return NextResponse.json({ error: 'Failed to fetch chatbot' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = { ...body }
    delete updateData.id
    delete updateData.createdAt

    const chatbot = await db.chatbot.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: chatbot })
  } catch (error) {
    console.error('Error updating chatbot:', error)
    return NextResponse.json({ error: 'Failed to update chatbot' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete related sessions first
    await db.chatbotSession.deleteMany({ where: { chatbotId: id } })

    await db.chatbot.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chatbot:', error)
    return NextResponse.json({ error: 'Failed to delete chatbot' }, { status: 500 })
  }
}

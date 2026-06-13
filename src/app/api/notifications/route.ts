import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (channel) where.channel = channel

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Failed to list notifications:', error)
    return NextResponse.json(
      { error: 'Failed to list notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      type,
      channel,
      recipient,
      recipientName,
      subject,
      body: notificationBody,
      metadataJson,
    } = body

    if (!type || !recipient || !notificationBody) {
      return NextResponse.json(
        { error: 'type, recipient, and body are required' },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        type,
        channel: channel ?? 'whatsapp',
        recipient,
        recipientName: recipientName ?? null,
        subject: subject ?? null,
        body: notificationBody,
        status: 'sent',
        sentAt: new Date(),
        metadataJson: metadataJson
          ? typeof metadataJson === 'string'
            ? metadataJson
            : JSON.stringify(metadataJson)
          : null,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Failed to create notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

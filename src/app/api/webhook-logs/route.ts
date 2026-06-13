import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const success = searchParams.get('success')
    const url = searchParams.get('url')

    const where: Record<string, unknown> = {}
    if (success !== null) where.success = success === 'true'
    if (url) where.url = url

    const logs = await db.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Failed to list webhook logs:', error)
    return NextResponse.json(
      { error: 'Failed to list webhook logs' },
      { status: 500 }
    )
  }
}

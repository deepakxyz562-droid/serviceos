import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify the form exists
    const form = await db.wAForm.findUnique({ where: { id } })
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const responses = await db.wAFormResponse.findMany({
      where: { formId: id },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({ data: responses })
  } catch (error) {
    console.error('Error fetching WA form responses:', error)
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
  }
}

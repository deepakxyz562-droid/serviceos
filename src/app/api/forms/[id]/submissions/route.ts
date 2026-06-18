import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const MAX_LIMIT = 200

// Helper: Safe JSON parse with fallback
function safeJsonParse(str: string | null | undefined, fallback: unknown): unknown {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// GET /api/forms/[id]/submissions — List submissions for a form
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify form exists
    const form = await db.form.findUnique({ where: { id } })
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')

    // NaN protection: default to valid numbers if parseInt returns NaN
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10)
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
    const rawLimitClamped = isNaN(rawLimit) || rawLimit < 1 ? 50 : rawLimit
    // Max limit enforcement: cap at MAX_LIMIT
    const limit = Math.min(rawLimitClamped, MAX_LIMIT)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { formId: id }
    if (source) where.source = source

    const [submissions, total] = await Promise.all([
      db.formResponse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.formResponse.count({ where }),
    ])

    // Parse dataJson for each submission safely
    const data = submissions.map((s) => ({
      ...s,
      data: safeJsonParse(s.dataJson, {}),
    }))

    return NextResponse.json({
      data,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Failed to list form submissions:', error)
    return NextResponse.json(
      { error: 'Failed to list form submissions' },
      { status: 500 }
    )
  }
}

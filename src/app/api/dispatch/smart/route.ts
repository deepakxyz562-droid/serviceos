import { NextRequest, NextResponse } from 'next/server'
import { findBestMatch, autoAssign } from '@/lib/smart-dispatch'
import { getAuthUser } from '@/lib/auth'

// POST /api/dispatch/smart - Smart dispatch
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    const { jobId, autoAssign, criteria } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    let result

    if (autoAssign) {
      // Auto-assign the best match
      result = await autoAssign(jobId)
    } else {
      // Just find the best match without assigning
      result = await findBestMatch(jobId, criteria || {})
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error in smart dispatch:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

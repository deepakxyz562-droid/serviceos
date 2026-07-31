import { NextRequest, NextResponse } from 'next/server'
import { JourneyEngine } from '@/lib/journey-engine'
import { verifyCronAuth } from '@/lib/cron-auth'

// POST /api/journey/process-scheduled - Process scheduled actions (cron endpoint)
export async function POST(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request)
    if (!auth.ok) return auth.response

    // Body is unused but consumed for backwards compat
    await request.json().catch(() => ({}))

    // Process all scheduled actions that are due
    const processedCount = await JourneyEngine.processScheduledActions()

    return NextResponse.json({
      success: true,
      processedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing scheduled actions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

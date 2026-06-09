import { NextRequest, NextResponse } from 'next/server'
import { JourneyEngine } from '@/lib/journey-engine'

// POST /api/journey/process-scheduled - Process scheduled actions (cron endpoint)
export async function POST(request: NextRequest) {
  try {
    // Optional: verify a cron secret to prevent unauthorized access
    const body = await request.json().catch(() => ({}))
    const cronSecret = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

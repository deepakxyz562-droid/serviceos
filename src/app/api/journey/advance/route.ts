import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { JourneyEngine } from '@/lib/journey-engine'
import { db } from '@/lib/db'

// POST /api/journey/advance - Advance journey stage
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    const { jobId, stage, triggeredBy, employee } = body

    if (!jobId || !stage) {
      return NextResponse.json(
        { error: 'jobId and stage are required' },
        { status: 400 }
      )
    }

    // Validate stage
    const validStages = ['lead', 'booking', 'assigned', 'en_route', 'in_progress', 'completed', 'review', 'archived', 'cancelled']
    if (!validStages.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage: ${stage}. Valid stages: ${validStages.join(', ')}` },
        { status: 400 }
      )
    }

    // Get current journey for comparison
    const currentJourney = await JourneyEngine.getJourneyForJob(jobId)
    if (!currentJourney) {
      return NextResponse.json(
        { error: `No journey found for job ${jobId}` },
        { status: 404 }
      )
    }

    const previousStage = currentJourney.currentStage

    // Advance the stage using the engine
    await JourneyEngine.advanceStage(jobId, stage as import('@/lib/journey-engine').JourneyStage, {
      triggeredBy: triggeredBy || authUser?.name || 'api',
      ...(employee ? { employee } : {}),
    })

    // Update the DB record
    try {
      let completedStages: unknown[] = []
      try {
        const existing = await db.customerJourney.findFirst({ where: { jobId } })
        if (existing) {
          completedStages = JSON.parse(existing.completedStagesJson || '[]')
        }
      } catch {
        completedStages = []
      }

      // Close previous stage entry
      const lastEntry = completedStages[completedStages.length - 1] as Record<string, unknown> | undefined
      if (lastEntry) {
        lastEntry.exitedAt = new Date().toISOString()
      }

      completedStages.push({
        stage,
        enteredAt: new Date().toISOString(),
        triggeredBy: triggeredBy || authUser?.name || 'api',
      })

      await db.customerJourney.updateMany({
        where: { jobId },
        data: {
          currentStage: stage,
          previousStage: previousStage as string,
          stageChangedAt: new Date(),
          completedStagesJson: JSON.stringify(completedStages),
        },
      })
    } catch (err) {
      console.error('[JourneyAdvance] Failed to update DB record:', err)
    }

    // Get updated journey
    const updatedJourney = await JourneyEngine.getJourneyForJob(jobId)

    return NextResponse.json({
      success: true,
      jobId,
      previousStage,
      newStage: stage,
      journey: updatedJourney,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error advancing journey stage:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

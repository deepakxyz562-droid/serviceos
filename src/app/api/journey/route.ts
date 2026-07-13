import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { JourneyEngine } from '@/lib/journey-engine'
import { cache } from '@/lib/cache'

// 90s cache — journeys change infrequently (only on stage transitions).
const JOURNEY_LIST_CACHE_TTL = 90_000

// GET /api/journey - List journeys with filters
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const jobId = searchParams.get('jobId')
    const customerId = searchParams.get('customerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}

    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId
    }

    if (stage) where.currentStage = stage
    if (jobId) where.jobId = jobId
    if (customerId) where.customerId = customerId

    // PERFORMANCE: cache list queries — the dashboard fetches this on every
    // mount and there's no need to hit the DB for unchanged data.
    const cacheKey = `journey:${authUser?.id || 'anon'}:${authUser?.tenantId || ''}:${stage || ''}:${jobId || ''}:${customerId || ''}:${page}:${limit}`
    const cached = cache.get<{ journeys: unknown[]; pagination: unknown }>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const [journeys, total] = await Promise.all([
      db.customerJourney.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          job: { select: { id: true, title: true, status: true, assigneeName: true } },
          lead: { select: { id: true, name: true, status: true, serviceType: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.customerJourney.count({ where }),
    ])

    const result = {
      journeys,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }

    cache.set(cacheKey, result, JOURNEY_LIST_CACHE_TTL)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing journeys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/journey - Create journey from lead
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    const { leadId, tenantId } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    // Verify the lead exists
    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check if a journey already exists for this lead
    const existingJourney = await db.customerJourney.findUnique({
      where: { leadId },
    })
    if (existingJourney) {
      return NextResponse.json(
        { error: 'A journey already exists for this lead', journeyId: existingJourney.id },
        { status: 409 }
      )
    }

    // Create the journey using the engine
    const journey = await JourneyEngine.createJourney(
      leadId,
      tenantId || authUser?.tenantId || undefined
    )

    // Also create a DB record
    const dbJourney = await db.customerJourney.create({
      data: {
        customerId: lead.customerId,
        jobId: journey.jobId,
        leadId,
        currentStage: 'lead',
        stageChangedAt: new Date(),
        automationActive: true,
        completedStagesJson: JSON.stringify([{ stage: 'lead', enteredAt: new Date().toISOString() }]),
        tenantId: tenantId || authUser?.tenantId || lead.tenantId || null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        job: { select: { id: true, title: true, status: true } },
        lead: { select: { id: true, name: true, status: true } },
      },
    })

    return NextResponse.json({
      journey: {
        ...journey,
        dbRecord: dbJourney,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating journey:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

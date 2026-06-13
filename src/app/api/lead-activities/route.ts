import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/lead-activities — List activities for a lead
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const type = searchParams.get('type')
    const createdById = searchParams.get('createdById')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify lead exists
    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const where: Record<string, unknown> = { leadId }

    if (type) where.type = type
    if (createdById) where.createdById = createdById

    const [activities, total] = await Promise.all([
      db.leadActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.leadActivity.count({ where }),
    ])

    return NextResponse.json({
      data: activities,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        status: lead.status,
        score: lead.score,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to list lead activities:', error)
    return NextResponse.json(
      { error: 'Failed to list lead activities' },
      { status: 500 }
    )
  }
}

// POST /api/lead-activities — Create a lead activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      leadId,
      type,
      description,
      metadataJson,
      createdById,
      createdByName,
    } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      )
    }

    if (!description) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      )
    }

    // Verify lead exists
    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const activity = await db.leadActivity.create({
      data: {
        leadId,
        type,
        description,
        metadataJson: metadataJson
          ? typeof metadataJson === 'string'
            ? metadataJson
            : JSON.stringify(metadataJson)
          : null,
        createdById: createdById ?? null,
        createdByName: createdByName ?? null,
      },
    })

    // If activity is a status_change, also update the lead status
    if (type === 'status_change' && metadataJson) {
      const metadata =
        typeof metadataJson === 'string'
          ? JSON.parse(metadataJson)
          : metadataJson
      if (metadata?.newStatus) {
        await db.lead.update({
          where: { id: leadId },
          data: {
            status: metadata.newStatus,
            lastContactedAt: new Date(),
          },
        })
      }
    } else {
      // Update lastContactedAt for call, email, whatsapp activity types
      if (['call', 'email', 'whatsapp'].includes(type)) {
        await db.lead.update({
          where: { id: leadId },
          data: { lastContactedAt: new Date() },
        })
      }
    }

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Failed to create lead activity:', error)
    return NextResponse.json(
      { error: 'Failed to create lead activity' },
      { status: 500 }
    )
  }
}

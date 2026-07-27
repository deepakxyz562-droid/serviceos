import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET /api/lead-activities — List activities for a lead
export async function GET(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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

    // ─── Tenant scoping (mirrors /api/leads pattern) ───────────────
    // findFirst with the tenant filter verifies the lead belongs to the
    // caller's tenant BEFORE we read its activities. Super-admins may
    // pass ?tenantId= to scope to a specific tenant. Authenticated users
    // without a tenant get a 404 (single-item endpoint — never leak existence).
    const where: Record<string, unknown> = { id: leadId }
    if (authUser.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) where.tenantId = queryTenantId
    } else if (authUser.tenantId) {
      where.tenantId = authUser.tenantId
    } else {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Verify lead exists AND belongs to the caller's tenant
    const lead = await db.lead.findFirst({ where })
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const activityWhere: Record<string, unknown> = { leadId }

    if (type) activityWhere.type = type
    if (createdById) activityWhere.createdById = createdById

    const [activities, total] = await Promise.all([
      db.leadActivity.findMany({
        where: activityWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.leadActivity.count({ where: activityWhere }),
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
    // ─── Auth ────────────────────────────────────────────────────
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
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

    // ─── Tenant scoping (mirrors /api/leads pattern) ───────────────
    // findFirst with the tenant filter verifies the lead belongs to the
    // caller's tenant BEFORE we write an activity for it. Super-admins
    // may pass ?tenantId= to scope to a specific tenant. Authenticated
    // users without a tenant get a 404 (single-item endpoint — never leak existence).
    const where: Record<string, unknown> = { id: leadId }
    if (authUser.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) where.tenantId = queryTenantId
    } else if (authUser.tenantId) {
      where.tenantId = authUser.tenantId
    } else {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Verify lead exists AND belongs to the caller's tenant
    const lead = await db.lead.findFirst({ where })
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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';

// GET /api/leads - List leads with optional status filter
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // Build where clause - use tenantId if authenticated, otherwise show all
    const where: Record<string, unknown> = {};
    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId;
    }

    if (status) {
      where.status = status;
    }
    if (source) {
      where.source = source;
    }
    if (priority) {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          job: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List leads error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const body = await request.json();
    const {
      name,
      phone,
      email,
      source,
      status,
      priority,
      value,
      description,
      address,
      serviceType,
      assignedToId,
      notesJson,
      tagsJson,
      followUpAt,
    } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const lead = await db.lead.create({
      data: {
        name,
        phone,
        email: email || null,
        source: source || 'manual',
        status: status || 'new',
        priority: priority || 'medium',
        value: value || 0,
        description: description || null,
        address: address || null,
        serviceType: serviceType || null,
        assignedToId: assignedToId || null,
        tenantId: authUser?.tenantId || null,
        notesJson: notesJson || '[]',
        tagsJson: tagsJson || '[]',
        followUpAt: followUpAt ? new Date(followUpAt) : null,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    // Emit lead.created event via EventBus
    try {
      await EventBus.emit('lead.created', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        serviceType: lead.serviceType,
        tenantId: lead.tenantId,
        resourceType: 'lead',
        resourceId: lead.id,
        summary: `New lead: ${lead.name} (${lead.source})`,
      }, { tenantId: lead.tenantId || undefined });
    } catch (eventErr) {
      console.error('[LeadsCreate] Failed to emit lead.created event:', eventErr);
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}

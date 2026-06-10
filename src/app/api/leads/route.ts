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
    // Also include orphan leads (tenantId: null) so WordPress leads without a tenant are visible
    const andConditions: Record<string, unknown>[] = [];

    if (authUser?.tenantId) {
      andConditions.push({
        OR: [
          { tenantId: authUser.tenantId },
          { tenantId: null },
        ],
      });
    }

    if (status) {
      andConditions.push({ status });
    }
    if (source) {
      andConditions.push({ source });
    }
    if (priority) {
      andConditions.push({ priority });
    }
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }

    const where = andConditions.length > 0
      ? (andConditions.length === 1 ? andConditions[0] : { AND: andConditions })
      : {};

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
        email: lead.email,
        source: lead.source,
        status: lead.status,
        serviceType: lead.serviceType,
        tenantId: lead.tenantId,
        assignedToId: lead.assignedToId,
        resourceType: 'lead',
        resourceId: lead.id,
        summary: `New lead: ${lead.name} (${lead.source})`,
      }, { tenantId: lead.tenantId || undefined });
    } catch (eventErr) {
      console.error('[LeadsCreate] Failed to emit lead.created event:', eventErr);
    }

    // If lead was created with an assigned employee, also emit lead.assigned
    if (lead.assignedToId) {
      try {
        await EventBus.emit('lead.assigned', {
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          serviceType: lead.serviceType,
          assignedToId: lead.assignedToId,
          tenantId: lead.tenantId,
          resourceType: 'lead',
          resourceId: lead.id,
          summary: `Lead assigned: ${lead.name}`,
        }, { tenantId: lead.tenantId || undefined });
      } catch (eventErr) {
        console.error('[LeadsCreate] Failed to emit lead.assigned event:', eventErr);
      }
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

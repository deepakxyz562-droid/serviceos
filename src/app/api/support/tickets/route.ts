import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Generate ticket number: SUP-YYYY-NNNNNN
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUP-${year}-`;

  try {
    const lastTicket = await db.supportTicket.findFirst({
      where: { ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });

    if (lastTicket?.ticketNumber) {
      const lastNum = parseInt(lastTicket.ticketNumber.replace(prefix, ''), 10);
      return `${prefix}${String(lastNum + 1).padStart(6, '0')}`;
    }
  } catch {
    // If query fails, use timestamp-based approach
  }

  return `${prefix}${String(Date.now()).slice(-6)}`;
}

// GET /api/support/tickets — List tickets
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';

    const where: Record<string, unknown> = {};

    // Super-admin sees all tickets; tenant users see only their own
    if (!isSuperAdmin) {
      where.tenantId = user.tenantId;
      where.reporterId = user.id;
    } else {
      // Super-admin can filter by tenantId
      const tenantId = searchParams.get('tenantId');
      if (tenantId) where.tenantId = tenantId;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { reporterName: { contains: search } },
        { reporterEmail: { contains: search } },
      ];
    }

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.supportTicket.count({ where }),
    ]);

    return NextResponse.json({
      tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST /api/support/tickets — Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, description, categoryId, priority, type, source, tagsJson, metadataJson } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        subject,
        description,
        categoryId: categoryId || null,
        priority: priority || 'medium',
        type: type || 'general',
        source: source || 'web',
        tagsJson: tagsJson ? (typeof tagsJson === 'string' ? tagsJson : JSON.stringify(tagsJson)) : '[]',
        metadataJson: metadataJson ? (typeof metadataJson === 'string' ? metadataJson : JSON.stringify(metadataJson)) : '{}',
        reporterId: user.id,
        reporterEmail: user.email,
        reporterName: user.name,
        tenantId: user.tenantId,
        lastMessageAt: new Date().toISOString(),
      },
    });

    // Auto-create first message from description
    await db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        content: description,
        contentType: 'text',
        authorId: user.id,
        authorName: user.name || user.email,
        authorRole: 'user',
        isInternal: false,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}

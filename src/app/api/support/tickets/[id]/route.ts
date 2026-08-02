import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/support/tickets/[id] — Get ticket with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Access control: tenant users can only see their own tickets
    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    if (!isSuperAdmin && ticket.reporterId !== user.id && ticket.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch messages (non-internal for tenant users)
    const messagesWhere: Record<string, unknown> = { ticketId: id };
    if (!isSuperAdmin) {
      messagesWhere.isInternal = false;
    }

    const messages = await db.ticketMessage.findMany({
      where: messagesWhere,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ ...ticket, messages });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

// PATCH /api/support/tickets/[id] — Update ticket (status, priority, assignee, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';

    const existing = await db.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Tenant users can only update certain fields
    if (isSuperAdmin) {
      if (body.status !== undefined) {
        updateData.status = body.status;
        if (body.status === 'resolved') updateData.resolvedAt = new Date().toISOString();
        if (body.status === 'closed') updateData.closedAt = new Date().toISOString();
        if (body.status === 'in_progress' && !existing.firstResponseAt) {
          updateData.firstResponseAt = new Date().toISOString();
        }
      }
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
      if (body.assigneeName !== undefined) updateData.assigneeName = body.assigneeName;
      if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.resolution !== undefined) updateData.resolution = body.resolution;
    }

    // Both can update satisfaction
    if (body.satisfactionRating !== undefined) updateData.satisfactionRating = body.satisfactionRating;
    if (body.satisfactionComment !== undefined) updateData.satisfactionComment = body.satisfactionComment;

    // Tenant can close/resolved their own tickets
    if (!isSuperAdmin && existing.reporterId === user.id) {
      if (body.status === 'closed') {
        updateData.status = 'closed';
        updateData.closedAt = new Date().toISOString();
      }
    }

    const ticket = await db.supportTicket.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

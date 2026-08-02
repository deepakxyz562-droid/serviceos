import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/support/tickets/[id]/messages — List messages for a ticket
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
    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { ticketId: id };
    if (!isSuperAdmin) where.isInternal = false;

    const messages = await db.ticketMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/support/tickets/[id]/messages — Add a message to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, contentType, isInternal } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';

    // Access control
    if (!isSuperAdmin && ticket.reporterId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only admins can create internal notes
    const messageIsInternal = isSuperAdmin && isInternal;

    const message = await db.ticketMessage.create({
      data: {
        ticketId: id,
        content,
        contentType: contentType || 'text',
        authorId: user.id,
        authorName: user.name || user.email,
        authorRole: isSuperAdmin ? 'admin' : 'user',
        isInternal: messageIsInternal,
      },
    });

    // Update ticket's lastMessageAt and status
    const ticketUpdate: Record<string, unknown> = { lastMessageAt: new Date().toISOString() };

    if (isSuperAdmin && ticket.status === 'open') {
      ticketUpdate.status = 'in_progress';
      if (!ticket.firstResponseAt) ticketUpdate.firstResponseAt = new Date().toISOString();
    }

    if (!isSuperAdmin && ticket.status === 'waiting_customer') {
      ticketUpdate.status = 'in_progress';
    }

    await db.supportTicket.update({
      where: { id },
      data: ticketUpdate,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}

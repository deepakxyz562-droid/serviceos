import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/contacts/[id] — Get customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobs: true,
            invoices: true,
            leads: true,
          },
        },
        jobs: {
          select: { id: true, title: true, status: true, scheduledAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        invoices: {
          select: { id: true, number: true, total: true, status: true, dueDate: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Verify workspace isolation if authenticated
    if (authUser?.workspaceId && customer.workspaceId !== authUser.workspaceId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id] — Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    const body = await request.json();

    // Verify the customer exists
    const existingCustomer = await db.customer.findUnique({ where: { id } });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Verify workspace isolation if authenticated
    if (authUser?.workspaceId && existingCustomer.workspaceId !== authUser.workspaceId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.whatsappId !== undefined) updateData.whatsappId = body.whatsappId || null;

    // Check for duplicate phone if being updated
    if (body.phone && body.phone !== existingCustomer.phone && authUser?.workspaceId) {
      const duplicate = await db.customer.findFirst({
        where: {
          phone: body.phone,
          workspaceId: authUser.workspaceId,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'A customer with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    const customer = await db.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/[id] — Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    // Verify the customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobs: true,
            invoices: true,
          },
        },
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Verify workspace isolation if authenticated
    if (authUser?.workspaceId && existingCustomer.workspaceId !== authUser.workspaceId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if customer has active jobs
    if (existingCustomer._count.jobs > 0) {
      return NextResponse.json(
        { error: `Cannot delete contact with ${existingCustomer._count.jobs} job(s). Remove or reassign them first.` },
        { status: 400 }
      );
    }

    await db.customer.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

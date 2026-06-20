import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';

// GET /api/leads/[id] - Get lead by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    const { id } = await params;

    const where: Record<string, unknown> = { id };
    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId;
    }

    const lead = await db.lead.findFirst({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, phone: true, avatar: true, role: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        job: {
          select: { id: true, title: true, status: true, scheduledAt: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

// PUT /api/leads/[id] - Update lead
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    const { id } = await params;
    const body = await request.json();

    // Verify lead exists
    const where: Record<string, unknown> = { id };
    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId;
    }

    const existingLead = await db.lead.findFirst({ where });

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

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

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (source !== undefined) updateData.source = source;
    if (priority !== undefined) updateData.priority = priority;
    if (value !== undefined) updateData.value = value;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (notesJson !== undefined) updateData.notesJson = notesJson;
    if (tagsJson !== undefined) updateData.tagsJson = tagsJson;
    if (followUpAt !== undefined) {
      updateData.followUpAt = followUpAt ? new Date(followUpAt) : null;
    }

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status;

      // If converting to won, set convertedAt
      if (status === 'won' && existingLead.status !== 'won') {
        updateData.convertedAt = new Date();
      }

      // If reverting from won, clear convertedAt
      if (existingLead.status === 'won' && status !== 'won') {
        updateData.convertedAt = null;
      }
    }

    // --- Propagate phone/name/email changes to linked Customer & Conversations ---
    // The phone number is stored in 3 places: Lead.phone, Customer.phone (read by
    // Customer 360), and Conversation.customerPhone (read by the Omni-channel inbox).
    // Without this propagation, editing a lead's phone only updates the Leads menu
    // and leaves Customer 360 + Omni-channel showing the stale number.
    const customerUpdate: Record<string, unknown> = {};
    if (name !== undefined) customerUpdate.name = name;
    if (phone !== undefined) customerUpdate.phone = phone;
    if (email !== undefined) customerUpdate.email = email;

    const conversationUpdate: Record<string, unknown> = {};
    if (phone !== undefined) conversationUpdate.customerPhone = phone;
    if (name !== undefined) conversationUpdate.customerName = name;

    const hasCustomerChanges = Object.keys(customerUpdate).length > 0;
    const hasConversationChanges = Object.keys(conversationUpdate).length > 0;
    const linkedCustomerId = existingLead.customerId;

    const lead = await db.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          job: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      // Sync to the linked Customer record (read by Customer 360 view)
      if (linkedCustomerId && hasCustomerChanges) {
        try {
          await tx.customer.update({
            where: { id: linkedCustomerId },
            data: customerUpdate,
          });
        } catch (custErr) {
          console.error('[LeadsUpdate] Failed to sync customer:', custErr);
        }
      }

      // Sync to all Conversations linked to this lead (1:1 via leadId) or to the
      // same customer (covers cross-channel conversations). Read by Omni-channel inbox.
      if (hasConversationChanges) {
        try {
          // Conversations directly linked to this lead
          await tx.conversation.updateMany({
            where: { leadId: id },
            data: conversationUpdate,
          });
          // Conversations linked to the same customer (other channels / sessions)
          if (linkedCustomerId) {
            await tx.conversation.updateMany({
              where: { customerId: linkedCustomerId },
              data: conversationUpdate,
            });
          }
        } catch (convErr) {
          console.error('[LeadsUpdate] Failed to sync conversations:', convErr);
        }
      }

      return updated;
    });

    // Emit lead.updated event via EventBus
    try {
      await EventBus.emit('lead.updated', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        status: lead.status,
        serviceType: lead.serviceType,
        tenantId: lead.tenantId,
        resourceType: 'lead',
        resourceId: lead.id,
        changedFields: Object.keys(updateData),
      }, { tenantId: lead.tenantId || undefined });
    } catch (eventErr) {
      console.error('[LeadsUpdate] Failed to emit lead.updated event:', eventErr);
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Update lead error:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - Delete lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    const { id } = await params;

    // Verify lead exists
    const where: Record<string, unknown> = { id };
    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId;
    }

    const existingLead = await db.lead.findFirst({ where });

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Delete the lead
    await db.lead.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}

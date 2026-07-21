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
      title,
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
      serviceId,
      assignedToId,
      notesJson,
      tagsJson,
      lineItemsJson,
      imagesJson,
      assessmentImagesJson,
      customerId,
      jobId,
      convertedAt,
      followUpAt,
    } = body;

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title || null;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (source !== undefined) updateData.source = source;
    if (priority !== undefined) updateData.priority = priority;
    if (value !== undefined) updateData.value = value;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    if (serviceId !== undefined) updateData.serviceId = serviceId || null;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (notesJson !== undefined) updateData.notesJson = notesJson;
    if (tagsJson !== undefined) updateData.tagsJson = tagsJson;
    if (lineItemsJson !== undefined) updateData.lineItemsJson = lineItemsJson;
    if (imagesJson !== undefined) updateData.imagesJson = imagesJson;
    if (assessmentImagesJson !== undefined) updateData.assessmentImagesJson = assessmentImagesJson;
    if (customerId !== undefined) updateData.customerId = customerId || null;
    if (jobId !== undefined) updateData.jobId = jobId || null;
    if (convertedAt !== undefined) updateData.convertedAt = convertedAt ? new Date(convertedAt) : null;
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

    // ─── Sync linked Deal.stage with Lead.status (HubSpot model) ───────
    // Mirror of the Deal→Lead sync in /api/deals/[id] PUT. When a Lead's
    // status changes (via the Kanban board drag, the status dropdown, or the
    // detail dialog), the linked Deal's stage is updated so the Sales
    // Pipeline and Leads views always agree. We run this AFTER the lead
    // update (below) so we can read the fresh lead if needed; the deal
    // update itself is best-effort and never fails the lead update.
    const shouldSyncDeal =
      status !== undefined && status !== existingLead.status;

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

    // ─── Sync the linked Deal's stage with the new Lead status ──────────
    // Runs outside the lead transaction (best-effort, non-fatal). We look up
    // the Deal by `leadId` (1:1 link) and update its stage, probability, and
    // closedAt to match the canonical pipeline stage values. This keeps the
    // Leads Kanban and the Sales Pipeline in lock-step regardless of which
    // view the user used to move the record.
    if (shouldSyncDeal) {
      try {
        const linkedDeal = await db.deal.findFirst({
          where: { leadId: lead.id },
          select: { id: true, stage: true },
        });
        if (linkedDeal && linkedDeal.stage !== status) {
          const stageProbability: Record<string, number> = {
            new_lead: 10, contacted: 20, qualified: 40, quote_sent: 50,
            negotiation: 70, won: 100, lost: 0,
          };
          await db.deal.update({
            where: { id: linkedDeal.id },
            data: {
              stage: status as string,
              probability: stageProbability[status as string] ?? 10,
              // Stamp/clear closedAt alongside the stage
              ...(status === 'won' || status === 'lost'
                ? { closedAt: new Date() }
                : { closedAt: null }),
            },
          });
          // Record a stage-history entry so the Deal's audit trail matches.
          await db.dealStageHistory.create({
            data: {
              dealId: linkedDeal.id,
              fromStage: linkedDeal.stage,
              toStage: status as string,
              changedById: authUser?.id || null,
              note: 'Synced from Lead status change',
            },
          });
        }
      } catch (dealSyncErr) {
        console.error('[LeadsUpdate] Failed to sync linked Deal.stage:', dealSyncErr);
        // Non-fatal — the Lead update already succeeded.
      }
    }

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

    // ─── Send WhatsApp notifications on lead assignment ────────────
    if (assignedToId !== undefined && assignedToId !== existingLead.assignedToId && lead.assignedTo) {
      try {
        const { notifyEmployeeLeadAssigned, notifyCustomerLeadAssigned } = await import('@/lib/whatsapp-notifications');

        // Notify the assigned employee
        await notifyEmployeeLeadAssigned(
          { id: lead.id, name: lead.name, phone: lead.phone, source: lead.source, serviceType: lead.serviceType, priority: lead.priority, value: lead.value, tenantId: lead.tenantId },
          { id: lead.assignedTo.id, name: lead.assignedTo.name, phone: lead.assignedTo.phone }
        );

        // Notify the customer/lead
        if (lead.phone) {
          await notifyCustomerLeadAssigned(
            { id: lead.id, name: lead.name, phone: lead.phone, tenantId: lead.tenantId },
            { id: lead.assignedTo.id, name: lead.assignedTo.name, phone: lead.assignedTo.phone }
          );
        }
      } catch (notifyErr) {
        console.error('[LeadsUpdate] WhatsApp notification failed:', notifyErr);
      }
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

    // ─── Delete linked Deal (HubSpot model) ───────────────────
    // When a Lead is deleted, its linked Deal is also deleted.
    try {
      const linkedDeal = await db.deal.findFirst({ where: { leadId: id } });
      if (linkedDeal) {
        await db.dealStageHistory.deleteMany({ where: { dealId: linkedDeal.id } });
        await db.deal.delete({ where: { id: linkedDeal.id } });
      }
    } catch (dealErr) {
      console.error('[LeadsDelete] Failed to delete linked Deal:', dealErr);
      // Non-fatal — the lead is still deleted.
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

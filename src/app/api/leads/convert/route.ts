import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';

// POST /api/leads/convert - Convert lead to job
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const tenantId = authUser?.tenantId || null;
    const workspaceId = authUser?.workspaceId || null;

    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Fetch the lead
    const where: Record<string, unknown> = { id: leadId };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const lead = await db.lead.findFirst({ where });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Check if lead is already converted
    if (lead.status === 'won' && lead.jobId) {
      return NextResponse.json(
        { error: 'Lead has already been converted to a job' },
        { status: 400 }
      );
    }

    // Check if lead is in a convertible state
    const convertibleStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];
    if (!convertibleStatuses.includes(lead.status)) {
      return NextResponse.json(
        { error: `Lead with status '${lead.status}' cannot be converted. Only leads in new, contacted, qualified, proposal, or negotiation status can be converted.` },
        { status: 400 }
      );
    }

    // Find or create a workspace for the job
    let jobWorkspaceId = workspaceId;
    if (!jobWorkspaceId) {
      // Try to find any existing workspace
      const existingWorkspace = await db.workspace.findFirst();
      if (existingWorkspace) {
        jobWorkspaceId = existingWorkspace.id;
      } else {
        // Create a default workspace
        const newWorkspace = await db.workspace.create({
          data: {
            name: 'Default Workspace',
            slug: 'default',
            ownerId: authUser?.id || 'system',
            tenantId,
          },
        });
        jobWorkspaceId = newWorkspace.id;
      }
    }

    // Create Customer from lead data
    const customer = await db.customer.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        workspaceId: jobWorkspaceId,
      },
    });

    // Create Job from lead data
    const jobTitle = lead.serviceType
      ? `${lead.serviceType.charAt(0).toUpperCase() + lead.serviceType.slice(1)} - ${lead.name}`
      : `Job for ${lead.name}`;

    const job = await db.job.create({
      data: {
        title: jobTitle,
        description: lead.description || `Converted from lead: ${lead.name}`,
        status: 'pending',
        priority: lead.priority,
        type: lead.serviceType || 'delivery',
        address: lead.address,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        assigneeId: lead.assignedToId || null,
        workspaceId: jobWorkspaceId,
      },
      include: {
        assignee: {
          select: { id: true, name: true, phone: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    // If the lead had an assigned employee, update their name/phone on the job
    if (lead.assignedToId) {
      const employee = await db.employee.findUnique({
        where: { id: lead.assignedToId },
      });
      if (employee) {
        await db.job.update({
          where: { id: job.id },
          data: {
            assigneeName: employee.name,
            assigneePhone: employee.phone,
          },
        });
      }
    }

    // Update lead status to 'won', set customerId and jobId
    const updatedLead = await db.lead.update({
      where: { id: leadId },
      data: {
        status: 'won',
        customerId: customer.id,
        jobId: job.id,
        convertedAt: new Date(),
      },
    });

    // Emit lead.converted event via EventBus
    try {
      await EventBus.emit('lead.converted', {
        leadId: updatedLead.id,
        name: updatedLead.name,
        phone: updatedLead.phone,
        source: updatedLead.source,
        jobId: job.id,
        customerId: customer.id,
        tenantId: updatedLead.tenantId,
        resourceType: 'lead',
        resourceId: updatedLead.id,
        summary: `Lead converted: ${updatedLead.name} → Job ${job.id}`,
      }, { tenantId: updatedLead.tenantId || undefined, workspaceId: jobWorkspaceId || undefined });

      // Also emit job.created for the new job
      await EventBus.emit('job.created', {
        job: {
          id: job.id,
          jobNumber: job.jobNumber,
          title: job.title,
          status: job.status,
          priority: job.priority,
          type: job.type,
          address: job.address,
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          workspaceId: job.workspaceId,
        },
        resourceType: 'job',
        resourceId: job.id,
        summary: `Job created from lead: ${updatedLead.name}`,
      }, { tenantId: updatedLead.tenantId || undefined, workspaceId: jobWorkspaceId || undefined });
    } catch (eventErr) {
      console.error('[LeadsConvert] Failed to emit events:', eventErr);
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        workspaceId: customer.workspaceId,
      },
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        priority: job.priority,
        type: job.type,
        customerId: job.customerId,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        assigneeId: job.assigneeId,
      },
      lead: updatedLead,
    }, { status: 201 });
  } catch (error) {
    console.error('Convert lead error:', error);
    return NextResponse.json(
      { error: 'Failed to convert lead to job' },
      { status: 500 }
    );
  }
}

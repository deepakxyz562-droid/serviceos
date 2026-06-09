import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';

/**
 * POST /api/jobs/create
 * Create a new job with auto-generated ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate priority if provided
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate type if provided
    const validTypes = ['delivery', 'service', 'pickup', 'installation', 'maintenance', 'inspection', 'repair', 'consultation'];
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Auto-generate ID
    const jobId = crypto.randomUUID();

    // Create the job in the database with status 'pending'
    const job = await db.job.create({
      data: {
        id: jobId,
        title: body.title,
        description: body.description || null,
        status: 'pending',
        priority: body.priority || 'medium',
        type: body.type || 'delivery',
        address: body.address || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        notes: body.notes || null,
        // Customer info
        customerId: body.customerId || null,
        customerName: body.customerName || null,
        customerPhone: body.customerPhone || null,
        // Assignee info (not set at creation for pending jobs)
        assigneeId: null,
        assigneeName: null,
        assigneePhone: null,
        // WhatsApp tracking (not set at creation)
        whatsappMessageId: null,
        whatsappSessionId: null,
        assignmentStatus: null,
        workspaceId: body.workspaceId || null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            avatar: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    // Emit job.created event via EventBus
    try {
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
        summary: `Job created: ${job.title}`,
      }, { tenantId: job.workspaceId || undefined, workspaceId: job.workspaceId || undefined });
    } catch (eventErr) {
      console.error('[JobsCreate] Failed to emit job.created event:', eventErr);
    }

    return NextResponse.json(
      {
        job,
        message: 'Job created successfully',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

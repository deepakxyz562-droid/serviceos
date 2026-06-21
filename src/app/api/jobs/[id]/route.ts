import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            avatar: true,
            rating: true,
            completedJobs: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingJob = await db.job.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.actualEndTime !== undefined) updateData.actualEndTime = body.actualEndTime ? new Date(body.actualEndTime) : null;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.customerId !== undefined) updateData.customerId = body.customerId;
    if (body.customerName !== undefined) updateData.customerName = body.customerName;
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone;
    if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail;
    if (body.quotedAmount !== undefined) {
      updateData.quotedAmount =
        body.quotedAmount === null || body.quotedAmount === ''
          ? null
          : Number(body.quotedAmount);
    }
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.assigneeName !== undefined) updateData.assigneeName = body.assigneeName;
    if (body.assigneePhone !== undefined) updateData.assigneePhone = body.assigneePhone;
    if (body.whatsappMessageId !== undefined) updateData.whatsappMessageId = body.whatsappMessageId;
    if (body.whatsappSessionId !== undefined) updateData.whatsappSessionId = body.whatsappSessionId;
    if (body.assignmentStatus !== undefined) updateData.assignmentStatus = body.assignmentStatus;

    // If status is being changed to 'assigned' and assigneeId is provided, update employee status
    if (body.status === 'assigned' && body.assigneeId) {
      await db.employee.update({
        where: { id: body.assigneeId },
        data: { status: 'busy' },
      });
    }

    // If status is being changed to 'completed', set actualEndTime and free up assignee
    if (body.status === 'completed') {
      updateData.actualEndTime = new Date();
      if (existingJob.assigneeId) {
        // Only mark as 'available' if no other active jobs remain.
        const otherActiveJobs = await db.job.count({
          where: {
            assigneeId: existingJob.assigneeId,
            id: { not: id },
            status: { in: ['assigned', 'in_progress', 'en_route'] },
          },
        });
        await db.employee.update({
          where: { id: existingJob.assigneeId },
          data: {
            status: otherActiveJobs > 0 ? 'busy' : 'available',
            completedJobs: { increment: 1 },
          },
        });
      }
    }

    // If status is being changed to 'cancelled', free up the assignee
    if (body.status === 'cancelled' && existingJob.assigneeId) {
      await db.employee.update({
        where: { id: existingJob.assigneeId },
        data: { status: 'available' },
      });
    }

    const job = await db.job.update({
      where: { id },
      data: updateData,
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

    // Emit events via EventBus based on status change
    try {
      const eventMap: Record<string, import('@/lib/event-bus').ServiceEvent> = {
        'assigned': 'job.assigned',
        'accepted': 'job.accepted',
        'in_progress': 'job.started',
        'en_route': 'job.started',
        'completed': 'job.completed',
        'cancelled': 'job.cancelled',
      };

      const newStatus = body.status || existingJob.status;
      const eventType = eventMap[newStatus];

      if (eventType) {
        await EventBus.emit(eventType, {
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
            assigneeName: job.assigneeName,
            assigneePhone: job.assigneePhone,
            workspaceId: job.workspaceId,
          },
          employee: job.assigneeId ? { id: job.assigneeId, name: job.assigneeName, phone: job.assigneePhone } : null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job',
          resourceId: job.id,
          fromStatus: existingJob.status,
          toStatus: newStatus,
        }, { tenantId: job.workspaceId || undefined, workspaceId: job.workspaceId || undefined });
      } else if (Object.keys(updateData).length > 0) {
        // Emit job.updated for any other changes
        await EventBus.emit('job.updated', {
          job: { id: job.id, title: job.title, status: job.status, workspaceId: job.workspaceId },
          resourceType: 'job',
          resourceId: job.id,
          changedFields: Object.keys(updateData),
        }, { tenantId: job.workspaceId || undefined, workspaceId: job.workspaceId || undefined });
      }
    } catch (eventErr) {
      console.error('[JobsUpdate] Failed to emit event:', eventErr);
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingJob = await db.job.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If the job has an assignee, free them up
    if (existingJob.assigneeId) {
      await db.employee.update({
        where: { id: existingJob.assigneeId },
        data: { status: 'available' },
      });
    }

    await db.job.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

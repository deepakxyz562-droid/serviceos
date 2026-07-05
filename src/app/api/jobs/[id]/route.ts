import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { logActivity } from '@/lib/activity-log';

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
    // ── Jobber-style itemized billing + on-site instructions + schedule ──
    if (body.lineItemsJson !== undefined) {
      updateData.lineItemsJson = typeof body.lineItemsJson === 'string'
        ? body.lineItemsJson
        : JSON.stringify(body.lineItemsJson ?? []);
    }
    if (body.visitInstructions !== undefined) updateData.visitInstructions = body.visitInstructions || null;
    if (body.scheduledTime !== undefined) updateData.scheduledTime = body.scheduledTime || null;
    if (body.estimatedDuration !== undefined) {
      updateData.estimatedDuration =
        body.estimatedDuration === null || body.estimatedDuration === ''
          ? null
          : Number(body.estimatedDuration);
    }
    if (body.serviceId !== undefined) updateData.serviceId = body.serviceId || null;
    if (body.description !== undefined) updateData.description = body.description;

    // ── V1.5: assetId is stored inside metadataJson (no dedicated column).
    // Accept either { assetId } or { metadataJson } in the body.
    if (body.assetId !== undefined || body.metadataJson !== undefined) {
      let md: Record<string, unknown> = {};
      try {
        const raw = body.metadataJson ?? existingJob.metadataJson;
        md = raw ? JSON.parse(raw) : {};
        if (!md || typeof md !== 'object') md = {};
      } catch {
        md = {};
      }
      if (body.assetId !== undefined) {
        if (body.assetId) md.assetId = body.assetId;
        else delete md.assetId;
      }
      updateData.metadataJson = JSON.stringify(md);
    }

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

    // ─── V1.5 Activity Log ──────────────────────────────────────────
    // Records the update action in the audit trail. Wrapped so a logging
    // failure never affects the main response.
    try {
      let jobTenantId: string | null = null;
      if (job.workspaceId) {
        const ws = await db.workspace.findUnique({
          where: { id: job.workspaceId },
          select: { tenantId: true },
        });
        jobTenantId = ws?.tenantId ?? null;
      }
      if (jobTenantId) {
        const changedFields = Object.keys(updateData);
        const isStatusChange =
          body.status !== undefined && body.status !== existingJob.status;
        if (isStatusChange) {
          await logActivity({
            tenantId: jobTenantId,
            actorType: 'system',
            action: 'status_change',
            entityType: 'job',
            entityId: job.id,
            entityName: job.title || job.customerName || null,
            description: `Job "${job.title || 'Untitled'}" status: ${existingJob.status} → ${body.status}`,
            metadataJson: JSON.stringify({
              fromStatus: existingJob.status,
              toStatus: body.status,
              changedFields,
            }),
            severity: 'info',
          });
        } else if (changedFields.length > 0) {
          await logActivity({
            tenantId: jobTenantId,
            actorType: 'system',
            action: 'update',
            entityType: 'job',
            entityId: job.id,
            entityName: job.title || job.customerName || null,
            description: `Updated job "${job.title || 'Untitled'}" (${changedFields.length} field${changedFields.length === 1 ? '' : 's'})`,
            metadataJson: JSON.stringify({ changedFields }),
            severity: 'info',
          });
        }
      }
    } catch (logErr) {
      console.error('[JobsUpdate] Failed to log activity:', logErr);
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

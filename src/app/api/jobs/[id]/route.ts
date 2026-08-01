import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { logActivity } from '@/lib/activity-log';
import { getAuthUser } from '@/lib/auth';
import { autoRecordAssetServiceHistory } from '@/lib/asset-service-history';
import { validateJobCompletionProof } from '@/lib/job-completion-validation';
import { reopenDealOnJobCancel } from '@/lib/deal-archive';

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
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Allow owner, admin, manager, employee, and super_admin to mutate jobs.
    // Customers are NOT allowed to mutate jobs directly (reviews go through /api/reviews).
    const allowedRoles = ['owner', 'admin', 'manager', 'employee', 'super_admin'];
    if (!allowedRoles.includes(authUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
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

    // If status is being changed to 'completed', set actualEndTime and free up assignee.
    // Validation: require before/after photos + customer signature (and a
    // completed checklist if linked/expected) before a job can be marked
    // completed. Skip when the job is already completed (no-op).
    if (body.status === 'completed' && existingJob.status !== 'completed') {
      const proof = await validateJobCompletionProof(id);
      if (!proof.ok) {
        return NextResponse.json(
          { error: proof.error, missing: proof.missing },
          { status: 400 },
        );
      }
    }
    // Only set actualEndTime + free up the assignee on the FIRST transition
    // to 'completed'. Guard with `existingJob.status !== 'completed'` so that
    // editing a completed job (e.g. fixing a line item) does NOT overwrite
    // the original completion timestamp or double-count completedJobs.
    if (body.status === 'completed' && existingJob.status !== 'completed') {
      updateData.actualEndTime = new Date();
      updateData.completedAt = new Date();
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

    // If status is being changed AWAY from 'completed' (e.g. tenant reopens a
    // completed job to fix a mistake), clear the completion timestamps so the
    // job doesn't look finished in the detail view or trigger same-day grace.
    if (body.status && body.status !== 'completed' && existingJob.status === 'completed') {
      updateData.actualEndTime = null;
      updateData.completedAt = null;
    }

    // If status is being changed to 'cancelled', free up the assignee
    if (body.status === 'cancelled' && existingJob.assigneeId) {
      await db.employee.update({
        where: { id: existingJob.assigneeId },
        data: { status: 'available' },
      });
    }

    // ── Pipeline Redesign (Phase 1): Job cancel → Deal sync ────────────
    // When a Job is cancelled, stamp `Job.cancelledAt = now()` (indexed for
    // efficient querying by the Attention Center) AND call
    // `reopenDealOnJobCancel(jobId)` which sets `Deal.jobCancelledAt = now()`
    // on the linked Deal. The Deal stays in 'won' (rep decides next step)
    // but shows a red "⚠ Job cancelled" badge in the Won Summary widget.
    //
    // Only fires on the FIRST transition to 'cancelled' (guarded by
    // `existingJob.status !== 'cancelled'`) so we don't double-stamp.
    if (body.status === 'cancelled' && existingJob.status !== 'cancelled') {
      updateData.cancelledAt = new Date();
      // Fire-and-forget — never blocks the Job update response. The helper
      // itself never throws (it has its own try/catch), so this outer .catch()
      // is just defense-in-depth.
      reopenDealOnJobCancel(id).catch((err) => {
        console.error('[JobsUpdate] reopenDealOnJobCancel failed (non-blocking):', err);
      });
    }

    // ── Clear cancelledAt if status moves AWAY from 'cancelled' ────────
    // E.g. a tenant re-opens a cancelled job to fix a mistake. The Deal's
    // jobCancelledAt is NOT auto-cleared here (the rep decides whether to
    // reopen as Lost or leave as Won with the badge). They can clear it
    // manually by re-winning the Deal.
    if (body.status && body.status !== 'cancelled' && existingJob.status === 'cancelled') {
      updateData.cancelledAt = null;
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

    // ─── Auto-record AssetServiceHistory when job is marked completed ───
    // Fulfills the job-form promise: "Service history will be auto-recorded
    // on this asset when the job completes." Idempotent — skips if no asset
    // linked or an entry already exists. Only fires on a real transition
    // (existingJob.status !== 'completed' → 'completed').
    if (body.status === 'completed' && existingJob.status !== 'completed') {
      try {
        const ashResult = await autoRecordAssetServiceHistory(job);
        if (ashResult.success) {
          console.log(`[Jobs PUT] Auto-recorded service history for job ${job.id}`);
        } else if (!ashResult.skipped) {
          console.error(`[Jobs PUT] Asset service-history failed: ${ashResult.reason}`);
        }
      } catch (e) {
        console.error('Failed to auto-record asset service history on PUT:', e);
      }
    }

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
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Allow owner, admin, manager, employee, and super_admin to mutate jobs.
    // Customers are NOT allowed to mutate jobs directly (reviews go through /api/reviews).
    const allowedRoles = ['owner', 'admin', 'manager', 'employee', 'super_admin'];
    if (!allowedRoles.includes(authUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
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

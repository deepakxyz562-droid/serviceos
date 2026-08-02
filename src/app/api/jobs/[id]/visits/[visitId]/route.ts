import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * GET /api/jobs/[id]/visits/[visitId]
 * Fetch a single visit.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { visitId } = await params;
    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    const visit = await db.jobVisit.findUnique({ where: { id: visitId } });
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }
    return NextResponse.json({ visit });
  } catch (error) {
    console.error('Error fetching visit:', error);
    return NextResponse.json({ error: 'Failed to fetch visit' }, { status: 500 });
  }
}

/**
 * PATCH /api/jobs/[id]/visits/[visitId]
 * Update a visit. Owner/admin can update all fields; employees can only
 * change status (e.g. mark completed) on visits assigned to them.
 *
 * Body: any subset of { title, instructions, scheduledDate, endDate,
 *   scheduledTime, endTime, anytime, scheduleLater, assigneeIds, emailTeam,
 *   teamReminder, checklistIds, status, notes }
 *
 * Special body field `applyToAll`: when true (and the visit is part of a
 * repeat series — ie. other visits with the same jobId+title+instructions),
 * the title/instructions/assignment/checklist fields are bulk-applied to all
 * matching visits. Date/time fields remain per-visit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id: jobId, visitId } = await params;
    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    const body = await request.json();
    const isEmployee = authUser.role === 'employee';

    const existing = await db.jobVisit.findUnique({ where: { id: visitId } });
    if (!existing) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // ── Employee scope: can only update status of visits assigned to them.
    if (isEmployee) {
      let assignedIds: string[] = [];
      try {
        assignedIds = JSON.parse(existing.assigneeIdsJson || '[]');
      } catch {
        assignedIds = [];
      }
      const ownId = authUser.employeeId || authUser.id;
      if (!assignedIds.includes(ownId)) {
        return NextResponse.json({ error: 'Forbidden: visit not assigned to you' }, { status: 403 });
      }
      const allowedStatus = body.status;
      if (!allowedStatus || !['in_progress', 'completed', 'cancelled'].includes(allowedStatus)) {
        return NextResponse.json({ error: 'Employees may only update visit status' }, { status: 403 });
      }
      const updateData: Record<string, unknown> = {
        status: allowedStatus,
        completedAt: allowedStatus === 'completed' ? new Date() : null,
      };
      const updated = await db.jobVisit.update({ where: { id: visitId }, data: updateData });
      return NextResponse.json({ visit: updated });
    }

    // ── Owner/admin: full update ───────────────────────────────────────────
    const {
      title,
      instructions,
      scheduledDate,
      endDate,
      scheduledTime,
      endTime,
      anytime,
      scheduleLater,
      assigneeIds,
      emailTeam,
      teamReminder,
      checklistIds,
      status,
      notes,
      applyToAll = false,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = String(title || '').trim();
    if (instructions !== undefined) updateData.instructions = instructions ? String(instructions).trim() : null;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : existing.scheduledDate;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (scheduledTime !== undefined) updateData.scheduledTime = anytime ? null : (scheduledTime || null);
    if (endTime !== undefined) updateData.endTime = anytime ? null : (endTime || null);
    if (anytime !== undefined) updateData.anytime = Boolean(anytime);
    if (scheduleLater !== undefined) updateData.scheduleLater = Boolean(scheduleLater);
    if (emailTeam !== undefined) updateData.emailTeam = Boolean(emailTeam);
    if (teamReminder !== undefined) updateData.teamReminder = String(teamReminder || 'none');
    if (notes !== undefined) updateData.notes = notes ? String(notes) : null;
    if (status !== undefined) {
      updateData.status = String(status);
      updateData.completedAt = status === 'completed' ? new Date() : null;
    }

    // Resolve assignee names if assigneeIds changed.
    if (assigneeIds !== undefined && Array.isArray(assigneeIds)) {
      const ids = assigneeIds as string[];
      let names: string[] = [];
      if (ids.length > 0) {
        try {
          const emps = await db.employee.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          });
          names = ids.map((id) => emps.find((e) => e.id === id)?.name).filter((n): n is string => Boolean(n));
        } catch {
          // ignore
        }
      }
      updateData.assigneeIdsJson = JSON.stringify(ids);
      updateData.assigneeNamesJson = JSON.stringify(names);
    }

    if (checklistIds !== undefined && Array.isArray(checklistIds)) {
      updateData.checklistIdsJson = JSON.stringify(checklistIds as string[]);
    }

    const updated = await db.jobVisit.update({ where: { id: visitId }, data: updateData });

    // Bulk-apply shared fields to sibling visits (Edit All Visits flow).
    if (applyToAll) {
      try {
        const sharedFields: Record<string, unknown> = {};
        if (title !== undefined) sharedFields.title = updateData.title;
        if (instructions !== undefined) sharedFields.instructions = updateData.instructions;
        if (assigneeIds !== undefined) {
          sharedFields.assigneeIdsJson = updateData.assigneeIdsJson;
          sharedFields.assigneeNamesJson = updateData.assigneeNamesJson;
        }
        if (checklistIds !== undefined) sharedFields.checklistIdsJson = updateData.checklistIdsJson;
        if (emailTeam !== undefined) sharedFields.emailTeam = updateData.emailTeam;
        if (teamReminder !== undefined) sharedFields.teamReminder = updateData.teamReminder;
        if (Object.keys(sharedFields).length > 0) {
          await db.jobVisit.updateMany({
            where: { jobId, id: { not: visitId }, status: { in: ['scheduled', 'in_progress'] } },
            data: sharedFields,
          });
        }
      } catch (err) {
        console.error('[Visits PATCH] bulk apply failed:', err);
      }
    }

    // Mirror onto Job for backward compat if this is visit #1.
    if (existing.jobVisitNumber === 1) {
      try {
        const jobUpdate: Record<string, unknown> = {};
        if (updateData.scheduledDate) jobUpdate.scheduledAt = updateData.scheduledDate;
        if (updateData.anytime !== undefined) jobUpdate.scheduledTime = updateData.scheduledTime;
        if (updateData.instructions !== undefined) jobUpdate.visitInstructions = updateData.instructions;
        if (Object.keys(jobUpdate).length > 0) {
          await db.job.update({ where: { id: jobId }, data: jobUpdate });
        }
      } catch (err) {
        console.error('[Visits PATCH] mirror onto Job failed:', err);
      }
    }

    // Best-effort activity log
    try {
      await logActivity({
        tenantId: existing.tenantId ?? '',
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'update',
        entityType: 'jobVisit',
        entityId: visitId,
        entityName: existing.title || visitId,
        description: `Updated visit #${existing.jobVisitNumber} for job ${jobId}${applyToAll ? ' (applied to all visits)' : ''}`,
        metadataJson: JSON.stringify({ jobId, visitId, applyToAll, fields: Object.keys(updateData) }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Visits PATCH] activity log failed:', logErr);
    }

    return NextResponse.json({ visit: updated });
  } catch (error) {
    console.error('Error updating visit:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update visit', message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/jobs/[id]/visits/[visitId]
 * Delete a single visit. Employees are forbidden.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (authUser.role === 'employee') {
      return NextResponse.json({ error: 'Forbidden: employees cannot delete visits' }, { status: 403 });
    }
    const { id: jobId, visitId } = await params;
    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 });
    }

    const existing = await db.jobVisit.findUnique({ where: { id: visitId } });
    if (!existing) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    await db.jobVisit.delete({ where: { id: visitId } });

    // Best-effort activity log
    try {
      await logActivity({
        tenantId: existing.tenantId ?? '',
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'delete',
        entityType: 'jobVisit',
        entityId: visitId,
        entityName: existing.title || visitId,
        description: `Deleted visit #${existing.jobVisitNumber} for job ${jobId}`,
        metadataJson: JSON.stringify({ jobId, visitId, jobVisitNumber: existing.jobVisitNumber }),
        severity: 'warning',
      });
    } catch (logErr) {
      console.error('[Visits DELETE] activity log failed:', logErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return NextResponse.json({ error: 'Failed to delete visit' }, { status: 500 });
  }
}

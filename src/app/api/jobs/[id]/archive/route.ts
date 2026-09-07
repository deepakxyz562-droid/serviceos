import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/[id]/archive — soft-delete (archive) a Job.
// Sets `deletedAt = now()` so the job disappears from the Active tab and
// appears in the Archived tab. Reversible via POST .../restore.
//
// NOTE: The existing /api/jobs/bulk endpoint already supports soft-delete via
// action='softDelete'. This dedicated single-job endpoint exists for the
// archive-tab pattern used by PAGINATION-ARCHIVE-1.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const allowedRoles = ['owner', 'admin', 'manager', 'employee', 'super_admin'];
    if (!allowedRoles.includes(authUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { id } = await params;

    // Tenant scoping: Job uses workspaceId (not tenantId directly). Resolve the
    // tenant's workspaces and verify the job belongs to one of them.
    const where: Record<string, unknown> = { id };
    if (authUser.tenantId) {
      const tenantWorkspaces = await db.workspace.findMany({
        where: { tenantId: authUser.tenantId },
        select: { id: true },
      });
      const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
      if (workspaceIds.length > 0) {
        where.workspaceId = { in: workspaceIds };
      } else if (authUser.workspaceId) {
        where.workspaceId = authUser.workspaceId;
      } else {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    } else if (!authUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const existing = await db.job.findFirst({
      where,
      select: { id: true, deletedAt: true, title: true, assigneeId: true, workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Job already archived' });
    }

    await db.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Free the assignee (mirrors /api/jobs/bulk softDelete behaviour).
    if (existing.assigneeId) {
      try {
        await db.employee.update({
          where: { id: existing.assigneeId },
          data: { status: 'available' },
        });
      } catch (empErr) {
        console.error('[Jobs Archive] Failed to free assignee:', empErr);
      }
    }

    try {
      if (authUser.tenantId) {
        await logActivity({
          tenantId: authUser.tenantId,
          actorId: authUser.id,
          actorName: authUser.name || authUser.email,
          actorType: 'user',
          action: 'archive',
          entityType: 'job',
          entityId: id,
          entityName: existing.title || null,
          description: `Archived job "${existing.title || id}"`,
          metadataJson: JSON.stringify({ jobId: id }),
          severity: 'info',
        });
      }
    } catch (logErr) {
      console.error('[Jobs Archive] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Job archived' });
  } catch (error) {
    console.error('Archive job error:', error);
    return NextResponse.json({ error: 'Failed to archive job' }, { status: 500 });
  }
}

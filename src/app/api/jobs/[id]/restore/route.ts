import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/[id]/restore — un-archive (restore) a Job.
// Clears `deletedAt` so the job re-appears in the Active tab.
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
      select: { id: true, deletedAt: true, title: true, workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Job already active' });
    }

    await db.job.update({
      where: { id },
      data: { deletedAt: null },
    });

    try {
      if (authUser.tenantId) {
        await logActivity({
          tenantId: authUser.tenantId,
          actorId: authUser.id,
          actorName: authUser.name || authUser.email,
          actorType: 'user',
          action: 'restore',
          entityType: 'job',
          entityId: id,
          entityName: existing.title || null,
          description: `Restored job "${existing.title || id}"`,
          metadataJson: JSON.stringify({ jobId: id }),
          severity: 'info',
        });
      }
    } catch (logErr) {
      console.error('[Jobs Restore] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Job restored' });
  } catch (error) {
    console.error('Restore job error:', error);
    return NextResponse.json({ error: 'Failed to restore job' }, { status: 500 });
  }
}

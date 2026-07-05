import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * GET /api/activity-logs/[id] — fetch a single ActivityLog entry with full metadata.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const log = await db.activityLog.findUnique({ where: { id } });
    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    // Tenant isolation — superadmin bypasses
    if (!user.isSuperAdmin && log.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let metadata: unknown = {};
    try {
      metadata = JSON.parse(log.metadataJson || '{}');
    } catch {
      metadata = {};
    }

    return NextResponse.json({ ...log, metadata });
  } catch (error) {
    console.error('[activity-logs/[id] GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/activity-logs/[id] — admin-only deletion of a single log entry.
 * Records its own deletion in the audit trail (meta!).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner / admin / superadmin may delete log entries.
    const role = (user.role || '').toLowerCase();
    const isAdmin =
      user.isSuperAdmin ||
      role === 'owner' ||
      role === 'admin' ||
      role === 'superadmin' ||
      role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can delete activity logs' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const existing = await db.activityLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    // Tenant isolation — superadmin bypasses
    if (!user.isSuperAdmin && existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.activityLog.delete({ where: { id } });

    // Record the deletion in the audit trail (best-effort, never throws)
    await logActivity({
      tenantId: existing.tenantId,
      actorId: user.id,
      actorName: user.name || user.email,
      actorType: 'user',
      action: 'delete',
      entityType: 'activity_log',
      entityId: id,
      entityName: existing.description?.slice(0, 80) ?? null,
      description: `Admin deleted activity log entry`,
      metadataJson: JSON.stringify({
        originalAction: existing.action,
        originalEntityType: existing.entityType,
        originalEntityId: existing.entityId,
        originalDescription: existing.description,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
      severity: 'warning',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[activity-logs/[id] DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity log' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/leads/[id]/archive — soft-delete (archive) a Lead.
// Sets `deletedAt = now()` so the lead disappears from the Active tab and
// appears in the Archived tab. Reversible via POST .../restore.
//
// NOTE: /api/leads/[id] already supports soft-delete via body.softDelete=true
// in the DELETE handler. This dedicated endpoint exists for the archive-tab
// pattern used by PAGINATION-ARCHIVE-1 (POST /api/{module}/{id}/archive).
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Tenant scoping (mirrors /api/leads/[id]).
    const where: Record<string, unknown> = { id };
    if (authUser.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId');
      if (queryTenantId) where.tenantId = queryTenantId;
    } else if (authUser.tenantId) {
      where.tenantId = authUser.tenantId;
    } else {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const existing = await db.lead.findFirst({
      where,
      select: { id: true, deletedAt: true, name: true, title: true, tenantId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Lead already archived' });
    }

    await db.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    try {
      const tenantId = existing.tenantId || authUser.tenantId;
      if (tenantId) {
        await logActivity({
          tenantId,
          actorId: authUser.id,
          actorName: authUser.name || authUser.email,
          actorType: 'user',
          action: 'archive',
          entityType: 'lead',
          entityId: id,
          entityName: existing.name || existing.title || null,
          description: `Archived lead "${existing.name || existing.title || id}"`,
          metadataJson: JSON.stringify({ leadId: id }),
          severity: 'info',
        });
      }
    } catch (logErr) {
      console.error('[Leads Archive] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Lead archived' });
  } catch (error) {
    console.error('Archive lead error:', error);
    return NextResponse.json({ error: 'Failed to archive lead' }, { status: 500 });
  }
}

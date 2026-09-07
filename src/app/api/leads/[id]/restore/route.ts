import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/leads/[id]/restore — un-archive (restore) a Lead.
// Clears `deletedAt` so the lead re-appears in the Active tab.
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
    if (!existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Lead already active' });
    }

    await db.lead.update({
      where: { id },
      data: { deletedAt: null },
    });

    try {
      const tenantId = existing.tenantId || authUser.tenantId;
      if (tenantId) {
        await logActivity({
          tenantId,
          actorId: authUser.id,
          actorName: authUser.name || authUser.email,
          actorType: 'user',
          action: 'restore',
          entityType: 'lead',
          entityId: id,
          entityName: existing.name || existing.title || null,
          description: `Restored lead "${existing.name || existing.title || id}"`,
          metadataJson: JSON.stringify({ leadId: id }),
          severity: 'info',
        });
      }
    } catch (logErr) {
      console.error('[Leads Restore] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Lead restored' });
  } catch (error) {
    console.error('Restore lead error:', error);
    return NextResponse.json({ error: 'Failed to restore lead' }, { status: 500 });
  }
}

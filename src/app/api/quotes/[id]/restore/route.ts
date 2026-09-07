import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/quotes/[id]/restore — un-archive (restore) a Quote.
// Clears `deletedAt` so the quote re-appears in the Active tab.
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
    const { id } = await params;

    // Tenant scoping — verify ownership BEFORE mutating.
    const where: Record<string, unknown> = { id };
    if (!authUser.isSuperAdmin && authUser.tenantId) {
      where.tenantId = authUser.tenantId;
    } else if (!authUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const existing = await db.quote.findFirst({
      where,
      select: { id: true, deletedAt: true, title: true, tenantId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    // Idempotent — if already active, just return success.
    if (!existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Quote already active' });
    }

    await db.quote.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Best-effort activity log.
    try {
      const tenantId = existing.tenantId || authUser.tenantId;
      if (tenantId) {
        await logActivity({
          tenantId,
          actorId: authUser.id,
          actorName: authUser.name || authUser.email,
          actorType: 'user',
          action: 'restore',
          entityType: 'quote',
          entityId: id,
          entityName: existing.title || null,
          description: `Restored quote "${existing.title || id}"`,
          metadataJson: JSON.stringify({ quoteId: id }),
          severity: 'info',
        });
      }
    } catch (logErr) {
      console.error('[Quotes Restore] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Quote restored' });
  } catch (error) {
    console.error('Restore quote error:', error);
    return NextResponse.json({ error: 'Failed to restore quote' }, { status: 500 });
  }
}

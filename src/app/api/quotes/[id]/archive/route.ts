import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/quotes/[id]/archive — soft-delete (archive) a Quote.
// Sets `deletedAt = now()` so the quote disappears from the Active tab and
// appears in the Archived tab. Reversible via POST /api/quotes/[id]/restore.
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

    // Tenant scoping — verify ownership BEFORE mutating (mirrors /api/leads/[id]).
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
    // Idempotent — if already archived, just return success.
    if (existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Quote already archived' });
    }

    await db.quote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Best-effort activity log (never fails the archive).
    try {
      const tenantId = existing.tenantId || authUser.tenantId;
      if (tenantId) {
        await logActivity({
          tenantId,
          actorId: authUser.id,
          actorName: authUser.name || authUser.email,
          actorType: 'user',
          action: 'archive',
          entityType: 'quote',
          entityId: id,
          entityName: existing.title || null,
          description: `Archived quote "${existing.title || id}"`,
          metadataJson: JSON.stringify({ quoteId: id }),
          severity: 'info',
        });
      }
    } catch (logErr) {
      console.error('[Quotes Archive] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Quote archived' });
  } catch (error) {
    console.error('Archive quote error:', error);
    return NextResponse.json({ error: 'Failed to archive quote' }, { status: 500 });
  }
}

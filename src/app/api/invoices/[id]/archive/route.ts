import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { resolveFallbackTenantId } from '@/lib/tenant-resolver';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices/[id]/archive — soft-delete (archive) an Invoice.
// Sets `deletedAt = now()` so the invoice disappears from the Active tab
// and appears in the Archived tab. Reversible via POST .../restore.
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

    // Customer sessions can archive their own invoices only.
    if (authUser.role === 'customer' && authUser.id) {
      const existing = await db.invoice.findFirst({
        where: { id, customerId: authUser.id },
        select: { id: true, deletedAt: true, number: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (existing.deletedAt) {
        return NextResponse.json({ success: true, message: 'Invoice already archived' });
      }
      await db.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ success: true, message: 'Invoice archived' });
    }

    // Admin/employee: tenant-scoped.
    const tenantId = await resolveFallbackTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const existing = await db.invoice.findFirst({
      where: { id, tenantId },
      select: { id: true, deletedAt: true, number: true, tenantId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Invoice already archived' });
    }

    await db.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    try {
      await logActivity({
        tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'archive',
        entityType: 'invoice',
        entityId: id,
        entityName: existing.number || null,
        description: `Archived invoice ${existing.number || id}`,
        metadataJson: JSON.stringify({ invoiceId: id }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Invoices Archive] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Invoice archived' });
  } catch (error) {
    console.error('Archive invoice error:', error);
    return NextResponse.json({ error: 'Failed to archive invoice' }, { status: 500 });
  }
}

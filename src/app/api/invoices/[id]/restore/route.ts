import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { resolveFallbackTenantId } from '@/lib/tenant-resolver';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices/[id]/restore — un-archive (restore) an Invoice.
// Clears `deletedAt` so the invoice re-appears in the Active tab.
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

    // Customer sessions can restore their own invoices only.
    if (authUser.role === 'customer' && authUser.id) {
      const existing = await db.invoice.findFirst({
        where: { id, customerId: authUser.id },
        select: { id: true, deletedAt: true, number: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (!existing.deletedAt) {
        return NextResponse.json({ success: true, message: 'Invoice already active' });
      }
      await db.invoice.update({ where: { id }, data: { deletedAt: null } });
      return NextResponse.json({ success: true, message: 'Invoice restored' });
    }

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
    if (!existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Invoice already active' });
    }

    await db.invoice.update({
      where: { id },
      data: { deletedAt: null },
    });

    try {
      await logActivity({
        tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'restore',
        entityType: 'invoice',
        entityId: id,
        entityName: existing.number || null,
        description: `Restored invoice ${existing.number || id}`,
        metadataJson: JSON.stringify({ invoiceId: id }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Invoices Restore] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Invoice restored' });
  } catch (error) {
    console.error('Restore invoice error:', error);
    return NextResponse.json({ error: 'Failed to restore invoice' }, { status: 500 });
  }
}

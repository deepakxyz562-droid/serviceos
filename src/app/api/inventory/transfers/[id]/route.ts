import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

function scopeWhere(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
  id: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = { id };
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    const transfer = await db.stockTransfer.findFirst({ where: scopeWhere(authUser, id) });
    if (!transfer) {
      return NextResponse.json({ error: 'Stock transfer not found' }, { status: 404 });
    }

    return NextResponse.json({ transfer });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch stock transfer');
    const message = error instanceof Error ? error.message : 'Failed to fetch stock transfer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    const existing = await db.stockTransfer.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Stock transfer not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status, notes } = body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (typeof status === 'string') {
      data.status = status;
      if (status === 'received') {
        data.receivedDate = new Date();
      }
    }
    if (typeof notes === 'string') data.notes = notes;

    const updated = await db.stockTransfer.update({
      where: { id },
      data,
    });

    // If marked received, execute the location stock movement!
    if (status === 'received' && existing.status !== 'received') {
      try {
        const items = JSON.parse(existing.itemsJson || '[]');
        for (const item of items) {
          const qty = Number(item.quantity) || 0;
          if (qty > 0) {
            // Deduct from source location
            if (existing.fromWarehouseId || existing.fromEmployeeId) {
              const srcWhere: Record<string, unknown> = { inventoryItemId: item.inventoryItemId };
              if (existing.fromWarehouseId) srcWhere.warehouseId = existing.fromWarehouseId;
              if (existing.fromEmployeeId) srcWhere.employeeId = existing.fromEmployeeId;

              const srcLoc = await db.stockLocation.findFirst({ where: srcWhere });
              if (srcLoc) {
                await db.stockLocation.update({
                  where: { id: srcLoc.id },
                  data: { quantity: Math.max(0, srcLoc.quantity - qty) },
                });
              }
            }

            // Add to destination location
            if (existing.toWarehouseId || existing.toEmployeeId) {
              const dstWhere: Record<string, unknown> = { inventoryItemId: item.inventoryItemId };
              if (existing.toWarehouseId) dstWhere.warehouseId = existing.toWarehouseId;
              if (existing.toEmployeeId) dstWhere.employeeId = existing.toEmployeeId;

              const dstLoc = await db.stockLocation.findFirst({ where: dstWhere });
              if (dstLoc) {
                await db.stockLocation.update({
                  where: { id: dstLoc.id },
                  data: { quantity: dstLoc.quantity + qty },
                });
              } else {
                await db.stockLocation.create({
                  data: {
                    inventoryItemId: item.inventoryItemId,
                    warehouseId: existing.toWarehouseId || null,
                    employeeId: existing.toEmployeeId || null,
                    quantity: qty,
                  },
                });
              }
            }

            // Log paired stock transactions
            await db.stockTransaction.create({
              data: {
                tenantId: existing.tenantId ?? authUser.tenantId,
                inventoryItemId: item.inventoryItemId,
                type: 'transfer',
                direction: 'in',
                quantity: qty,
                reference: `Transfer #${existing.id.slice(0, 8)} received`,
                performedById: authUser.id,
                performedByName: authUser.name || authUser.email,
              },
            });
          }
        }
      } catch (locErr) {
        log.warn({ err: locErr }, 'Could not update location stock during transfer receipt');
      }
    }

    log.info({ userId: authUser.id, transferId: id, status }, 'Stock transfer updated');
    return NextResponse.json({ transfer: updated });
  } catch (error) {
    log.error({ err: error }, 'Failed to update stock transfer');
    const message = error instanceof Error ? error.message : 'Failed to update stock transfer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

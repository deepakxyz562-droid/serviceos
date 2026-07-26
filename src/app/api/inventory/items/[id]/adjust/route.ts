import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Stock Adjustment API
 * ---------------------
 * POST /api/inventory/items/[id]/adjust
 *
 * Body:
 *   quantity:  number (required, can be negative for decrease)
 *   reason:    string (required, free text — e.g. "Damaged in transit")
 *   type:      'adjustment' | 'consumption' | 'return' | 'transfer'  (default 'adjustment')
 *
 * Behaviour:
 *   - Creates a StockTransaction (direction 'in' if quantity > 0, else 'out')
 *   - Updates InventoryItem.totalStock by the quantity (clamped to >= 0)
 *   - Recomputes availableStock = totalStock - reservedStock
 *   - If after the adjustment totalStock <= reorderLevel (and reorderLevel > 0),
 *     upserts an active LowStockAlert.
 */

const VALID_TYPES = ['adjustment', 'consumption', 'return', 'transfer'] as const;

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
    }

    const existing = await db.inventoryItem.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    if (!existing.isActive) {
      return NextResponse.json(
        { error: 'Cannot adjust stock for an inactive item' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { quantity, reason, type, reference, notes } = body as Record<string, unknown>;

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty === 0) {
      return NextResponse.json(
        { error: 'quantity is required and must be a non-zero number' },
        { status: 400 },
      );
    }

    if (typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    const txType =
      typeof type === 'string' && VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])
        ? (type as (typeof VALID_TYPES)[number])
        : 'adjustment';

    const direction = qty > 0 ? 'in' : 'out';
    const absQty = Math.abs(Math.floor(qty));

    // Check we don't drive totalStock below zero
    const newTotal = existing.totalStock + qty;
    if (newTotal < 0) {
      return NextResponse.json(
        {
          error: `Adjustment would result in negative stock (current ${existing.totalStock}, attempted ${qty > 0 ? '+' : ''}${qty})`,
        },
        { status: 400 },
      );
    }

    const newReserved = existing.reservedStock;
    const newAvailable = Math.max(0, newTotal - newReserved);

    // Use a transaction so the StockTransaction + InventoryItem update are atomic
    const [updatedItem, transaction] = await db.$transaction([
      db.inventoryItem.update({
        where: { id },
        data: {
          totalStock: newTotal,
          availableStock: newAvailable,
        },
      }),
      db.stockTransaction.create({
        data: {
          tenantId: existing.tenantId ?? authUser.tenantId,
          inventoryItemId: id,
          type: txType,
          direction,
          quantity: absQty,
          unitCost: existing.costPrice,
          totalCost: absQty * existing.costPrice,
          reference: typeof reference === 'string' && reference.trim() ? reference.trim() : `Adjustment: ${reason.trim()}`,
          referenceId: null,
          notes: `${reason.trim()}${typeof notes === 'string' && notes.trim() ? ' | ' + notes.trim() : ''}`,
          performedById: authUser.id,
          performedByName: authUser.name || authUser.email,
          metadataJson: JSON.stringify({
            source: 'stock_adjustment',
            reason: reason.trim(),
            previousTotal: existing.totalStock,
            newTotal,
          }),
        },
      }),
    ]);

    // Low stock alert upsert
    let alert: { id: string; status: string } | null = null;
    if (
      updatedItem.reorderLevel > 0 &&
      updatedItem.totalStock <= updatedItem.reorderLevel
    ) {
      try {
        const existingAlert = await db.lowStockAlert.findFirst({
          where: { inventoryItemId: id, status: 'active' },
        });
        if (existingAlert) {
          alert = await db.lowStockAlert.update({
            where: { id: existingAlert.id },
            data: { currentStock: updatedItem.totalStock, reorderLevel: updatedItem.reorderLevel },
            select: { id: true, status: true },
          });
        } else {
          alert = await db.lowStockAlert.create({
            data: {
              tenantId: existing.tenantId ?? authUser.tenantId,
              inventoryItemId: id,
              currentStock: updatedItem.totalStock,
              reorderLevel: updatedItem.reorderLevel,
              status: 'active',
            },
            select: { id: true, status: true },
          });
        }
      } catch (e) {
        log.warn({ err: e, itemId: id }, 'Failed to upsert low stock alert');
      }
    } else {
      // Auto-resolve any active alert if we're back above reorder level
      try {
        await db.lowStockAlert.updateMany({
          where: { inventoryItemId: id, status: 'active' },
          data: { status: 'resolved', resolvedAt: new Date() },
        });
      } catch {
        // ignore
      }
    }

    log.info(
      {
        userId: authUser.id,
        itemId: id,
        type: txType,
        direction,
        quantity: absQty,
        previousTotal: existing.totalStock,
        newTotal: updatedItem.totalStock,
        alertCreated: !!alert,
      },
      'Stock adjusted',
    );

    return NextResponse.json({ item: updatedItem, transaction, alert }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to adjust stock');
    const message = error instanceof Error ? error.message : 'Failed to adjust stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

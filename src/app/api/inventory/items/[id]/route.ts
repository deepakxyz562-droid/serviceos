import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

/**
 * Single Inventory Item API
 * --------------------------
 * GET    /api/inventory/items/[id]  — fetch an item (with supplier + recent transactions)
 * PATCH  /api/inventory/items/[id]  — update item fields
 * DELETE /api/inventory/items/[id]  — soft delete (set isActive=false)
 *
 * Tenant scoping enforced on every read/write.
 */

const VALID_UNITS = ['each', 'kg', 'litre', 'metre', 'box', 'hour', 'pack'];

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

/**
 * GET /api/inventory/items/[id]
 */
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

    // Plan-tier gate: Inventory module is business+.
    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
    }

    const item = await db.inventoryItem.findFirst({
      where: scopeWhere(authUser, id),
      include: { supplier: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Recent stock transactions (last 25)
    const recentTransactions = await db.stockTransaction.findMany({
      where: { inventoryItemId: id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    // Active low stock alert (if any)
    const activeAlert = await db.lowStockAlert.findFirst({
      where: { inventoryItemId: id, status: 'active' },
    });

    return NextResponse.json({ item, recentTransactions, activeAlert });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch inventory item');
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/inventory/items/[id]
 * Updatable fields: name, description, category, unit, costPrice, salePrice,
 *   currency, reorderLevel, reorderQty, supplierId, supplierSku, barcode,
 *   imageUrl, branchId, isActive, metadata
 *
 * If totalStock or reservedStock is changed via this endpoint, availableStock is
 * recomputed. (Stock-level changes should normally go through /adjust, but
 * we allow direct patch for corrections.)
 */
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

    // Plan-tier gate: Inventory module is business+.
    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
    }

    const existing = await db.inventoryItem.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim().slice(0, 300);
    }
    if (body.description !== undefined) {
      updateData.description =
        typeof body.description === 'string' ? body.description : null;
    }
    if (typeof body.category === 'string' && body.category.trim()) {
      updateData.category = body.category.trim();
    }
    if (body.unit !== undefined) {
      if (typeof body.unit !== 'string' || !VALID_UNITS.includes(body.unit)) {
        return NextResponse.json(
          { error: `Invalid unit. Must be one of: ${VALID_UNITS.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.unit = body.unit;
    }
    if (body.costPrice !== undefined) {
      const v = Number(body.costPrice);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'costPrice must be a non-negative number' }, { status: 400 });
      }
      updateData.costPrice = v;
    }
    if (body.salePrice !== undefined) {
      const v = Number(body.salePrice);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'salePrice must be a non-negative number' }, { status: 400 });
      }
      updateData.salePrice = v;
    }
    if (typeof body.currency === 'string' && body.currency.trim()) {
      updateData.currency = body.currency.trim().slice(0, 8);
    }
    if (body.reorderLevel !== undefined) {
      const v = Number(body.reorderLevel);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'reorderLevel must be a non-negative number' }, { status: 400 });
      }
      updateData.reorderLevel = Math.floor(v);
    }
    if (body.reorderQty !== undefined) {
      const v = Number(body.reorderQty);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'reorderQty must be a non-negative number' }, { status: 400 });
      }
      updateData.reorderQty = Math.floor(v);
    }
    if (body.supplierId !== undefined) {
      updateData.supplierId =
        typeof body.supplierId === 'string' && body.supplierId.trim()
          ? body.supplierId.trim()
          : null;
    }
    if (body.supplierSku !== undefined) {
      updateData.supplierSku =
        typeof body.supplierSku === 'string' && body.supplierSku.trim()
          ? body.supplierSku.trim()
          : null;
    }
    if (body.barcode !== undefined) {
      updateData.barcode =
        typeof body.barcode === 'string' && body.barcode.trim() ? body.barcode.trim() : null;
    }
    if (body.imageUrl !== undefined) {
      updateData.imageUrl =
        typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null;
    }
    if (body.branchId !== undefined) {
      updateData.branchId =
        typeof body.branchId === 'string' && body.branchId.trim() ? body.branchId.trim() : null;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }
    if (body.totalStock !== undefined) {
      const v = Number(body.totalStock);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'totalStock must be a non-negative number' }, { status: 400 });
      }
      updateData.totalStock = Math.floor(v);
    }
    if (body.reservedStock !== undefined) {
      const v = Number(body.reservedStock);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'reservedStock must be a non-negative number' }, { status: 400 });
      }
      updateData.reservedStock = Math.floor(v);
    }
    if (body.metadata !== undefined) {
      updateData.metadataJson = JSON.stringify(
        body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      );
    }

    // Recompute availableStock if total/reserved changed
    const newTotal = typeof updateData.totalStock === 'number' ? updateData.totalStock : existing.totalStock;
    const newReserved = typeof updateData.reservedStock === 'number' ? updateData.reservedStock : existing.reservedStock;
    updateData.availableStock = Math.max(0, newTotal - newReserved);

    const item = await db.inventoryItem.update({
      where: { id },
      data: updateData,
      include: { supplier: { select: { id: true, name: true } } },
    });

    log.info(
      { userId: authUser.id, itemId: id, fields: Object.keys(updateData) },
      'Inventory item updated',
    );

    return NextResponse.json({ item });
  } catch (error) {
    log.error({ err: error }, 'Failed to update inventory item');
    const message = error instanceof Error ? error.message : 'Failed to update inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/items/[id]
 * Soft-delete: set isActive=false. Hard-deleting would break historical
 * StockTransaction references, so we deactivate instead.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Plan-tier gate: Inventory module is business+.
    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
    }

    const existing = await db.inventoryItem.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });

    log.info({ userId: authUser.id, itemId: id }, 'Inventory item deactivated');

    return NextResponse.json({ item, deleted: true });
  } catch (error) {
    log.error({ err: error }, 'Failed to delete inventory item');
    const message = error instanceof Error ? error.message : 'Failed to delete inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

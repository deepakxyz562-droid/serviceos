import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Single Purchase Order API
 * --------------------------
 * GET   /api/inventory/purchase-orders/[id]  — fetch a PO
 * PATCH /api/inventory/purchase-orders/[id]  — update a PO (status, expected date, items, notes)
 *
 * Tenant scoping enforced on every read/write.
 */

const VALID_STATUSES = ['draft', 'sent', 'partial', 'received', 'cancelled'] as const;

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
 * GET /api/inventory/purchase-orders/[id]
 * Returns the PO with parsed itemsJson + the related supplier (if any).
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Purchase order id is required' }, { status: 400 });
    }

    const purchaseOrder = await db.purchaseOrder.findFirst({
      where: scopeWhere(authUser, id),
    });
    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Resolve supplier (PurchaseOrder has no Prisma relation, only supplierId FK)
    let supplier: { id: string; name: string; email: string | null; phone: string | null } | null = null;
    if (purchaseOrder.supplierId) {
      supplier = await db.supplier
        .findUnique({
          where: { id: purchaseOrder.supplierId },
          select: { id: true, name: true, email: true, phone: true },
        })
        .catch(() => null);
    }

    return NextResponse.json({
      purchaseOrder,
      items: (() => {
        try {
          const parsed = JSON.parse(purchaseOrder.itemsJson);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      supplier,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch purchase order');
    const message = error instanceof Error ? error.message : 'Failed to fetch purchase order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/inventory/purchase-orders/[id]
 * Updatable fields: status, expectedDate, supplierId, branchId, items, notes, poNumber
 *
 * If items is provided, totalAmount is recomputed.
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Purchase order id is required' }, { status: 400 });
    }

    const existing = await db.purchaseOrder.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Once a PO is fully received or cancelled, prevent edits (except status rollback by admin).
    if (existing.status === 'received' || existing.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot edit a PO in status '${existing.status}'` },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (
        typeof body.status !== 'string' ||
        !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])
      ) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }

    if (body.expectedDate !== undefined) {
      updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }
    if (body.supplierId !== undefined) {
      updateData.supplierId =
        typeof body.supplierId === 'string' && body.supplierId.trim()
          ? body.supplierId.trim()
          : null;
    }
    if (body.branchId !== undefined) {
      updateData.branchId =
        typeof body.branchId === 'string' && body.branchId.trim() ? body.branchId.trim() : null;
    }
    if (body.poNumber !== undefined) {
      updateData.poNumber =
        typeof body.poNumber === 'string' && body.poNumber.trim()
          ? body.poNumber.trim().slice(0, 100)
          : null;
    }
    if (body.notes !== undefined) {
      updateData.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    }

    if (body.items !== undefined) {
      if (!Array.isArray(body.items)) {
        return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
      }
      let totalAmount = 0;
      const normalizedItems = body.items.map((it: any, idx: number) => {
        const quantity = Number(it?.quantity);
        const unitPrice = Number(it?.unitPrice);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`items[${idx}].quantity must be a positive number`);
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`items[${idx}].unitPrice must be a non-negative number`);
        }
        const lineTotal = quantity * unitPrice;
        totalAmount += lineTotal;
        return {
          inventoryItemId: typeof it?.inventoryItemId === 'string' ? it.inventoryItemId : null,
          name: typeof it?.name === 'string' ? it.name : '',
          sku: typeof it?.sku === 'string' ? it.sku : null,
          quantity: Math.floor(quantity),
          unitPrice,
          total: lineTotal,
        };
      });
      updateData.itemsJson = JSON.stringify(normalizedItems);
      updateData.totalAmount = totalAmount;
    }

    const purchaseOrder = await db.purchaseOrder.update({
      where: { id },
      data: updateData,
    });

    log.info(
      { userId: authUser.id, poId: id, fields: Object.keys(updateData) },
      'Purchase order updated',
    );

    return NextResponse.json({ purchaseOrder });
  } catch (error) {
    log.error({ err: error }, 'Failed to update purchase order');
    const message = error instanceof Error ? error.message : 'Failed to update purchase order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

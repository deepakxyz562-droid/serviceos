import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

/**
 * Purchase Orders API
 * --------------------
 * GET  /api/inventory/purchase-orders  — list POs (filter by status/supplierId/branchId)
 * POST /api/inventory/purchase-orders  — create a PO (draft by default)
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_STATUSES = ['draft', 'sent', 'partial', 'received', 'cancelled'] as const;

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/inventory/purchase-orders
 * Query params: status, supplierId, branchId, limit
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Plan-tier gate: Inventory module is business+ (covers POs).
    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const branchId = searchParams.get('branchId');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = tenantScope(authUser);
    if (supplierId) where.supplierId = supplierId;
    if (branchId) where.branchId = branchId;
    if (status) {
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      where.status = status;
    }

    const purchaseOrders = await db.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    log.info({ userId: authUser.id, count: purchaseOrders.length }, 'Purchase orders listed');

    return NextResponse.json({ purchaseOrders, count: purchaseOrders.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list purchase orders');
    const message = error instanceof Error ? error.message : 'Failed to fetch purchase orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/inventory/purchase-orders
 * Body:
 *   supplierId, branchId, poNumber, orderDate, expectedDate, currency,
 *   items: [{ inventoryItemId, name, sku, quantity, unitPrice }],
 *   notes, status (default 'draft')
 *
 * totalAmount = sum(quantity * unitPrice) computed server-side.
 */
export async function POST(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    // Plan-tier gate: Inventory module is business+ (covers POs).
    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      supplierId,
      branchId,
      poNumber,
      orderDate,
      expectedDate,
      currency,
      items,
      notes,
      status,
    } = body as Record<string, unknown>;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    // Validate + compute totals
    let totalAmount = 0;
    const normalizedItems = items.map((it: any, idx: number) => {
      const inventoryItemId =
        typeof it?.inventoryItemId === 'string' ? it.inventoryItemId : null;
      const name = typeof it?.name === 'string' ? it.name : '';
      const sku = typeof it?.sku === 'string' ? it.sku : null;
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
        inventoryItemId,
        name,
        sku,
        quantity: Math.floor(quantity),
        unitPrice,
        total: lineTotal,
      };
    });

    const finalStatus =
      typeof status === 'string' && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
        ? (status as (typeof VALID_STATUSES)[number])
        : 'draft';

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        tenantId: authUser.tenantId,
        supplierId:
          typeof supplierId === 'string' && supplierId.trim() ? supplierId.trim() : null,
        branchId: typeof branchId === 'string' && branchId.trim() ? branchId.trim() : null,
        poNumber:
          typeof poNumber === 'string' && poNumber.trim() ? poNumber.trim().slice(0, 100) : null,
        orderDate: orderDate ? new Date(orderDate as string) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate as string) : null,
        receivedDate: null,
        totalAmount,
        currency: typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 8) : 'USD',
        itemsJson: JSON.stringify(normalizedItems),
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
        status: finalStatus,
      },
    });

    log.info(
      { userId: authUser.id, poId: purchaseOrder.id, totalAmount, itemCount: normalizedItems.length },
      'Purchase order created',
    );

    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create purchase order');
    const message = error instanceof Error ? error.message : 'Failed to create purchase order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

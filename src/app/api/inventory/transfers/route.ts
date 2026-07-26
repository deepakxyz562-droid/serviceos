import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Stock Transfers API
 * --------------------
 * GET  /api/inventory/transfers  — list stock transfers (filter by status)
 * POST /api/inventory/transfers  — create a stock transfer between warehouses or employees
 *
 * A transfer moves stock from one location (warehouse or employee) to another.
 * On creation, StockTransaction rows are recorded with type='transfer' for
 * audit (one 'out' on the source, one 'in' on the destination), and the
 * InventoryItem.totalStock is unchanged (transfers move location, not totals).
 *
 * NOTE: The schema models StockLocation as the per-location quantity holder,
 * but since StockLocation rows are optional in this schema (InventoryItem has
 * a single denormalized totalStock), transfers here are recorded as audit
 * events on the InventoryItem itself. If StockLocation rows exist, callers
 * should adjust them separately via the appropriate locations API.
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_STATUSES = ['pending', 'in_transit', 'received', 'cancelled'] as const;

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/inventory/transfers
 * Query params: status, limit
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = tenantScope(authUser);
    if (status) {
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      where.status = status;
    }

    const transfers = await db.stockTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    log.info({ userId: authUser.id, count: transfers.length }, 'Stock transfers listed');

    return NextResponse.json({ transfers, count: transfers.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list stock transfers');
    const message = error instanceof Error ? error.message : 'Failed to fetch stock transfers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/inventory/transfers
 * Body:
 *   fromWarehouseId | fromEmployeeId (at least one source)
 *   toWarehouseId   | toEmployeeId   (at least one destination)
 *   items: [{ inventoryItemId, name, quantity }]  (required)
 *   notes, status (default 'pending')
 *
 * Each item must have quantity > 0. Creates the StockTransfer record and (if
 * status='in_transit' or 'received') writes paired StockTransaction rows
 * (direction 'out' on source, 'in' on destination) for audit.
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      fromWarehouseId,
      toWarehouseId,
      fromEmployeeId,
      toEmployeeId,
      items,
      notes,
      status,
      transferDate,
    } = body as Record<string, unknown>;

    // Validate: at least one source and one destination
    const hasSource =
      (typeof fromWarehouseId === 'string' && fromWarehouseId.trim()) ||
      (typeof fromEmployeeId === 'string' && fromEmployeeId.trim());
    const hasDest =
      (typeof toWarehouseId === 'string' && toWarehouseId.trim()) ||
      (typeof toEmployeeId === 'string' && toEmployeeId.trim());

    if (!hasSource || !hasDest) {
      return NextResponse.json(
        { error: 'At least one source (fromWarehouseId or fromEmployeeId) and one destination (toWarehouseId or toEmployeeId) are required' },
        { status: 400 },
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    // Normalize items
    const normalizedItems = items.map((it: any, idx: number) => {
      const inventoryItemId = typeof it?.inventoryItemId === 'string' ? it.inventoryItemId : null;
      const name = typeof it?.name === 'string' ? it.name : '';
      const quantity = Number(it?.quantity);
      if (!inventoryItemId) {
        throw new Error(`items[${idx}].inventoryItemId is required`);
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`items[${idx}].quantity must be a positive number`);
      }
      return { inventoryItemId, name, quantity: Math.floor(quantity) };
    });

    const finalStatus =
      typeof status === 'string' && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
        ? (status as (typeof VALID_STATUSES)[number])
        : 'pending';

    const transfer = await db.stockTransfer.create({
      data: {
        tenantId: authUser.tenantId,
        fromWarehouseId:
          typeof fromWarehouseId === 'string' && fromWarehouseId.trim() ? fromWarehouseId.trim() : null,
        toWarehouseId:
          typeof toWarehouseId === 'string' && toWarehouseId.trim() ? toWarehouseId.trim() : null,
        fromEmployeeId:
          typeof fromEmployeeId === 'string' && fromEmployeeId.trim()
            ? fromEmployeeId.trim()
            : null,
        toEmployeeId:
          typeof toEmployeeId === 'string' && toEmployeeId.trim() ? toEmployeeId.trim() : null,
        status: finalStatus,
        transferDate: transferDate ? new Date(transferDate as string) : new Date(),
        receivedDate: finalStatus === 'received' ? new Date() : null,
        itemsJson: JSON.stringify(normalizedItems),
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      },
    });

    // If the transfer is already in_transit or received, record paired
    // StockTransaction rows so the audit trail reflects the movement.
    if (finalStatus === 'in_transit' || finalStatus === 'received') {
      const transferRef = `Transfer ${transfer.id}`;
      try {
        for (const it of normalizedItems) {
          // Verify the item exists and is tenant-scoped
          const item = await db.inventoryItem.findFirst({
            where: { id: it.inventoryItemId, ...tenantScope(authUser) },
          });
          if (!item) {
            log.warn(
              { transferId: transfer.id, itemId: it.inventoryItemId },
              'Inventory item not found during transfer audit write — skipping',
            );
            continue;
          }
          // 'out' from source
          await db.stockTransaction.create({
            data: {
              tenantId: authUser.tenantId,
              inventoryItemId: item.id,
              type: 'transfer',
              direction: 'out',
              quantity: it.quantity,
              unitCost: item.costPrice,
              totalCost: it.quantity * item.costPrice,
              reference: transferRef,
              referenceId: transfer.id,
              notes: `Transfer out (transfer ${transfer.id})`,
              performedById: authUser.id,
              performedByName: authUser.name || authUser.email,
              metadataJson: JSON.stringify({
                source: 'stock_transfer',
                transferId: transfer.id,
                fromWarehouseId: transfer.fromWarehouseId ?? null,
                fromEmployeeId: transfer.fromEmployeeId ?? null,
                toWarehouseId: transfer.toWarehouseId ?? null,
                toEmployeeId: transfer.toEmployeeId ?? null,
                leg: 'out',
              }),
            },
          });
          // 'in' to destination
          await db.stockTransaction.create({
            data: {
              tenantId: authUser.tenantId,
              inventoryItemId: item.id,
              type: 'transfer',
              direction: 'in',
              quantity: it.quantity,
              unitCost: item.costPrice,
              totalCost: it.quantity * item.costPrice,
              reference: transferRef,
              referenceId: transfer.id,
              notes: `Transfer in (transfer ${transfer.id})`,
              performedById: authUser.id,
              performedByName: authUser.name || authUser.email,
              metadataJson: JSON.stringify({
                source: 'stock_transfer',
                transferId: transfer.id,
                fromWarehouseId: transfer.fromWarehouseId ?? null,
                fromEmployeeId: transfer.fromEmployeeId ?? null,
                toWarehouseId: transfer.toWarehouseId ?? null,
                toEmployeeId: transfer.toEmployeeId ?? null,
                leg: 'in',
              }),
            },
          });
        }
      } catch (e) {
        log.warn(
          { err: e, transferId: transfer.id },
          'Failed to write some/all stock transactions for transfer (transfer record was still created)',
        );
      }
    }

    log.info(
      {
        userId: authUser.id,
        transferId: transfer.id,
        itemCount: normalizedItems.length,
        status: finalStatus,
      },
      'Stock transfer created',
    );

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create stock transfer');
    const message = error instanceof Error ? error.message : 'Failed to create stock transfer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

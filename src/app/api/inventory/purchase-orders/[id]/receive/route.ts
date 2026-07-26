import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Purchase Order Receive API
 * ---------------------------
 * POST /api/inventory/purchase-orders/[id]/receive
 *
 * Receives items against a Purchase Order. For each item received:
 *   - Creates a StockTransaction (type='purchase', direction='in')
 *   - Increments the InventoryItem.totalStock (and recomputes availableStock)
 *   - If after receipt totalStock <= reorderLevel, upsert an active LowStockAlert
 *     (rare on receipt, but possible for partial receipts)
 *
 * The PO status is updated:
 *   - 'partial'  if not all line items are fully received yet
 *   - 'received' if all line items are fully received
 *   - leaves 'cancelled' POs untouched (rejected)
 *
 * Body:
 *   receivedItems: [{ inventoryItemId, quantity, unitPrice? }]   (required)
 *   notes?: string
 *
 * If a line item's inventoryItemId is null (because the SKU didn't exist yet),
 * the route returns 400 with a list of unresolved items — the caller must
 * create the InventoryItem first.
 */

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
 * Upsert an active LowStockAlert if totalStock is at or below reorderLevel.
 * Otherwise auto-resolve any existing active alerts for the item.
 */
async function refreshLowStockAlert(
  tenantId: string | null,
  itemId: string,
  currentStock: number,
  reorderLevel: number,
  log: ReturnType<typeof withRequestId>,
): Promise<void> {
  if (reorderLevel > 0 && currentStock <= reorderLevel) {
    try {
      const existingAlert = await db.lowStockAlert.findFirst({
        where: { inventoryItemId: itemId, status: 'active' },
      });
      if (existingAlert) {
        await db.lowStockAlert.update({
          where: { id: existingAlert.id },
          data: { currentStock, reorderLevel },
        });
      } else {
        await db.lowStockAlert.create({
          data: {
            tenantId,
            inventoryItemId: itemId,
            currentStock,
            reorderLevel,
            status: 'active',
          },
        });
      }
    } catch (e) {
      log.warn({ err: e, itemId }, 'Failed to upsert low stock alert during PO receive');
    }
  } else {
    // Stock is above reorder level — auto-resolve any active alerts
    try {
      await db.lowStockAlert.updateMany({
        where: { inventoryItemId: itemId, status: 'active' },
        data: { status: 'resolved', resolvedAt: new Date() },
      });
    } catch {
      // ignore
    }
  }
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
      return NextResponse.json({ error: 'Purchase order id is required' }, { status: 400 });
    }

    const po = await db.purchaseOrder.findFirst({ where: scopeWhere(authUser, id) });
    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }
    if (po.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot receive a cancelled purchase order' }, { status: 400 });
    }
    if (po.status === 'received') {
      return NextResponse.json(
        { error: 'Purchase order has already been fully received' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { receivedItems, notes } = body as Record<string, unknown>;

    if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
      return NextResponse.json(
        { error: 'receivedItems must be a non-empty array' },
        { status: 400 },
      );
    }

    // Parse the PO line items so we can match receipts + track received quantities.
    interface PoLineItem {
      inventoryItemId: string | null;
      name: string;
      sku: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
      receivedQuantity?: number;
    }
    let poItems: PoLineItem[] = [];
    try {
      const parsed = JSON.parse(po.itemsJson);
      poItems = Array.isArray(parsed) ? (parsed as PoLineItem[]) : [];
    } catch {
      poItems = [];
    }

    // Normalize received items + validate
    interface ReceivedItem {
      inventoryItemId: string;
      quantity: number;
      unitPrice?: number;
    }
    const normalized: ReceivedItem[] = [];
    for (let i = 0; i < receivedItems.length; i++) {
      const it = receivedItems[i] as Record<string, unknown>;
      const invId = typeof it?.inventoryItemId === 'string' ? it.inventoryItemId : null;
      const qty = Number(it?.quantity);
      if (!invId) {
        return NextResponse.json(
          { error: `receivedItems[${i}].inventoryItemId is required` },
          { status: 400 },
        );
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `receivedItems[${i}].quantity must be a positive number` },
          { status: 400 },
        );
      }
      normalized.push({
        inventoryItemId: invId,
        quantity: Math.floor(qty),
        unitPrice: typeof it?.unitPrice === 'number' && Number.isFinite(it.unitPrice)
          ? it.unitPrice
          : undefined,
      });
    }

    // Fetch all referenced inventory items in one query
    const invIds = Array.from(new Set(normalized.map((r) => r.inventoryItemId)));
    const invItems = await db.inventoryItem.findMany({
      where: { id: { in: invIds } },
    });
    const invById = new Map(invItems.map((it) => [it.id, it]));
    const missing = invIds.filter((iid) => !invById.has(iid));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'One or more inventory items not found',
          missingInventoryItemIds: missing,
        },
        { status: 404 },
      );
    }

    // Validate tenant scope for inventory items
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      const foreign = invItems.filter((it) => it.tenantId !== authUser.tenantId);
      if (foreign.length > 0) {
        return NextResponse.json(
          {
            error: 'One or more inventory items belong to a different tenant',
            foreignItemIds: foreign.map((it) => it.id),
          },
          { status: 403 },
        );
      }
    }

    const tenantId = po.tenantId ?? authUser.tenantId;
    const performerName = authUser.name || authUser.email;
    const performerId = authUser.id;
    const poRef = po.poNumber || po.id;

    // ── Atomic receipt: update inventory + create stock transactions ──────
    const transactions: Awaited<ReturnType<typeof db.stockTransaction.create>>[] = [];
    const itemUpdates: { itemId: string; receivedQty: number; previousTotal: number; newTotal: number }[] = [];

    // Use a sequential transaction so each item update + transaction creation
    // happens atomically. If any step fails, the whole receipt rolls back.
    await db.$transaction(async (tx) => {
      for (const recv of normalized) {
        const item = invById.get(recv.inventoryItemId);
        if (!item) continue; // already validated, but TS doesn't know

        const unitCost = recv.unitPrice ?? item.costPrice;
        const lineTotal = unitCost * recv.quantity;
        const previousTotal = item.totalStock;
        const newTotal = previousTotal + recv.quantity;
        const newAvailable = Math.max(0, newTotal - item.reservedStock);

        const updated = await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            totalStock: newTotal,
            availableStock: newAvailable,
            // Optionally update costPrice if a new unitPrice was supplied
            ...(recv.unitPrice !== undefined && recv.unitPrice !== item.costPrice
              ? { costPrice: recv.unitPrice }
              : {}),
          },
        });

        const transaction = await tx.stockTransaction.create({
          data: {
            tenantId,
            inventoryItemId: item.id,
            type: 'purchase',
            direction: 'in',
            quantity: recv.quantity,
            unitCost,
            totalCost: lineTotal,
            reference: `PO ${poRef}`,
            referenceId: po.id,
            notes:
              `Received against PO ${poRef}` +
              (typeof notes === 'string' && notes.trim() ? ` | ${notes.trim()}` : ''),
            performedById: performerId,
            performedByName: performerName,
            metadataJson: JSON.stringify({
              source: 'po_receive',
              purchaseOrderId: po.id,
              poNumber: po.poNumber ?? null,
              supplierId: po.supplierId ?? null,
            }),
          },
        });

        transactions.push(transaction);
        itemUpdates.push({
          itemId: item.id,
          receivedQty: recv.quantity,
          previousTotal,
          newTotal: updated.totalStock,
        });

        // Update the in-memory copy so subsequent iterations see the new total
        item.totalStock = updated.totalStock;
        item.costPrice = updated.costPrice;
      }

      // Update receivedQuantity tracking on each PO line item
      const receivedByItem = new Map<string, number>();
      for (const recv of normalized) {
        receivedByItem.set(
          recv.inventoryItemId,
          (receivedByItem.get(recv.inventoryItemId) ?? 0) + recv.quantity,
        );
      }
      let allFullyReceived = poItems.length > 0;
      const updatedPoItems = poItems.map((line) => {
        if (!line.inventoryItemId) {
          allFullyReceived = false;
          return line;
        }
        const alreadyReceived = line.receivedQuantity ?? 0;
        const thisReceipt = receivedByItem.get(line.inventoryItemId) ?? 0;
        const totalReceived = alreadyReceived + thisReceipt;
        if (totalReceived < line.quantity) {
          allFullyReceived = false;
        }
        return { ...line, receivedQuantity: totalReceived };
      });

      const newStatus = allFullyReceived ? 'received' : 'partial';
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: newStatus,
          receivedDate: allFullyReceived ? new Date() : po.receivedDate,
          itemsJson: JSON.stringify(updatedPoItems),
        },
      });
    });

    // ── Post-transaction side effects (outside the db tx for resilience) ──
    // Refresh low stock alerts for each affected item.
    for (const upd of itemUpdates) {
      const item = invById.get(upd.itemId);
      if (!item) continue;
      await refreshLowStockAlert(tenantId, upd.itemId, upd.newTotal, item.reorderLevel, log);
    }

    log.info(
      {
        userId: authUser.id,
        poId: po.id,
        poNumber: po.poNumber,
        receivedCount: normalized.length,
        transactionsCreated: transactions.length,
      },
      'Purchase order received',
    );

    return NextResponse.json(
      {
        success: true,
        purchaseOrderId: po.id,
        transactions,
        itemUpdates,
      },
      { status: 201 },
    );
  } catch (error) {
    log.error({ err: error }, 'Failed to receive purchase order');
    const message = error instanceof Error ? error.message : 'Failed to receive purchase order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

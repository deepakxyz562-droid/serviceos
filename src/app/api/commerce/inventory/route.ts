import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export const runtime = 'nodejs';

/**
 * GET & PATCH /api/commerce/inventory
 *
 * Phase 2 migration: now reads/writes the real `InventoryItem` Prisma model
 * (with companion `StockTransaction` for audit + `LowStockAlert` for proactive
 * restock notifications). The legacy `catalogJson[i].stock` JSON blob is no
 * longer the source of truth for stock.
 *
 * Response shapes are unchanged for backward compatibility with any consumer
 * that reads this endpoint (the `commerceInventory` path is registered in
 * `gptform-mobile-app/src/lib/constants.ts` — currently no mobile screen
 * consumes it, but the shape stays stable so a future screen can use it
 * directly).
 */

interface InventoryListResponseItem {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  minStock: number;
  isLowStock: boolean;
  imageUrl?: string | null;
  isActive: boolean;
}

/**
 * GET /api/commerce/inventory
 *
 * Fallback decision (documented): when no `InventoryItem` rows exist for the
 * tenant yet, we fall back to reading the catalog from `catalogJson` and
 * surface each product with `stock: 0` and `minStock: 0`. This keeps the
 * inventory screen populated with the merchant's catalog (so they can see
 * "what needs to be stocked") rather than showing an opaque empty state.
 * The stock numbers are honest (0 — not the legacy magic 50). Phase 3 will
 * add a one-time "seed InventoryItems from catalog" migration action that
 * removes this fallback entirely.
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const tenantId = business.tenantId || business.id;

    const items = await db.inventoryItem.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    let enriched: InventoryListResponseItem[];

    if (items.length > 0) {
      enriched = items.map((it) => {
        const stock = it.availableStock; // honour reservations
        const isLowStock = it.reorderLevel > 0 && stock <= it.reorderLevel;
        return {
          id: it.id,
          name: it.name,
          price: it.salePrice,
          category: it.category || 'General',
          stock,
          minStock: it.reorderLevel,
          isLowStock,
          imageUrl: it.imageUrl,
          isActive: it.isActive,
        };
      });
    } else {
      // Fallback: read catalog products and report them as 0-stock. Honest
      // — no fake "50" magic number. The merchant can still see their
      // catalog and convert items to tracked InventoryItems via PATCH.
      const config = await db.gptformCommerceConfig.findFirst({
        where: {
          OR: [
            { businessId: business.id },
            ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
          ],
        },
      });
      let catalog: any[] = [];
      if (config?.catalogJson) {
        try {
          catalog = JSON.parse(config.catalogJson);
        } catch {
          catalog = [];
        }
      }
      enriched = catalog.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        category: p.category || 'General',
        stock: 0,
        minStock: 0,
        isLowStock: false,
        imageUrl: p.imageUrl,
        isActive: p.isActive !== false,
      }));
    }

    const lowStockItems = enriched.filter((i) => i.isLowStock);
    const totalValuation = enriched.reduce((sum, i) => sum + i.stock * i.price, 0);

    return NextResponse.json({
      items: enriched,
      lowStockItems,
      totalItemsCount: enriched.length,
      lowStockCount: lowStockItems.length,
      totalValuation: Number(totalValuation.toFixed(2)),
      // Phase 2 marker — when true, the response is a fallback derived from
      // `catalogJson` (no real InventoryItem rows yet). Consumers can surface
      // a "convert to tracked inventory" prompt.
      isFallback: items.length === 0,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch inventory:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch inventory' }, { status: 500 });
  }
}

/**
 * PATCH /api/commerce/inventory
 * Body: { productId, deltaStock?, newStock?, minStock? }
 *
 * `productId` now refers to an `InventoryItem.id`. If no InventoryItem row
 * exists yet (legacy catalog product), we lazily create one keyed on the
 * catalog product's id/name so future PATCHes are idempotent.
 *
 * Stock changes are written atomically (increment/decrement) and a
 * `StockTransaction` audit row is recorded. Low-stock alerts are
 * created/reactivated when `availableStock <= reorderLevel && reorderLevel>0`.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { productId, deltaStock, newStock, minStock } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const tenantId = business.tenantId || business.id;

    // Resolve the InventoryItem. Look up by id; if no row exists, try the
    // catalog (legacy path — bootstrap an InventoryItem row from the catalog
    // entry so the merchant can start tracking it).
    let item = await db.inventoryItem.findFirst({
      where: { OR: [{ id: productId }, { sku: productId }], tenantId },
    });

    if (!item) {
      // Bootstrap from catalog (lazy migration). Look up the catalog product
      // to copy its name/price/category.
      const config = await db.gptformCommerceConfig.findFirst({
        where: {
          OR: [
            { businessId: business.id },
            ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
          ],
        },
      });
      let catalogEntry: any = null;
      if (config?.catalogJson) {
        try {
          const catalog = JSON.parse(config.catalogJson);
          catalogEntry = (Array.isArray(catalog) ? catalog : []).find(
            (p: any) => p.id === productId || p.name === productId
          );
        } catch {
          catalogEntry = null;
        }
      }

      const name = catalogEntry?.name || `Item ${productId}`;
      const price = Number(catalogEntry?.price) || 0;
      const category = catalogEntry?.category || 'General';
      const imageUrl = catalogEntry?.imageUrl || null;

      item = await db.inventoryItem.create({
        data: {
          tenantId,
          sku: `CAT-${productId}`.slice(0, 64),
          name,
          description: catalogEntry?.description || null,
          category,
          salePrice: price,
          costPrice: 0,
          currency: 'INR',
          totalStock: 0,
          reservedStock: 0,
          availableStock: 0,
          reorderLevel: 0,
          reorderQty: 0,
          imageUrl,
          isActive: catalogEntry?.isActive !== false,
          isSellableOnline: true,
        },
      });
    }

    // Apply the requested change.
    let updated: typeof item | null = item;

    if (typeof newStock === 'number') {
      // Absolute set — keep reservedStock untouched, recompute available.
      const safeStock = Math.max(0, Math.floor(newStock));
      updated = await db.inventoryItem.update({
        where: { id: item.id },
        data: {
          totalStock: safeStock,
          availableStock: Math.max(0, safeStock - item.reservedStock),
        },
      });
      // Audit row — adjustment transaction.
      try {
        await db.stockTransaction.create({
          data: {
            tenantId,
            inventoryItemId: item.id,
            type: 'adjustment',
            direction: safeStock >= item.totalStock ? 'in' : 'out',
            quantity: Math.abs(safeStock - item.totalStock),
            unitCost: item.salePrice,
            totalCost: Math.abs(safeStock - item.totalStock) * item.salePrice,
            notes: `Manual stock set to ${safeStock}`,
          },
        });
      } catch (txErr) {
        console.warn('StockTransaction (set) audit row failed (non-fatal):', txErr);
      }
    } else if (typeof deltaStock === 'number') {
      // Atomic increment/decrement.
      const delta = Math.floor(deltaStock);
      updated = await db.inventoryItem.update({
        where: { id: item.id },
        data: {
          totalStock: { increment: delta },
          availableStock: { increment: delta },
        },
      });
      try {
        await db.stockTransaction.create({
          data: {
            tenantId,
            inventoryItemId: item.id,
            type: 'adjustment',
            direction: delta > 0 ? 'in' : 'out',
            quantity: Math.abs(delta),
            unitCost: item.salePrice,
            totalCost: Math.abs(delta) * item.salePrice,
            notes: 'Manual stock adjustment',
          },
        });
      } catch (txErr) {
        console.warn('StockTransaction (delta) audit row failed (non-fatal):', txErr);
      }
    }

    if (typeof minStock === 'number') {
      updated = await db.inventoryItem.update({
        where: { id: item.id },
        data: { reorderLevel: Math.max(0, Math.floor(minStock)) },
      });
    }

    // Refresh the row for the alert check (in case `update` returned stale
    // numbers under concurrent writes).
    const fresh = await db.inventoryItem.findUnique({ where: { id: item.id } });
    if (fresh) {
      updated = fresh;
    }

    // Low-stock alert: create or reactivate an `active` alert if the row is
    // at/below reorderLevel. LowStockAlert has no unique constraint on
    // inventoryItemId, so we use findFirst + create/update.
    if (
      updated &&
      updated.reorderLevel > 0 &&
      updated.availableStock <= updated.reorderLevel
    ) {
      try {
        const existingAlert = await db.lowStockAlert.findFirst({
          where: {
            inventoryItemId: updated.id,
            status: { in: ['active', 'acknowledged'] },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (existingAlert) {
          await db.lowStockAlert.update({
            where: { id: existingAlert.id },
            data: {
              currentStock: updated.availableStock,
              reorderLevel: updated.reorderLevel,
              status: 'active',
              resolvedAt: null,
            },
          });
        } else {
          await db.lowStockAlert.create({
            data: {
              tenantId,
              inventoryItemId: updated.id,
              currentStock: updated.availableStock,
              reorderLevel: updated.reorderLevel,
              status: 'active',
            },
          });
        }
      } catch (alertErr) {
        console.warn('LowStockAlert upsert failed (non-fatal):', alertErr);
      }
    }

    return NextResponse.json({
      success: true,
      updatedProduct: {
        id: updated!.id,
        name: updated!.name,
        price: updated!.salePrice,
        category: updated!.category || 'General',
        stock: updated!.availableStock,
        minStock: updated!.reorderLevel,
        isLowStock:
          updated!.reorderLevel > 0 && updated!.availableStock <= updated!.reorderLevel,
        imageUrl: updated!.imageUrl,
        isActive: updated!.isActive,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to update inventory:', e);
    return NextResponse.json({ error: e.message || 'Failed to update inventory' }, { status: 500 });
  }
}

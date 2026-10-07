import { ownerBusiness } from '@/lib/commerce/access';
import { atomicCommerce,commerceError } from '@/lib/commerce/atomic';
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
    const business=await ownerBusiness(req);
    const body=await req.json().catch(()=>null);
    const key=req.headers.get('Idempotency-Key')||body?.requestKey;
    if(!body||typeof body.productId!=='string'||!body.productId||body.productId.length>200||typeof key!=='string')return NextResponse.json({error:'Invalid stock change'},{status:400});
    if(body.newStock!==undefined&&body.deltaStock!==undefined)return NextResponse.json({error:'Choose an adjustment or a new count, not both.'},{status:400});
    for(const field of ['deltaStock','newStock','minStock'])if(body[field]!==undefined&&(!Number.isSafeInteger(body[field])||Math.abs(body[field])>100000000||field!=='deltaStock'&&body[field]<0))return NextResponse.json({error:'Stock quantities must be valid whole numbers.'},{status:400});
    const payload={productId:body.productId,...(body.deltaStock!==undefined?{deltaStock:body.deltaStock}:{}),...(body.newStock!==undefined?{newStock:body.newStock}:{}),...(body.minStock!==undefined?{minStock:body.minStock}:{})};
    return NextResponse.json(await atomicCommerce('stock',[business.id,key,payload]));
  }catch(error){
    if(error instanceof Error&&['UNAUTHORIZED','FORBIDDEN'].includes(error.message))return NextResponse.json({error:'Access denied'},{status:error.message==='UNAUTHORIZED'?401:403});
    const failure=commerceError(error);return NextResponse.json({error:failure.message},{status:failure.status});
  }
}

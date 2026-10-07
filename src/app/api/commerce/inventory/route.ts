import { ownerBusiness } from '@/lib/commerce/access';
import { atomicCommerce,commerceError } from '@/lib/commerce/atomic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export const runtime = 'nodejs';

/** Catalog products and tracked quantities share one Products screen. */

interface InventoryListResponseItem {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number | null;
  totalStock: number | null;
  productId?: string;
  minStock: number;
  isLowStock: boolean;
  imageUrl?: string | null;
  isActive: boolean;
}

/** Untracked quantities are null; missing stock records never imply zero. */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const tenantId = business.tenantId || business.id;

    const items = await db.inventoryItem.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const config = await db.gptformCommerceConfig.findFirst({where:{businessId:business.id}})
      || (business.tenantId ? await db.gptformCommerceConfig.findFirst({where:{businessId:business.tenantId}}):null);
    const catalog: Array<{id:string;name:string;price:number;category?:string;sku?:string;imageUrl?:string;isActive?:boolean}> = JSON.parse(config?.catalogJson || '[]');
    const linked = new Set<string>();
    const enriched: InventoryListResponseItem[] = catalog.map(product=>{
      const inventory=items.find(i=>i.id===product.id||i.sku===product.id||i.sku===`CAT-${product.id}`||i.sku===`${tenantId}:${product.id}`||(product.sku&&i.sku===product.sku));
      if(inventory)linked.add(inventory.id);
      return {id:inventory?.id||product.id,productId:product.id,name:product.name,price:Number(product.price),category:product.category||'General',stock:inventory?.availableStock??null,totalStock:inventory?.totalStock??null,minStock:inventory?.reorderLevel||0,isLowStock:!!inventory&&inventory.reorderLevel>0&&inventory.availableStock<=inventory.reorderLevel,imageUrl:product.imageUrl,isActive:product.isActive!==false};
    });
    for(const inventory of items.filter(i=>!linked.has(i.id)))enriched.push({id:inventory.id,name:inventory.name,price:inventory.salePrice,category:inventory.category||'General',stock:inventory.availableStock,totalStock:inventory.totalStock,minStock:inventory.reorderLevel,isLowStock:inventory.reorderLevel>0&&inventory.availableStock<=inventory.reorderLevel,imageUrl:inventory.imageUrl,isActive:inventory.isActive});

    const lowStockItems = enriched.filter((i) => i.isLowStock);
    const totalValuation = enriched.reduce((sum, i) => sum + (i.stock ?? 0) * i.price, 0);

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

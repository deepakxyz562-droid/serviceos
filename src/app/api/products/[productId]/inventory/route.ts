import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

/**
 * GET /api/products/[productId]/inventory
 * ─────────────────────────────────────────────────────────────────────────
 * Returns REAL per-variant stock levels for a product, sourced from the
 * InventoryItem table (NOT synthesized with Math.random() on the client).
 *
 * Used by the runtime `variant_selector` widget
 * (src/features/forms/components/runtime/widgets/ecommerce/variant-selector.tsx)
 * so end users see actual stock levels instead of fabricated demo numbers.
 *
 * The InventoryItem schema is SKU-keyed (no productId column), so this
 * endpoint accepts a comma-separated `skus` query string listing the
 * variant SKUs the widget computed (e.g. `BLACK-S,BLACK-M`). It returns
 * `{ bySku: { 'BLACK-S': 5, 'BLACK-M': 0, ... } }` for every SKU that
 * has a matching InventoryItem row in the caller's tenant.
 *
 * SKUs without a matching DB row are simply absent from the response —
 * the widget renders a neutral "Check availability" state for those.
 *
 * Auth: any authenticated tenant user. Plan gate: Inventory module is
 * business+ (mirrors /api/inventory/items). On public form contexts
 * where no auth cookie is available, the route returns 401 and the
 * widget gracefully falls back to the neutral state — it never
 * fabricates stock numbers.
 *
 * Response shape:
 *   {
 *     productId: string,
 *     bySku: { [sku: string]: number },  // sku -> availableStock
 *     items: [{ sku, name, availableStock, totalStock, currency, salePrice }]
 *   }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Plan-tier gate: Inventory module is business+ (mirrors /api/inventory/items).
    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const skusParam = searchParams.get('skus');
    const skus = skusParam
      ? skusParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Build the tenant-scoped where clause. Super admins see all tenants.
    const where: Record<string, unknown> = {};
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      where.tenantId = authUser.tenantId;
    }
    // Filter by the requested SKU list (if provided). Otherwise we return
    // all SKUs for the tenant — but that's potentially huge, so we cap to
    // the first 200 to keep the response bounded. Callers that need a
    // specific variant's stock should always pass `skus`.
    if (skus.length > 0) {
      where.sku = { in: skus };
    }
    // Only return items that are sellable online (mirrors the
    // `isSellableOnline` flag on InventoryItem — internal-only items
    // shouldn't surface to storefront / public-form consumers).
    where.isSellableOnline = true;

    const items = await db.inventoryItem.findMany({
      where,
      select: {
        sku: true,
        name: true,
        availableStock: true,
        totalStock: true,
        currency: true,
        salePrice: true,
      },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    });

    const bySku: Record<string, number> = {};
    for (const item of items) {
      if (item.sku) bySku[item.sku] = item.availableStock;
    }

    return NextResponse.json({
      productId,
      bySku,
      items,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch product inventory');
    const message =
      error instanceof Error ? error.message : 'Failed to fetch product inventory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

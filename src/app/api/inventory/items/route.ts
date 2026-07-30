import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

/**
 * Inventory Items API
 * --------------------
 * GET  /api/inventory/items   — list inventory items (filter by category/branch/supplier/lowStock)
 * POST /api/inventory/items   — create a new inventory item
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_UNITS = ['each', 'kg', 'litre', 'metre', 'box', 'hour', 'pack'];

/**
 * Build a Prisma `where` clause scoped to the auth user's tenant.
 */
function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/inventory/items
 * Query params:
 *   category, branchId, supplierId, lowStock (1/true), active (1/true/0/false)
 *   search (name or sku substring), limit (default 100, max 500)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const branchId = searchParams.get('branchId');
    const supplierId = searchParams.get('supplierId');
    const lowStock = searchParams.get('lowStock');
    const active = searchParams.get('active');
    const search = searchParams.get('search')?.trim();
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = tenantScope(authUser);
    if (category) where.category = category;
    if (branchId) where.branchId = branchId;
    if (supplierId) where.supplierId = supplierId;

    if (active !== null && active !== undefined && active !== '') {
      const isActive = active === '1' || active === 'true';
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, ...CI } },
        { sku: { contains: search, ...CI } },
        { barcode: { contains: search, ...CI } },
      ];
    }

    let items: Awaited<ReturnType<typeof db.inventoryItem.findMany>> = [];
    if (lowStock === '1' || lowStock === 'true') {
      // totalStock <= reorderLevel AND reorderLevel > 0 — fetch candidates then
      // filter in-app because Prisma can't express a column-to-column compare.
      const candidates = await db.inventoryItem.findMany({
        where: { ...where, reorderLevel: { gt: 0 } },
        orderBy: { totalStock: 'asc' },
        take: limit * 5,
        include: { supplier: { select: { id: true, name: true } } },
      });
      items = candidates.filter((it) => it.totalStock <= it.reorderLevel).slice(0, limit);
    } else {
      items = await db.inventoryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { supplier: { select: { id: true, name: true } } },
      });
    }

    log.info(
      {
        userId: authUser.id,
        count: items.length,
        filters: { category, branchId, supplierId, lowStock },
      },
      'Inventory items listed',
    );

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list inventory items');
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/inventory/items
 * Body:
 *   name (required), sku, description, category, unit, costPrice, salePrice,
 *   currency, totalStock, reorderLevel, reorderQty, supplierId, supplierSku,
 *   barcode, imageUrl, branchId, metadata
 *
 * availableStock is auto-derived as totalStock - reservedStock.
 * If initial totalStock > 0, an opening StockTransaction is recorded.
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

    // Plan-tier gate: Inventory module is business+.
    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      name,
      sku,
      description,
      category,
      unit,
      costPrice,
      salePrice,
      currency,
      totalStock,
      reservedStock,
      reorderLevel,
      reorderQty,
      supplierId,
      supplierSku,
      barcode,
      imageUrl,
      branchId,
      metadata,
    } = body as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (unit !== undefined && (typeof unit !== 'string' || !VALID_UNITS.includes(unit))) {
      return NextResponse.json(
        { error: `Invalid unit. Must be one of: ${VALID_UNITS.join(', ')}` },
        { status: 400 },
      );
    }

    // SKU uniqueness check (sku is @unique globally)
    if (typeof sku === 'string' && sku.trim()) {
      const existing = await db.inventoryItem.findUnique({ where: { sku: sku.trim() } });
      if (existing) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
    }

    const total =
      typeof totalStock === 'number' && Number.isFinite(totalStock)
        ? Math.max(0, Math.floor(totalStock))
        : 0;
    const reserved =
      typeof reservedStock === 'number' && Number.isFinite(reservedStock)
        ? Math.max(0, Math.floor(reservedStock))
        : 0;
    const available = Math.max(0, total - reserved);

    const item = await db.inventoryItem.create({
      data: {
        tenantId: authUser.tenantId,
        branchId: typeof branchId === 'string' && branchId.trim() ? branchId.trim() : null,
        sku: typeof sku === 'string' && sku.trim() ? sku.trim() : null,
        name: name.trim().slice(0, 300),
        description: typeof description === 'string' ? description : null,
        category: typeof category === 'string' && category.trim() ? category.trim() : 'general',
        unit: typeof unit === 'string' ? unit : 'each',
        costPrice: typeof costPrice === 'number' && Number.isFinite(costPrice) ? costPrice : 0,
        salePrice: typeof salePrice === 'number' && Number.isFinite(salePrice) ? salePrice : 0,
        currency: typeof currency === 'string' && currency.trim() ? currency.trim() : 'USD',
        totalStock: total,
        reservedStock: reserved,
        availableStock: available,
        reorderLevel:
          typeof reorderLevel === 'number' && Number.isFinite(reorderLevel)
            ? Math.max(0, Math.floor(reorderLevel))
            : 0,
        reorderQty:
          typeof reorderQty === 'number' && Number.isFinite(reorderQty)
            ? Math.max(0, Math.floor(reorderQty))
            : 0,
        supplierId:
          typeof supplierId === 'string' && supplierId.trim() ? supplierId.trim() : null,
        supplierSku:
          typeof supplierSku === 'string' && supplierSku.trim() ? supplierSku.trim() : null,
        barcode: typeof barcode === 'string' && barcode.trim() ? barcode.trim() : null,
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
        isActive: true,
        metadataJson: JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    // Record opening stock transaction if initial stock > 0
    if (total > 0) {
      try {
        await db.stockTransaction.create({
          data: {
            tenantId: authUser.tenantId,
            inventoryItemId: item.id,
            type: 'purchase',
            direction: 'in',
            quantity: total,
            unitCost: item.costPrice,
            totalCost: total * item.costPrice,
            reference: 'Opening stock',
            referenceId: item.id,
            notes: 'Initial stock on item creation',
            performedById: authUser.id,
            performedByName: authUser.name || authUser.email,
            metadataJson: JSON.stringify({ source: 'item_create' }),
          },
        });
      } catch (e) {
        log.warn({ err: e, itemId: item.id }, 'Failed to create opening stock transaction');
      }
    }

    log.info(
      { userId: authUser.id, itemId: item.id, sku: item.sku },
      'Inventory item created',
    );

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create inventory item');
    const message = error instanceof Error ? error.message : 'Failed to create inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

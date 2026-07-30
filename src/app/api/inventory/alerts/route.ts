import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

/**
 * Low Stock Alerts API
 * ---------------------
 * GET   /api/inventory/alerts   — list low stock alerts (filter by status/inventoryItemId)
 * PATCH /api/inventory/alerts   — acknowledge or resolve one or more alerts
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

const VALID_STATUSES = ['active', 'acknowledged', 'resolved'] as const;

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/inventory/alerts
 * Query params: status (default 'active'), inventoryItemId, limit
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
    const status = searchParams.get('status') || 'active';
    const inventoryItemId = searchParams.get('inventoryItemId');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const where: Record<string, unknown> = tenantScope(authUser);
    where.status = status;
    if (inventoryItemId) where.inventoryItemId = inventoryItemId;

    // LowStockAlert has no Prisma relation to InventoryItem (only the
    // inventoryItemId FK string), so we fetch alerts then eager-load the
    // related items in a second query.
    const alerts = await db.lowStockAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Eager-load referenced inventory items + their suppliers
    const itemIds = Array.from(new Set(alerts.map((a) => a.inventoryItemId)));
    const items = itemIds.length
      ? await db.inventoryItem.findMany({
          where: { id: { in: itemIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            totalStock: true,
            reorderLevel: true,
            reorderQty: true,
            supplierId: true,
            supplier: { select: { id: true, name: true } },
          },
        })
      : [];
    const itemById = new Map(items.map((it) => [it.id, it]));
    const alertsWithItems = alerts.map((a) => ({
      ...a,
      item: itemById.get(a.inventoryItemId) ?? null,
    }));

    log.info(
      { userId: authUser.id, count: alertsWithItems.length, status },
      'Low stock alerts listed',
    );

    return NextResponse.json({ alerts: alertsWithItems, count: alertsWithItems.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list low stock alerts');
    const message = error instanceof Error ? error.message : 'Failed to fetch low stock alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/inventory/alerts
 * Body:
 *   alertIds: string[]            — required, alerts to update
 *   action:   'acknowledge' | 'resolve'   — required
 *
 * Acknowledge sets status='acknowledged', acknowledgedById/At.
 * Resolve sets status='resolved', resolvedAt (acknowledged fields untouched if already set).
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { alertIds, action } = body as Record<string, unknown>;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({ error: 'alertIds must be a non-empty array' }, { status: 400 });
    }
    if (action !== 'acknowledge' && action !== 'resolve') {
      return NextResponse.json(
        { error: 'action must be either "acknowledge" or "resolve"' },
        { status: 400 },
      );
    }

    // Scope the update to the user's tenant
    const where: Record<string, unknown> = { id: { in: alertIds } };
    if (authUser.tenantId && !authUser.isSuperAdmin) {
      where.tenantId = authUser.tenantId;
    }

    const updateData: Record<string, unknown> =
      action === 'acknowledge'
        ? {
            status: 'acknowledged',
            acknowledgedById: authUser.id,
            acknowledgedAt: new Date(),
          }
        : {
            status: 'resolved',
            resolvedAt: new Date(),
          };

    const result = await db.lowStockAlert.updateMany({
      where,
      data: updateData,
    });

    log.info(
      {
        userId: authUser.id,
        action,
        alertIds,
        updatedCount: result.count,
      },
      'Low stock alerts updated',
    );

    return NextResponse.json({ success: true, updated: result.count, action });
  } catch (error) {
    log.error({ err: error }, 'Failed to update low stock alerts');
    const message = error instanceof Error ? error.message : 'Failed to update low stock alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

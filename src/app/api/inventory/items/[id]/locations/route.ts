import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

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

    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    const item = await db.inventoryItem.findFirst({ where: scopeWhere(authUser, id) });
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const tenantId = item.tenantId ?? authUser.tenantId;

    // Resolve employee where clause safely via workspace scoping
    const empWhere: Record<string, unknown> = {};
    if (authUser.workspaceId) {
      empWhere.workspaceId = authUser.workspaceId;
    } else if (tenantId) {
      const wsList = await db.workspace.findMany({
        where: { tenantId },
        select: { id: true },
      }).catch(() => []);
      const wsIds = wsList.map((w: { id: string }) => w.id);
      if (wsIds.length > 0) empWhere.workspaceId = { in: wsIds };
    }

    const [warehouses, employees, stockLocations] = await Promise.all([
      db.warehouse.findMany({
        where: { ...(tenantId ? { tenantId } : {}), isActive: true },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      db.employee.findMany({
        where: empWhere,
        select: { id: true, name: true, phone: true, role: true },
      }).catch(() => []),
      db.stockLocation.findMany({
        where: { inventoryItemId: id },
      }),
    ]);

    // Build unified location list with quantities
    const locationMap = new Map<string, typeof stockLocations[0]>();
    for (const loc of stockLocations) {
      const key = loc.warehouseId ? `wh:${loc.warehouseId}` : loc.employeeId ? `emp:${loc.employeeId}` : `id:${loc.id}`;
      locationMap.set(key, loc);
    }

    const breakdown = [];

    // 1. Warehouses & Primary Shops
    for (const wh of warehouses) {
      const existingLoc = locationMap.get(`wh:${wh.id}`);
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(wh.metadataJson || '{}');
      } catch {
        meta = {};
      }
      const assignedEmpId = (meta.employeeId as string) || null;
      const assignedEmp = assignedEmpId ? employees.find((e) => e.id === assignedEmpId) || null : null;

      // Quantity calculation: if explicit stockLocation exists, use it.
      // If none exists across the tenant, assign totalStock to default main shop.
      const qty = existingLoc
        ? existingLoc.quantity
        : (wh.type === 'main' || meta.isDefault) && stockLocations.length === 0
        ? item.totalStock
        : 0;

      breakdown.push({
        id: existingLoc ? existingLoc.id : `wh:${wh.id}`,
        locationType: wh.type === 'main' ? 'main_shop' : wh.type === 'vehicle' ? 'van' : 'warehouse',
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: (meta.code as string) || null,
        warehouseType: wh.type,
        isDefault: wh.type === 'main' || !!meta.isDefault,
        employeeId: assignedEmpId,
        employeeName: assignedEmp ? assignedEmp.name : null,
        name: wh.name,
        address: wh.address,
        quantity: qty,
        locationCode: existingLoc?.locationCode || null,
        minStock: 0,
        maxStock: 0,
      });
    }

    // 2. Direct Technician Vans (if not already represented by a vehicle warehouse)
    for (const emp of employees) {
      const existingLoc = locationMap.get(`emp:${emp.id}`);
      const alreadyInWhList = warehouses.some((wh) => {
        try {
          const m = JSON.parse(wh.metadataJson || '{}');
          return m.employeeId === emp.id;
        } catch {
          return false;
        }
      });

      if (!alreadyInWhList && existingLoc && existingLoc.quantity > 0) {
        breakdown.push({
          id: existingLoc.id,
          locationType: 'van',
          warehouseId: null,
          warehouseName: null,
          warehouseCode: null,
          warehouseType: 'vehicle',
          isDefault: false,
          employeeId: emp.id,
          employeeName: emp.name,
          name: `${emp.name}'s Service Van`,
          address: `Field Technician (${emp.phone || 'Active'})`,
          quantity: existingLoc.quantity,
          locationCode: existingLoc.locationCode || null,
          minStock: 0,
          maxStock: 0,
        });
      }
    }

    return NextResponse.json({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      totalStock: item.totalStock,
      availableStock: item.availableStock,
      locations: breakdown,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch item stock locations');
    const message = error instanceof Error ? error.message : 'Failed to fetch stock locations';
    return NextResponse.json({ error: message }, { status: 500 });
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

    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    const item = await db.inventoryItem.findFirst({ where: scopeWhere(authUser, id) });
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { warehouseId, employeeId, quantity, locationCode } = body as Record<string, unknown>;

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return NextResponse.json({ error: 'quantity must be a non-negative number' }, { status: 400 });
    }

    const whereClause: Record<string, unknown> = { inventoryItemId: id };
    if (warehouseId) whereClause.warehouseId = String(warehouseId);
    if (employeeId) whereClause.employeeId = String(employeeId);

    const existing = await db.stockLocation.findFirst({ where: whereClause });

    let location;
    if (existing) {
      location = await db.stockLocation.update({
        where: { id: existing.id },
        data: {
          quantity: Math.floor(qty),
          locationCode: typeof locationCode === 'string' ? locationCode.trim() : existing.locationCode,
        },
      });
    } else {
      location = await db.stockLocation.create({
        data: {
          inventoryItemId: id,
          warehouseId: warehouseId ? String(warehouseId) : null,
          employeeId: employeeId ? String(employeeId) : null,
          quantity: Math.floor(qty),
          locationCode: typeof locationCode === 'string' ? locationCode.trim() : null,
        },
      });
    }

    log.info({ itemId: id, locationId: location.id, qty }, 'Stock location updated');
    return NextResponse.json({ location });
  } catch (error) {
    log.error({ err: error }, 'Failed to set stock location');
    const message = error instanceof Error ? error.message : 'Failed to update location stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

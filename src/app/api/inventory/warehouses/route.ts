import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';

/**
 * Warehouses & Storage Units API
 * --------------------------------
 * GET  /api/inventory/warehouses — list all warehouses/storage locations
 * POST /api/inventory/warehouses — create a new warehouse/storage location
 *
 * Types: 'main' (Shop/HQ), 'branch'/'secondary' (Warehouse), 'vehicle' (Service Van)
 *
 * Automatically seeds a default "Main Shop / HQ" if the tenant has no warehouses yet.
 */

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

export async function GET(request: NextRequest) {
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

    const where: Record<string, unknown> = tenantScope(authUser);

    let warehouses = await db.warehouse.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    // Auto-seed default Main Shop if tenant has none
    if (warehouses.length === 0 && authUser.tenantId) {
      try {
        const defaultShop = await db.warehouse.create({
          data: {
            tenantId: authUser.tenantId,
            name: 'Main Shop / HQ',
            type: 'main',
            address: 'Main Facility',
            isActive: true,
            metadataJson: JSON.stringify({ isDefault: true, code: 'HQ-01' }),
          },
        });
        warehouses = [defaultShop];
      } catch (e) {
        log.warn({ err: e }, 'Could not auto-seed default warehouse');
      }
    }

    // Fetch active employees for technician/vehicle assignments
    let employees: Array<{ id: string; name: string; phone: string; role: string }> = [];
    try {
      const empWhere: Record<string, unknown> = {};
      if (authUser.workspaceId) {
        empWhere.workspaceId = authUser.workspaceId;
      } else if (authUser.tenantId) {
        const wsList = await db.workspace.findMany({
          where: { tenantId: authUser.tenantId },
          select: { id: true },
        }).catch(() => []);
        const wsIds = wsList.map((w: { id: string }) => w.id);
        if (wsIds.length > 0) empWhere.workspaceId = { in: wsIds };
      }
      employees = await db.employee.findMany({
        where: empWhere,
        select: { id: true, name: true, phone: true, role: true },
      });
    } catch (e) {
      log.warn({ err: e }, 'Could not fetch employees for warehouse lookup');
    }

    const enrichedWarehouses = warehouses.map((w) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(w.metadataJson || '{}');
      } catch {
        meta = {};
      }
      const employeeId = (meta.employeeId as string) || null;
      const employee = employeeId ? employees.find((e) => e.id === employeeId) || null : null;
      return {
        ...w,
        code: (meta.code as string) || null,
        employeeId,
        employee,
        isDefault: w.type === 'main' || !!meta.isDefault,
      };
    });

    return NextResponse.json({ warehouses: enrichedWarehouses, employees, count: enrichedWarehouses.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list warehouses');
    const message = error instanceof Error ? error.message : 'Failed to fetch warehouses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const gate = await requirePlanFeature('inventory');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, address, type, capacity, branchId, code, employeeId } = body as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Warehouse name is required' }, { status: 400 });
    }

    const validTypes = ['main', 'branch', 'secondary', 'vehicle', 'technician'];
    const whType = typeof type === 'string' && validTypes.includes(type) ? type : 'branch';

    const metaObj: Record<string, unknown> = {};
    if (typeof code === 'string' && code.trim()) metaObj.code = code.trim().toUpperCase();
    if (typeof employeeId === 'string' && employeeId.trim()) metaObj.employeeId = employeeId.trim();
    if (whType === 'main') metaObj.isDefault = true;

    const warehouse = await db.warehouse.create({
      data: {
        tenantId: authUser.tenantId,
        name: name.trim(),
        address: typeof address === 'string' && address.trim() ? address.trim() : null,
        type: whType,
        capacity: typeof capacity === 'number' && Number.isFinite(capacity) ? capacity : null,
        branchId: typeof branchId === 'string' && branchId.trim() ? branchId.trim() : null,
        metadataJson: JSON.stringify(metaObj),
        isActive: true,
      },
    });

    log.info({ userId: authUser.id, warehouseId: warehouse.id }, 'Warehouse created');
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create warehouse');
    const message = error instanceof Error ? error.message : 'Failed to create warehouse';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

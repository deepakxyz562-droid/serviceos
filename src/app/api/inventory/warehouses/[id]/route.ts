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
    const warehouse = await db.warehouse.findFirst({ where: scopeWhere(authUser, id) });
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Fetch stock locations associated with this warehouse
    const locations = await db.stockLocation.findMany({
      where: { warehouseId: id },
    });

    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(warehouse.metadataJson || '{}');
    } catch {
      meta = {};
    }

    return NextResponse.json({
      warehouse: {
        ...warehouse,
        code: meta.code || null,
        employeeId: meta.employeeId || null,
        isDefault: warehouse.type === 'main' || !!meta.isDefault,
      },
      locations,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch warehouse');
    const message = error instanceof Error ? error.message : 'Failed to fetch warehouse';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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
    const existing = await db.warehouse.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, address, type, capacity, isActive, code, employeeId } = body as Record<string, unknown>;

    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(existing.metadataJson || '{}');
    } catch {
      meta = {};
    }

    if (code !== undefined) meta.code = typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : null;
    if (employeeId !== undefined) meta.employeeId = typeof employeeId === 'string' && employeeId.trim() ? employeeId.trim() : null;

    const data: Record<string, unknown> = {
      metadataJson: JSON.stringify(meta),
    };
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (address !== undefined) data.address = typeof address === 'string' && address.trim() ? address.trim() : null;
    if (typeof type === 'string') data.type = type;
    if (typeof capacity === 'number') data.capacity = capacity;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const updated = await db.warehouse.update({
      where: { id },
      data,
    });

    log.info({ userId: authUser.id, warehouseId: id }, 'Warehouse updated');
    return NextResponse.json({
      warehouse: {
        ...updated,
        code: meta.code || null,
        employeeId: meta.employeeId || null,
        isDefault: updated.type === 'main' || !!meta.isDefault,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to update warehouse');
    const message = error instanceof Error ? error.message : 'Failed to update warehouse';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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
    const existing = await db.warehouse.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Soft-deactivate
    await db.warehouse.update({
      where: { id },
      data: { isActive: false },
    });

    log.info({ userId: authUser.id, warehouseId: id }, 'Warehouse deactivated');
    return NextResponse.json({ success: true, message: 'Warehouse deactivated' });
  } catch (error) {
    log.error({ err: error }, 'Failed to delete warehouse');
    const message = error instanceof Error ? error.message : 'Failed to delete warehouse';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

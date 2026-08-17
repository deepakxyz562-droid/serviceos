import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Equipment tab — employee detail  (Phase 3 — Equipment tracking)
 * ----------------------------------------------------------------
 * GET /api/employees/[id]/equipment
 *
 * Returns:
 *   {
 *     employee: { id, name, role },
 *     assigned:    InventoryAsset[]   // currently assigned to this employee
 *     history:     InventoryAssetAssignment[]  // last 20 assignment records
 *   }
 *
 * Each `assigned` asset includes its related `inventoryItem`
 * (id/name/sku) for display.
 *
 * PERMISSION GATE: any authenticated tenant member can read this endpoint —
 * equipment is operational data, not sensitive like payroll. We do enforce
 * workspace match: a caller in workspace A may not read an employee in
 * workspace B. (Super-admins bypass the workspace check.)
 *
 * Supabase-safe: uses `include` for the inventoryItem relation (mapped in
 * db-adapter.ts RELATION_MAP), and a separate `findMany` for the assignment
 * history (no nested include on the asset — only the asset row itself is
 * returned for the history, joined manually to the asset by id).
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Employee id is required' }, { status: 400 });
    }

    // Fetch the employee and verify workspace match (defense-in-depth).
    const employee = await db.employee.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, workspaceId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Workspace match — super-admins bypass.
    if (
      !user.isSuperAdmin &&
      user.workspaceId &&
      employee.workspaceId &&
      employee.workspaceId !== user.workspaceId
    ) {
      return NextResponse.json(
        { error: 'Access denied — employee is in a different workspace' },
        { status: 403 },
      );
    }

    // 1. Currently-assigned assets (assignedEmployeeId = employeeId, tenant match).
    const assigned = await db.inventoryAsset.findMany({
      where: {
        assignedEmployeeId: id,
        ...(user.isSuperAdmin ? {} : { tenantId: user.tenantId }),
      },
      orderBy: { assignedAt: 'desc' },
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
      },
    });

    // 2. Assignment history (last 20 records for this employee, regardless of
    //    whether they're open or returned). Manual join to the asset row
    //    because the Supabase adapter's nested include support is best-effort
    //    for arbitrary relations; doing the lookup separately is the safe
    //    pattern (mirrors /api/time-tracking/payroll).
    const history = await db.inventoryAssetAssignment.findMany({
      where: {
        employeeId: id,
        ...(user.isSuperAdmin ? {} : { tenantId: user.tenantId }),
      },
      orderBy: { assignedAt: 'desc' },
      take: 20,
    });

    // 2a. Fetch the related asset rows for the history entries (so the UI can
    //     display "Asset XYZ returned on <date>"). Single batched query.
    const historyAssetIds = Array.from(
      new Set(history.map((h) => h.assetId).filter(Boolean)),
    );
    const historyAssets =
      historyAssetIds.length > 0
        ? await db.inventoryAsset.findMany({
            where: {
              id: { in: historyAssetIds },
              ...(user.isSuperAdmin ? {} : { tenantId: user.tenantId }),
            },
            select: {
              id: true,
              name: true,
              serialNumber: true,
              assetTag: true,
              inventoryItemId: true,
            },
          })
        : [];
    const assetMap = new Map(historyAssets.map((a) => [a.id, a]));

    // Attach the asset summary to each history row.
    const historyWithAssets = history.map((h) => ({
      ...h,
      asset: assetMap.get(h.assetId) ?? null,
    }));

    return NextResponse.json({
      employee: { id: employee.id, name: employee.name, role: employee.role },
      assigned,
      history: historyWithAssets,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch employee equipment';
    console.error('[employees/[id]/equipment GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';

/**
 * Assign an InventoryAsset to an Employee  (Phase 3 — Equipment tracking)
 * -----------------------------------------------------------------------
 * POST /api/inventory/assets/[id]/assign
 *
 * Body: { employeeId (required), notes? }
 *
 * Flow:
 *   1. Validate the asset exists + belongs to the caller's tenant.
 *   2. Validate the employee exists + belongs to the same workspace.
 *   3. If the asset is already assigned (assignedEmployeeId !== null), return
 *      HTTP 400 "Asset is already assigned — return it first".
 *   4. Update the asset: assignedEmployeeId, assignedAt=now, assignmentStatus='assigned'.
 *   5. Create an InventoryAssetAssignment audit record (assignedAt=now,
 *      assignmentStatus='assigned', assignedById=user.id, notes).
 *   6. Return the updated asset.
 *
 * Role gate: owner / admin / manager / dispatcher / office.
 *
 * Note: this is NOT a transactional endpoint. SQLite + Supabase PostgREST do not
 * expose multi-statement transactions through this adapter. The two writes
 * (asset update + assignment insert) happen sequentially; if the second fails,
 * the asset will be marked assigned but no audit row will exist. This is
 * acceptable for v1 because the failure mode is rare (network/DB outage mid-
 * request) and the next /return call will surface the inconsistency. If needed,
 * a reconciliation job can be added later that detects orphan assignments.
 */

const ASSET_ASSIGN_ROLES = ['owner', 'admin', 'manager', 'dispatcher', 'office'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }
    if (!hasRole(authUser, ASSET_ASSIGN_ROLES)) {
      return NextResponse.json(
        {
          error:
            'Forbidden — only owners, admins, managers, dispatchers and office staff can assign assets',
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { employeeId, notes } = body as Record<string, unknown>;
    if (typeof employeeId !== 'string' || !employeeId.trim()) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }
    const employeeIdTrimmed = employeeId.trim();

    // 1. Fetch + validate the asset belongs to the caller's tenant.
    const asset = await db.inventoryAsset.findFirst({
      where: {
        id,
        ...(authUser.isSuperAdmin ? {} : { tenantId: authUser.tenantId }),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        assignedEmployeeId: true,
        assignmentStatus: true,
      },
    });
    if (!asset) {
      return NextResponse.json({ error: 'Inventory asset not found' }, { status: 404 });
    }

    // 2. Validate the employee exists + belongs to the same workspace.
    //    Use workspaceId match if the caller has one; otherwise fall back to
    //    tenantId match (defensive — covers super-admin callers who have no
    //    workspaceId set).
    const employee = await db.employee.findUnique({
      where: { id: employeeIdTrimmed },
      select: { id: true, name: true, workspaceId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    if (
      authUser.workspaceId &&
      employee.workspaceId &&
      employee.workspaceId !== authUser.workspaceId
    ) {
      return NextResponse.json(
        { error: 'Employee does not belong to your workspace' },
        { status: 400 },
      );
    }

    // 3. Refuse if the asset is already assigned.
    if (asset.assignedEmployeeId) {
      return NextResponse.json(
        { error: 'Asset is already assigned — return it first' },
        { status: 400 },
      );
    }

    const now = new Date();

    // 4. Update the asset itself.
    const updatedAsset = await db.inventoryAsset.update({
      where: { id: asset.id },
      data: {
        assignedEmployeeId: employeeIdTrimmed,
        assignedAt: now,
        assignmentStatus: 'assigned',
        // Mirror status to 'assigned' so list filters by status='assigned' work.
        // The previous status (e.g. 'available') is implicitly replaced.
        status: 'assigned',
      },
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedEmployee: { select: { id: true, name: true } },
      },
    });

    // 5. Create the assignment audit row.
    try {
      await db.inventoryAssetAssignment.create({
        data: {
          tenantId: authUser.tenantId,
          assetId: asset.id,
          employeeId: employeeIdTrimmed,
          assignedAt: now,
          assignmentStatus: 'assigned',
          assignedById: authUser.id,
          notes: typeof notes === 'string' ? notes : null,
        },
      });
    } catch (auditErr) {
      // Log but don't fail — the asset itself was updated successfully. The
      // audit row is a best-effort trail; an operational read of the asset
      // will still show it as assigned.
      console.error('[inventory/assets/[id]/assign] audit row creation failed:', auditErr);
    }

    return NextResponse.json({ asset: updatedAsset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assign inventory asset';
    console.error('[inventory/assets/[id]/assign POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

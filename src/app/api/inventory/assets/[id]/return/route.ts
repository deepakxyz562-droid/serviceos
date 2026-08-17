import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';

/**
 * Return an InventoryAsset from its current assignment  (Phase 3 — Equipment)
 * --------------------------------------------------------------------------
 * POST /api/inventory/assets/[id]/return
 *
 * Body: { notes?, status?: 'returned' | 'lost' | 'damaged' }  (default 'returned')
 *
 * Flow:
 *   1. Fetch the asset (gated by tenantId).
 *   2. Find the latest open InventoryAssetAssignment for this asset
 *      (returnedAt=null). If none, return HTTP 400 "Asset is not currently
 *      assigned".
 *   3. Update the assignment row: returnedAt=now, assignmentStatus=status,
 *      returnedById=user.id, notes (if provided).
 *   4. Update the asset:
 *        assignedEmployeeId=null
 *        assignedAt=null
 *        assignmentStatus=status
 *        status = (status === 'lost' || status === 'damaged') ? status : 'available'
 *   5. Return the updated asset.
 *
 * Role gate: owner / admin / manager / dispatcher / office.
 */

const ASSET_RETURN_ROLES = ['owner', 'admin', 'manager', 'dispatcher', 'office'];

const VALID_RETURN_STATUSES = ['returned', 'lost', 'damaged'] as const;
type ReturnStatus = (typeof VALID_RETURN_STATUSES)[number];

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
    if (!hasRole(authUser, ASSET_RETURN_ROLES)) {
      return NextResponse.json(
        {
          error:
            'Forbidden — only owners, admins, managers, dispatchers and office staff can return assets',
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const notes =
      body && typeof body === 'object' && 'notes' in body && typeof body.notes === 'string'
        ? body.notes
        : null;
    const rawStatus =
      body && typeof body === 'object' && 'status' in body ? String(body.status) : 'returned';
    if (!VALID_RETURN_STATUSES.includes(rawStatus as ReturnStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_RETURN_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }
    const status = rawStatus as ReturnStatus;

    // 1. Fetch the asset.
    const asset = await db.inventoryAsset.findFirst({
      where: {
        id,
        ...(authUser.isSuperAdmin ? {} : { tenantId: authUser.tenantId }),
      },
      select: { id: true, tenantId: true, assignedEmployeeId: true },
    });
    if (!asset) {
      return NextResponse.json({ error: 'Inventory asset not found' }, { status: 404 });
    }

    // 2. Find the latest OPEN assignment (returnedAt=null).
    const openAssignment = await db.inventoryAssetAssignment.findFirst({
      where: { assetId: asset.id, returnedAt: null },
      orderBy: { assignedAt: 'desc' },
    });
    if (!openAssignment) {
      return NextResponse.json(
        { error: 'Asset is not currently assigned' },
        { status: 400 },
      );
    }

    const now = new Date();
    const newAssetStatus: string =
      status === 'lost' || status === 'damaged' ? status : 'available';

    // 3. Update the assignment audit row.
    await db.inventoryAssetAssignment.update({
      where: { id: openAssignment.id },
      data: {
        returnedAt: now,
        assignmentStatus: status,
        returnedById: authUser.id,
        notes: notes ?? openAssignment.notes, // preserve existing notes if none provided
      },
    });

    // 4. Update the asset itself.
    const updatedAsset = await db.inventoryAsset.update({
      where: { id: asset.id },
      data: {
        assignedEmployeeId: null,
        assignedAt: null,
        assignmentStatus: status,
        status: newAssetStatus,
      },
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedEmployee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ asset: updatedAsset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to return inventory asset';
    console.error('[inventory/assets/[id]/return POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

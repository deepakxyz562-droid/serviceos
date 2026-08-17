import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';

/**
 * Single Inventory Asset API  (Phase 3 — Equipment tracking)
 * -----------------------------------------------------------
 * GET    /api/inventory/assets/[id]  — fetch a single asset
 * PATCH  /api/inventory/assets/[id]  — update asset fields (NOT assignment —
 *                                       use /assign and /return for that)
 * DELETE /api/inventory/assets/[id]  — hard delete (use with care — historical
 *                                       InventoryAssetAssignment rows will be
 *                                       orphaned; prefer status='retired')
 *
 * Tenant scoping enforced on every read/write.
 */

// Roles allowed to update assets (same allow-list as POST /assets).
const ASSET_WRITE_ROLES = ['owner', 'admin', 'manager', 'dispatcher', 'office'];
// Roles allowed to delete assets. Per the task spec: owner/admin only.
const ASSET_DELETE_ROLES = ['owner', 'admin'];

const VALID_STATUSES = [
  'available',
  'assigned',
  'in_maintenance',
  'retired',
  'lost',
  'damaged',
];
const VALID_CONDITIONS = ['new', 'good', 'fair', 'poor', 'broken'];

/**
 * Build a tenant-scoped `where` for a single asset id.
 */
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

/**
 * GET /api/inventory/assets/[id]
 * Returns the asset with its inventoryItem and assignedEmployee relations.
 */
export async function GET(
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const asset = await db.inventoryAsset.findFirst({
      where: scopeWhere(authUser, id),
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedEmployee: { select: { id: true, name: true } },
      },
    });
    if (!asset) {
      return NextResponse.json({ error: 'Inventory asset not found' }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory asset';
    console.error('[inventory/assets/[id] GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/inventory/assets/[id]
 * Updatable fields: name, inventoryItemId, serialNumber, assetTag, description,
 *   status, condition, purchaseDate, purchaseCost, notes.
 *
 * Assignment-related fields (assignedEmployeeId, assignedAt, assignmentStatus)
 * are NOT updatable through this endpoint — use /assign and /return instead so
 * the InventoryAssetAssignment audit trail is preserved.
 */
export async function PATCH(
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
    if (!hasRole(authUser, ASSET_WRITE_ROLES)) {
      return NextResponse.json(
        {
          error:
            'Forbidden — only owners, admins, managers, dispatchers and office staff can update assets',
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const existing = await db.inventoryAsset.findFirst({
      where: scopeWhere(authUser, id),
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Inventory asset not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim().slice(0, 300);
    }
    if (body.inventoryItemId !== undefined) {
      if (typeof body.inventoryItemId === 'string' && body.inventoryItemId.trim()) {
        // Validate the linked InventoryItem exists in this tenant.
        const linked = await db.inventoryItem.findFirst({
          where: { id: body.inventoryItemId.trim(), tenantId: authUser.tenantId },
          select: { id: true },
        });
        if (!linked) {
          return NextResponse.json(
            { error: 'inventoryItemId does not exist in your tenant' },
            { status: 400 },
          );
        }
        updateData.inventoryItemId = body.inventoryItemId.trim();
      } else {
        // Allow clearing the link by passing null/empty.
        updateData.inventoryItemId = null;
      }
    }
    if (body.serialNumber !== undefined) {
      updateData.serialNumber =
        typeof body.serialNumber === 'string' && body.serialNumber.trim()
          ? body.serialNumber.trim().slice(0, 200)
          : null;
    }
    if (body.assetTag !== undefined) {
      updateData.assetTag =
        typeof body.assetTag === 'string' && body.assetTag.trim()
          ? body.assetTag.trim().slice(0, 200)
          : null;
    }
    if (body.description !== undefined) {
      updateData.description = typeof body.description === 'string' ? body.description : null;
    }
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(String(body.status))) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.status = String(body.status);
    }
    if (body.condition !== undefined) {
      if (!VALID_CONDITIONS.includes(String(body.condition))) {
        return NextResponse.json(
          { error: `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.condition = String(body.condition);
    }
    if (body.purchaseDate !== undefined) {
      if (body.purchaseDate === null) {
        updateData.purchaseDate = null;
      } else {
        const d = new Date(String(body.purchaseDate));
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: 'purchaseDate must be a valid ISO date string' },
            { status: 400 },
          );
        }
        updateData.purchaseDate = d;
      }
    }
    if (body.purchaseCost !== undefined) {
      if (body.purchaseCost === null) {
        updateData.purchaseCost = null;
      } else {
        const v = Number(body.purchaseCost);
        if (!Number.isFinite(v) || v < 0) {
          return NextResponse.json(
            { error: 'purchaseCost must be a non-negative number' },
            { status: 400 },
          );
        }
        updateData.purchaseCost = v;
      }
    }
    if (body.notes !== undefined) {
      updateData.notes = typeof body.notes === 'string' ? body.notes : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const asset = await db.inventoryAsset.update({
      where: { id },
      data: updateData,
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedEmployee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ asset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update inventory asset';
    console.error('[inventory/assets/[id] PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/assets/[id]
 *
 * Hard delete. NOTE: this WILL fail if there are InventoryAssetAssignment rows
 * referencing this asset (FK constraint). Use status='retired' via PATCH for
 * soft-retirement instead — historical assignment records should be preserved.
 *
 * Role gate: owner / admin only.
 */
export async function DELETE(
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
    if (!hasRole(authUser, ASSET_DELETE_ROLES)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners and admins can delete assets' },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const existing = await db.inventoryAsset.findFirst({
      where: scopeWhere(authUser, id),
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Inventory asset not found' }, { status: 404 });
    }

    await db.inventoryAsset.delete({ where: { id } });

    return NextResponse.json({ deleted: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete inventory asset';
    console.error('[inventory/assets/[id] DELETE]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

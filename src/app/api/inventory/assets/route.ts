import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';

/**
 * Inventory Assets API  (Phase 3 — Equipment tracking)
 * ------------------------------------------------------
 * GET  /api/inventory/assets            — list assets (filterable, paginated)
 * POST /api/inventory/assets            — create a new asset
 *
 * Asset-level (serialised) equipment tracking. Distinct from /api/inventory/items
 * which tracks SKU/quantity-level stock. Each InventoryAsset row is ONE physical
 * tracked item (with its own serial number / asset tag) that can be assigned to
 * an employee.
 *
 * Tenant scoping is enforced via authUser.tenantId on every read/write.
 * Super-admins see all tenants.
 *
 * Supabase-safe: uses `include` (resolveIncludes via RELATION_MAP entries in
 * db-adapter.ts). No raw SQL, no upsert.
 */

// Roles allowed to create/update/assign assets. Per the task spec:
// owner / admin / manager / dispatcher / office. (employee/viewer/customer excluded.)
const ASSET_WRITE_ROLES = ['owner', 'admin', 'manager', 'dispatcher', 'office'];

/**
 * Build a Prisma `where` clause scoped to the auth user's tenant.
 * Super-admins (no tenantId, or isSuperAdmin) bypass the tenant filter.
 */
function tenantScope(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/inventory/assets
 *
 * Query params:
 *   status                 — available | assigned | in_maintenance | retired | lost | damaged
 *   assignedEmployeeId     — filter to assets currently assigned to this employee
 *   inventoryItemId        — filter to assets that are instances of this SKU
 *   search                 — substring match on name / serialNumber / assetTag (case-insensitive)
 *   limit                  — page size (default 50, max 200)
 *   page                   — 1-based page number (default 1)
 *
 * Response: { assets, total, page, limit }
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim() || undefined;
    const assignedEmployeeId = searchParams.get('assignedEmployeeId')?.trim() || undefined;
    const inventoryItemId = searchParams.get('inventoryItemId')?.trim() || undefined;
    const search = searchParams.get('search')?.trim() || undefined;

    const limitRaw = Number(searchParams.get('limit') || '50');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const pageRaw = Number(searchParams.get('page') || '1');
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = tenantScope(authUser);
    if (status) where.status = status;
    if (assignedEmployeeId) where.assignedEmployeeId = assignedEmployeeId;
    if (inventoryItemId) where.inventoryItemId = inventoryItemId;

    if (search) {
      // Prisma `contains` is case-sensitive on SQLite but case-insensitive on
      // Postgres. The PostgREST adapter maps `contains` to `ilike` so this
      // works correctly on both backends.
      where.OR = [
        { name: { contains: search } },
        { serialNumber: { contains: search } },
        { assetTag: { contains: search } },
      ];
    }

    const [assets, total] = await Promise.all([
      db.inventoryAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          inventoryItem: { select: { id: true, name: true, sku: true } },
          assignedEmployee: { select: { id: true, name: true } },
        },
      }),
      db.inventoryAsset.count({ where }),
    ]);

    return NextResponse.json({ assets, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory assets';
    console.error('[inventory/assets GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/inventory/assets
 *
 * Body:
 *   name (required), inventoryItemId?, serialNumber?, assetTag?,
 *   description?, status?, condition?, purchaseDate? (ISO), purchaseCost?,
 *   notes?
 *
 * Sets tenantId from the auth user. The asset starts unassigned
 * (assignedEmployeeId=null, assignmentStatus=null) — use the /assign endpoint
 * to assign it to an employee.
 */
export async function POST(request: NextRequest) {
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
            'Forbidden — only owners, admins, managers, dispatchers and office staff can create assets',
        },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      name,
      inventoryItemId,
      serialNumber,
      assetTag,
      description,
      status,
      condition,
      purchaseDate,
      purchaseCost,
      notes,
    } = body as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Validate purchaseDate (if provided) is a parseable ISO date.
    let purchaseDateParsed: Date | null = null;
    if (purchaseDate !== undefined && purchaseDate !== null) {
      const d = new Date(String(purchaseDate));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: 'purchaseDate must be a valid ISO date string' },
          { status: 400 },
        );
      }
      purchaseDateParsed = d;
    }

    // Validate purchaseCost.
    if (
      purchaseCost !== undefined &&
      purchaseCost !== null &&
      (typeof purchaseCost !== 'number' || !Number.isFinite(purchaseCost) || purchaseCost < 0)
    ) {
      return NextResponse.json(
        { error: 'purchaseCost must be a non-negative number' },
        { status: 400 },
      );
    }

    // Validate status / condition against the allowed vocab — defensive.
    const VALID_STATUSES = [
      'available',
      'assigned',
      'in_maintenance',
      'retired',
      'lost',
      'damaged',
    ];
    const VALID_CONDITIONS = ['new', 'good', 'fair', 'poor', 'broken'];
    if (status !== undefined && !VALID_STATUSES.includes(String(status))) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }
    if (condition !== undefined && !VALID_CONDITIONS.includes(String(condition))) {
      return NextResponse.json(
        { error: `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate inventoryItemId (if provided) belongs to the same tenant.
    if (typeof inventoryItemId === 'string' && inventoryItemId.trim()) {
      const linked = await db.inventoryItem.findFirst({
        where: { id: inventoryItemId.trim(), ...tenantScope(authUser) },
        select: { id: true },
      });
      if (!linked) {
        return NextResponse.json(
          { error: 'inventoryItemId does not exist in your tenant' },
          { status: 400 },
        );
      }
    }

    const asset = await db.inventoryAsset.create({
      data: {
        tenantId: authUser.tenantId,
        name: name.trim().slice(0, 300),
        inventoryItemId:
          typeof inventoryItemId === 'string' && inventoryItemId.trim()
            ? inventoryItemId.trim()
            : null,
        serialNumber:
          typeof serialNumber === 'string' && serialNumber.trim()
            ? serialNumber.trim().slice(0, 200)
            : null,
        assetTag:
          typeof assetTag === 'string' && assetTag.trim()
            ? assetTag.trim().slice(0, 200)
            : null,
        description: typeof description === 'string' ? description : null,
        status: typeof status === 'string' ? status : 'available',
        condition: typeof condition === 'string' ? condition : 'good',
        purchaseDate: purchaseDateParsed,
        purchaseCost:
          typeof purchaseCost === 'number' && Number.isFinite(purchaseCost) ? purchaseCost : null,
        notes: typeof notes === 'string' ? notes : null,
        // Asset starts unassigned. Use /assign endpoint to attach to an employee.
        assignedEmployeeId: null,
        assignedAt: null,
        assignmentStatus: null,
      },
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
        assignedEmployee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create inventory asset';
    console.error('[inventory/assets POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

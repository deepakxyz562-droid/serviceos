import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { cache } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, workspaces: true, leads: true, subscriptions: true, conversations: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get latest subscription
    let latestSubscription = null;
    try {
      const subs = await db.subscription.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (subs.length > 0) {
        latestSubscription = subs[0];
      }
    } catch {
      // Subscription query may fail
    }

    return NextResponse.json({
      tenant: {
        ...tenant,
        latestSubscription,
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Tenant GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Verify tenant exists
    const existing = await db.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle suspend/unsuspend
    if (body.status === 'suspended') {
      if (!body.reason?.trim()) {
        return NextResponse.json({ error: 'Reason is required for suspension' }, { status: 400 });
      }
      updateData.planStatus = 'suspended';
      updateData.suspendedAt = new Date().toISOString();
      updateData.suspensionReason = body.reason.trim();
    } else if (body.status === 'active') {
      updateData.planStatus = 'active';
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    }

    // Handle name update
    if (body.name !== undefined && typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    // Handle plan update
    if (body.plan !== undefined && typeof body.plan === 'string') {
      updateData.plan = body.plan;
    }

    // Handle planStatus update (if not using status field)
    if (body.planStatus !== undefined && !body.status) {
      updateData.planStatus = body.planStatus;
      if (body.planStatus === 'suspended' && body.reason) {
        updateData.suspendedAt = new Date().toISOString();
        updateData.suspensionReason = body.reason;
      } else if (body.planStatus === 'active') {
        updateData.suspendedAt = null;
        updateData.suspensionReason = null;
      }
    }

    // Handle other updatable fields
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.onboardingCompleted !== undefined) updateData.onboardingCompleted = body.onboardingCompleted;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    // Invalidate relevant caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('[SuperAdmin Tenant PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Verify tenant exists
    const existing = await db.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // ─── HARD DELETE (permanent, irreversible) ─────────────────────────────
    // The Tenant model has 30+ direct relations and the full schema has 140+
    // models (~101 with tenantId, ~47 with workspaceId). Hardcoding a cascade
    // for each is unmaintainable and brittle. Instead we:
    //   1. Collect the tenant's workspace IDs (for workspace-scoped tables).
    //   2. Temporarily disable SQLite FK enforcement.
    //      (Safe: Prisma's SQLite connector uses connection_limit=1 by default,
    //       so the PRAGMA persists across our subsequent statements on the same
    //       connection. We re-enable it in `finally`.)
    //   3. Dynamically enumerate every user table from sqlite_master.
    //   4. For each table: if it has a `tenantId` column, DELETE WHERE
    //      tenantId = id; else if it has a `workspaceId` column, DELETE WHERE
    //      workspaceId IN (...the tenant's workspaces).
    //   5. Finally DELETE the Tenant row itself.
    // This auto-covers ALL current and future tables without code changes.
    // ────────────────────────────────────────────────────────────────────────

    // 1. Collect workspace IDs for this tenant
    const workspaces = await db.workspace.findMany({
      where: { tenantId: id },
      select: { id: true },
    });
    const wsIds = workspaces.map((w) => w.id);

    // 2. Disable FK enforcement for the connection
    await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF');

    let tablesCleared = 0;
    try {
      // 3. Enumerate every user table (skip SQLite internals + Prisma's migration table)
      const tables = (await db.$queryRawUnsafe<{ name: string }[]>(`
        SELECT name FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
          AND name NOT LIKE '_prisma_%'
          AND name NOT LIKE 'Migration%'
          AND name NOT LIKE '__ Licensing %'
      `)) as { name: string }[];

      // 4. Delete matching rows from every relevant table
      for (const { name } of tables) {
        // Introspect columns for this table
        const cols = (await db.$queryRawUnsafe<{ name: string }[]>(
          `PRAGMA table_info(${JSON.stringify(name)})`,
        )) as { name: string }[];
        const colNames = cols.map((c) => c.name);

        const hasTenantId = colNames.includes('tenantId');
        const hasWorkspaceId = colNames.includes('workspaceId');

        if (hasTenantId) {
          // Tenant-scoped table — delete everything for this tenant
          await db.$executeRawUnsafe(
            `DELETE FROM ${JSON.stringify(name)} WHERE "tenantId" = ?`,
            id,
          );
          tablesCleared++;
        } else if (hasWorkspaceId && wsIds.length > 0) {
          // Workspace-scoped table (no tenantId) — delete by workspaceId IN (...)
          const placeholders = wsIds.map(() => '?').join(',');
          await db.$executeRawUnsafe(
            `DELETE FROM ${JSON.stringify(name)} WHERE "workspaceId" IN (${placeholders})`,
            ...wsIds,
          );
          tablesCleared++;
        }
      }

      // 5. Delete the Tenant row itself (the loop above skipped it because the
      //    Tenant table has no `tenantId`/`workspaceId` column)
      await db.tenant.delete({ where: { id } });
    } finally {
      // Always re-enable FK enforcement, even on failure
      try {
        await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      } catch {
        // best-effort; connection will reset on next request anyway
      }
    }

    // Invalidate caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({
      success: true,
      message: `Tenant "${existing.name}" permanently deleted. ${tablesCleared} related table(s) cleared.`,
      tablesCleared,
      workspacesRemoved: wsIds.length,
    });
  } catch (error) {
    console.error('[SuperAdmin Tenant DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}

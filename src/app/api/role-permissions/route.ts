import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/role-permissions
 * Returns all role permissions for the authenticated tenant.
 * Falls back to default permissions if none exist in DB.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let permissions;
    try {
      permissions = await db.rolePermission.findMany({
        where: user.tenantId ? { tenantId: user.tenantId } : {},
        orderBy: [{ role: 'asc' }, { resource: 'asc' }],
      });
    } catch {
      // DB unavailable — return defaults
      permissions = [];
    }

    // If no permissions in DB, return defaults
    if (permissions.length === 0) {
      return NextResponse.json({
        success: true,
        permissions: getDefaultPermissions(),
        source: 'defaults',
      });
    }

    return NextResponse.json({
      success: true,
      permissions: permissions.map((p) => ({
        id: p.id,
        role: p.role,
        resource: p.resource,
        actions: JSON.parse(p.actionsJson || '[]'),
      })),
      source: 'database',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch permissions' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/role-permissions
 * Updates a permission for a role + resource.
 * Body: { role, resource, actions: string[] }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { role, resource, actions } = body;

    if (!role || !resource) {
      return NextResponse.json(
        { error: 'role and resource are required' },
        { status: 400 },
      );
    }

    const tenantId = user.tenantId || null;

    try {
      const updated = await db.rolePermission.upsert({
        where: {
          role_resource_tenantId: { role, resource, tenantId: tenantId || '' },
        },
        create: {
          role,
          resource,
          actionsJson: JSON.stringify(actions || []),
          tenantId: tenantId || undefined,
        },
        update: {
          actionsJson: JSON.stringify(actions || []),
        },
      });

      return NextResponse.json({
        success: true,
        permission: {
          id: updated.id,
          role: updated.role,
          resource: updated.resource,
          actions: JSON.parse(updated.actionsJson || '[]'),
        },
      });
    } catch (dbError) {
      // DB unavailable — return success with the intended change
      return NextResponse.json({
        success: true,
        permission: { role, resource, actions: actions || [] },
        warning: 'Database not available — change not persisted.',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update permission' },
      { status: 500 },
    );
  }
}

/**
 * Default permissions used when no DB rows exist.
 * Matches the previous hardcoded PERMISSION_ROWS.
 */
function getDefaultPermissions() {
  const roles = ['owner', 'admin', 'manager', 'agent', 'viewer'];
  const resources = [
    'manage_users', 'manage_roles', 'company_settings', 'billing_plans',
    'create_leads', 'assign_leads', 'create_jobs', 'dispatch_jobs',
    'view_reports', 'export_data', 'manage_invoices', 'manage_workflows',
    'api_access',
  ];

  // Default permission matrix (same as the old hardcoded PERMISSION_ROWS)
  const matrix: Record<string, Record<string, boolean>> = {
    owner: Object.fromEntries(resources.map((r) => [r, true])),
    admin: Object.fromEntries(resources.map((r) => [r, ['manage_roles', 'billing_plans'].includes(r) ? true : true])),
    manager: Object.fromEntries(resources.map((r) => [r, ['create_leads', 'assign_leads', 'create_jobs', 'dispatch_jobs', 'view_reports', 'export_data', 'manage_invoices', 'manage_workflows'].includes(r)])),
    agent: Object.fromEntries(resources.map((r) => [r, ['create_leads', 'create_jobs', 'view_reports'].includes(r)])),
    viewer: Object.fromEntries(resources.map((r) => [r, ['view_reports'].includes(r)])),
  };

  const permissions: Array<{ role: string; resource: string; actions: string[] }> = [];
  for (const role of roles) {
    for (const resource of resources) {
      permissions.push({
        role,
        resource,
        actions: matrix[role]?.[resource] ? ['read', 'write'] : ['read'],
      });
    }
  }
  return permissions;
}

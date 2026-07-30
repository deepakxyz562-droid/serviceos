import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { hardDeleteUser } from '@/lib/user-cascade-delete';

// GET /api/admin/users - List all users across tenants
export async function GET(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const tenantId = searchParams.get('tenantId') || '';

    // Pagination params — defaults: page=1, limit=50. Limit clamped to [1, 200].
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    // Build where clause - show all users including admins
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (role) {
      where.role = role;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Run the paginated findMany and the total count in parallel. The count
    // reuses the SAME `where` so `totalPages` reflects the filtered set.
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          avatar: true,
          authProvider: true,
          lastLoginAt: true,
          tenantId: true,
          workspaceId: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    const formattedUsers = users.map((user: Record<string, unknown>) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt as string | Date).toISOString() : null,
      tenantId: user.tenantId,
      tenantName: (user.tenant as Record<string, unknown>)?.name || null,
      tenantSlug: (user.tenant as Record<string, unknown>)?.slug || null,
      tenantPlan: (user.tenant as Record<string, unknown>)?.plan || null,
      createdAt: new Date(user.createdAt as string | Date).toISOString(),
    }));

    // Paginated response shape: { data, page, limit, total, totalPages }.
    return NextResponse.json({
      data: formattedUsers,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PUT /api/admin/users - Update user (lock/unlock/resetPassword/impersonate)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    if (!['lock', 'unlock', 'resetPassword', 'impersonate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be lock, unlock, resetPassword, or impersonate' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true, plan: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'lock') {
      await db.user.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'User account locked successfully' });
    }

    if (action === 'unlock') {
      await db.user.update({
        where: { id },
        data: { isActive: true },
      });
      return NextResponse.json({ message: 'User account unlocked successfully' });
    }

    if (action === 'resetPassword') {
      const newPassword = `Reset${Date.now()}!`;
      const passwordHash = await hashPassword(newPassword);
      await db.user.update({
        where: { id },
        data: { passwordHash },
      });
      return NextResponse.json({
        message: 'Password reset successfully',
        temporaryPassword: newPassword,
      });
    }

    if (action === 'impersonate') {
      // Return user info for impersonation — actual token generation handled by client
      return NextResponse.json({
        message: 'Impersonation authorized',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          workspaceId: user.workspaceId,
          avatar: user.avatar,
        },
        tenant: user.tenant,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin user PUT error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users?id=<userId> — Hard delete with cascade
//
// Permanently deletes a user account AND every record that references it:
//   - Employee rows (and their dependents: shifts, time entries, GPS, etc.)
//   - ApiKey, NotificationPreference, PushSubscription (deleted)
//   - Notification, AuditLog, Credential, Workflow, CustomerTimelineEntry,
//     JobPhoto, etc. (FK set to NULL — preserves historical records)
//
// Guards:
//   - Super-admin only (isSuperAdminRequest)
//   - Refuses to delete other super-admin accounts (footgun prevention)
//   - Records an audit log entry BEFORE the user is gone
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required (use ?id=<userId>)' },
        { status: 400 }
      );
    }

    // Load the user first (for audit log + super-admin guard)
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
        tenantId: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.isSuperAdmin) {
      return NextResponse.json(
        {
          error:
            'Refusing to delete super admin account. Demote the user to a regular role first, then delete.',
        },
        { status: 400 }
      );
    }

    // Record an audit log entry BEFORE the cascade (so we still have the
    // deleted user's identity for compliance).
    try {
      await db.auditLog.create({
        data: {
          userId: null, // no FK to a User (the actor may be the one being deleted)
          action: 'USER_HARD_DELETE',
          resourceType: 'User',
          resourceId: userId,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          metadataJson: JSON.stringify({
            deletedUserEmail: targetUser.email,
            deletedUserName: targetUser.name,
            deletedUserRole: targetUser.role,
            deletedUserTenantId: targetUser.tenantId,
            deletedAt: new Date().toISOString(),
          }),
        },
      });
    } catch (auditErr) {
      // Non-fatal — the delete should still proceed even if audit logging fails
      console.error('[Admin DELETE user] audit log failed:', auditErr);
    }

    // Run the cascade hard-delete
    const report = await hardDeleteUser(userId);

    if (!report.success) {
      return NextResponse.json(
        {
          error: report.error || 'Cascade delete completed with errors',
          report,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `User "${targetUser.email}" permanently deleted`,
      report: {
        userId: report.userId,
        userEmail: report.userEmail,
        employeesDeleted: report.employeesDeleted,
        steps: report.steps,
      },
    });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

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

    // Build where clause
    const where: Record<string, unknown> = { role: { not: 'admin' } };

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

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || null,
      tenantSlug: user.tenant?.slug || null,
      tenantPlan: user.tenant?.plan || null,
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json({ users: formattedUsers, total: formattedUsers.length });
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

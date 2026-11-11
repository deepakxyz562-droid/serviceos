import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/users/[id]
 * Update a team member's role (admin, manager, staff) or active status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update team members' },
        { status: 403 }
      );
    }

    const { id: userId } = await params;
    const body = await request.json().catch(() => ({}));
    const { role, isActive, phone, name } = body;

    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser || existingUser.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'User not found in this workspace' }, { status: 404 });
    }

    // Prevent changing role of the workspace owner unless caller is owner
    if (existingUser.role === 'owner' && authUser.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot modify workspace owner' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) {
      const normalizedRole = ['admin', 'manager', 'staff', 'technician', 'employee'].includes(role)
        ? role
        : 'staff';
      updateData.role = normalizedRole;
    }
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    if (typeof phone === 'string') {
      updateData.phone = phone.trim() || null;
    }
    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Remove/revoke a team member from the workspace.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can remove team members' },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    // Caller cannot delete themselves
    if (userId === authUser.id) {
      return NextResponse.json({ error: 'You cannot remove yourself from the workspace' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'User not found in this workspace' }, { status: 404 });
    }

    if (targetUser.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the workspace owner' }, { status: 403 });
    }

    // Delete user
    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: 'Team member removed successfully' });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove user' },
      { status: 500 }
    );
  }
}

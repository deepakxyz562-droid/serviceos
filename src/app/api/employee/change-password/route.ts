import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hashPassword, verifyPassword } from '@/lib/auth';

/**
 * POST /api/employee/change-password
 *
 * Self-service password change for the currently-authenticated employee.
 *
 * Body: { currentPassword, newPassword }
 *
 * Flow:
 *   1. Get auth user (must be an employee).
 *   2. Resolve the linked Employee row (via JWT employeeId claim or Employee.userId).
 *   3. Find the linked User account (must have a passwordHash to verify against).
 *   4. Verify the currentPassword against User.passwordHash.
 *   5. Hash the newPassword (bcrypt, 12 rounds) and persist it on the User row.
 *
 * Returns 200 on success, 400/401/404 with a friendly `error` field otherwise.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only employees (and owners browsing the portal) may self-serve here.
    if (user.role !== 'employee' && user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only employees can change their own password here' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 },
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 },
      );
    }

    // Resolve the linked Employee row
    let employee: { id: string; userId: string | null } | null = null;
    if (user.employeeId) {
      employee = await db.employee.findUnique({
        where: { id: user.employeeId },
        select: { id: true, userId: true },
      });
    }
    if (!employee) {
      employee = await db.employee.findFirst({
        where: { userId: user.id },
        select: { id: true, userId: true },
      });
    }
    if (!employee) {
      return NextResponse.json(
        { error: 'No employee record linked to your account' },
        { status: 404 },
      );
    }

    // Find the linked User account
    const linkedUserId = employee.userId || user.id;
    const userAccount = await db.user.findUnique({
      where: { id: linkedUserId },
      select: { id: true, passwordHash: true },
    });
    if (!userAccount) {
      return NextResponse.json(
        { error: 'No user account found for this employee' },
        { status: 404 },
      );
    }
    if (!userAccount.passwordHash) {
      return NextResponse.json(
        { error: 'Your account uses an external login provider — password cannot be changed here' },
        { status: 400 },
      );
    }

    // Verify the current password
    const ok = await verifyPassword(currentPassword, userAccount.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    // Persist the new hash
    const newHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: userAccount.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[employee/change-password POST] error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 },
    );
  }
}

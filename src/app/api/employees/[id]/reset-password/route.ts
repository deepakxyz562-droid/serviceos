import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/employees/[id]/reset-password
 *
 * Generate a password-reset link for an employee. The link points to the
 * company-scoped accept-invite page with a fresh token (the employee's
 * existing passwordHash is NOT cleared here — they can keep using the old
 * password until they set a new one via the link).
 *
 * Returns the reset URL the admin should send to the employee.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can reset passwords' },
        { status: 403 }
      );
    }

    const { id: employeeId } = await params;

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { workspace: { select: { id: true, tenantId: true } }, userAccount: true },
    });

    if (!employee || !employee.email) {
      return NextResponse.json(
        { error: 'Employee not found or has no email' },
        { status: 404 }
      );
    }

    if (!employee.userId) {
      return NextResponse.json(
        { error: 'Employee has no user account. Send an invitation first.' },
        { status: 400 }
      );
    }

    // Invalidate prior pending invitations
    await db.invitation.updateMany({
      where: { employeeId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h for reset

    await db.invitation.create({
      data: {
        token,
        email: employee.email,
        name: employee.name,
        role: 'employee',
        phone: employee.phone,
        status: 'pending',
        invitedById: user.id,
        tenantId: employee.workspace?.tenantId || user.tenantId,
        workspaceId: employee.workspaceId || user.workspaceId,
        employeeId,
        expiresAt,
      },
    });

    const tenant = await db.tenant.findUnique({
      where: { id: employee.workspace?.tenantId || user.tenantId || undefined },
      select: { slug: true, name: true },
    });

    const appUrl = getAppUrl();
    const slug = tenant?.slug || 'default';
    const resetUrl = `${appUrl}/${slug}/accept-invite?token=${token}&mode=reset`;

    return NextResponse.json({
      success: true,
      resetUrl,
      expiresAt: expiresAt.toISOString(),
      employee: { id: employee.id, name: employee.name, email: employee.email },
    });
  } catch (error) {
    console.error('[Employee Reset Password Error]', error);
    return NextResponse.json(
      { error: 'Failed to generate password reset link' },
      { status: 500 }
    );
  }
}

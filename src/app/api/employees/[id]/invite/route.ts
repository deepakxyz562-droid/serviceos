import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/employees/[id]/invite
 *
 * Generate (or regenerate) an invitation link for an existing Employee record.
 * The Employee must already exist; this endpoint creates/updates:
 *   - a User row (status invited, no passwordHash)
 *   - an Invitation row with a fresh token (7-day expiry)
 *
 * Returns the invite URL the admin should send to the employee.
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
    if (!['owner', 'admin', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can send invitations' },
        { status: 403 }
      );
    }

    const { id: employeeId } = await params;

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { workspace: { select: { id: true, tenantId: true } }, userAccount: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!employee.email) {
      return NextResponse.json(
        { error: 'Employee must have an email to receive an invitation' },
        { status: 400 }
      );
    }

    // Ensure a User account exists (invited, no password yet)
    let userAccount = employee.userAccount;
    if (!userAccount) {
      const existing = await db.user.findUnique({ where: { email: employee.email } });
      if (existing) {
        userAccount = existing;
      } else {
        userAccount = await db.user.create({
          data: {
            email: employee.email,
            name: employee.name,
            phone: employee.phone,
            role: 'employee',
            authProvider: 'email',
            isActive: true,
            tenantId: employee.workspace?.tenantId || user.tenantId,
            workspaceId: employee.workspaceId || user.workspaceId,
          },
        });
        await db.employee.update({
          where: { id: employeeId },
          data: { userId: userAccount.id },
        });
      }
    }

    // Invalidate any prior pending invitations for this employee
    await db.invitation.updateMany({
      where: { employeeId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await db.invitation.create({
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

    await db.employee.update({
      where: { id: employeeId },
      data: { invitationStatus: 'pending' },
    });

    const tenant = await db.tenant.findUnique({
      where: { id: invitation.tenantId || undefined },
      select: { slug: true, name: true },
    });

    const appUrl = getAppUrl();
    const slug = tenant?.slug || 'default';
    const inviteUrl = `${appUrl}/${slug}/accept-invite?token=${token}`;

    return NextResponse.json({
      success: true,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      invitationId: invitation.id,
      employee: { id: employee.id, name: employee.name, email: employee.email },
      company: { name: tenant?.name, slug: tenant?.slug },
    });
  } catch (error) {
    console.error('[Employee Invite Error]', error);
    return NextResponse.json(
      { error: 'Failed to generate employee invitation' },
      { status: 500 }
    );
  }
}

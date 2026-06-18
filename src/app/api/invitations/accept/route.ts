import { db } from '@/lib/db';
import { hashPassword, generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/invitations/accept — Accept an invitation (public, no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, password, phone } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify the invitation is still valid
    if (invitation.status !== 'pending') {
      const statusMessages: Record<string, string> = {
        accepted: 'This invitation has already been accepted',
        cancelled: 'This invitation has been cancelled',
        expired: 'This invitation has expired',
      };
      return NextResponse.json(
        { error: statusMessages[invitation.status] || 'This invitation is no longer valid' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Check if a user with that email already exists
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
    });

    let user;

    if (existingUser) {
      // Update the existing user's tenant, workspace, and role
      user = await db.user.update({
        where: { id: existingUser.id },
        data: {
          tenantId: invitation.tenantId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
          name: name || existingUser.name || invitation.name,
          phone: phone || existingUser.phone || invitation.phone,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create a new user
      user = await db.user.create({
        data: {
          email: invitation.email,
          name: name || invitation.name || invitation.email.split('@')[0],
          passwordHash,
          phone: phone || invitation.phone || null,
          role: invitation.role,
          authProvider: 'email',
          tenantId: invitation.tenantId,
          workspaceId: invitation.workspaceId,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
    }

    // Update the invitation status
    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Update the Employee record: link userId, set status to 'available'
    if (invitation.employeeId) {
      await db.employee.update({
        where: { id: invitation.employeeId },
        data: {
          userId: user.id,
          status: 'available',
          name: user.name || undefined,
          phone: user.phone || undefined,
        },
      });
    }

    // Fetch the updated employee
    const employee = invitation.employeeId
      ? await db.employee.findUnique({ where: { id: invitation.employeeId } })
      : null;

    // Fetch the tenant
    const tenant = invitation.tenantId
      ? await db.tenant.findUnique({
          where: { id: invitation.tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            planStatus: true,
            onboardingCompleted: true,
            onboardingStep: true,
          },
        })
      : null;

    // Generate JWT token
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || false,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
    };
    const jwtToken = generateToken(authUser);

    // Build the response
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          tenantId: user.tenantId,
          workspaceId: user.workspaceId,
          avatar: user.avatar,
        },
        tenant,
        employee,
      },
      { status: 200 }
    );

    // Set the auth cookie
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: jwtToken,
    });

    return response;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

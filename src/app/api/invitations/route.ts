import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/invitations — List invitations for the current tenant
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    const invitations = await db.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
        employee: {
          select: { id: true, name: true, phone: true, status: true },
        },
      },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

// POST /api/invitations — Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners and managers can create invitations
    if (user.role !== 'owner' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners and managers can send invitations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, role, phone, message } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email in the tenant
    const existingInvitation = await db.invitation.findFirst({
      where: {
        email,
        tenantId: user.tenantId,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      );
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create the Employee record with 'invited' status
    const employee = await db.employee.create({
      data: {
        name: name || email.split('@')[0],
        phone: phone || '',
        email,
        role,
        status: 'invited',
        workspaceId: user.workspaceId,
      },
    });

    // Create the invitation linked to the employee
    const invitation = await db.invitation.create({
      data: {
        token,
        email,
        name: name || null,
        role,
        phone: phone || null,
        status: 'pending',
        message: message || null,
        invitedById: user.id,
        tenantId: user.tenantId,
        workspaceId: user.workspaceId,
        employeeId: employee.id,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
        employee: {
          select: { id: true, name: true, phone: true, status: true },
        },
      },
    });

    // Build the invite URL
    const appUrl = getAppUrl();
    const inviteUrl = `${appUrl}/?invite=${token}`;

    return NextResponse.json(
      { ...invitation, inviteUrl },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

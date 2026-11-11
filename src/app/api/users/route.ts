import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hashPassword } from '@/lib/auth';

// GET /api/users - List users and pending invitations in the current tenant
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      include: { brandProfile: true },
    });

    const businessName =
      tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';

    const users = await db.user.findMany({
      where: { tenantId: authUser.tenantId },
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
      orderBy: { createdAt: 'desc' },
    });

    const invitations = await db.invitation.findMany({
      where: { tenantId: authUser.tenantId, status: 'pending' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      users,
      invitations,
      currentUserId: authUser.id,
      currentUserRole: authUser.role,
      businessName,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Invite/create a new user in the tenant (Grexa multi-user parity)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Only owner or admin can invite users
    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can invite users' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, role, phone } = body;

    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedEmail || !trimmedName) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      include: { brandProfile: true },
    });

    const businessName =
      tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';

    // Normalize role: Grexa roles -> admin, manager, staff
    const normalizedRole = ['admin', 'manager', 'staff', 'technician', 'employee'].includes(role)
      ? role
      : 'staff';

    // Generate a temporary password (10 characters: alphanumeric)
    const tempPassword = Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
    const passwordHash = await hashPassword(tempPassword);

    const user = await db.user.create({
      data: {
        email: trimmedEmail,
        name: trimmedName,
        role: normalizedRole,
        phone: trimmedPhone || null,
        passwordHash,
        tenantId: authUser.tenantId,
        workspaceId: authUser.workspaceId,
        isActive: true,
      },
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

    const portalUrl =
      process.env.BGOS_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://bgos.fieseros.com';

    const loginUrl = `${portalUrl}/login`;
    const roleCapitalized = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);

    const whatsappShareText = `Hello ${trimmedName}, you have been invited to join ${businessName} on ServiceOS BGOS as ${roleCapitalized}!\n\nAccess portal: ${loginUrl}\nEmail: ${trimmedEmail}\nTemporary Password: ${tempPassword}\n\nPlease log in and update your password.`;

    return NextResponse.json(
      {
        user,
        tempPassword,
        loginUrl,
        whatsappShareText,
        businessName,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

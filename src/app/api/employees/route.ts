import { db } from '@/lib/db';
import { getAuthUser, hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/employees — List employees for the workspace
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build where clause scoped to the user's workspace
    const where: Record<string, unknown> = {
      workspaceId: user.workspaceId,
    };

    if (role) where.role = role;
    if (status) {
      // Support comma-separated status values (e.g., "available,busy,offline")
      const statuses = status.split(',');
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await db.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userAccount: {
          select: { id: true, name: true, email: true, avatar: true, isActive: true },
        },
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/employees — Create employee directly (with optional login credentials)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners and managers can create employees directly
    if (user.role !== 'owner' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners and managers can create employees' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, phone, email, role, skills, password, location } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // If email and password provided, create a User account for login access
    let userAccountId: string | null = null;

    // Resolve workspaceId: use user's workspaceId, or find/create default workspace for tenant
    let workspaceId = user.workspaceId;
    if (!workspaceId && user.tenantId) {
      const defaultWorkspace = await db.workspace.findFirst({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'asc' },
      });
      if (defaultWorkspace) {
        workspaceId = defaultWorkspace.id;
      } else {
        // Auto-create a workspace for the tenant
        const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
        const newWorkspace = await db.workspace.create({
          data: {
            name: tenant?.name || 'Default Workspace',
            slug: `${tenant?.slug || 'default'}-ws`,
            ownerId: user.id,
            tenantId: user.tenantId,
          },
        });
        workspaceId = newWorkspace.id;
      }
    }

    if (email && password) {
      // Check if user with this email already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }

      // Validate password strength
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await db.user.create({
        data: {
          email,
          name,
          passwordHash: hashedPassword,
          role: 'employee',
          tenantId: user.tenantId,
          workspaceId: workspaceId,
          isActive: true,
        },
      });

      userAccountId = newUser.id;
    } else if (email) {
      // Email provided but no password — still create a user account with a random password
      // so the employee can be invited later
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        // Create user without password — they'll need to set one via invitation
        const newUser = await db.user.create({
          data: {
            email,
            name,
            passwordHash: null,
            role: 'employee',
            tenantId: user.tenantId,
            workspaceId: workspaceId,
            isActive: true,
          },
        });

        userAccountId = newUser.id;
      }
    }

    const employee = await db.employee.create({
      data: {
        name,
        phone,
        email: email || null,
        role,
        skills: skills ? JSON.stringify(skills) : '[]',
        status: 'available',
        location: location || null,
        workspaceId: workspaceId,
        userId: userAccountId,
      },
      include: {
        userAccount: {
          select: { id: true, name: true, email: true, avatar: true, isActive: true },
        },
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}

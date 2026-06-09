import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();

    // Super Admin: can see all workspaces across all tenants
    if (authUser?.isSuperAdmin) {
      const workspaces = await db.workspace.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          plan: true,
          logo: true,
          tenantId: true,
          createdAt: true,
        },
      });
      return NextResponse.json(workspaces);
    }

    // Regular user: only see workspaces belonging to their tenant
    const tenantId = authUser?.tenantId;
    if (tenantId) {
      const workspaces = await db.workspace.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          plan: true,
          logo: true,
          tenantId: true,
          createdAt: true,
        },
      });
      return NextResponse.json(workspaces);
    }

    // No tenant: return empty (user not associated with a company yet)
    return NextResponse.json([]);
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, industry } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate a slug from the name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const workspace = await db.workspace.create({
      data: {
        name: name.trim(),
        slug,
        industry: industry || null,
        ownerId: authUser.id,
        tenantId: authUser.tenantId || null,
        plan: 'free',
        settingsJson: '{}',
      },
    });

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      slug,
      industry: workspace.industry,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}

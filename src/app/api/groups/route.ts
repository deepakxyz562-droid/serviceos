import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/groups — list groups for the current tenant
// Query params: parentId (id | "root"), type (manual|smart), search
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.trim();

    const where: Record<string, unknown> = { tenantId };
    if (type) where.type = type;
    if (parentId === 'root' || parentId === '') {
      where.parentGroupId = null;
    } else if (parentId) {
      where.parentGroupId = parentId;
    }
    if (search) {
      where.name = { contains: search };
    }

    const groups = await db.group.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { contacts: true, children: true } },
      },
    });

    const data = groups.map((g) => ({
      ...g,
      childrenCount: g._count.children,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST /api/groups — create a group
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json();
    const {
      name,
      description,
      color,
      icon,
      type,
      parentGroupId,
      smartRulesJson,
      isDefault,
    } = body as Record<string, unknown>;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate parent belongs to same tenant
    if (parentGroupId) {
      const parent = await db.group.findFirst({
        where: { id: String(parentGroupId), tenantId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent group not found in this tenant' },
          { status: 400 }
        );
      }
    }

    const group = await db.group.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description) : null,
        color: color ? String(color) : null,
        icon: icon ? String(icon) : null,
        type: type === 'smart' ? 'smart' : 'manual',
        parentGroupId: parentGroupId ? String(parentGroupId) : null,
        smartRulesJson: smartRulesJson ? String(smartRulesJson) : '{}',
        isDefault: Boolean(isDefault),
        tenantId,
        workspaceId: user.workspaceId || null,
      },
      include: {
        _count: { select: { contacts: true, children: true } },
      },
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

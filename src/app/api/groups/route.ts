import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/groups — list groups for the current tenant
// Query params: parentId (id | "root"), type (manual|smart), search
//
// NOTE: `memberCount` is read from the Group row directly (maintained by the
// create/update/delete sync logic). `childrenCount` is computed via an
// explicit Group query because the Supabase adapter doesn't support Prisma's
// `_count` for self-relations (it would query a non-existent "Children"
// table).
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
    });

    // Compute childrenCount per group via an explicit query.
    const groupIds = groups.map((g) => g.id);
    const children = groupIds.length > 0
      ? await db.group.findMany({
          where: { parentGroupId: { in: groupIds } },
          select: { parentGroupId: true },
        })
      : [];
    const childCountByParent = new Map<string, number>();
    for (const c of children) {
      if (c.parentGroupId) {
        childCountByParent.set(
          c.parentGroupId,
          (childCountByParent.get(c.parentGroupId) || 0) + 1
        );
      }
    }

    const data = groups.map((g) => ({
      ...g,
      contactCount: g.memberCount || 0,
      childrenCount: childCountByParent.get(g.id) || 0,
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
    });

    return NextResponse.json(
      { data: { ...group, contactCount: 0, childrenCount: 0 } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

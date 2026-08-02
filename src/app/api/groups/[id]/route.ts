import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  parseRulesJson,
  countContactsByRules,
} from '@/lib/segment-rules';

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/[id] — fetch one group with first 50 contacts and children
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const group = await db.group.findFirst({
      where: { id, tenantId },
      include: {
        contacts: {
          take: 50,
          orderBy: { addedAt: 'desc' },
          include: {
            contact: {
              include: {
                contactTags: { include: { tag: true } },
              },
            },
          },
        },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { contacts: true, children: true } },
          },
        },
        _count: { select: { contacts: true, children: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ data: group });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

// PUT /api/groups/[id] — update group fields, recompute memberCount for smart groups
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.group.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      color,
      icon,
      type,
      smartRulesJson,
      parentGroupId,
      isDefault,
    } = body as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined)
      updateData.description = description ? String(description) : null;
    if (color !== undefined) updateData.color = color ? String(color) : null;
    if (icon !== undefined) updateData.icon = icon ? String(icon) : null;
    if (type !== undefined) updateData.type = type === 'smart' ? 'smart' : 'manual';
    if (smartRulesJson !== undefined)
      updateData.smartRulesJson = smartRulesJson ? String(smartRulesJson) : '{}';
    if (parentGroupId !== undefined)
      updateData.parentGroupId = parentGroupId ? String(parentGroupId) : null;
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

    // Recompute memberCount if smart group fields changed
    const effectiveType =
      (updateData.type as string | undefined) || existing.type;
    const effectiveRules =
      (updateData.smartRulesJson as string | undefined) ||
      existing.smartRulesJson;

    if (effectiveType === 'smart') {
      const { rules, matchLogic } = parseRulesJson(effectiveRules);
      const count = await countContactsByRules(rules, matchLogic, tenantId);
      updateData.memberCount = count;
    } else if (effectiveType === 'manual') {
      // For manual groups, sync memberCount with actual ContactGroup rows
      const actual = await db.contactGroup.count({
        where: { groupId: id },
      });
      updateData.memberCount = actual;
    }

    const updated = await db.group.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { contacts: true, children: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE /api/groups/[id] — delete group (cascade removes ContactGroup)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.group.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    await db.group.delete({ where: { id } });

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

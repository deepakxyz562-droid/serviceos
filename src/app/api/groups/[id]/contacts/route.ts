import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { addContactsToGroup } from '@/lib/contact-links';

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/[id]/contacts — paginated list of contacts in this group
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const group = await db.group.findFirst({ where: { id, tenantId } });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim();
    const skip = (page - 1) * limit;

    const contactWhere: Record<string, unknown> = { tenantId };
    if (search) {
      contactWhere.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const [rows, total] = await Promise.all([
      db.contactGroup.findMany({
        where: { groupId: id, contact: contactWhere },
        orderBy: { addedAt: 'desc' },
        skip,
        take: limit,
        include: {
          contact: {
            include: {
              contactTags: { include: { tag: true } },
            },
          },
        },
      }),
      db.contactGroup.count({
        where: { groupId: id, contact: contactWhere },
      }),
    ]);

    const data = rows.map((r) => ({
      addedAt: r.addedAt,
      addedById: r.addedById,
      ...r.contact,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching group contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group contacts' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/contacts — add contacts to group
// Body: { contactIds: string[] }
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const group = await db.group.findFirst({ where: { id, tenantId } });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const body = await request.json();
    const contactIds = Array.isArray(body?.contactIds)
      ? (body.contactIds as string[]).map(String).filter(Boolean)
      : [];

    if (contactIds.length === 0) {
      return NextResponse.json({ added: 0, skipped: 0 });
    }

    // Verify all contacts belong to same tenant
    const validContacts = await db.contact.findMany({
      where: { id: { in: contactIds }, tenantId },
      select: { id: true },
    });
    const validIds = validContacts.map((c) => c.id);

    let added = 0;
    if (validIds.length > 0) {
      added = await addContactsToGroup(id, validIds, user.id);
    }

    // Sync memberCount
    const actualCount = await db.contactGroup.count({
      where: { groupId: id },
    });
    await db.group.update({
      where: { id },
      data: { memberCount: actualCount },
    });

    return NextResponse.json({
      added,
      skipped: contactIds.length - added,
    });
  } catch (error) {
    console.error('Error adding contacts to group:', error);
    return NextResponse.json(
      { error: 'Failed to add contacts to group' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/contacts — remove contacts from group
// Body: { contactIds: string[] }
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const group = await db.group.findFirst({ where: { id, tenantId } });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const body = await request.json();
    const contactIds = Array.isArray(body?.contactIds)
      ? (body.contactIds as string[]).map(String).filter(Boolean)
      : [];

    if (contactIds.length === 0) {
      return NextResponse.json({ removed: 0 });
    }

    const result = await db.contactGroup.deleteMany({
      where: { groupId: id, contactId: { in: contactIds } },
    });

    // Sync memberCount
    const actualCount = await db.contactGroup.count({
      where: { groupId: id },
    });
    await db.group.update({
      where: { id },
      data: { memberCount: actualCount },
    });

    return NextResponse.json({ removed: result.count });
  } catch (error) {
    console.error('Error removing contacts from group:', error);
    return NextResponse.json(
      { error: 'Failed to remove contacts from group' },
      { status: 500 }
    );
  }
}

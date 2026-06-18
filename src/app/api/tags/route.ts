import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/tags — list tags for current tenant with contactCount
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.name = { contains: search };
    }

    const tags = await db.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { contacts: true } },
      },
    });

    const data = tags.map((t) => ({
      ...t,
      contactCount: t._count.contacts,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags — create a tag (409 if name exists for tenant)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json();
    const { name, color, description } = body as Record<string, unknown>;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = String(name).trim();

    // Check for existing tag with same name in tenant
    const existing = await db.tag.findFirst({
      where: { tenantId, name: trimmedName },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    const tag = await db.tag.create({
      data: {
        name: trimmedName,
        color: color ? String(color) : '#10b981',
        description: description ? String(description) : null,
        tenantId,
        workspaceId: user.workspaceId || null,
      },
      include: {
        _count: { select: { contacts: true } },
      },
    });

    return NextResponse.json(
      { data: { ...tag, contactCount: tag._count.contacts } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

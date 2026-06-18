import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/tags/[id] — fetch one tag with contactCount
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const tag = await db.tag.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { contacts: true } },
      },
    });
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: { ...tag, contactCount: tag._count.contacts },
    });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}

// PUT /api/tags/[id] — update name / color / description
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.tag.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, color, description } = body as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      // Check name uniqueness within tenant (excluding self)
      const dup = await db.tag.findFirst({
        where: { tenantId, name: trimmed, NOT: { id } },
      });
      if (dup) {
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      updateData.name = trimmed;
    }
    if (color !== undefined) updateData.color = color ? String(color) : '#10b981';
    if (description !== undefined)
      updateData.description = description ? String(description) : null;

    const updated = await db.tag.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { contacts: true } },
      },
    });

    return NextResponse.json({
      data: { ...updated, contactCount: updated._count.contacts },
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags/[id] — delete tag (cascade removes ContactTag)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.tag.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await db.tag.delete({ where: { id } });

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}

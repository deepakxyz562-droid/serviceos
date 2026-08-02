import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/support/categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { id } = await params;
    const category = await db.supportCategory.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

// PATCH /api/support/categories/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    if (!isSuperAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const category = await db.supportCategory.update({ where: { id }, data: updateData });
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/support/categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    if (!isSuperAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const category = await db.supportCategory.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (category.isSystem) return NextResponse.json({ error: 'Cannot delete system category' }, { status: 400 });

    await db.supportCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

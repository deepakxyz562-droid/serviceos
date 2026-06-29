import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/support/announcements/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { id } = await params;
    const announcement = await db.announcement.findUnique({ where: { id } });
    if (!announcement) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 });
  }
}

// PATCH /api/support/announcements/[id]
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

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.targetRole !== undefined) updateData.targetRole = body.targetRole;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt;
    if (body.tenantId !== undefined) updateData.tenantId = body.tenantId;

    // Handle publish/unpublish
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'published') {
        updateData.publishedAt = new Date().toISOString();
      }
    }

    const announcement = await db.announcement.update({ where: { id }, data: updateData });
    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

// DELETE /api/support/announcements/[id]
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
    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/notifications/archive/[id]
 *
 * Archive a single notification (soft-delete from the inbox view).
 * Sets isArchived=true and archivedAt=now().
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const { id } = await params;

    // Verify ownership before archiving.
    const existing = await db.appNotification.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        recipientId: user.id,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    const updated = await db.appNotification.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[notifications] archive POST failed:', error);
    return NextResponse.json(
      { error: 'Failed to archive notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/archive/[id]
 *
 * Unarchive a notification (move it back to the inbox).
 * Sets isArchived=false and archivedAt=null.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const { id } = await params;

    const existing = await db.appNotification.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        recipientId: user.id,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    const updated = await db.appNotification.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[notifications] archive DELETE failed:', error);
    return NextResponse.json(
      { error: 'Failed to unarchive notification' },
      { status: 500 }
    );
  }
}

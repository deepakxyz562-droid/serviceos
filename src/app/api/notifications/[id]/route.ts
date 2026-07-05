import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * PATCH /api/notifications/[id]
 *
 * Update a notification's read/archived state. The body may include:
 *   - isRead: boolean       → also sets readAt = now() when true, null when false
 *   - isArchived: boolean   → also sets archivedAt = now() when true, null when false
 *
 * The notification must belong to the current user (matched on tenantId
 * + recipientId). Super-admins can update any notification within their
 * tenant context.
 */
export async function PATCH(
  request: NextRequest,
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
    const body = await request.json();
    const { isRead, isArchived } = body;

    // Verify ownership before mutating.
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

    // Build the patch incrementally so we only set fields that were
    // provided. Setting isRead=true also timestamps readAt; setting
    // it false clears readAt (e.g. for "mark as unread" UX).
    const data: Record<string, unknown> = {};
    if (typeof isRead === 'boolean') {
      data.isRead = isRead;
      data.readAt = isRead ? new Date() : null;
    }
    if (typeof isArchived === 'boolean') {
      data.isArchived = isArchived;
      data.archivedAt = isArchived ? new Date() : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided (isRead, isArchived)' },
        { status: 400 }
      );
    }

    const updated = await db.appNotification.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[notifications] PATCH failed:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 *
 * Hard-delete a notification. Restricted to the notification's owner
 * (matched on tenantId + recipientId) — admins/super-admins can use
 * this route too because the recipientId check passes for them when
 * the notification was originally addressed to them.
 *
 * For a soft-delete UX, prefer PATCH { isArchived: true } instead.
 */
export async function DELETE(
  request: NextRequest,
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

    await db.appNotification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[notifications] DELETE failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

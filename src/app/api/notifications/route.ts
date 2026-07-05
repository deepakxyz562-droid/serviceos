import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  createNotification,
  categoryForType,
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
} from '@/lib/notifications';

/**
 * GET /api/notifications
 *
 * List the current user's in-app notifications (AppNotification rows).
 *
 * Query params:
 *   - filter:   'all' | 'unread' | 'archived'  (default 'all')
 *   - type:     filter by notification type (one of NOTIFICATION_TYPES)
 *   - category: filter by category (one of NOTIFICATION_CATEGORIES)
 *   - search:   substring match on title + message
 *   - limit:    page size, default 50, max 100
 *   - offset:   pagination offset, default 0
 *
 * Response:
 *   { notifications: [...], total: number, unreadCount: number }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all | unread | archived
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      100
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    // Build the where clause. Always scope by tenant + recipient (the
    // current user) so notifications are user-private, not tenant-shared.
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      recipientId: user.id,
    };

    // The 'filter' param controls the read/archived state filter.
    //   all      → not archived
    //   unread   → not archived AND not read
    //   archived → archived = true
    if (filter === 'unread') {
      where.isArchived = false;
      where.isRead = false;
    } else if (filter === 'archived') {
      where.isArchived = true;
    } else {
      // default 'all' = everything that's NOT archived (the inbox view)
      where.isArchived = false;
    }

    if (type) where.type = type;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      db.appNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.appNotification.count({ where }),
      db.appNotification.count({
        where: {
          tenantId: user.tenantId,
          recipientId: user.id,
          isRead: false,
          isArchived: false,
        },
      }),
    ]);

    return NextResponse.json({ notifications, total, unreadCount });
  } catch (error) {
    console.error('[notifications] GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to list notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 *
 * Create a notification (internal/admin use). Required body fields:
 *   - type, title, message, recipientId
 * Optional:
 *   - category, metadataJson, actionUrl, actionLabel, priority,
 *     senderId, senderType, customerId, sourceType, sourceId
 *
 * The tenantId is taken from the authenticated user's session — callers
 * cannot forge cross-tenant notifications.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      type,
      category,
      title,
      message,
      recipientId,
      metadataJson,
      actionUrl,
      actionLabel,
      priority,
      senderId,
      senderType,
      customerId,
      sourceType,
      sourceId,
    } = body;

    if (!type || !title || !message || !recipientId) {
      return NextResponse.json(
        { error: 'type, title, message, and recipientId are required' },
        { status: 400 }
      );
    }

    // Validate type if it's one of the known ones (we still allow ad-hoc
    // types so workflows can introduce new ones without a code change).
    if (
      NOTIFICATION_TYPES.indexOf(type) === -1 &&
      typeof type === 'string' &&
      type.length === 0
    ) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    if (category && NOTIFICATION_CATEGORIES.indexOf(category) === -1) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const result = await createNotification({
      tenantId: user.tenantId,
      recipientId,
      type,
      category: category || categoryForType(type),
      title,
      message,
      metadataJson:
        typeof metadataJson === 'string'
          ? metadataJson
          : metadataJson
            ? JSON.stringify(metadataJson)
            : undefined,
      actionUrl,
      actionLabel,
      priority,
      senderId: senderId || user.id,
      senderType: senderType || 'user',
      customerId,
      sourceType,
      sourceId,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    const created = await db.appNotification.findUnique({
      where: { id: result.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[notifications] POST failed:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/support/announcements — List announcements
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const targetRole = searchParams.get('targetRole');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';

    const where: Record<string, unknown> = {};

    if (isSuperAdmin) {
      // Super-admin sees all announcements
      if (status) where.status = status;
    } else {
      // Tenant users see only published, non-expired announcements for them
      where.status = 'published';
      where.OR = [
        { targetRole: 'all' },
        { targetRole: 'tenant' },
      ];
      where.OR.push({ tenantId: null }, { tenantId: user.tenantId });
      // Filter out expired
      where.expiresAt = { or: [{ equals: null }, { gt: new Date().toISOString() }] };
    }

    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (targetRole) where.targetRole = targetRole;

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { publishedAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.announcement.count({ where }),
    ]);

    return NextResponse.json({
      announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST /api/support/announcements — Create announcement (super-admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only admins can create announcements' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, type, priority, status, targetRole, icon, color, isPinned, publishedAt, expiresAt, tenantId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        priority: priority || 'normal',
        status: status || 'draft',
        targetRole: targetRole || 'all',
        icon: icon || 'Bell',
        color: color || '#0f766e',
        isPinned: isPinned ?? false,
        publishedAt: status === 'published' ? (publishedAt || new Date().toISOString()) : (publishedAt || null),
        expiresAt: expiresAt || null,
        tenantId: tenantId || null,
        authorId: user.id,
        authorName: user.name || user.email,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}

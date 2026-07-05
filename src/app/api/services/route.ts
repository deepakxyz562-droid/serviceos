import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ─── GET /api/services ─────────────────────────────────────────────────────
// List services for a tenant

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };
    if (category) where.category = category;
    if (active !== null && active !== undefined) {
      where.isActive = active === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.service.count({ where }),
    ]);

    return NextResponse.json({
      services,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List services error:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

// ─── POST /api/services ────────────────────────────────────────────────────
// Create a service

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      basePrice,
      duration,
      icon,
      isActive,
      checklistId,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    const service = await db.service.create({
      data: {
        name,
        description: description || null,
        category: category || 'general',
        basePrice: basePrice !== undefined ? Number(basePrice) : 0,
        duration: duration !== undefined ? Number(duration) : 60,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive : true,
        checklistId: checklistId || null,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

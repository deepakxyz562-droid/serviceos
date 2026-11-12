import { serviceInputError } from '../../../../shared/service-input';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSeededDummyService } from '@/lib/bgos-business-sanitizers';
import { deriveServiceSlug, syncServiceCatalogAndGbp } from '@/lib/gbp/service-sync';

// ─── GET /api/services ─────────────────────────────────────────────────────
// List non-dummy services for a tenant

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    const search = searchParams.get('search');
    const includeDummy = searchParams.get('includeDummy') === '1';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));

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

    const [rawServices, rawTotal] = await Promise.all([
      db.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.service.count({ where }),
    ]);

    const services = includeDummy
      ? rawServices
      : rawServices.filter(
          (svc) =>
            !isSeededDummyService({
              slug: svc.slug || deriveServiceSlug(svc.name),
              name: svc.name,
              description: svc.longDescription || svc.description,
              basePrice: svc.basePrice,
              duration: svc.duration,
            }),
        );
    const filteredDummyCount = rawServices.length - services.length;
    const total = Math.max(services.length, rawTotal - filteredDummyCount);

    return NextResponse.json({
      services,
      hasSeededDummyServices: filteredDummyCount > 0,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('List services error:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

// ─── POST /api/services ────────────────────────────────────────────────────
// Create a service and sync to BGOS settings, chatbot & (when requested) Google Business

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({error: 'Invalid service'}, {status: 400});
    const validationError = serviceInputError(body, false);
    if (validationError) return NextResponse.json({error: validationError}, {status: 400});
    const {
      name,
      description,
      longDescription,
      category,
      basePrice,
      duration,
      icon,
      isActive,
      isPublic,
      checklistId,
      syncToGoogle,
    } = body;

    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    const cleanLongDesc =
      typeof longDescription === 'string' && longDescription.trim()
        ? longDescription.trim().slice(0, 500)
        : null;
    const cleanShortDesc =
      typeof description === 'string' && description.trim()
        ? description.trim()
        : cleanLongDesc
          ? cleanLongDesc.slice(0, 220)
          : null;

    const service = await db.service.create({
      data: {
        name: cleanName,
        slug: deriveServiceSlug(cleanName) || undefined,
        description: cleanShortDesc,
        longDescription: cleanLongDesc,
        category: category || 'general',
        basePrice: basePrice !== undefined ? Number(basePrice) : 0,
        duration: duration !== undefined ? Number(duration) : 60,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive : true,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        checklistId: checklistId || null,
        tenantId: user.tenantId,
      },
    });

    const syncResult = await syncServiceCatalogAndGbp(user.tenantId, {
      syncToGoogle: syncToGoogle !== false,
      triggerSource: 'service_create',
    }).catch(() => ({
      servicesCount: 0,
      googleSync: { connected: false, attempted: false, synced: false, warnings: [] },
    }));

    return NextResponse.json(
      { service, googleSync: syncResult.googleSync },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

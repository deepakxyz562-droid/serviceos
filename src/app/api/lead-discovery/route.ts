import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/lead-discovery — List discoveries with filters and counts
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const businessType = searchParams.get('businessType');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause scoped to tenant
    const where: Record<string, unknown> = { tenantId };

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }
    if (source) {
      const sources = source.split(',');
      if (sources.length === 1) {
        where.source = sources[0];
      } else {
        where.source = { in: sources };
      }
    }
    if (businessType) {
      where.businessType = businessType;
    }
    if (priority) {
      const priorities = priority.split(',');
      if (priorities.length === 1) {
        where.priority = priorities[0];
      } else {
        where.priority = { in: priorities };
      }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { businessType: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [discoveries, total, statusCounts, sourceCounts] = await Promise.all([
      db.leadDiscovery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          search: {
            select: { id: true, query: true, source: true },
          },
        },
      }),
      db.leadDiscovery.count({ where }),
      // Count by status
      db.leadDiscovery.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),
      // Count by source
      db.leadDiscovery.groupBy({
        by: ['source'],
        where: { tenantId },
        _count: { source: true },
      }),
    ]);

    // Format counts
    const byStatus: Record<string, number> = {};
    for (const item of statusCounts) {
      byStatus[item.status] = item._count.status;
    }

    const bySource: Record<string, number> = {};
    for (const item of sourceCounts) {
      bySource[item.source] = item._count.source;
    }

    return NextResponse.json({
      discoveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        total,
        byStatus,
        bySource,
      },
    });
  } catch (error: any) {
    console.error('[LeadDiscovery] List error:', error?.message || error);
    console.error('[LeadDiscovery] Stack:', error?.stack);
    return NextResponse.json(
      { error: 'Failed to fetch discoveries', detail: error?.message },
      { status: 500 }
    );
  }
}

// POST /api/lead-discovery — Create a new discovery record (manual entry)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      email,
      website,
      address,
      city,
      state,
      postalCode,
      country,
      businessType,
      category,
      rating,
      reviewCount,
      description,
      source,
      externalId,
      sourceUrl,
      sourceDataJson,
      priority,
      tagsJson,
      searchQueryId,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const discovery = await db.leadDiscovery.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || 'US',
        businessType: businessType || null,
        category: category || null,
        rating: rating || 0,
        reviewCount: reviewCount || 0,
        description: description || null,
        source: source || 'manual',
        externalId: externalId || null,
        sourceUrl: sourceUrl || null,
        sourceDataJson: sourceDataJson || '{}',
        priority: priority || 'medium',
        tagsJson: tagsJson || '[]',
        searchQueryId: searchQueryId || null,
        tenantId: authUser.tenantId,
        createdById: authUser.id,
      },
    });

    return NextResponse.json({ discovery }, { status: 201 });
  } catch (error) {
    console.error('[LeadDiscovery] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create discovery' },
      { status: 500 }
    );
  }
}

import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reviews — List reviews with filters
//
// Customer sessions: scoped to the logged-in customer's own reviews
// (where.customerId = user.id). tenantId is skipped for customers — if
// Customer.workspaceId is null (broken Customer→Workspace→Tenant chain),
// tenantId can't be resolved and the review list would return empty.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Customers don't need a tenantId — they're scoped by customerId.
    if (user.role !== 'customer' && !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const employeeId = searchParams.get('employeeId');
    const customerIdParam = searchParams.get('customerId');
    const minRating = searchParams.get('minRating');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: Record<string, unknown> = {};

    // Customers: scope by customerId (privacy + resilience).
    // Admins/employees: scope by tenantId (+ optional customerId filter).
    if (user.role === 'customer') {
      where.customerId = user.id;
    } else {
      where.tenantId = user.tenantId;
      if (customerIdParam) where.customerId = customerIdParam;
    }

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }
    if (source) where.source = source;
    if (employeeId) where.employeeId = employeeId;
    if (minRating) where.rating = { gte: parseInt(minRating) };

    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews — Create review
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      rating,
      comment,
      authorName,
      jobId,
      customerId,
      employeeId,
      source,
      status,
      npsScore,
      responseJson,
      googleReviewId,
      reviewUrl,
    } = body;

    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: 'Rating is required' },
        { status: 400 }
      );
    }

    // All fields written here exist on the Review model (see prisma/schema.prisma —
    // PHASE-1-SCHEMA added authorName, source, status, responseJson, externalUrl,
    // npsScore, googleReviewId, reviewUrl). `externalUrl` is intentionally not
    // exposed via this API — it's a schema-level alias of `reviewUrl` reserved
    // for future import-from-Google workflows.
    const review = await db.review.create({
      data: {
        rating: parseInt(String(rating)),
        comment: comment || null,
        authorName: authorName || null,
        jobId: jobId || null,
        customerId: customerId || null,
        employeeId: employeeId || null,
        source: source || 'internal',
        status: status || 'published',
        npsScore: npsScore ? parseInt(String(npsScore)) : null,
        responseJson: responseJson || '{}',
        googleReviewId: googleReviewId || null,
        reviewUrl: reviewUrl || null,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reviews — List reviews with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const employeeId = searchParams.get('employeeId');
    const customerId = searchParams.get('customerId');
    const minRating = searchParams.get('minRating');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

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
    if (customerId) where.customerId = customerId;
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

    const review = await db.review.create({
      data: {
        rating: parseInt(String(rating)),
        comment: comment || null,
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

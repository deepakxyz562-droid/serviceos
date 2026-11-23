import { googleReviewScope } from '@/lib/social/google-review-scope';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import { getAuthUser } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';
import { toIsoStringSafe } from '@/lib/safe-date';
import { parseReviewFlagReport } from '@/lib/reviews/report-review';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reviews — List reviews with filters
//
// Customer sessions: scoped to the logged-in customer's own reviews
// (where.customerId = user.id). tenantId is skipped for customers — if
// Customer.workspaceId is null (broken Customer→Workspace→Tenant chain),
// tenantId can't be resolved and the review list would return empty.
//
// PERMISSION GATE (Phase 1.4): when a non-customer caller passes
// `?employeeId=X`, they must hold one of the Reviews-tab roles
// (owner/admin/manager). Without this gate, any tenant member could read
// any other employee's reviews by simply passing `?employeeId=...`.
// Self-access (an employee reading their own reviews) is allowed.
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
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(300, Math.max(1, Number.parseInt(searchParams.get('limit') || '50') || 50));
    const sortBy = ['createdAt', 'rating', 'updatedAt'].includes(searchParams.get('sortBy') || '') ? searchParams.get('sortBy')! : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: Record<string, unknown> = {};

    // Customers: scope by customerId (privacy + resilience).
    // Admins/employees: scope by tenantId (+ optional customerId filter).
    if (user.role === 'customer') {
      where.customerId = user.id;
    } else {
      where.tenantId = user.tenantId;
      if (customerIdParam) where.customerId = customerIdParam;

      const profileId = searchParams.get('profileId');
      if (source === 'google' || profileId) {
        where.AND = [await googleReviewScope(user.tenantId!, profileId && profileId !== 'all' ? profileId : undefined)];
      }
    }

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }
    if (source) {
      where.source = source === 'google' ? 'google' : source;
    }
    if (employeeId) where.employeeId = employeeId;
    if (minRating) where.rating = { gte: parseInt(minRating) };

    // PERMISSION GATE: cross-employee review reads require the Reviews-tab
    // role lane (owner/admin/manager). Self-access is allowed — an employee
    // reading their own reviews via ?employeeId=<their own id> is permitted.
    // Customer sessions are scoped by `where.customerId = user.id` above, so
    // they cannot read other employees' reviews regardless of this gate.
    if (
      employeeId &&
      user.role !== 'customer' &&
      employeeId !== user.employeeId &&
      !hasRole(user, ['owner', 'admin', 'manager'])
    ) {
      return NextResponse.json(
        { error: 'Forbidden — insufficient role to read other employees\' reviews' },
        { status: 403 }
      );
    }

    if (search) {
      where.OR = [
        { comment: { contains: search, ...CI } },
      ];
    }

    // Stored replies use compact JSON with text (or the legacy replyText key).
    // A review needs a reply if:
    // 1) It has no text reply at all, OR
    // 2) It is a Google review whose reply has NOT been confirmed published to Google.
    if (searchParams.get('needsReply') === 'true') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              AND: [
                { NOT: { responseJson: { contains: '"text":"' } } },
                { NOT: { responseJson: { contains: '"replyText":"' } } },
              ],
            },
            {
              AND: [
                { source: 'google' },
                { NOT: { responseJson: { contains: '"publishedToGoogle":true' } } },
              ],
            },
          ],
        },
      ];
    }
    if (searchParams.get('countOnly') === 'true') {
      return NextResponse.json({ total: await db.review.count({ where }) });
    }

    // Compute rating breakdown across all reviews so mobile & web can show accurate counts
    let counts: {
      all: number;
      fiveStars: number;
      fourStars: number;
      threeStars: number;
      critical: number;
      needsReply: number;
    } | undefined;

    try {
      const baseWhere: Record<string, unknown> = user.role === 'customer'
        ? { customerId: user.id }
        : {
            tenantId: user.tenantId,
            ...(source ? { source: source === 'google' ? 'google' : source } : {}),
          };

      const [ratingGroups, needsReplyTotal] = await Promise.all([
        db.review.groupBy({
          by: ['rating'],
          where: baseWhere,
          _count: true,
        }),
        db.review.count({
          where: {
            ...baseWhere,
            OR: [
              {
                AND: [
                  { NOT: { responseJson: { contains: '"text":"' } } },
                  { NOT: { responseJson: { contains: '"replyText":"' } } },
                ],
              },
              {
                AND: [
                  { source: 'google' },
                  { NOT: { responseJson: { contains: '"publishedToGoogle":true' } } },
                ],
              },
            ],
          },
        }),
      ]);

      const rCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let allTotal = 0;
      for (const g of ratingGroups) {
        const r = Math.round(Number(g.rating) || 5);
        const c = typeof g._count === 'number' ? g._count : (g._count as any)?._all || 1;
        rCounts[r] = (rCounts[r] || 0) + c;
        allTotal += c;
      }

      counts = {
        all: allTotal,
        fiveStars: rCounts[5] || 0,
        fourStars: rCounts[4] || 0,
        threeStars: rCounts[3] || 0,
        critical: (rCounts[1] || 0) + (rCounts[2] || 0),
        needsReply: needsReplyTotal,
      };
    } catch (countErr) {
      console.warn('[api/reviews] Error computing rating counts summary:', countErr);
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

    const normalizedReviews = reviews.map((review: any) => {
      const normalizedCreatedAt = toIsoStringSafe(review?.createdAt);
      const flagReport = parseReviewFlagReport(review?.responseJson);
      if (review?.source === 'google' && typeof review.responseJson === 'string' && review.responseJson) {
        try {
          const parsed = JSON.parse(review.responseJson);
          const createIso = toIsoStringSafe(parsed?.googleCreateTime);
          if (createIso) {
            return {
              ...review,
              flagReport,
              createdAt: createIso,
              createTime: createIso,
              googleUpdateTime: toIsoStringSafe(parsed?.googleUpdateTime) || (typeof parsed?.googleUpdateTime === 'string' ? parsed.googleUpdateTime : undefined),
            };
          }
        } catch {}
      }
      if (normalizedCreatedAt && normalizedCreatedAt !== review?.createdAt) {
        return {
          ...review,
          flagReport,
          createdAt: normalizedCreatedAt,
        };
      }
      return flagReport ? { ...review, flagReport } : review;
    });

    const finalReviews =
      searchParams.get('needsReply') === 'true'
        ? normalizedReviews.filter((review: any) => {
            try {
              const parsed =
                typeof review?.responseJson === 'string'
                  ? JSON.parse(review.responseJson || '{}')
                  : review?.responseJson || {};
              const txt = parsed?.text || parsed?.replyText;
              if (!txt || typeof txt !== 'string' || !txt.trim()) return true;
              if (review?.source === 'google') {
                return parsed?.publishedToGoogle !== true;
              }
              return false;
            } catch {
              return true;
            }
          })
        : normalizedReviews;

    const totalFiltered =
      searchParams.get('needsReply') === 'true'
        ? Math.max(0, total - (normalizedReviews.length - finalReviews.length))
        : total;

    return NextResponse.json({
      reviews: finalReviews,
      ...(counts ? { counts } : {}),
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit),
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

    if (source === 'google' || googleReviewId) {
      return NextResponse.json({ error: 'Google reviews must be imported through Google sync. Use manual source for customer feedback.' }, { status: 400 });
    }

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

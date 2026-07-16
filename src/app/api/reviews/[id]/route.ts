import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reviews/[id] — Get single review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const review = await db.review.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

// PUT /api/reviews/[id] — Update review
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.review.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    // All these fields exist on the Review model in prisma/schema.prisma
    // (PHASE-1-SCHEMA added authorName, source, status, responseJson,
    // npsScore, googleReviewId, reviewUrl). `externalUrl` is intentionally
    // omitted — it's a schema-level alias of `reviewUrl` reserved for future
    // import-from-Google workflows.
    const allowedFields = [
      'rating', 'comment', 'authorName', 'status', 'source', 'npsScore',
      'responseJson', 'googleReviewId', 'reviewUrl',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'rating' || field === 'npsScore') {
          updateData[field] = body[field] ? parseInt(String(body[field])) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const review = await db.review.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id] — Delete review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.review.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await db.review.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/review-requests/[id] — Get review request by ID
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

    const reviewRequest = await db.reviewRequest.findUnique({ where: { id } });

    if (!reviewRequest) {
      return NextResponse.json(
        { error: 'Review request not found' },
        { status: 404 }
      );
    }

    // Verify tenant isolation
    if (reviewRequest.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(reviewRequest);
  } catch (error) {
    console.error('Error fetching review request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review request' },
      { status: 500 }
    );
  }
}

// PUT /api/review-requests/[id] — Update review request (status changes)
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

    // Verify the review request exists and belongs to the same tenant
    const existingRequest = await db.reviewRequest.findUnique({ where: { id } });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Review request not found' },
        { status: 404 }
      );
    }

    if (existingRequest.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle status transitions
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Set timestamps based on status
      if (body.status === 'sent' && !existingRequest.sentAt) {
        updateData.sentAt = new Date();
      }
      if (body.status === 'opened' && !existingRequest.openedAt) {
        updateData.openedAt = new Date();
      }
      if (body.status === 'reviewed' && !existingRequest.reviewedAt) {
        updateData.reviewedAt = new Date();
        if (body.reviewId) updateData.reviewId = body.reviewId;
      }
      if (body.status === 'expired') {
        // Mark as expired, no special timestamp needed
      }
    }

    // Handle reminder
    if (body.sendReminder === true) {
      updateData.reminderCount = existingRequest.reminderCount + 1;
      updateData.lastReminderAt = new Date();
    }

    // Allow updating channel
    if (body.channel !== undefined) updateData.channel = body.channel;

    const reviewRequest = await db.reviewRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(reviewRequest);
  } catch (error) {
    console.error('Error updating review request:', error);
    return NextResponse.json(
      { error: 'Failed to update review request' },
      { status: 500 }
    );
  }
}

// DELETE /api/review-requests/[id] — Delete review request
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

    // Verify the review request exists and belongs to the same tenant
    const existingRequest = await db.reviewRequest.findUnique({ where: { id } });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Review request not found' },
        { status: 404 }
      );
    }

    if (existingRequest.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.reviewRequest.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Review request deleted' });
  } catch (error) {
    console.error('Error deleting review request:', error);
    return NextResponse.json(
      { error: 'Failed to delete review request' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

/**
 * POST /api/social/posts/[id]/approval
 * Body: { approvalStatus: 'pending' | 'approved' | 'rejected' }
 *
 * Powers the Dhanda-style AI-post review workflow (Pending ⚠️ / Approved 👍 /
 * Rejected 👎 filter pills). Approval does NOT publish — approving a
 * `scheduled` post simply marks it ready; publishing stays with the existing
 * scheduler (`/api/social/publish-due`).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const approvalStatus = String(body?.approvalStatus || '');

    if (!VALID_STATUSES.includes(approvalStatus)) {
      return NextResponse.json(
        { error: `approvalStatus must be one of ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const existing = await db.socialPost.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, status: true, content: true, gbpOfferData: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    let offerData: Record<string, unknown> = {};
    try {
      if (typeof existing.gbpOfferData === 'string') {
        offerData = JSON.parse(existing.gbpOfferData) || {};
      } else if (existing.gbpOfferData && typeof existing.gbpOfferData === 'object') {
        offerData = { ...(existing.gbpOfferData as Record<string, unknown>) };
      }
    } catch {
      offerData = {};
    }
    offerData.approvalStatus = approvalStatus;

    const updateData: Record<string, unknown> = {
      gbpOfferData: JSON.stringify(offerData),
      approvalStatus,
    };

    const updated = await db.socialPost.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, content: true, gbpOfferData: true, updatedAt: true },
    });

    return NextResponse.json({
      success: true,
      post: {
        ...updated,
        approvalStatus,
      },
    });
  } catch (error: unknown) {
    console.error('[post-approval] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update post approval' },
      { status: 500 },
    );
  }
}

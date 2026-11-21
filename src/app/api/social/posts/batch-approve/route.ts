import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/social/posts/batch-approve
 * Approves a batch of pending campaign posts and marks them as scheduled.
 * Body: { postIds?: string[], approveAll?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const body = (await request.json().catch(() => ({}))) as {
      postIds?: string[];
      approveAll?: boolean;
    };

    const whereClause: Record<string, unknown> = {
      tenantId,
      status: { in: ['draft', 'scheduled'] },
    };

    if (Array.isArray(body.postIds) && body.postIds.length > 0 && !body.approveAll) {
      whereClause.id = { in: body.postIds };
    } else {
      whereClause.approvalStatus = 'pending';
    }

    const result = await db.socialPost.updateMany({
      where: whereClause,
      data: {
        approvalStatus: 'approved',
        status: 'scheduled',
      },
    });

    return NextResponse.json({
      success: true,
      approvedCount: result.count,
      message: `Successfully scheduled ${result.count} posts for publishing.`,
    });
  } catch (error) {
    console.error('[POST /api/social/posts/batch-approve] Error:', error);
    return NextResponse.json({ error: 'Failed to approve posts' }, { status: 500 });
  }
}

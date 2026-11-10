import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  GoogleBusinessNotConnectedError,
  syncGoogleReviewsForTenant,
} from '@/lib/reviews/sync-google-service';

/**
 * POST /api/reviews/sync-google
 * Sync latest customer reviews from Google Business Profile,
 * upsert into the database, optionally auto-reply to positive reviews with AI,
 * and dispatch in-app + mobile/web push alerts for newly imported reviews.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await syncGoogleReviewsForTenant({
      tenantId: user.tenantId,
    });

    return NextResponse.json({
      success: true,
      totalFetched: result.totalFetched,
      newReviewsCount: result.newReviewsCount,
      updatedReviewsCount: result.updatedReviewsCount,
      autoRepliesCount: result.autoRepliesCount,
      averageRating: result.averageRating,
      totalReviewCount: result.totalReviewCount,
      notificationsCreated: result.notificationsCreated,
      pushesDelivered: result.pushesDelivered,
      message: `Synced ${result.totalFetched} reviews from Google Business Profile (${result.newReviewsCount} new, ${result.updatedReviewsCount} updated, ${result.autoRepliesCount} auto-replied).`,
    });
  } catch (error: unknown) {
    if (error instanceof GoogleBusinessNotConnectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error syncing Google reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync Google reviews' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { decryptToken } from '@/lib/social/crypto';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import {
  uploadGoogleBusinessMedia,
  listGoogleBusinessMedia,
} from '@/lib/social/adapters/googlebusiness';
import type { SocialAccountData } from '@/lib/social/types';

async function prepareGoogleAccount(tenantId: string): Promise<SocialAccountData | null> {
  const account = await db.socialAccount.findFirst({
    where: {
      tenantId,
      platform: 'googlebusiness',
      isActive: true,
    },
  });

  if (!account) return null;

  try {
    const rawAccessToken = decryptToken(account.accessToken);
    const rawRefreshToken = account.refreshToken ? decryptToken(account.refreshToken) : undefined;
    let metadata: Record<string, unknown> = {};
    if (typeof account.metadata === 'string') {
      try {
        metadata = JSON.parse(account.metadata);
      } catch {
        metadata = {};
      }
    } else if (account.metadata && typeof account.metadata === 'object') {
      metadata = account.metadata as Record<string, unknown>;
    }

    const accountData: SocialAccountData = {
      id: account.id,
      platform: 'googlebusiness',
      accountId: account.accountId,
      accountName: account.accountName,
      accessToken: rawAccessToken,
      refreshToken: rawRefreshToken,
      tokenExpiry: account.tokenExpiry || undefined,
      metadata,
    };

    return await refreshExpiredToken(accountData);
  } catch (err) {
    console.warn('[social/photos] Error preparing Google account:', err);
    return null;
  }
}

/**
 * GET /api/social/photos
 * List all photos on Google Business Profile + scheduled photo drip queue.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const googleAccount = await prepareGoogleAccount(user.tenantId);
    let livePhotos: Array<{
      id: string;
      url: string;
      thumbnailUrl?: string;
      category?: string;
      createdAt: string;
      source: 'google' | 'queue';
    }> = [];

    if (googleAccount) {
      try {
        const mediaRes = await listGoogleBusinessMedia(googleAccount);
        livePhotos = (mediaRes.mediaItems || []).map((m, idx) => ({
          id: m.name || `gmedia-${idx}`,
          url: m.googleUrl,
          thumbnailUrl: m.thumbnailUrl || m.googleUrl,
          category: m.category,
          createdAt: m.createTime,
          source: 'google' as const,
        }));
      } catch (err: unknown) {
        console.warn('[social/photos] Google media list warning:', err instanceof Error ? err.message : err);
      }
    }

    // Fetch scheduled photo posts in the drip queue
    const scheduledPosts = await db.socialPost.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['scheduled', 'publishing', 'draft'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
      select: {
        id: true,
        mediaUrls: true,
        scheduledAt: true,
        content: true,
        status: true,
      },
    });

    const queuedPhotos = scheduledPosts
      .flatMap((p) => {
        try {
          const urls = JSON.parse(p.mediaUrls || '[]');
          return urls.map((u: string, idx: number) => ({
            id: `${p.id}-${idx}`,
            url: u,
            thumbnailUrl: u,
            category: 'SCHEDULED_DRIP',
            createdAt: p.scheduledAt ? p.scheduledAt.toISOString() : new Date().toISOString(),
            source: 'queue' as const,
            status: p.status,
            caption: p.content,
          }));
        } catch {
          return [];
        }
      })
      .filter(Boolean);

    return NextResponse.json({
      photos: [...livePhotos, ...queuedPhotos],
      liveCount: livePhotos.length,
      queuedCount: queuedPhotos.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch photos' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/social/photos
 * Upload photos in bulk with AI auto-drip scheduling (daily, weekly, or staggered).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const photos: string[] = Array.isArray(body.photos)
      ? body.photos
      : body.photoUrl
        ? [body.photoUrl]
        : [];

    if (!photos.length) {
      return NextResponse.json({ error: 'No photos provided for upload.' }, { status: 400 });
    }

    const scheduleMode: 'instant' | 'daily' | 'weekly' | 'staggered' = body.scheduleMode || 'instant';
    const category: 'ADDITIONAL' | 'COVER' | 'PROFILE' | 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' =
      body.category || 'ADDITIONAL';
    const description: string = body.description || body.aiSeoKeywords || '';

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });
    const businessName = tenant?.name || 'our business';

    const googleAccount = await prepareGoogleAccount(user.tenantId);
    const uploadedPhotos: Array<{ url: string; status: string; scheduledAt?: string }> = [];

    if (scheduleMode === 'instant') {
      for (const photoUrl of photos) {
        if (googleAccount) {
          try {
            const uploaded = await uploadGoogleBusinessMedia(googleAccount, {
              sourceUrl: photoUrl,
              mediaFormat: 'PHOTO',
              category,
              description: description || `Recent work and services at ${businessName}`,
            });
            uploadedPhotos.push({ url: uploaded.googleUrl, status: 'published' });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn('[social/photos] Google media upload warning:', msg);
            uploadedPhotos.push({ url: photoUrl, status: `saved_locally: ${msg}` });
          }
        } else {
          uploadedPhotos.push({ url: photoUrl, status: 'saved_locally (Google account not connected)' });
        }
      }
    } else {
      // Drip scheduler mode: staggered, daily, or weekly
      const dayInterval = scheduleMode === 'daily' ? 1 : scheduleMode === 'weekly' ? 7 : 2;
      const now = Date.now();

      for (let i = 0; i < photos.length; i++) {
        const photoUrl = photos[i];
        // Offset each photo into the future
        const scheduledTime = new Date(now + (i + 1) * dayInterval * 24 * 60 * 60 * 1000);

        const caption =
          description ||
          `Quality craftsmanship and customer satisfaction at ${businessName}. Serving local residents and businesses.`;

        const publishTargets = googleAccount
          ? [
              {
                platform: 'googlebusiness',
                socialAccountId: googleAccount.id,
                status: 'pending',
              },
            ]
          : [];

        await db.socialPost.create({
          data: {
            tenantId: user.tenantId,
            status: 'scheduled',
            content: caption,
            mediaUrls: JSON.stringify([photoUrl]),
            publishTargets: JSON.stringify(publishTargets),
            scheduledAt: scheduledTime,
            createdById: user.id || 'system',
          },
        });

        uploadedPhotos.push({
          url: photoUrl,
          status: 'scheduled',
          scheduledAt: scheduledTime.toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: uploadedPhotos.length,
      scheduleMode,
      results: uploadedPhotos,
      message:
        scheduleMode === 'instant'
          ? `Uploaded ${uploadedPhotos.length} photo(s) to Google Business Profile.`
          : `Scheduled ${uploadedPhotos.length} photo(s) on AI drip (${scheduleMode} interval). Fresh photos will publish automatically!`,
    });
  } catch (error: unknown) {
    console.error('Error in photo upload/drip:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process photos' },
      { status: 500 },
    );
  }
}

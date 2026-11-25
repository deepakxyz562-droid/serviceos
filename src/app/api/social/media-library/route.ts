import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { getCategoryImagesFromS3, getCategoryStorageFolder } from '@/lib/designs/category-image-engine';
import { generateDesignImage } from '@/lib/designs/image-provider';
import { saveDesignAsset } from '@/lib/designs/assets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/social/media-library
 * Returns all media sources available to the merchant for 1-tap post photo replacement:
 * - Real Google Business Profile photos
 * - Uploaded library assets
 * - Curated S3 category library
 * - AI image generation quota status (5/day)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    const industry = tenant.industry || tenant.brandProfile?.industry || 'Services';

    // 1. Google Business Media
    let googlePhotos: Array<{ url: string; title: string }> = [];
    let googleAccount: Awaited<ReturnType<typeof prepareGoogleAccount>> = null;
    try {
      googleAccount = await prepareGoogleAccount(tenantId);
    } catch (gErr) {
      console.warn('[media-library] Could not prepare Google account:', gErr);
    }
    if (googleAccount) {
      try {
        const mediaRes = await listGoogleBusinessMedia(googleAccount, { pageSize: 30 });
        googlePhotos = (mediaRes.mediaItems || [])
          .map((m) => ({
            url: m.googleUrl || m.thumbnailUrl || '',
            title: m.category || 'Google Business Media',
          }))
          .filter((p) => p.url.length > 0);
      } catch (err) {
        console.warn('[media-library] Error fetching GBP media:', err);
      }
    }

    // 2. Uploaded / Saved Library Photos
    let uploadedPhotos: Array<{ id: string; url: string; title: string; folder: string }> = [];
    try {
      const libRows = await db.imageLibrary.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: { id: true, url: true, name: true, folder: true },
      });
      uploadedPhotos = libRows.map((r) => ({
        id: r.id,
        url: r.url,
        title: r.name,
        folder: r.folder,
      }));
    } catch {}

    // 3. Curated S3 Category Pack
    let categoryPhotos: Array<{ url: string; title: string }> = [];
    try {
      const s3Folder = getCategoryStorageFolder(industry);
      const s3Urls = await getCategoryImagesFromS3(s3Folder, 20);
      categoryPhotos = (Array.isArray(s3Urls) ? s3Urls : []).map((url, idx) => ({
        url,
        title: `${industry} Photography ${idx + 1}`,
      }));
    } catch {}

    // 4. Calculate AI Quota
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const isPaidSubscriber = tenant.planStatus === 'active' && tenant.plan !== 'free';
    const isTrial = !isPaidSubscriber;

    let usedImageCount = 0;
    try {
      usedImageCount = await (db.imageLibrary?.count?.({
        where: {
          tenantId,
          folder: 'bgos_ai_photos',
          ...(isTrial ? {} : { createdAt: { gte: startOfDay } }),
        },
      }) ?? Promise.resolve(0));
    } catch {}

    const quotaLimit = 5;
    const remaining = Math.max(0, quotaLimit - usedImageCount);

    return NextResponse.json({
      googlePhotos,
      uploadedPhotos,
      categoryPhotos,
      aiQuota: {
        used: usedImageCount,
        limit: quotaLimit,
        remaining,
        isTrial,
      },
    });
  } catch (error) {
    console.error('[GET /api/social/media-library] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch media library' }, { status: 500 });
  }
}

/**
 * POST /api/social/media-library
 * Generates 1 on-demand commercial AI photo for a post, strictly checking the 5-image daily quota.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    // Check Quota
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const isPaidSubscriber = tenant.planStatus === 'active' && tenant.plan !== 'free';
    const isTrial = !isPaidSubscriber;

    let usedImageCount = 0;
    try {
      usedImageCount = await (db.imageLibrary?.count?.({
        where: {
          tenantId,
          folder: 'bgos_ai_photos',
          ...(isTrial ? {} : { createdAt: { gte: startOfDay } }),
        },
      }) ?? Promise.resolve(0));
    } catch {}

    const quotaLimit = 5;
    if (usedImageCount >= quotaLimit) {
      return NextResponse.json(
        {
          error: isTrial
            ? 'You have reached your 5 AI image trial limit. Subscribe to unlock 5 fresh AI photos every day!'
            : 'You have reached your daily limit of 5 AI photos. Quota resets tomorrow at midnight!',
          quotaReached: true,
          remaining: 0,
        },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
      title?: string;
    };

    const businessName = (tenant.brandProfile?.businessName || tenant.name || 'Our Business').trim();
    const industry = (tenant.industry || tenant.brandProfile?.industry || 'Services').trim();
    const city = (tenant.city || tenant.brandProfile?.location || '').trim();

    const userPrompt = (body.prompt || body.title || '').trim();
    const imagePrompt = `High quality commercial advertising photography for ${businessName} (${industry} in ${city}): ${userPrompt || 'Signature premium service and customer excellence'}. Clean composition, authentic natural lighting, ultra sharp focus.`;

    // Priority 1: Recraft V4.1 Flash V2 (OpenRouter) -> Priority 2: NVIDIA FLUX.1 Schnell -> fallbacks
    const generated = await generateDesignImage(
      imagePrompt,
      'openrouter',
      AbortSignal.timeout(45000),
      false,
      {
        businessName,
        category: industry,
        city,
      },
      { aspectRatio: '4:5' },
    );

    if (!generated?.bytes) {
      return NextResponse.json({ error: 'Image generation failed. Please try again.' }, { status: 502 });
    }

    const savedAsset = await saveDesignAsset(generated.bytes, tenantId, user.id, {
      format: 'webp',
      assetTitle: `${businessName} AI Photo`,
    });

    // Mark as bgos_ai_photos folder in DB to correctly count towards daily quota
    await db.imageLibrary.update({
      where: { id: savedAsset.assetId },
      data: { folder: 'bgos_ai_photos' },
    });

    return NextResponse.json({
      success: true,
      url: savedAsset.url,
      quota: {
        used: usedImageCount + 1,
        limit: quotaLimit,
        remaining: Math.max(0, quotaLimit - (usedImageCount + 1)),
        isTrial,
      },
    });
  } catch (error) {
    console.error('[POST /api/social/media-library] Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI photo' }, { status: 500 });
  }
}

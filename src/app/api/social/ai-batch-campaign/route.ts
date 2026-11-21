import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { getCategoryImagesFromS3, getCategoryStorageFolder } from '@/lib/designs/category-image-engine';
import { generateDesignImage } from '@/lib/designs/image-provider';
import { saveDesignAsset } from '@/lib/designs/assets';
import { ANNUAL_OCCASIONS } from '@/lib/marketing/occasions';
import { localPostingSlot } from '@/lib/social/autopilot-schedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface BatchCampaignRequest {
  goal: string;
  platforms?: Array<'googlebusiness' | 'instagram' | 'facebook' | 'linkedin'>;
  daysCount?: number;
}

interface GeneratedDailyPost {
  dayOffset: number; // 1 to 30
  postingTime: string; // e.g. "11:30" or "17:30"
  theme: 'offer' | 'review' | 'tip' | 'showcase' | 'community';
  title: string;
  caption: string;
  hashtags: string[];
  ctaText: string;
  visualConcept: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const body = (await request.json().catch(() => ({}))) as BatchCampaignRequest;
    const totalDays = Math.min(30, Math.max(7, body.daysCount || 30));

    // 1. Fetch Tenant Context
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        brandProfile: true,
        socialAccounts: {
          where: { isActive: true },
          select: { id: true, platform: true, accountName: true, metadata: true, isActive: true },
        },
        reviews: {
          where: { rating: { gte: 4 } },
          take: 8,
          orderBy: { createdAt: 'desc' },
          select: { authorName: true, rating: true, comment: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    const businessName = (tenant.brandProfile?.businessName || tenant.name || 'Local Business').trim();
    const city = (tenant.city || tenant.brandProfile?.location || 'your city').trim();
    const industry = (tenant.industry || tenant.brandProfile?.industry || 'Services').trim();
    const phone = tenant.brandProfile?.phone || tenant.communicationPhone || '';
    const website = tenant.website || (tenant.brandProfile as any)?.website || '';

    const autonomousGoal = `Promote ${businessName}'s ${industry} services in ${city}, spotlight verified customer reviews, drive phone inquiries, and increase weekly client bookings.`;
    const userGoal = (body.goal || '').trim() || autonomousGoal;

    // Extract active platforms from user selection or connected accounts
    const targetPlatforms = body.platforms && body.platforms.length > 0
      ? body.platforms
      : ['googlebusiness', 'instagram', 'facebook'] as Array<'googlebusiness' | 'instagram' | 'facebook'>;

    const connectedTargetAccounts = (tenant.socialAccounts || []).filter(
      (acc) => targetPlatforms.includes(acc.platform as any),
    );

    const publishTargets = connectedTargetAccounts.map((acc) => ({
      platform: acc.platform,
      socialAccountId: acc.id,
      status: 'pending',
    }));

    // 2. Fetch Media: Real Google Business Photos + S3 Category Library + Existing DB Library
    let realGooglePhotos: string[] = [];
    const googleAccount = await prepareGoogleAccount(tenantId, db);
    if (googleAccount) {
      try {
        const mediaRes = await listGoogleBusinessMedia(googleAccount, { pageSize: 15 });
        realGooglePhotos = (mediaRes.mediaItems || [])
          .map((m) => m.googleUrl || m.thumbnailUrl)
          .filter((u): u is string => typeof u === 'string' && u.length > 0);
      } catch (err) {
        console.warn('[ai-batch-campaign] Could not load Google Business media:', err);
      }
    }

    // Curated S3 category images
    const s3Folder = getCategoryStorageFolder(industry);
    let s3Photos: string[] = [];
    try {
      const s3Res = await getCategoryImagesFromS3(s3Folder, { targetCount: 15 });
      s3Photos = s3Res.images.map((img) => img.url);
    } catch {}

    // Existing uploaded photos in tenant ImageLibrary
    let uploadedPhotos: string[] = [];
    try {
      const libRows = await db.imageLibrary.findMany({
        where: { tenantId },
        take: 12,
        orderBy: { createdAt: 'desc' },
        select: { url: true },
      });
      uploadedPhotos = libRows.map((r) => r.url);
    } catch {}

    // Pool of available zero-quota images
    const zeroQuotaImagePool = [
      ...realGooglePhotos,
      ...uploadedPhotos,
      ...s3Photos,
    ];

    // Fallback image if library is empty
    const DEFAULT_FALLBACK_IMAGE =
      'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-001.webp';

    // 3. Collect Reviews & Upcoming Occasions
    const verifiedReviews = (tenant.reviews || []).map((r) => `"${r.comment}" - ${r.authorName} (${r.rating}★)`).slice(0, 5);
    const today = new Date();
    const monthName = today.toLocaleString('en-US', { month: 'long' });

    // 4. Prompt LLM to Generate Structured 30-Day Content Matrix
    const prompt = `You are an elite CMO and local marketing strategist planning a comprehensive ${totalDays}-day marketing campaign for:
Business Name: "${businessName}"
Industry: "${industry}"
Location / City: "${city}"
Phone: "${phone || 'Contact for details'}"
Website: "${website || ''}"
Customer Goal: "${userGoal}"
Verified Reviews: ${verifiedReviews.length > 0 ? verifiedReviews.join(' | ') : 'Known for dependable quality, fast response, and verified expertise.'}
Current Month: ${monthName}

INSTRUCTIONS:
Generate a strategic, high-converting ${totalDays}-day social media content calendar.
Evenly distribute the posts across these 5 themes:
1. "offer": Weekend specials, discounts, limited packages, or urgency booking incentives (~8 posts).
2. "review": Real or authentic customer proof, 5-star testimonials, and trust spotlights (~6 posts).
3. "tip": Practical advice, maintenance/care secrets, and educational value (~6 posts).
4. "showcase": Craftsmanship, signature services, behind-the-scenes quality (~5 posts).
5. "community": Local connection, weekend greetings, and customer appreciation (~5 posts).

STRICT RULES FOR EVERY POST:
- Caption MUST be genuine, punchy, and include a clear call-to-action (e.g. Call ${phone || 'today'} or visit website).
- Include 3-4 natural local hashtags (e.g. #${city.replace(/\s+/g, '')}${industry.replace(/\s+/g, '')} #${businessName.replace(/\s+/g, '')}).
- NEVER output placeholder tokens like [Phone], [Link], [Date], or [Business].
- Keep each caption concise (under 280 characters for Google Maps compatibility, engaging on Instagram/Facebook).
- postingTime should be an optimal local hour: "09:00", "11:30", "14:00", "17:30", or "19:00".

Respond ONLY with a valid JSON array of ${totalDays} objects:
[
  {
    "dayOffset": 1,
    "postingTime": "11:30",
    "theme": "offer",
    "title": "Short Hook Headline",
    "caption": "Full localized post caption with call to action and hashtags",
    "hashtags": ["#Tag1", "#Tag2"],
    "ctaText": "Call Now",
    "visualConcept": "Art-directed visual description for commercial photography"
  }
]`;

    let generatedItems: GeneratedDailyPost[] = [];
    try {
      const aiResponse = await callAI({
        messages: [
          { role: 'system', content: 'You are an expert local business marketing copywriter. Respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        usageContext: { tenantId, feature: 'bgos_batch_campaign' },
      });

      const rawText = typeof aiResponse === 'string' ? aiResponse : (aiResponse as any)?.content || (aiResponse as any)?.text || '[]';
      const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        generatedItems = JSON.parse(jsonMatch[0]);
      } else {
        generatedItems = JSON.parse(rawText);
      }
    } catch (err) {
      console.error('[ai-batch-campaign] AI synthesis failed:', err);
      return NextResponse.json({ error: 'Failed to generate 30-day marketing plan. Please retry.' }, { status: 500 });
    }

    if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
      return NextResponse.json({ error: 'AI returned empty campaign plan.' }, { status: 500 });
    }

    // 5. Check AI Image Quota for Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const isPaidSubscriber = tenant.subscriptionStatus === 'active' || tenant.plan !== 'free';
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

    const remainingAiCredits = Math.max(0, 5 - usedImageCount);
    let aiCreditsUsedThisRun = 0;

    // 6. Map and Save All 30 Posts
    const createdPosts = [];
    const baseDate = new Date();

    for (let i = 0; i < generatedItems.length; i++) {
      const item = generatedItems[i];
      const postDay = new Date(baseDate);
      postDay.setDate(baseDate.getDate() + (item.dayOffset || (i + 1)));

      // Parse postingTime (e.g. "11:30")
      const [hours, minutes] = (item.postingTime || '11:30').split(':').map((n) => parseInt(n, 10) || 0);
      postDay.setHours(hours, minutes, 0, 0);

      // Determine Media URL
      let chosenMediaUrl = '';

      // If this is Day 1 or Day 2 and we have remaining AI photo credits, generate an AI photo!
      if (i < 2 && remainingAiCredits > aiCreditsUsedThisRun) {
        try {
          const imagePrompt = `High quality commercial photography for ${businessName} (${industry} in ${city}): ${item.visualConcept || item.title}. Clean composition, natural lighting, professional advertising aesthetic.`;
          const generatedImg = await generateDesignImage(
            imagePrompt,
            'cloudflare',
            AbortSignal.timeout(35000),
            false,
          );

          if (generatedImg?.bytes) {
            const savedAsset = await saveDesignAsset(generatedImg.bytes, tenantId, user.id, {
              format: 'webp',
              assetTitle: `${businessName} - Day ${i + 1}`,
            });
            chosenMediaUrl = savedAsset.url;
            aiCreditsUsedThisRun++;
          }
        } catch (imgErr) {
          console.warn(`[ai-batch-campaign] AI image generation fallback for Day ${i + 1}:`, imgErr);
        }
      }

      // If no AI photo was generated, choose from our zero-quota library
      if (!chosenMediaUrl) {
        if (zeroQuotaImagePool.length > 0) {
          chosenMediaUrl = zeroQuotaImagePool[i % zeroQuotaImagePool.length];
        } else {
          chosenMediaUrl = DEFAULT_FALLBACK_IMAGE;
        }
      }

      // Create SocialPost draft / pending review in DB
      try {
        const savedPost = await db.socialPost.create({
          data: {
            tenantId,
            createdById: user.id,
            status: 'draft',
            approvalStatus: 'pending',
            content: item.caption,
            mediaUrls: JSON.stringify([chosenMediaUrl]),
            publishTargets: JSON.stringify(publishTargets),
            scheduledAt: postDay,
            gbpPostType: item.theme === 'offer' ? 'offer' : 'whats_new',
          },
        });

        createdPosts.push({
          id: savedPost.id,
          dayOffset: item.dayOffset || (i + 1),
          scheduledAt: postDay.toISOString(),
          theme: item.theme,
          title: item.title,
          content: item.caption,
          mediaUrl: chosenMediaUrl,
          status: savedPost.status,
          approvalStatus: savedPost.approvalStatus,
        });
      } catch (saveErr) {
        console.error(`[ai-batch-campaign] Failed to save post for day ${i + 1}:`, saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdPosts.length,
      goal: userGoal,
      aiImagesGenerated: aiCreditsUsedThisRun,
      aiQuotaRemaining: Math.max(0, remainingAiCredits - aiCreditsUsedThisRun),
      posts: createdPosts,
    });
  } catch (error) {
    console.error('[POST /api/social/ai-batch-campaign] Internal error:', error);
    return NextResponse.json({ error: 'Internal campaign generation error' }, { status: 500 });
  }
}

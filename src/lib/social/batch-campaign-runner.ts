import crypto from 'crypto';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { resolveTenantVisuals } from '@/lib/designs/ai-visual-engine';

export interface BatchCampaignParams {
  tenantId: string;
  userId: string;
  goal?: string;
  platforms?: Array<'googlebusiness' | 'instagram' | 'facebook' | 'linkedin'>;
  daysCount?: number;
  idempotencyKey?: string;
  locationId?: string;
}

export interface GeneratedDailyPost {
  dayOffset: number;
  postingTime: string;
  theme: 'offer' | 'review' | 'tip' | 'showcase' | 'community';
  title: string;
  caption: string;
  hashtags: string[];
  ctaText: string;
  visualConcept: string;
}

export interface CampaignPostSummary {
  id: string;
  dayOffset: number;
  scheduledAt: string;
  theme: string;
  title: string;
  content: string;
  mediaUrl: string;
  mediaSource: string;
  status: string;
  approvalStatus: string;
}

const inFlightJobs = new Map<string, Promise<void>>();

export function generateDynamicFallbackCampaign(
  businessName: string,
  industry: string,
  city: string,
  phone: string,
  totalDays: number,
  services: string[] = [],
): GeneratedDailyPost[] {
  const themes: Array<'offer' | 'review' | 'tip' | 'showcase' | 'community'> = [
    'offer',
    'showcase',
    'tip',
    'review',
    'community',
    'offer',
    'tip',
  ];
  const times = ['11:30', '17:30', '09:30', '14:00', '19:00'];
  const phoneText = phone ? ` Call ${phone} to connect today!` : ' Connect with us today!';
  const cleanCity = city || 'your local area';
  const cleanIndustry = industry || 'Professional Services';
  const serviceList = services.length > 0 ? services : [cleanIndustry];
  const bizTag = businessName.replace(/[^a-zA-Z0-9]/g, '');
  const cityTag = cleanCity.replace(/[^a-zA-Z0-9]/g, '');
  const indTag = cleanIndustry.replace(/[^a-zA-Z0-9]/g, '');

  const items: GeneratedDailyPost[] = [];
  for (let i = 1; i <= totalDays; i++) {
    const theme = themes[(i - 1) % themes.length];
    const postingTime = times[(i - 1) % times.length];
    const featuredService = serviceList[(i - 1) % serviceList.length];

    let title = '';
    let caption = '';
    let ctaText = 'Book Now';

    if (theme === 'offer') {
      title = `${businessName}: Featured ${featuredService}`;
      caption = `Looking for reliable ${featuredService} in ${cleanCity}? ${businessName} delivers trusted ${cleanIndustry.toLowerCase()} tailored to your needs.${phoneText}`;
      ctaText = 'Call Now';
    } else if (theme === 'review') {
      title = `Trusted ${cleanIndustry} in ${cleanCity}`;
      caption = `See why local clients across ${cleanCity} rely on ${businessName} for responsive support and quality ${featuredService}.${phoneText}`;
      ctaText = 'Learn More';
    } else if (theme === 'tip') {
      title = `${cleanIndustry} Insight from ${businessName}`;
      caption = `Pro tip for ${cleanCity} clients: proactive ${featuredService} keeps outcomes consistent and avoids costly delays.${phoneText}`;
      ctaText = 'Learn More';
    } else if (theme === 'showcase') {
      title = `Inside ${businessName}: ${featuredService}`;
      caption = `Every ${featuredService} engagement in ${cleanCity} follows ${businessName}'s documented standards and local expertise.${phoneText}`;
      ctaText = 'View Work';
    } else {
      title = `Serving ${cleanCity} with Pride`;
      caption = `Thank you for choosing ${businessName} for ${cleanIndustry.toLowerCase()} across ${cleanCity}. We're here whenever your team needs support.${phoneText}`;
      ctaText = 'Contact Us';
    }

    items.push({
      dayOffset: i,
      postingTime,
      theme,
      title,
      caption,
      hashtags: [`#${cityTag}${indTag}`, `#${bizTag}`, `#${indTag}`].filter((t) => t.length > 1),
      ctaText,
      visualConcept: `${businessName} ${featuredService} in ${cleanCity}`,
    });
  }

  return items;
}

function buildContextState(patch: Record<string, unknown>, prevRaw?: string | null): string {
  let prev: Record<string, unknown> = {};
  if (prevRaw) {
    try {
      prev = JSON.parse(prevRaw);
    } catch {}
  }
  return JSON.stringify({ ...prev, ...patch });
}

async function updateJobProgress(
  jobId: string,
  status: 'queued' | 'processing' | 'completed' | 'failed',
  patch: Record<string, unknown>,
  prevContext?: string | null,
  extra?: { resultJson?: string; error?: string; finishedAt?: Date },
): Promise<string> {
  const nextContext = buildContextState(patch, prevContext);
  await db.designGenerationJob
    .update({
      where: { id: jobId },
      data: {
        status,
        contextJson: nextContext,
        ...(extra?.resultJson !== undefined ? { resultJson: extra.resultJson } : {}),
        ...(extra?.error !== undefined ? { error: extra.error } : {}),
        ...(extra?.finishedAt ? { finishedAt: extra.finishedAt } : {}),
      },
    })
    .catch((err) => {
      console.warn(`[batch-campaign] Progress update warning for ${jobId}:`, err);
    });
  return nextContext;
}

export async function runBatchCampaignJob(
  jobId: string,
  params: BatchCampaignParams,
): Promise<void> {
  const existingPromise = inFlightJobs.get(jobId);
  if (existingPromise) return existingPromise;

  const runner = (async () => {
    const totalDays = Math.min(30, Math.max(7, params.daysCount || 30));
    let ctxJson = buildContextState({
      kind: 'batch_campaign',
      stage: 'analyzing',
      progressPct: 15,
      totalDays,
      goal: params.goal || '',
      platforms: params.platforms || ['googlebusiness', 'instagram', 'facebook'],
      idempotencyKey: params.idempotencyKey || '',
      locationId: params.locationId || '',
    });

    try {
      ctxJson = await updateJobProgress(jobId, 'processing', {
        stage: 'analyzing',
        progressPct: 20,
      }, ctxJson);

      const tenant = await db.tenant.findUnique({
        where: { id: params.tenantId },
        include: {
          brandProfile: true,
          socialAccounts: {
            where: { isActive: true },
            select: { id: true, platform: true, accountName: true, accountId: true, metadata: true, isActive: true },
          },
          reviews: {
            where: { rating: { gte: 4 } },
            take: 8,
            orderBy: { createdAt: 'desc' },
            select: { authorName: true, rating: true, comment: true },
          },
          services: {
            where: { isActive: true },
            take: 12,
            select: { name: true },
          },
        },
      });

      if (!tenant) {
        throw new Error('Workspace not found for campaign generation.');
      }

      let settingsObj: Record<string, any> = {};
      try {
        if (tenant.settingsJson) settingsObj = JSON.parse(tenant.settingsJson);
      } catch {}

      const locationProfiles =
        settingsObj.locationProfiles && typeof settingsObj.locationProfiles === 'object'
          ? settingsObj.locationProfiles
          : {};
      const selectedLoc =
        (params.locationId && locationProfiles[params.locationId]) || null;

      const businessName = (
        selectedLoc?.title ||
        tenant.brandProfile?.businessName ||
        settingsObj.activeGbpTitle ||
        tenant.name ||
        'Local Business'
      ).trim();
      const city = (
        selectedLoc?.city ||
        settingsObj.activeGbpCity ||
        tenant.city ||
        tenant.brandProfile?.location ||
        'your area'
      ).trim();
      const industry = (
        selectedLoc?.category ||
        settingsObj.activeGbpCategory ||
        tenant.brandProfile?.industry ||
        tenant.industry ||
        'Professional Services'
      ).trim();
      const phone = tenant.phone || '';
      const website = tenant.website || (tenant.brandProfile as any)?.website || '';
      const serviceNames = (tenant.services || []).map((s) => s.name).filter(Boolean);

      const autonomousGoal = `Promote ${businessName}'s ${industry} in ${city}, spotlight verified customer trust, drive phone inquiries, and increase weekly client bookings.`;
      const userGoal = (params.goal || '').trim() || autonomousGoal;

      const targetPlatforms =
        params.platforms && params.platforms.length > 0
          ? params.platforms
          : (['googlebusiness', 'instagram', 'facebook'] as const);

      const connectedTargetAccounts = (tenant.socialAccounts || []).filter((acc) =>
        targetPlatforms.includes(acc.platform as any),
      );
      const publishTargets = connectedTargetAccounts.map((acc) => ({
        platform: acc.platform,
        socialAccountId: acc.id,
        status: 'pending',
      }));

      // Stage 2: GBP-Photos-First Visual Pool (zero blocking AI image generation per post)
      ctxJson = await updateJobProgress(jobId, 'processing', {
        stage: 'resolving_photos',
        progressPct: 40,
      }, ctxJson);

      const resolvedVisuals = await resolveTenantVisuals({
        tenantId: params.tenantId,
        industry,
        businessName,
        city,
        limit: 30,
      });

      const ownedVisuals = resolvedVisuals.filter((v) => v.source !== 'stock_library');
      const visualPool = ownedVisuals.length > 0 ? ownedVisuals : resolvedVisuals;
      const gbpPhotoCount = resolvedVisuals.filter((v) => v.source === 'gbp_photo').length;

      // Stage 3: Bounded Structured AI Copy Generation (with 1 automatic retry + clean dynamic fallback)
      ctxJson = await updateJobProgress(jobId, 'processing', {
        stage: 'generating_copy',
        progressPct: 65,
      }, ctxJson);

      const verifiedReviews = (tenant.reviews || [])
        .map((r) => `"${r.comment}" - ${r.authorName} (${r.rating}★)`)
        .slice(0, 5);
      const monthName = new Date().toLocaleString('en-US', { month: 'long' });

      const prompt = `You are a senior local marketing strategist creating a ${totalDays}-day social media calendar for:
Business Name: "${businessName}"
Industry: "${industry}"
Location / City: "${city}"
Services: ${serviceNames.slice(0, 8).join(', ') || industry}
Phone: "${phone || 'Contact us'}"
Website: "${website || ''}"
Campaign Goal: "${userGoal}"
Verified Reviews: ${verifiedReviews.length > 0 ? verifiedReviews.join(' | ') : 'Trusted local quality and responsive care.'}
Current Month: ${monthName}

Rules:
- Distribute evenly across themes: "offer", "review", "tip", "showcase", "community".
- Never mention unrelated industries or fabricated claims.
- Keep captions concise (<280 chars for GBP compatibility) with a real CTA (using actual business phone/name, never [Phone]/[Link] placeholders).
- Include 3-4 hashtags relevant to ${city} and ${industry}.
- Respond ONLY with a valid JSON array of ${totalDays} objects: [{"dayOffset":1,"postingTime":"11:30","theme":"offer","title":"...","caption":"...","hashtags":["#..."],"ctaText":"Call Now","visualConcept":"..."}]`;

      let generatedItems: GeneratedDailyPost[] = [];
      for (let attempt = 0; attempt < 2 && generatedItems.length === 0; attempt++) {
        try {
          const aiResponse = await callAI({
            messages: [
              {
                role: 'system',
                content:
                  'Respond ONLY with a valid JSON array of marketing posts. No markdown fences or prose.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: attempt === 0 ? 0.65 : 0.4,
            maxTokens: 3600,
            timeoutMs: 25_000,
            usageContext: { tenantId: params.tenantId, feature: 'bgos_batch_campaign' },
          });
          const rawText =
            typeof aiResponse === 'string'
              ? aiResponse
              : (aiResponse as any)?.content || '';
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
          const toParse = jsonMatch ? jsonMatch[0] : cleaned;
          const parsed = JSON.parse(toParse.replace(/,\s*([\]}])/g, '$1'));
          if (Array.isArray(parsed) && parsed.length > 0) {
            generatedItems = parsed.slice(0, totalDays);
          }
        } catch (aiErr) {
          console.warn(`[batch-campaign] AI attempt ${attempt + 1} failed for ${jobId}:`, aiErr);
        }
      }

      if (generatedItems.length === 0) {
        generatedItems = generateDynamicFallbackCampaign(
          businessName,
          industry,
          city,
          phone,
          totalDays,
          serviceNames,
        );
      }

      // Pad to totalDays if AI returned fewer items
      if (generatedItems.length < totalDays) {
        const extra = generateDynamicFallbackCampaign(
          businessName,
          industry,
          city,
          phone,
          totalDays,
          serviceNames,
        );
        for (let idx = generatedItems.length; idx < totalDays; idx++) {
          generatedItems.push({ ...extra[idx], dayOffset: idx + 1 });
        }
      }

      // Stage 4: Single Batch DB Write via createMany
      ctxJson = await updateJobProgress(jobId, 'processing', {
        stage: 'saving',
        progressPct: 85,
      }, ctxJson);

      const baseDate = new Date();
      const jobShort = jobId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'batch';
      const rowsToInsert: Array<{
        id: string;
        tenantId: string;
        createdById: string;
        status: string;
        approvalStatus: string;
        content: string;
        mediaUrls: string;
        publishTargets: string;
        scheduledAt: Date;
        gbpPostType: string;
      }> = [];
      const createdPosts: CampaignPostSummary[] = [];

      for (let i = 0; i < generatedItems.length; i++) {
        const item = generatedItems[i];
        const postDay = new Date(baseDate);
        const dayOffset = item.dayOffset || i + 1;
        postDay.setDate(baseDate.getDate() + dayOffset);

        const [hours, minutes] = (item.postingTime || '11:30')
          .split(':')
          .map((n) => parseInt(n, 10) || 0);
        postDay.setHours(hours, minutes, 0, 0);

        const chosenVisual =
          visualPool.length > 0 ? visualPool[i % visualPool.length] : null;
        const chosenMediaUrl = chosenVisual?.url || '';
        const mediaUrls = chosenMediaUrl ? [chosenMediaUrl] : [];

        const postId = `camp_${jobShort}_${dayOffset}_${crypto.randomBytes(3).toString('hex')}`;
        const gbpPostType = item.theme === 'offer' ? 'offer' : 'whats_new';

        rowsToInsert.push({
          id: postId,
          tenantId: params.tenantId,
          createdById: params.userId,
          status: 'draft',
          approvalStatus: 'pending',
          content: item.caption || item.title,
          mediaUrls: JSON.stringify(mediaUrls),
          publishTargets: JSON.stringify(publishTargets),
          scheduledAt: postDay,
          gbpPostType,
        });

        createdPosts.push({
          id: postId,
          dayOffset,
          scheduledAt: postDay.toISOString(),
          theme: item.theme,
          title: item.title,
          content: item.caption || item.title,
          mediaUrl: chosenMediaUrl,
          mediaSource: chosenVisual?.source || 'none',
          status: 'draft',
          approvalStatus: 'pending',
        });
      }

      await db.socialPost.createMany({ data: rowsToInsert });

      const resultPayload = {
        success: true,
        count: createdPosts.length,
        goal: userGoal,
        gbpPhotoCount,
        aiImagesGenerated: 0,
        posts: createdPosts,
      };

      await updateJobProgress(
        jobId,
        'completed',
        { stage: 'completed', progressPct: 100 },
        ctxJson,
        { resultJson: JSON.stringify(resultPayload), finishedAt: new Date() },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Campaign generation failed.';
      console.error(`[batch-campaign] Job ${jobId} failed:`, err);
      await updateJobProgress(
        jobId,
        'failed',
        { stage: 'failed', progressPct: 0 },
        ctxJson,
        { error: msg.slice(0, 500), finishedAt: new Date() },
      );
    } finally {
      inFlightJobs.delete(jobId);
    }
  })();

  inFlightJobs.set(jobId, runner);
  return runner;
}

export async function enqueueOrReuseBatchCampaignJob(
  params: BatchCampaignParams,
): Promise<{
  jobId: string;
  status: string;
  stage: string;
  progressPct: number;
  reused: boolean;
  result?: any;
}> {
  const totalDays = Math.min(30, Math.max(7, params.daysCount || 30));
  const rawKey =
    params.idempotencyKey?.trim() ||
    crypto
      .createHash('sha256')
      .update(
        `${params.tenantId}|${totalDays}|${(params.platforms || []).join(',')}|${(params.goal || '').trim()}|${params.locationId || ''}`,
      )
      .digest('hex')
      .slice(0, 20);

  // Deduplicate active or recent identical jobs within last 2 minutes (or explicit idempotency key within 15m)
  const lookbackMs = params.idempotencyKey ? 15 * 60 * 1000 : 2 * 60 * 1000;
  const recentJobs = await db.designGenerationJob
    .findMany({
      where: {
        tenantId: params.tenantId,
        provider: 'batch_campaign',
        createdAt: { gte: new Date(Date.now() - lookbackMs) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    .catch(() => []);

  for (const job of recentJobs || []) {
    try {
      const ctx = job.contextJson ? JSON.parse(job.contextJson) : {};
      if (ctx?.idempotencyKey === rawKey && job.status !== 'failed') {
        return {
          jobId: job.id,
          status: job.status,
          stage: ctx.stage || 'analyzing',
          progressPct: typeof ctx.progressPct === 'number' ? ctx.progressPct : 15,
          reused: true,
          ...(job.status === 'completed' && job.resultJson
            ? { result: JSON.parse(job.resultJson) }
            : {}),
        };
      }
    } catch {}
  }

  const jobId = `campjob_${crypto.randomUUID()}`;
  const initialContext = JSON.stringify({
    kind: 'batch_campaign',
    stage: 'analyzing',
    progressPct: 10,
    totalDays,
    goal: params.goal || '',
    platforms: params.platforms || ['googlebusiness', 'instagram', 'facebook'],
    idempotencyKey: rawKey,
    locationId: params.locationId || '',
  });

  await db.designGenerationJob.create({
    data: {
      id: jobId,
      tenantId: params.tenantId,
      userId: params.userId,
      provider: 'batch_campaign',
      prompt: (params.goal || `Generate ${totalDays}-day campaign`).slice(0, 500),
      status: 'queued',
      contextJson: initialContext,
      startedAt: new Date(),
    },
  });

  return {
    jobId,
    status: 'queued',
    stage: 'analyzing',
    progressPct: 10,
    reused: false,
  };
}

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
  bullets?: string[];
  conclusion?: string;
  hashtags: string[];
  ctaText: string;
  visualConcept: string;
}

const MAX_CAMPAIGN_TITLE_CHARS = 60;

export interface CampaignSocialAccountRow {
  id: string;
  platform: string;
  accountName?: string | null;
  accountId?: string | null;
  metadata?: string | null;
  isActive?: boolean;
}

/**
 * Scope campaign publish targets to at most one active SocialAccount per requested platform.
 * When multiple GBP locations exist, prefer the active/selected locationId instead of emitting duplicate GBP entries.
 */
export function resolveDeduplicatedCampaignTargets(
  socialAccounts: CampaignSocialAccountRow[],
  targetPlatforms: readonly string[],
  preferredGbpLocationId?: string | null,
): Array<{ platform: string; socialAccountId: string; status: 'pending' }> {
  const activeAccounts = (socialAccounts || []).filter((acc) => acc && acc.isActive !== false);
  const targets: Array<{ platform: string; socialAccountId: string; status: 'pending' }> = [];
  const seenPlatforms = new Set<string>();

  for (const platform of targetPlatforms) {
    if (!platform || seenPlatforms.has(platform)) continue;
    const matches = activeAccounts.filter((acc) => acc.platform === platform);
    if (matches.length === 0) continue;

    let chosen = matches[0];
    if (platform === 'googlebusiness' && preferredGbpLocationId) {
      const preferred = matches.find((acc) => {
        if (acc.id === preferredGbpLocationId || acc.accountId === preferredGbpLocationId) return true;
        if (acc.metadata) {
          try {
            const meta = JSON.parse(acc.metadata) as Record<string, unknown>;
            if (meta.locationId === preferredGbpLocationId || meta.name === preferredGbpLocationId) return true;
          } catch {}
        }
        return false;
      });
      if (preferred) chosen = preferred;
    }

    seenPlatforms.add(platform);
    targets.push({
      platform: chosen.platform,
      socialAccountId: chosen.id,
      status: 'pending',
    });
  }

  return targets;
}

export function clampCampaignHeadline(rawTitle: string, maxChars = MAX_CAMPAIGN_TITLE_CHARS): string {
  const clean = (rawTitle || '')
    .replace(/\s+/g, ' ')
    .replace(/^[✓•\-\*#:\s]+|[.,;:!?]+$/g, '')
    .trim();
  if (!clean) return 'Featured Update';
  if (clean.length <= maxChars) return clean;
  const sliced = clean.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace >= Math.floor(maxChars * 0.55) ? sliced.slice(0, lastSpace) : sliced).trim();
}

export function formatStructuredCampaignPost(
  item: GeneratedDailyPost,
  params: { businessName: string; industry: string; city: string; phone?: string },
): { title: string; content: string } {
  const fallbackHeadline = `${item.theme === 'offer' ? 'Featured' : 'Trusted'} ${params.industry}`.trim();
  let title = clampCampaignHeadline(item.title || fallbackHeadline);
  const rawBody = (item.caption || '').replace(/\s+/g, ' ').trim();
  let intro = rawBody;

  // Never let title and intro be identical sentences
  if (intro && intro.toLowerCase().startsWith(title.toLowerCase()) && intro.length <= title.length + 12) {
    title = clampCampaignHeadline(`${params.businessName}: ${params.industry}`);
  }
  if (title.toLowerCase() === intro.toLowerCase()) {
    intro = `Discover trusted ${params.industry.toLowerCase()} with ${params.businessName}${params.city ? ` in ${params.city}` : ''}.`;
  }

  const bullets = (Array.isArray(item.bullets) ? item.bullets : [])
    .map((b) => String(b || '').replace(/^[✓•\-\*\s]+/, '').trim())
    .filter((b) => b.length >= 6)
    .slice(0, 5);

  const conclusion = (item.conclusion || '').replace(/\s+/g, ' ').trim();
  const cta = (item.ctaText || 'CALL').trim().toUpperCase();
  const normalizedCta =
    /book/i.test(cta)
      ? 'BOOK ONLINE'
      : /offer|save|discount/i.test(cta)
        ? 'GET OFFER'
        : /order/i.test(cta)
          ? 'ORDER'
          : /learn|view|more/i.test(cta)
            ? 'LEARN MORE'
            : 'CALL';

  const tags = (Array.isArray(item.hashtags) ? item.hashtags : [])
    .map((t) => String(t || '').trim())
    .filter((t) => /^#[a-zA-Z0-9_]+$/.test(t))
    .slice(0, 4);

  const parts: string[] = [title];
  if (intro) parts.push(intro);
  if (bullets.length > 0) parts.push(bullets.map((b) => `✓ ${b}`).join('\n'));
  if (conclusion && conclusion.toLowerCase() !== intro.toLowerCase()) parts.push(conclusion);
  parts.push(`CTA: ${normalizedCta}${params.phone ? `\nPhone: ${params.phone}` : ''}`);
  if (tags.length > 0) parts.push(tags.join(' '));

  return {
    title,
    content: parts.join('\n\n').slice(0, 1450),
  };
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
    let bullets: string[] = [];
    let conclusion = '';
    let ctaText = 'BOOK ONLINE';

    if (theme === 'offer') {
      title = clampCampaignHeadline(`${featuredService} Spotlight`);
      caption = `Looking for reliable ${featuredService} in ${cleanCity}? ${businessName} delivers dependable ${cleanIndustry.toLowerCase()} tailored around your requirements.`;
      bullets = [
        `Priority scheduling for ${featuredService} across ${cleanCity}`,
        'Clear scope and transparent upfront pricing',
        'Dedicated specialists supporting your request start to finish',
      ];
      conclusion = `Connect with ${businessName} today to check available booking slots.${phoneText}`;
      ctaText = 'CALL';
    } else if (theme === 'review') {
      title = clampCampaignHeadline(`Why ${cleanCity} Trusts ${businessName}`);
      caption = `Clients across ${cleanCity} count on ${businessName} for consistent quality and responsive care in ${featuredService}.`;
      bullets = [
        `Verified local experience in ${cleanIndustry}`,
        'Consistent turnaround and clear communication',
        'High customer satisfaction across repeat engagements',
      ];
      conclusion = `Reach out to ${businessName} in ${cleanCity} to see how our team can help.${phoneText}`;
      ctaText = 'LEARN MORE';
    } else if (theme === 'tip') {
      title = clampCampaignHeadline(`Smart Tips for ${featuredService}`);
      caption = `Proactive planning for ${featuredService} helps ${cleanCity} clients avoid delays and get better long-term outcomes.`;
      bullets = [
        `Assess your ${featuredService} needs early before peak demand`,
        'Work with verified specialists using documented standards',
        'Review maintenance checklists for predictable performance',
      ];
      conclusion = `Have questions for ${businessName}? Our team in ${cleanCity} is ready to assist.${phoneText}`;
      ctaText = 'LEARN MORE';
    } else if (theme === 'showcase') {
      title = clampCampaignHeadline(`Inside Our ${featuredService} Process`);
      caption = `Every ${featuredService} project with ${businessName} in ${cleanCity} follows careful quality standards and attention to detail.`;
      bullets = [
        `Structured ${cleanIndustry.toLowerCase()} execution tailored to your goals`,
        'Trained team committed to reliable delivery',
        'Responsive post-service follow-up and local support',
      ];
      conclusion = `Schedule a quick consultation with ${businessName} in ${cleanCity}.${phoneText}`;
      ctaText = 'BOOK ONLINE';
    } else {
      title = clampCampaignHeadline(`Serving ${cleanCity} with Care`);
      caption = `Thank you for choosing ${businessName} for ${cleanIndustry.toLowerCase()} in ${cleanCity}. We remain committed to dependable local service.`;
      bullets = [
        `Local team dedicated to ${cleanCity} customers`,
        `Full coverage across ${featuredService}`,
        'Prompt callback support when you reach out',
      ];
      conclusion = `Contact ${businessName} anytime to discuss your upcoming ${cleanIndustry.toLowerCase()} needs.${phoneText}`;
      ctaText = 'CALL';
    }

    items.push({
      dayOffset: i,
      postingTime,
      theme,
      title,
      caption,
      bullets,
      conclusion,
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

      const preferredGbpLocationId =
        params.locationId ||
        (typeof settingsObj.activeGbpLocationId === 'string' ? settingsObj.activeGbpLocationId : null);

      const publishTargets = resolveDeduplicatedCampaignTargets(
        tenant.socialAccounts || [],
        targetPlatforms,
        preferredGbpLocationId,
      );

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
- "title" MUST be a short, punchy headline (4 to 8 words, strictly under 60 characters) and MUST NOT repeat the opening sentence of "caption".
- "caption" should be a distinct 1-2 sentence intro (90–180 chars) describing the value for ${city} customers without [Phone]/[Link] placeholders.
- "bullets" MUST include 3 concise value highlight strings (6–12 words each, no leading checkmark symbols).
- "conclusion" should be 1 brief closing CTA sentence.
- Include 3-4 hashtags relevant to ${city} and ${industry}.
- Respond ONLY with a valid JSON array of ${totalDays} objects: [{"dayOffset":1,"postingTime":"11:30","theme":"offer","title":"Short Headline Here","caption":"Distinct 1-2 sentence intro...","bullets":["Highlight 1","Highlight 2","Highlight 3"],"conclusion":"Closing CTA sentence.","hashtags":["#Tag1","#Tag2","#Tag3"],"ctaText":"CALL","visualConcept":"..."}]`;

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
        const formatted = formatStructuredCampaignPost(item, {
          businessName,
          industry,
          city,
          phone,
        });

        rowsToInsert.push({
          id: postId,
          tenantId: params.tenantId,
          createdById: params.userId,
          status: 'draft',
          approvalStatus: 'pending',
          content: formatted.content,
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
          title: formatted.title,
          content: formatted.content,
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

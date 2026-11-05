import { createHash } from 'crypto';
import { localPostingSlot } from './autopilot-schedule';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { publishPost } from '@/lib/social/publisher';
import { generateDesignImage } from '@/lib/designs/image-provider';
import { saveDesignAsset } from '@/lib/designs/assets';
import { renderDesign } from '@/lib/designs/render';
import { logActivity } from '@/lib/activity-log';

export type AutopilotDuration = '7_days' | '30_days' | '1_year' | 'custom';

export interface AutopilotConfig {
  enabled: boolean;
  duration: AutopilotDuration;
  customDays?: number;
  platforms: Array<'googlebusiness' | 'instagram' | 'facebook'>;
  accountIds?: string[];
  templateIds?: string[];
  postingTime: string;
  timeZone: string;
  startDate: string;
  endDate: string;
  lastRunAt?: string | null;
  totalPostsCreated: number;
  status: 'active' | 'paused' | 'completed';
  contentSource?: 'ai_generated' | 'my_templates' | 'hybrid';
}

const DEFAULT_PLATFORMS: Array<'googlebusiness' | 'instagram' | 'facebook'> = [
  'googlebusiness',
  'instagram',
  'facebook',
];

export function getAutopilotDays(duration: AutopilotDuration, customDays?: number): number {
  if (duration === '7_days') return 7;
  if (duration === '1_year') return 365;
  if (duration === 'custom') return Math.max(1, Math.min(365, customDays || 7));
  return 30;
}

export async function getTenantAutopilotConfig(tenantId: string): Promise<AutopilotConfig> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });

  let settings: Record<string, any> = {};
  try {
    settings = JSON.parse(tenant?.settingsJson || '{}');
  } catch {}

  const raw = settings.socialAutopilot || {};
  const duration: AutopilotDuration =
    raw.duration === '7_days'
      ? '7_days'
      : raw.duration === '1_year'
      ? '1_year'
      : raw.duration === 'custom'
      ? 'custom'
      : '30_days';
  const customDays = typeof raw.customDays === 'number' ? raw.customDays : undefined;
  const totalDays = getAutopilotDays(duration, customDays);
  const now = new Date();

  const startDate = raw.startDate || now.toISOString();
  const endDate =
    raw.endDate ||
    new Date(new Date(startDate).getTime() + totalDays * 24 * 60 * 60 * 1000).toISOString();

  const isExpired = new Date(endDate).getTime() <= now.getTime();
  const enabled = Boolean(raw.enabled) && !isExpired;

  return {
    enabled,
    duration,
    customDays,
    platforms: Array.isArray(raw.platforms) && raw.platforms.length > 0 ? raw.platforms : DEFAULT_PLATFORMS,
    accountIds: Array.isArray(raw.accountIds) ? raw.accountIds : undefined,
    templateIds: Array.isArray(raw.templateIds) ? raw.templateIds : [],
    postingTime: raw.postingTime || '09:00',
    timeZone: raw.timeZone || 'UTC',
    startDate,
    endDate,
    lastRunAt: raw.lastRunAt || null,
    totalPostsCreated: Number(raw.totalPostsCreated) || 0,
    status: isExpired ? 'completed' : enabled ? 'active' : 'paused',
    contentSource: raw.contentSource || 'ai_generated',
  };
}

export async function saveTenantAutopilotConfig(
  tenantId: string,
  updates: Partial<AutopilotConfig>
): Promise<AutopilotConfig> {
  const current = await getTenantAutopilotConfig(tenantId);

  const duration = updates.duration || current.duration;
  const customDays = updates.customDays ?? current.customDays;
  const totalDays = getAutopilotDays(duration, customDays);
  const now = new Date();

  let startDate = updates.startDate || current.startDate;
  let endDate = updates.endDate || current.endDate;

  // If enabling newly or resetting duration
  if (updates.enabled && (!current.enabled || (updates.duration !== undefined && updates.duration !== current.duration) || (updates.customDays !== undefined && updates.customDays !== current.customDays))) {
    startDate = updates.startDate || now.toISOString();
    endDate = updates.endDate || new Date(new Date(startDate).getTime() + totalDays * 24 * 60 * 60 * 1000).toISOString();
  }

  const merged: AutopilotConfig = {
    ...current,
    ...updates,
    duration,
    customDays,
    startDate,
    endDate,
    status:
      new Date(endDate).getTime() <= now.getTime()
        ? 'completed'
        : updates.enabled ?? current.enabled
          ? 'active'
          : 'paused',
  };

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });

  let settings: Record<string, any> = {};
  try {
    settings = JSON.parse(tenant?.settingsJson || '{}');
  } catch {}

  settings.socialAutopilot = merged;

  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(settings) },
  });

  return merged;
}

const THEMES = [
  { day: 'Monday', focus: 'Local Service Spotlight & New Week Availability', angle: 'High intent local booking & fast response' },
  { day: 'Tuesday', focus: 'Pro Tip & Common Problem Prevention', angle: 'Educational authority & tips for homeowners/clients' },
  { day: 'Wednesday', focus: 'Midweek Special Offer & Package Discount', angle: 'Limited seasonal savings & prompt consultation' },
  { day: 'Thursday', focus: 'Client Success Story & 5-Star Reviews', angle: 'Social proof, reliability & verified satisfaction' },
  { day: 'Friday', focus: 'Weekend Urgent Response & Emergency Coverage', angle: 'Priority weekend bookings and fast contact' },
  { day: 'Saturday', focus: 'Behind the Scenes & Quality Craftsmanship', angle: 'Dedicated work ethic, team standards & modern tools' },
  { day: 'Sunday', focus: 'Community Commitment & Booking for Next Week', angle: 'Friendly local connection & easy calendar scheduling' },
];

export async function generateDailyAutopilotPost(
  tenantId: string,
  userId?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  let claimedPostId: string | undefined;
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        brandProfile: true,
        socialAccounts: {
          where: { isActive: true },
          select: { id: true, platform: true, accountName: true },
        },
      },
    });

    if (!tenant) {
      return { success: false, error: 'Tenant not found' };
    }

    const config = await getTenantAutopilotConfig(tenantId);
    if (!config.enabled && !userId) {
      return { success: false, error: 'Autopilot is paused or completed' };
    }

    const targetAccounts=tenant.socialAccounts.filter(acc=>config.platforms.includes(acc.platform as any) && (!config.accountIds || config.accountIds.includes(acc.id)));
    if(!targetAccounts.length)return {success:false,error:'Connect a selected social channel before posting'};
    const slot=localPostingSlot(new Date(),config.timeZone);
    const postId='autopilot_'+createHash('sha256').update(`${tenantId}:${slot.date}`).digest('hex');
    const prior=await db.socialPost.findUnique({where:{id:postId}});
    if (prior) {
      if (prior.status === 'published') {
        if (!config.lastRunAt || localPostingSlot(new Date(config.lastRunAt),config.timeZone).date !== slot.date)
          await saveTenantAutopilotConfig(tenantId,{lastRunAt:new Date().toISOString(),totalPostsCreated:config.totalPostsCreated+1});
        return {success:true,postId};
      }
      const age = Date.now() - new Date(prior.updatedAt).getTime();
      // Never reclaim an uncertain provider delivery. A response may have been lost.
      if (prior.status === 'publishing') return {success:false,postId,error:'Delivery is awaiting reconciliation. Check the channel before retrying.'};
      let attempts = 1;
      try { attempts = JSON.parse(prior.gbpOfferData || '{}').autopilotAttempts || 1; } catch {}
      if (attempts >= 3 || age < 5 * 60_000 || (prior.status === 'generating' && age < 15 * 60_000))
        return {success:false,postId,error:'Daily post is processing or retry limit reached. Check recent activity.'};
      if (!['failed','partial','generating','scheduled'].includes(prior.status)) return {success:false,postId,error:'Post cannot be retried in its current state.'};
      try {
        const targets=JSON.parse(prior.publishTargets || '[]');
        if (targets.some((t:{error?:string})=>/timeout|timed out|network|fetch failed|abort|ECONN/i.test(t.error || '')))
          return {success:false,postId,error:'A channel response was uncertain. Check the external account before retrying.'};
      } catch { return {success:false,postId,error:'Invalid delivery record. Review this post.'}; }
      const claimed = await db.socialPost.updateMany({where:{id:postId,status:prior.status,updatedAt:prior.updatedAt},data:{status:'generating',gbpOfferData:JSON.stringify({autopilotAttempts:attempts+1})}});
      if (!claimed.count) return {success:false,postId,error:'Another worker is handling this post.'};
      claimedPostId = postId;
      if (prior.content && prior.publishTargets && prior.publishTargets !== '[]') {
        const previousTargets = JSON.parse(prior.publishTargets);
        if (!previousTargets.every((target:{socialAccountId:string;status:string})=>target.status === 'published' || targetAccounts.some(account=>account.id === target.socialAccountId)))
          throw new Error('A publishing account was removed or disconnected. Review this post before retrying.');
        await db.socialPost.update({where:{id:postId},data:{status:'scheduled'}});
        await publishPost(postId);
        const delivered = await db.socialPost.findUnique({where:{id:postId}});
        if (delivered?.status !== 'published') throw new Error('Delivery incomplete. Inspect individual channel results.');
        await saveTenantAutopilotConfig(tenantId,{lastRunAt:new Date().toISOString(),totalPostsCreated:config.totalPostsCreated+1});
        return {success:true,postId};
      }
    } else {
      await db.socialPost.create({data:{id:postId,tenantId,content:'',status:'generating',mediaUrls:'[]',publishTargets:'[]',gbpOfferData:JSON.stringify({autopilotAttempts:1}),createdById:'system-autopilot'}});
    }
    claimedPostId=postId;

    const businessName = tenant.brandProfile?.businessName || tenant.name || 'Local Service Pro';
    const industry = tenant.brandProfile?.industry || tenant.industry || 'Professional Services';
    const city = tenant.brandProfile?.location || tenant.city || 'your area';

    const dayIndex = (new Date(`${slot.date}T12:00:00Z`).getUTCDay()+6)%7;
    const todayTheme = THEMES[dayIndex] || THEMES[0];

    const useTemplate = config.contentSource === 'my_templates' ||
      (config.contentSource === 'hybrid' && Number(slot.date.replace(/-/g,'')) % 2 === 0);
    // 1. Generate SEO-optimized copy for the post
    const prompt = `Write a high-converting social media post for ${businessName} (${industry} in ${city}).
Today's Theme: ${todayTheme.focus} (${todayTheme.angle}).

Requirements:
1. Compelling, professional, and friendly tone suitable for Google Business Profile, Instagram, and Facebook.
2. 2-3 short, engaging paragraphs.
3. Highlight prompt service, high standards, and verified local expertise.
4. Call to action to call or book online today.
5. Include 3-4 natural local hashtags (e.g. #${city.replace(/\s+/g, '')}Services #${industry.replace(/\s+/g, '')}).
6. Do NOT include placeholder tokens like [Phone] or [Link].
7. Never invent reviews, discounts, emergency availability, guarantees or customer stories. If these are not provided in the business context, use an educational post instead.`;

    let content = '';
    if (!useTemplate) {
    try {
      const aiRes = await callAI({
        messages: [
          { role: 'system', content: 'You are an elite local business marketing copywriter.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        usageContext: { tenantId, feature: 'bgos_autopilot_post' },
      });
      content = typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '';
    } catch {
      throw new Error('AI copy generation failed. No fallback advertising claims were published.');
    }
    if(!content.trim())throw new Error('AI returned empty content');
    }

    // 2. Generate Graphic with Cloudflare Workers AI Flux-1 Schnell
    const imagePrompt = `Clean professional advertisement poster for ${businessName}, ${industry} in ${city}. High quality commercial photography, sleek layout, warm lighting, high detail, modern style.`;
    const mediaUrls: string[] = [];
    let postDesignJson: string | null = null;

    const actorId = userId || 'system-autopilot';

    if (useTemplate) {
      const ids = config.templateIds || [];
      if (!ids.length) throw new Error('Select saved posters for Autopilot first.');
      const template = await db.socialPost.findFirst({where:{tenantId,id:ids[Number(slot.date.replace(/-/g,'')) % ids.length]}});
      if (!template?.designJson) throw new Error('Selected poster is unavailable. Update Autopilot templates.');
      postDesignJson = template.designJson;
      const rendered = await renderDesign(JSON.parse(template.designJson),tenantId);
      mediaUrls.push(rendered.imageUrl);
      content = template.content?.trim() || '';
      if (!content) throw new Error('Add a caption to the selected saved poster before publishing.');
    } else {
      const key = await db.aiProviderKey.findFirst({where:{isActive:true,provider:{in:['gemini','openrouter','cloudflare']}},orderBy:{priority:'asc'},select:{provider:true}});
      if (!key) throw new Error('Configure an image provider in Superadmin.');
      const generated = await generateDesignImage(imagePrompt,key.provider as 'gemini'|'openrouter'|'cloudflare',AbortSignal.timeout(60000),true);
      if (!generated?.bytes) throw new Error('Image generation returned no image.');
      const asset = await saveDesignAsset(generated.bytes,tenantId,actorId);
      mediaUrls.push(asset.url);
    }

    // 3. Match publish targets to enabled channels
    const publishTargets = targetAccounts.map((acc) => ({
      platform: acc.platform,
      socialAccountId: acc.id,
      status: 'pending',
    }));

    // 4. Create SocialPost
    if(config.platforms.includes('instagram')&&!mediaUrls.length)throw new Error('Instagram requires an image; generation failed');
    const latest=await getTenantAutopilotConfig(tenantId);
    if(JSON.stringify([latest.accountIds,latest.platforms,latest.contentSource,latest.templateIds]) !== JSON.stringify([config.accountIds,config.platforms,config.contentSource,config.templateIds])) throw new Error('Autopilot settings changed during generation. Retry with the new settings.');
    if(!latest.enabled&&!userId)throw new Error('Autopilot paused during generation');
    const post = await db.socialPost.update({
      where:{id:postId},
      data: {
        tenantId,
        content: content.trim(),
        mediaUrls: JSON.stringify(mediaUrls),
        designJson: postDesignJson,
        publishTargets: JSON.stringify(publishTargets),
        status: 'scheduled',
        gbpPostType: 'whats_new',
        createdById: actorId,
        scheduledAt: new Date(),
      },
    });

    // 5. Trigger multi-platform publisher if targets exist
    if (publishTargets.length > 0) {
      await publishPost(post.id);
      const delivery = await db.socialPost.findUnique({where:{id:post.id},select:{status:true}});
      if (!delivery || delivery.status !== 'published') throw new Error(`Post saved; delivery status: ${delivery?.status || 'processing'}. Check channel results before retrying.`);
    }

    // 6. Update Autopilot counters
    await saveTenantAutopilotConfig(tenantId, {
      lastRunAt: new Date().toISOString(),
      totalPostsCreated: config.totalPostsCreated + 1,
    });

    await logActivity({
      tenantId,
      actorId,
      actorType: 'system',
      action: 'autopilot_daily_post',
      entityType: 'social_post',
      entityId: post.id,
      description: `Autopilot submitted daily post across ${publishTargets.length} platform(s).`,
      severity: 'info',
    }).catch(() => {});

    return {
      success: true,
      postId: post.id,
    };
  } catch (error: any) {
    if(claimedPostId)await db.socialPost.updateMany({where:{id:claimedPostId,status:'generating'},data:{status:'failed',failureReason:error?.message||'Generation failed'}}).catch(()=>{});
    console.error(`[social/autopilot] Error in generateDailyAutopilotPost for tenant ${tenantId}:`, error);
    return {
      success: false,
      error: error?.message || 'Failed to generate autopilot post',
    };
  }
}

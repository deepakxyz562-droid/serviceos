import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { nextAutopilotRun } from '@/lib/social/autopilot-schedule';
import { db } from '@/lib/db';
import {
  getTenantAutopilotConfig,
  saveTenantAutopilotConfig,
  generateDailyAutopilotPost,
} from '@/lib/social/autopilot';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/social/autopilot
 * Returns autopilot status, duration (30 days vs 1 year), channels, and recent posts.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const config = await getTenantAutopilotConfig(user.tenantId);

    const now = Date.now();
    const endMs = new Date(config.endDate).getTime();
    const daysRemaining = Math.max(0, Math.ceil((endMs - now) / (24 * 60 * 60 * 1000)));

    // Fetch connected accounts
    const accounts = await db.socialAccount.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, platform: true, accountName: true },
    });

    const connectedPlatforms = accounts.map((a) => a.platform);

    // Fetch recent autopilot posts
    const recentPosts = await db.socialPost.findMany({
      where: {
        tenantId: user.tenantId,
        id: { startsWith: 'autopilot_' },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        publishTargets: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        failureReason: true,
      },
    });

    return NextResponse.json({
      success: true,
      config: { ...config, accountIds: config.accountIds ?? accounts.filter(a => config.platforms.some(platform => platform === a.platform)).map(a => a.id) },
      daysRemaining,
      nextRunAt: nextAutopilotRun(config),
      connectedPlatforms,
      accounts,
      recentPosts,
    });
  } catch (error: any) {
    console.error('[api/social/autopilot] GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch autopilot status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/autopilot
 * Update autopilot settings (toggle, 30-day / 1-year duration, platforms, or trigger post).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));

    if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Send a JSON object'},{status:400});
    const { accountIds, templateIds, enabled, duration, customDays, startDate, endDate, platforms, postingTime, timeZone, contentSource, triggerPostNow } = body;
    if(platforms!==undefined&&(!Array.isArray(platforms)||!platforms.length||platforms.some((p:unknown)=>!['googlebusiness','instagram','facebook'].includes(String(p)))))return NextResponse.json({error:'Select valid publishing channels'},{status:400});
    if(postingTime!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(postingTime))return NextResponse.json({error:'Use HH:mm posting time'},{status:400});
    if(timeZone!==undefined){try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{return NextResponse.json({error:'Invalid timezone'},{status:400});}}
    if (duration !== undefined && !['7_days','30_days','1_year','custom'].includes(duration)) return NextResponse.json({error:'Invalid duration. Choose 7_days, 30_days, 1_year, or custom'},{status:400});
    if (enabled !== undefined && typeof enabled !== 'boolean') return NextResponse.json({error:'Invalid enabled value'},{status:400});
    for (const value of [accountIds, templateIds]) {
      if (value !== undefined && (!Array.isArray(value) || value.length > 100 || value.some((id:unknown)=>typeof id !== 'string' || !id)))
        return NextResponse.json({error:'Select valid accounts and saved posters'},{status:400});
    }
    if (contentSource !== undefined && !['ai_generated','my_templates','hybrid'].includes(contentSource)) return NextResponse.json({error:'Invalid content source'},{status:400});
    if (triggerPostNow !== undefined && typeof triggerPostNow !== 'boolean') return NextResponse.json({error:'Invalid post trigger'},{status:400});
    // Pausing must remain possible if a previously selected account or poster was deleted.
    if (enabled === false && Object.keys(body).length === 1) {
      const config = await saveTenantAutopilotConfig(user.tenantId, {enabled:false});
      const daysRemaining = Math.max(0, Math.ceil((Date.parse(config.endDate) - Date.now()) / 86_400_000));
      return NextResponse.json({success:true, config, daysRemaining, nextRunAt:null, message:'Autopilot is paused.'});
    }
    const current = await getTenantAutopilotConfig(user.tenantId);
    const selectedIds = accountIds ?? current.accountIds;
    if (selectedIds !== undefined) {
      const selected = await db.socialAccount.findMany({where:{tenantId:user.tenantId,isActive:true,id:{in:selectedIds},platform:{in:platforms ?? current.platforms}},select:{id:true}});
      if (selected.length !== new Set(selectedIds).size || ((enabled || triggerPostNow) && !selected.length))
        return NextResponse.json({error:'Select connected publishing accounts for this workspace'},{status:400});
    }
    let effectiveTemplateIds = templateIds !== undefined ? templateIds : current.templateIds;
    const effectiveContentSource = contentSource !== undefined ? contentSource : current.contentSource;

    if (effectiveContentSource !== 'ai_generated' && (!effectiveTemplateIds || !effectiveTemplateIds.length)) {
      // Auto-fallback: check if the tenant has any existing saved poster drafts
      const existingDrafts = await db.socialPost.findMany({
        where: { tenantId: user.tenantId, NOT: { designJson: { equals: null } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true },
      });
      if (existingDrafts.length > 0) {
        effectiveTemplateIds = existingDrafts.map((d) => d.id);
      } else {
        return NextResponse.json({ error: 'Select at least one saved poster for this content source' }, { status: 400 });
      }
    }

    if (effectiveTemplateIds !== undefined && effectiveTemplateIds.length > 0) {
      const templates = await db.socialPost.findMany({where:{tenantId:user.tenantId,id:{in:effectiveTemplateIds},NOT:{designJson:{equals:null}}},select:{id:true}});
      if (templates.length !== new Set(effectiveTemplateIds).size) return NextResponse.json({error:'A selected poster is unavailable'},{status:400});
    }
    if (customDays !== undefined && (!Number.isInteger(customDays) || customDays < 1 || customDays > 365)) return NextResponse.json({error:'Choose 1–365 days'},{status:400});
    for (const date of [startDate,endDate]) if (date !== undefined && !Number.isFinite(Date.parse(date))) return NextResponse.json({error:'Invalid campaign date'},{status:400});
    if (startDate && endDate && Date.parse(endDate) <= Date.parse(startDate)) return NextResponse.json({error:'End date must follow start date'},{status:400});
    const updates: Record<string, any> = {};
    if (accountIds !== undefined) updates.accountIds = [...new Set(accountIds)];
    if (effectiveTemplateIds !== undefined) updates.templateIds = [...new Set(effectiveTemplateIds)];
    if (typeof timeZone === 'string') updates.timeZone = timeZone;
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (duration) updates.duration = duration;
    if (typeof customDays === 'number' && customDays > 0) updates.customDays = customDays;
    if (typeof startDate === 'string') updates.startDate = startDate;
    if (typeof endDate === 'string') updates.endDate = endDate;
    if (contentSource && ['ai_generated', 'my_templates', 'hybrid'].includes(contentSource)) updates.contentSource = contentSource;
    if (Array.isArray(platforms)) updates.platforms = platforms;
    if (typeof postingTime === 'string') updates.postingTime = postingTime;

    const updatedConfig = await saveTenantAutopilotConfig(user.tenantId, updates);

    let triggerResult: Awaited<ReturnType<typeof generateDailyAutopilotPost>> | null = null;
    if (triggerPostNow) {
      triggerResult = await generateDailyAutopilotPost(user.tenantId, user.id);
    }

    const now = Date.now();
    const endMs = new Date(updatedConfig.endDate).getTime();
    const daysRemaining = Math.max(0, Math.ceil((endMs - now) / (24 * 60 * 60 * 1000)));

    const durationLabel =
      updatedConfig.duration === '7_days'
        ? '7 Days (Sprint)'
        : updatedConfig.duration === '1_year'
        ? '1 Year (365 Days)'
        : updatedConfig.duration === 'custom'
        ? `${daysRemaining} Days (Custom Range)`
        : '30 Days';

    return NextResponse.json({
      success: triggerResult ? triggerResult.success : true,
      config: updatedConfig,
      nextRunAt: nextAutopilotRun(updatedConfig),
      daysRemaining,
      triggerResult,
      message: triggerResult && !triggerResult.success ? triggerResult.error : updatedConfig.enabled
        ? `Autopilot active for ${durationLabel}. Daily posts will publish automatically.`
        : 'Autopilot is paused.',
    });
  } catch (error: any) {
    console.error('[api/social/autopilot] POST error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update autopilot' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getTenantAutopilotConfig,
  saveTenantAutopilotConfig,
  generateDailyAutopilotPost,
} from '@/lib/social/autopilot';

export const dynamic = 'force-dynamic';

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
        createdById: { in: [user.id, 'system-autopilot'] },
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
      },
    });

    return NextResponse.json({
      success: true,
      config,
      daysRemaining,
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

    const body = await request.json().catch(() => ({}));
    const { enabled, duration, platforms, postingTime, triggerPostNow } = body;

    const updates: Record<string, any> = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (duration === '30_days' || duration === '1_year') updates.duration = duration;
    if (Array.isArray(platforms)) updates.platforms = platforms;
    if (typeof postingTime === 'string') updates.postingTime = postingTime;

    const updatedConfig = await saveTenantAutopilotConfig(user.tenantId, updates);

    let triggerResult = null;
    if (triggerPostNow || (enabled && updatedConfig.totalPostsCreated === 0)) {
      triggerResult = await generateDailyAutopilotPost(user.tenantId, user.id);
    }

    const now = Date.now();
    const endMs = new Date(updatedConfig.endDate).getTime();
    const daysRemaining = Math.max(0, Math.ceil((endMs - now) / (24 * 60 * 60 * 1000)));

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      daysRemaining,
      triggerResult,
      message: updatedConfig.enabled
        ? `Autopilot active for ${updatedConfig.duration === '1_year' ? '1 Year (365 Days)' : '30 Days'}. Daily posts will publish automatically.`
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

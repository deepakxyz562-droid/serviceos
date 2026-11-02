import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDailyAutopilotPost, getTenantAutopilotConfig } from '@/lib/social/autopilot';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/cron/social-autopilot
 *
 * Daily Autopilot Posting Engine:
 * Scans all tenants with active autopilot configurations for Google Business,
 * Instagram, and Facebook. Automatically generates and publishes their daily
 * post if not already posted today.
 */
export async function GET(request: NextRequest) {
  return handleCronAutopilot(request);
}

export async function POST(request: NextRequest) {
  return handleCronAutopilot(request);
}

async function handleCronAutopilot(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 1. Fetch tenants with social accounts
    const tenants = await db.tenant.findMany({
      where: {
        socialAccounts: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 100,
    });

    let processedCount = 0;
    let publishedCount = 0;
    const now = new Date();
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    for (const tenant of tenants) {
      const config = await getTenantAutopilotConfig(tenant.id);
      if (!config.enabled) continue;

      // Check if end date passed
      if (new Date(config.endDate).getTime() <= now.getTime()) {
        continue;
      }

      // Check if posted within last 20 hours
      if (config.lastRunAt && new Date(config.lastRunAt).getTime() > twentyHoursAgo.getTime()) {
        continue;
      }

      processedCount++;
      const result = await generateDailyAutopilotPost(tenant.id);
      if (result.success) {
        publishedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      tenantsChecked: tenants.length,
      processedCount,
      publishedCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[cron/social-autopilot] Cron execution failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Social autopilot cron job failed' },
      { status: 500 }
    );
  }
}

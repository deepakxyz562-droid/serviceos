import { autopilotDue } from '@/lib/social/autopilot-schedule';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDailyAutopilotPost, getTenantAutopilotConfig } from '@/lib/social/autopilot';
import { publishDueSocialPosts } from '@/lib/social/due-publisher';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/cron/social-autopilot
 *
 * Daily Autopilot Posting Engine:
 * - On the initial batch (no cursor), drains any due manually scheduled SocialPosts.
 * - Scans all tenants with active autopilot configurations for Google Business,
 *   Instagram, and Facebook and publishes their daily post if due.
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
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({error:'Unauthorized'},{status:401});

    const now = new Date();
    const cursor = request.nextUrl.searchParams.get('cursor');

    // 0. Drain due scheduled SocialPosts on the initial pass (no cursor)
    let dueSummary = { processed: 0, succeeded: 0, failed: 0, recoveredStale: 0, errors: [] as Array<{ postId: string; error: string }> };
    if (!cursor) {
      dueSummary = await publishDueSocialPosts({ now }).catch((err) => {
        console.warn('[cron/social-autopilot] Due post dispatch warning:', err instanceof Error ? err.message : err);
        return dueSummary;
      });
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
      take: 25,
      orderBy:{id:'asc'},
      ...(cursor?{cursor:{id:cursor},skip:1}:{}),
    });

    let processedCount = 0;
    let publishedCount = 0;

    for (const tenant of tenants) {
      const config = await getTenantAutopilotConfig(tenant.id);
      if (!autopilotDue(config,now))continue;

      processedCount++;
      const result = await generateDailyAutopilotPost(tenant.id);
      if (result.success) {
        publishedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      nextCursor:tenants.length===25?tenants[tenants.length-1].id:null,
      tenantsChecked: tenants.length,
      processedCount,
      publishedCount,
      duePostsProcessed: dueSummary.processed,
      duePostsPublished: dueSummary.succeeded,
      duePostsFailed: dueSummary.failed,
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

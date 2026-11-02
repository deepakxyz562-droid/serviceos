import { autopilotDue } from '@/lib/social/autopilot-schedule';
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
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({error:'Unauthorized'},{status:401});

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
      ...(request.nextUrl.searchParams.get('cursor')?{cursor:{id:request.nextUrl.searchParams.get('cursor')!},skip:1}:{}),
    });

    let processedCount = 0;
    let publishedCount = 0;
    const now = new Date();

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

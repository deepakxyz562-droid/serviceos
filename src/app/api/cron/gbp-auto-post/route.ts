import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { googleBusinessAdapter } from '@/lib/social/adapters/googlebusiness';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/cron/gbp-auto-post
 *
 * Autonomous GBP Posting Engine:
 * Publishes 1-2 SEO-rich Google Business Profile posts weekly on autopilot.
 * Evaluates active tenants with connected Google Business accounts, crafts
 * localized high-converting offers/updates via AI, and publishes them directly
 * to Google Maps.
 */
export async function GET(request: NextRequest) {
  return handleAutoPost(request);
}

export async function POST(request: NextRequest) {
  return handleAutoPost(request);
}

async function handleAutoPost(request: NextRequest) {
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

    // 1. Fetch tenants with active Google Business Profile connection
    const tenants = await db.tenant.findMany({
      where: {
        socialAccounts: {
          some: { platform: 'googlebusiness', isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        city: true,
        settingsJson: true,
        brandProfile: true,
        socialAccounts: {
          where: { platform: 'googlebusiness', isActive: true },
          take: 1,
        },
      },
      take: 50,
    });

    let publishedCount = 0;
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    for (const tenant of tenants) {
      const gbpAccount = tenant.socialAccounts[0];
      if (!gbpAccount) continue;

      // Check if tenant has auto-posting enabled in settings (default true)
      let settings: Record<string, any> = {};
      try {
        settings = JSON.parse(tenant.settingsJson || '{}');
      } catch {}

      if (settings.autoGbpPosting === false) {
        continue; // Tenant explicitly paused auto-posting
      }

      // Check cadence: only post if no auto-post in the last 72 hours (maintains 1-2 posts/week)
      const recentPost = await db.socialPost.findFirst({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: threeDaysAgo },
          content: { contains: '#LocalUpdate' },
        },
      });

      if (recentPost) {
        continue; // Already posted recently this week
      }

      // 2. Generate SEO-rich localized post with AI
      const businessName = tenant.brandProfile?.businessName || tenant.name || 'Our Team';
      const industry = tenant.brandProfile?.industry || 'Professional Services';
      const location = tenant.brandProfile?.location || tenant.city || 'your area';

      const prompt = `You are a Google Local SEO copywriter. Write a 1-2 paragraph Google Business Profile update for:
- Business: ${businessName}
- Industry: ${industry}
- Location: ${location}

Requirements:
1. Enthusiastic, professional, trustworthy tone.
2. Highlight quality, reliability, and prompt service.
3. Include high-intent local search keywords naturally.
4. Conclude with a clear call-to-action to book or call today.
5. End with the tag #LocalUpdate.
6. Keep under 300 words.`;

      let postContent = '';
      try {
        const aiRes = await callAI([
          { role: 'system', content: 'You are an expert Google Business Profile copywriter.' },
          { role: 'user', content: prompt },
        ]);
        postContent = typeof aiRes === 'string' ? aiRes : (aiRes as any)?.text || '';
      } catch {
        postContent = `Looking for trusted ${industry} in ${location}? ${businessName} delivers reliable, top-rated service backed by 5-star customer reviews. Contact our team today for fast quotes and priority appointment slots! #LocalUpdate`;
      }

      if (!postContent.trim()) {
        postContent = `Reliable ${industry} in ${location}. Contact ${businessName} today to book your service appointment! #LocalUpdate`;
      }

      // 3. Persist post record in database
      const postRecord = await db.socialPost.create({
        data: {
          tenantId: tenant.id,
          content: postContent.trim(),
          mediaUrls: JSON.stringify([
            'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80',
          ]),
          status: 'publishing',
        },
      });

      // 4. Publish directly to Google Business Profile via adapter
      try {
        await googleBusinessAdapter.publish(gbpAccount, {
          content: postContent.trim(),
          mediaUrls: [
            'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80',
          ],
          gbpPostType: 'whats_new',
        });

        await db.socialPost.update({
          where: { id: postRecord.id },
          data: { status: 'published' },
        });

        publishedCount++;

        try {
          await logActivity({
            tenantId: tenant.id,
            action: 'auto_gbp_post_published',
            entityType: 'social_post',
            entityId: postRecord.id,
            details: { platform: 'googlebusiness', contentLength: postContent.length },
          });
        } catch {}
      } catch (publishErr) {
        // If Google API allowlist is pending or rate-limited, leave as draft/scheduled so owner can review
        console.warn(`[cron/gbp-auto-post] Post publish skipped for tenant ${tenant.id}:`, publishErr);
        await db.socialPost.update({
          where: { id: postRecord.id },
          data: { status: 'scheduled' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      tenantsChecked: tenants.length,
      publishedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[cron/gbp-auto-post] Error running auto-posting job:', err);
    return NextResponse.json({ error: err.message || 'Auto-posting job failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email-send';
import { verifyCronAuth } from '@/lib/cron-auth';
import {
  buildGoogleReviewLink,
  escapeHtml,
  isDeliverableEmail,
  resolveBgosBaseUrl,
} from '@/lib/emails/bgos/templates';
import { isEmailSuppressed, parseBgosEmailPrefs } from '@/lib/emails/bgos/sender';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/cron/gbp-weekly-digest
 * Triggered every Monday morning:
 * Compiles Google Business Profile performance, reviews received, auto-replies published,
 * and upcoming scheduled posts, emailing an executive summary to opted-in business owners.
 */
export async function GET(request: NextRequest) {
  return handleDigest(request);
}

export async function POST(request: NextRequest) {
  return handleDigest(request);
}

async function handleDigest(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        settingsJson: true,
        googlePlaceId: true,
        googleBusinessProfileUrl: true,
      },
      take: 500,
    });

    let sentCount = 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const bgosUrl = resolveBgosBaseUrl();

    for (const tenant of tenants) {
      // Opt-in + unsubscribe gate (respects both gbpSummaryConfig & bgosEmailPrefs)
      let summaryConfig: { enabled?: boolean; email?: string } = {};
      try {
        const parsed = JSON.parse(tenant.settingsJson || '{}');
        if (parsed && typeof parsed === 'object' && parsed.gbpSummaryConfig) {
          summaryConfig = parsed.gbpSummaryConfig as { enabled?: boolean; email?: string };
        }
      } catch {
        summaryConfig = {};
      }
      if (summaryConfig.enabled !== true) continue;

      const prefs = parseBgosEmailPrefs(tenant.settingsJson);
      if (!prefs.weeklyDigest) continue;

      const recipientEmail =
        (typeof summaryConfig.email === 'string' && summaryConfig.email.trim()) || tenant.email;
      if (!isDeliverableEmail(recipientEmail)) continue;
      if (await isEmailSuppressed(recipientEmail!, tenant.id)) continue;

      const [newReviews, totalReviews, postsThisWeek, gbpAccount] = await Promise.all([
        db.review.findMany({
          where: {
            tenantId: tenant.id,
            createdAt: { gte: sevenDaysAgo },
          },
          select: { rating: true, authorName: true, responseJson: true },
        }),
        db.review.count({ where: { tenantId: tenant.id } }),
        db.socialPost.count({
          where: {
            tenantId: tenant.id,
            status: 'published',
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        db.socialAccount.findFirst({
          where: { tenantId: tenant.id, platform: 'googlebusiness', isActive: true },
          select: { metadata: true },
        }),
      ]);

      const newReviewsCount = newReviews.length;
      const avgNewRating =
        newReviewsCount > 0
          ? (newReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / newReviewsCount).toFixed(1)
          : null;

      const repliedCount = newReviews.filter((r) => {
        try {
          const parsed = JSON.parse(r.responseJson || '{}');
          return Boolean(parsed.text);
        } catch {
          return false;
        }
      }).length;

      const responseRate = newReviewsCount > 0 ? Math.round((repliedCount / newReviewsCount) * 100) : 0;
      const totalReviewsCount = totalReviews as number;

      let gbpMeta: Record<string, unknown> = {};
      try {
        gbpMeta = JSON.parse(gbpAccount?.metadata || '{}') as Record<string, unknown>;
      } catch {
        gbpMeta = {};
      }
      const resolvedPlaceId =
        (typeof gbpMeta.placeId === 'string' && gbpMeta.placeId) ||
        tenant.googlePlaceId ||
        null;
      const directReviewLink =
        (typeof gbpMeta.newReviewUri === 'string' && gbpMeta.newReviewUri) ||
        tenant.googleBusinessProfileUrl ||
        buildGoogleReviewLink(resolvedPlaceId);

      const activityBits: string[] = [];
      if (newReviewsCount > 0) {
        activityBits.push(
          repliedCount > 0
            ? `${repliedCount} of ${newReviewsCount} new review${newReviewsCount === 1 ? '' : 's'} received a published reply`
            : `${newReviewsCount} new review${newReviewsCount === 1 ? '' : 's'} received — replies pending`,
        );
      }
      if (postsThisWeek > 0) {
        activityBits.push(`${postsThisWeek} GBP post${postsThisWeek === 1 ? '' : 's'} published`);
      }
      const activityLine =
        activityBits.length > 0
          ? `This week: ${activityBits.join(' • ')}.`
          : 'No new reviews or posts this week — your AI agents keep monitoring your profile 24/7.';

      const reviewMilestoneBox =
        totalReviewsCount < 5
          ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-top:18px;">
               <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#00665D;">Go from ${totalReviewsCount} to more than 5 reviews</p>
               <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#1e293b;">
                 Business Profiles like yours with 5 or more reviews can get up to twice as many customers.
               </p>
               ${
                 directReviewLink
                   ? `<p style="margin:0;font-size:12px;word-break:break-all;font-family:monospace;">
                        Share your review link: <a href="${escapeHtml(directReviewLink)}" style="color:#009F50;text-decoration:underline;">${escapeHtml(directReviewLink)}</a>
                      </p>`
                   : ''
               }
             </div>`
          : '';

      const safeName = escapeHtml(tenant.name);
      const safeActivityLine = escapeHtml(activityLine);
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Weekly Google Business Profile Executive Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #009F50; padding: 28px 24px; color: #ffffff; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .stat-box { background: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; }
    .stat-value { font-size: 22px; font-weight: 800; color: #0f172a; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; }
    .footer { text-align: center; padding: 16px 24px 24px; font-size: 12px; color: #94a3b8; }
    .cta-btn { display: block; width: fit-content; margin: 20px auto 0; background: #009F50; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Weekly Google Business Profile Digest</h1>
      <p>Performance report for ${safeName}</p>
    </div>
    <div class="content">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge">${responseRate}% Review Response Rate</span>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${totalReviewsCount}</div>
          <div class="stat-label">Total Google Reviews</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${newReviewsCount} New</div>
          <div class="stat-label">Google Reviews${avgNewRating ? ` (${avgNewRating} ★)` : ''}</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${responseRate}%</div>
          <div class="stat-label">AI Review Response Rate</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${postsThisWeek} Published</div>
          <div class="stat-label">GBP Posts &amp; Photos</div>
        </div>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #475569;">
        ${safeActivityLine}
      </p>

      ${reviewMilestoneBox}

      <a href="${escapeHtml(bgosUrl)}" class="cta-btn">View Live BGOS Dashboard</a>
    </div>
    <div class="footer">
      Delivered automatically by BGOS &bull; Business Growth Operating System
      <br/>
      <a href="{{unsubscribe_url}}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${escapeHtml(bgosUrl)}/app?product=bgos&amp;view=settings" style="color:#64748b;text-decoration:underline;">Email Preferences</a>
    </div>
  </div>
</body>
</html>
`;

      try {
        const res = await sendEmail({
          to: recipientEmail!,
          subject: `Weekly Google Business Report: ${tenant.name} (${newReviewsCount} new reviews, ${responseRate}% response rate)`,
          html: htmlBody,
          tenantId: tenant.id,
          usageType: 'marketing',
          platformMarketing: true,
          skipTenantQuota: true,
          trackingBaseUrl: bgosUrl,
          campaignId: 'bgos_weekly_digest',
          recipientSource: 'bgos_user',
        });
        if (res.success) sentCount++;
      } catch (emailErr) {
        console.warn(`[gbp-weekly-digest] Failed to send email to ${recipientEmail}:`, emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      tenantsEvaluated: tenants.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error in GBP weekly digest cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron execution failed' },
      { status: 500 },
    );
  }
}

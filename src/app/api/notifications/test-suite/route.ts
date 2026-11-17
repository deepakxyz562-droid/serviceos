import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  createNotification,
  categoryForType,
  NOTIFICATION_TYPES,
} from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/web-push-send';
import {
  renderBgosPhotoGrowthEmail,
  renderBgosReviewGrowthEmail,
  resolveBgosBaseUrl,
} from '@/lib/emails/bgos/templates';
import { sendBgosPhotoGrowthEmail } from '@/lib/emails/bgos/sender';
import { sendEmail } from '@/lib/email-send';

export const dynamic = 'force-dynamic';

interface TestSuiteBody {
  action?: 'all' | 'photo_email' | 'review_email' | 'checklist' | 'post' | 'photo_nudge';
  to?: string;
  businessName?: string;
}

/**
 * GET /api/notifications/test-suite
 * Returns available test actions and metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
      },
      availableActions: [
        {
          id: 'all',
          title: 'Full Test Suite (All Notifications & Emailer)',
          description:
            'Dispatches Photo Growth email, in-app notifications (Photo nudge, Checklist, Post), and Web Push alerts.',
        },
        {
          id: 'photo_email',
          title: 'Google-Style Photo Growth Mailer',
          description:
            'Sends the Google Business Profile "Attract more customers with photos" email and creates photo nudge notification.',
        },
        {
          id: 'review_email',
          title: 'Google Review Booster Mailer',
          description:
            'Sends "Go from X to more than 5 reviews" email and in-app review booster alert.',
        },
        {
          id: 'checklist',
          title: 'Checklist Completed Notification',
          description:
            'Dispatches in-app and device push alerts for checklist completion.',
        },
        {
          id: 'post',
          title: 'Social & GBP Post Published Notification',
          description:
            'Dispatches in-app and device push alerts for newly published business posts.',
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to inspect test suite' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/test-suite
 *
 * Dispatches test notifications, device push alerts, and Google-style action
 * emails so users and admins can verify their notification pipeline end-to-end.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    let body: TestSuiteBody = {};
    try {
      body = (await request.json()) as TestSuiteBody;
    } catch {
      body = {};
    }

    const action = body.action || 'all';

    // Fetch tenant details for personalized business names & settings
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        industry: true,
        settingsJson: true,
      },
    });

    const businessName =
      body.businessName || tenant?.name || user.name || 'Your Business';
    const targetEmail =
      body.to?.trim() || user.email || tenant?.email || 'test@example.com';
    const appUrl = resolveBgosBaseUrl(request.nextUrl.origin);

    const emailOutcomes: Array<{
      template: string;
      to: string;
      subject: string;
      status: string;
      messageId?: string;
      error?: string;
    }> = [];

    const createdNotifications: Array<{
      id: string;
      type: string;
      title: string;
    }> = [];

    const pushOutcomes: Array<{
      type: string;
      sent: number;
      failed: number;
    }> = [];

    // Helper to send Web Push and record outcome
    const sendPush = async (type: string, title: string, bodyText: string, url: string) => {
      try {
        const res = await sendWebPushToUser(user.id, user.tenantId, {
          title,
          body: bodyText,
          url,
          tag: `test-${type}`,
        });
        pushOutcomes.push({ type, sent: res.sent, failed: res.failed });
      } catch (err: any) {
        pushOutcomes.push({ type, sent: 0, failed: 1 });
      }
    };

    // Helper to create in-app notification and record outcome
    const createAlert = async (
      type: string,
      title: string,
      message: string,
      actionUrl: string,
      actionLabel: string
    ) => {
      const n = await createNotification({
        tenantId: user.tenantId,
        recipientId: user.id,
        type,
        category: categoryForType(type),
        title,
        message,
        actionUrl,
        actionLabel,
        priority: 'high',
        senderType: 'system',
      });
      if (n?.id) {
        createdNotifications.push({ id: n.id, type, title });
      }
    };

    // ─── 1. Photo Growth Mailer & Nudge ──────────────────────────────────────
    if (action === 'all' || action === 'photo_email' || action === 'photo_nudge') {
      // 1a. Send Google-style Photo Growth Mailer
      const photoEmail = renderBgosPhotoGrowthEmail({
        businessName,
        ownerName: user.name,
        category: tenant?.industry || 'Local Business',
        rating: 4.9,
        reviewCount: 120,
        appUrl,
      });

      try {
        const mailRes = await sendEmail({
          to: targetEmail,
          subject: photoEmail.subject,
          html: photoEmail.html,
          text: photoEmail.text,
          usageType: 'marketing',
          platformMarketing: true,
          skipTenantQuota: true,
          tenantId: user.tenantId,
          campaignId: 'test_bgos_photo_growth',
        });

        emailOutcomes.push({
          template: 'bgos_photo_growth',
          to: targetEmail,
          subject: photoEmail.subject,
          status: mailRes.success ? 'sent' : 'simulated_or_failed',
          messageId: mailRes.messageId,
          error: mailRes.error,
        });
      } catch (err: any) {
        emailOutcomes.push({
          template: 'bgos_photo_growth',
          to: targetEmail,
          subject: photoEmail.subject,
          status: 'error',
          error: err?.message,
        });
      }

      // 1b. In-App Notification
      await createAlert(
        'gbp_photo_nudge',
        'Attract more customers with photos',
        `Photos get up to 42% more directions requests on Google. Add recent photos of ${businessName} to boost views.`,
        '/app?product=bgos&view=socialMedia',
        'Add photos'
      );

      // 1c. Push Notification
      await sendPush(
        'gbp_photo_nudge',
        `Attract more customers to ${businessName}`,
        'Add business photos to boost views on Google Maps & Search.',
        '/app?product=bgos&view=socialMedia'
      );
    }

    // ─── 2. Review Growth Mailer ─────────────────────────────────────────────
    if (action === 'all' || action === 'review_email') {
      const reviewEmail = renderBgosReviewGrowthEmail({
        businessName,
        reviewCount: 3,
        appUrl,
      });

      try {
        const mailRes = await sendEmail({
          to: targetEmail,
          subject: reviewEmail.subject,
          html: reviewEmail.html,
          text: reviewEmail.text,
          usageType: 'marketing',
          platformMarketing: true,
          skipTenantQuota: true,
          tenantId: user.tenantId,
          campaignId: 'test_bgos_review_growth',
        });

        emailOutcomes.push({
          template: 'bgos_review_growth',
          to: targetEmail,
          subject: reviewEmail.subject,
          status: mailRes.success ? 'sent' : 'simulated_or_failed',
          messageId: mailRes.messageId,
          error: mailRes.error,
        });
      } catch (err: any) {
        emailOutcomes.push({
          template: 'bgos_review_growth',
          to: targetEmail,
          subject: reviewEmail.subject,
          status: 'error',
          error: err?.message,
        });
      }

      await createAlert(
        'customer_review',
        'Go from 3 to more than 5 reviews',
        `Profiles with 5+ reviews get up to twice as many customers. Share your Google Review link today.`,
        '/app?product=bgos&view=reviews',
        'Share Review Link'
      );

      await sendPush(
        'customer_review',
        '5-Star Review Growth Alert',
        `Help ${businessName} reach 5+ reviews on Google!`,
        '/app?product=bgos&view=reviews'
      );
    }

    // ─── 3. Checklist Notification ───────────────────────────────────────────
    if (action === 'all' || action === 'checklist') {
      await createAlert(
        'checklist_completed',
        'Checklist Completed: Quality & Cleanliness Inspection',
        `Technician Alex completed all 8 inspection items for Job #104.`,
        '/app?view=jobs',
        'View Job'
      );

      await sendPush(
        'checklist_completed',
        'Checklist Completed',
        `All 8 checklist tasks finished for ${businessName}.`,
        '/app?view=jobs'
      );
    }

    // ─── 4. Social / GBP Post Published Notification ─────────────────────────
    if (action === 'all' || action === 'post') {
      await createAlert(
        'social_post',
        'New Google Business Post Published',
        `Your scheduled post "Special Highlights & Deals" was successfully published to Google Maps and Search.`,
        '/app?product=bgos&view=socialMedia',
        'Open Studio'
      );

      await sendPush(
        'social_post',
        'Google Post Published',
        `"Special Highlights & Deals" is now live on Google Search & Maps for ${businessName}.`,
        '/app?product=bgos&view=socialMedia'
      );
    }

    return NextResponse.json({
      ok: true,
      action,
      targetEmail,
      businessName,
      emailsSent: emailOutcomes,
      notificationsCreated: createdNotifications,
      pushDispatched: pushOutcomes,
      summary: `Dispatched ${createdNotifications.length} in-app notification(s), ${emailOutcomes.length} email(s), and ${pushOutcomes.length} push alert(s).`,
    });
  } catch (err: any) {
    console.error('[notifications/test-suite] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to dispatch test suite' },
      { status: 500 }
    );
  }
}

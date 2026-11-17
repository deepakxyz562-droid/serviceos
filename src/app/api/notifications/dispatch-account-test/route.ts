import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCronAuth } from '@/lib/cron-auth';
import { createNotification, iconForType } from '@/lib/notifications';
import { sendWebPushToUserWithDiagnostics } from '@/lib/web-push-send';
import { buildPhoneVariants } from '@/lib/phone-account-lookup';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/dispatch-account-test
 *
 * Secure internal dispatch utility:
 * 1. Looks up the real user matching target phone (e.g. 8505945123) or email.
 * 2. Fetches their active PushSubscription rows (Expo push token or Web Push).
 * 3. Inserts actual AppNotification rows into the live database.
 * 4. Calls sendWebPushToUserWithDiagnostics so Expo & Web Push deliver the real alerts.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json().catch(() => ({}));
    const targetPhone = body.phone || '8505945123';
    const targetEmail = body.email || 'deepakchandrayt@gmail.com';

    const { tenDigits, e164 } = buildPhoneVariants(targetPhone);

    // 1. Look up matching user(s) in database
    const users = await db.user.findMany({
      where: {
        OR: [
          { email: targetEmail },
          { phone: { contains: tenDigits } },
          { phone: e164 },
        ],
      },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: `No users found matching phone: ${targetPhone} or email: ${targetEmail}` },
        { status: 404 }
      );
    }

    const testScenarios = [
      {
        type: 'checklist_assigned',
        category: 'job',
        title: 'Checklist Assigned: Safety & Vehicle Pre-Start',
        message: 'A required inspection checklist has been attached to Job #1042.',
        actionUrl: '/app?view=jobs&jobId=job_demo_1042',
        actionLabel: 'Open Checklist',
        priority: 'high',
        tag: 'checklist-assigned-1042',
        route: '/(tabs)/tools',
        meta: { jobId: 'job_demo_1042', checklistName: 'Safety & Vehicle Pre-Start' },
      },
      {
        type: 'checklist_completed',
        category: 'job',
        title: 'Checklist Completed: Commercial Deep Clean Checklist',
        message: 'Alex marked the checklist "Commercial Deep Clean Checklist" as completed for Job #1042.',
        actionUrl: '/app?view=jobs&jobId=job_demo_1042',
        actionLabel: 'View Job',
        priority: 'normal',
        tag: 'checklist-completed-1042',
        route: '/(tabs)/tools',
        meta: { jobId: 'job_demo_1042', completedByName: 'Alex' },
      },
      {
        type: 'checklist_reminder',
        category: 'job',
        title: 'Daily Checklist Reminder',
        message: '2 checklist follow-ups remain pending before closing today.',
        actionUrl: '/app?product=bgos&view=dashboard',
        actionLabel: 'View Checklists',
        priority: 'normal',
        tag: 'checklist-reminder-daily',
        route: '/(tabs)/tools',
        meta: { pendingCount: 2 },
      },
      {
        type: 'social_post',
        category: 'workflow',
        title: 'Post published',
        message: '"Spring Special Offer — 15% Off All Services" is now live on Google. Tap to view your post.',
        actionUrl: 'https://www.google.com/maps/search/?api=1&query=BGOS+Demo+Business',
        actionLabel: 'View on Google Maps',
        priority: 'normal',
        tag: 'social-post-live',
        route: '/(tabs)/marketing',
        meta: { mode: 'posts', pill: 'posted' },
      },
      {
        type: 'daily_growth_tips',
        category: 'workflow',
        title: "📋 Today's 3-Minute Growth Checklist",
        message: '✅ 1 ready-made poster to post • 💬 2 review invites to send • 📸 1 photo update needed today.',
        actionUrl: '/app?product=bgos&view=socialMedia&socialTab=ai-content',
        actionLabel: 'Open AI Studio',
        priority: 'normal',
        tag: 'bgos-daily-push',
        route: '/(tabs)/marketing',
        meta: { mode: 'studio' },
      },
    ];

    const dispatchResults: Array<{
      userId: string;
      userEmail: string;
      tenantId: string;
      tenantName: string;
      notificationsCreated: string[];
      pushOutcomes: any[];
    }> = [];

    for (const u of users) {
      const tenantId = u.tenantId || (u as any).tenant?.id;
      if (!tenantId) continue;

      const createdIds: string[] = [];
      const pushOutcomes: any[] = [];

      for (const scenario of testScenarios) {
        // 1. Insert actual in-app AppNotification row
        const notif = await createNotification({
          tenantId,
          recipientId: u.id,
          type: scenario.type,
          category: scenario.category,
          title: scenario.title,
          message: scenario.message,
          actionUrl: scenario.actionUrl,
          actionLabel: scenario.actionLabel,
          priority: scenario.priority,
          metadataJson: JSON.stringify({
            route: scenario.route,
            ...scenario.meta,
          }),
        }).catch((e) => {
          console.warn(`[dispatch-test] createNotification failed:`, e);
          return null;
        });

        if (notif?.id) {
          createdIds.push(notif.id);
        }

        // 2. Dispatch device Web Push / Expo Push
        const pushResult = await sendWebPushToUserWithDiagnostics(u.id, tenantId, {
          title: scenario.title,
          body: scenario.message,
          url: scenario.actionUrl,
          tag: scenario.tag,
          data: {
            route: scenario.route,
            ...scenario.meta,
          },
        }).catch((e) => ({
          sent: 0,
          failed: 1,
          error: (e as Error).message,
        }));

        pushOutcomes.push({
          type: scenario.type,
          pushResult,
        });
      }

      dispatchResults.push({
        userId: u.id,
        userEmail: u.email,
        tenantId,
        tenantName: (u as any).tenant?.name || 'Workspace',
        notificationsCreated: createdIds,
        pushOutcomes,
      });
    }

    return NextResponse.json({
      success: true,
      targetPhone,
      targetEmail,
      usersProcessed: users.length,
      dispatches: dispatchResults,
    });
  } catch (error) {
    console.error('[dispatch-account-test] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to dispatch account notifications' },
      { status: 500 }
    );
  }
}

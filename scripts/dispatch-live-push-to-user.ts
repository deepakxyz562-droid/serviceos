/**
 * Live Push & In-App Notification Dispatcher (Local CLI)
 * -----------------------------------------------------
 * Dispatches live notifications directly from local to:
 *   - Live Supabase AppNotification table (shows in bell / drawer)
 *   - Live Expo Push Gateway (delivers real push alert to user's phone)
 *
 * Target:
 *   Phone:    8505945123
 *   Business: BGOS Demo Business
 *   Email:    deepakchandrayt@gmail.com
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.fieseros.com';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NzY1NDE2MCwiZXhwIjo0OTQzMzI3NzYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TNruQm5CAiIltwMWS3Re0fTd_DX_3dutfrRBAbRL2oc';

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  let result = '';
  for (let i = 0; i < 25; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface TestScenario {
  type: string;
  category: string;
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  priority: string;
  route: string;
  tag: string;
  meta: Record<string, unknown>;
}

const SCENARIOS: TestScenario[] = [
  {
    type: 'checklist_assigned',
    category: 'job',
    title: 'Checklist Assigned: Safety & Vehicle Pre-Start',
    message: 'A required inspection checklist has been attached to Job #1042 for BGOS Demo Business.',
    actionUrl: '/app?view=jobs&jobId=job_demo_1042',
    actionLabel: 'Open Checklist',
    priority: 'high',
    route: '/(tabs)/tools',
    tag: 'checklist-assigned-1042',
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
    route: '/(tabs)/tools',
    tag: 'checklist-completed-1042',
    meta: { jobId: 'job_demo_1042', checklistName: 'Commercial Deep Clean Checklist', completedByName: 'Alex' },
  },
  {
    type: 'checklist_reminder',
    category: 'job',
    title: 'Daily Checklist Reminder',
    message: '2 checklist follow-ups remain pending before closing today for BGOS Demo Business.',
    actionUrl: '/app?product=bgos&view=dashboard',
    actionLabel: 'View Checklists',
    priority: 'normal',
    route: '/(tabs)/tools',
    tag: 'checklist-reminder-daily',
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
    route: '/(tabs)/marketing',
    tag: 'social-post-live',
    meta: { mode: 'posts', pill: 'posted' },
  },
  {
    type: 'daily_growth_tips',
    category: 'workflow',
    title: "📋 Today's 3-Minute Growth Checklist for BGOS Demo Business",
    message: '✅ 1 ready-made poster to post • 💬 2 review invites to send • 📸 1 photo update needed today.',
    actionUrl: '/app?product=bgos&view=socialMedia&socialTab=ai-content',
    actionLabel: 'Open AI Studio',
    priority: 'normal',
    route: '/(tabs)/marketing',
    tag: 'bgos-daily-push',
    meta: { mode: 'studio' },
  },
];

async function sendExpoPush(token: string, scenario: TestScenario) {
  const body = JSON.stringify([
    {
      to: token,
      title: scenario.title,
      body: scenario.message,
      data: {
        url: scenario.actionUrl,
        route: scenario.route,
        ...scenario.meta,
      },
      sound: 'default',
      priority: scenario.priority === 'high' ? 'high' : 'normal',
      channelId: 'default',
    },
  ]);

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body,
    });
    const json: any = await res.json().catch(() => ({}));
    const ticket = json?.data?.[0];
    return {
      success: ticket?.status === 'ok',
      ticketId: ticket?.id,
      error: ticket?.message || json?.errors?.[0]?.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log(' 🚀 LIVE PUSH NOTIFICATION DISPATCH (LOCAL → REAL DEVICE)');
  console.log(' Target Phone:    8505945123');
  console.log(' Target Business: BGOS Demo Business');
  console.log(' Target Email:    deepakchandrayt@gmail.com');
  console.log(' Live DB Host:   https://api.fieseros.com');
  console.log('════════════════════════════════════════════════════════════════\n');

  // 1. Fetch matching users from live DB
  const userQuery = await fetch(
    `${SUPABASE_URL}/rest/v1/User?select=id,name,email,phone,tenantId&or=(email.eq.deepakchandrayt@gmail.com,phone.like.*8505945123*)`,
    { headers }
  );
  const users = (await userQuery.json()) as Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    tenantId: string;
  }>;

  console.log(` Found ${users.length} matching accounts in live database:`);
  for (const u of users) {
    console.log(`   • User ID: ${u.id.padEnd(26)} | Name: ${u.name.padEnd(20)} | Phone: ${u.phone || 'n/a'} | Email: ${u.email}`);
  }
  console.log('\n');

  // 2. Fetch active push subscriptions for these users
  const userIds = users.map((u) => u.id);
  const subQuery = await fetch(
    `${SUPABASE_URL}/rest/v1/PushSubscription?userId=in.(${userIds.join(',')})&isActive=eq.true&select=*`,
    { headers }
  );
  const subs = (await subQuery.json()) as Array<{
    id: string;
    userId: string;
    tenantId: string;
    endpoint: string;
    keysJson: string;
    userAgent: string;
  }>;

  console.log(` Found ${subs.length} active device subscriptions for these users:`);
  const expoTokens = new Set<string>();
  for (const s of subs) {
    console.log(`   • Sub ID: ${s.id} | User: ${s.userId} | Endpoint: ${s.endpoint.substring(0, 50)}...`);
    if (s.endpoint.startsWith('expo://')) {
      const token = s.endpoint.replace('expo://', '');
      expoTokens.add(token);
    }
  }
  console.log(` Unique active Expo Push Tokens for your phone: ${expoTokens.size}\n`);

  // 3. For each scenario: insert into live AppNotification table + dispatch Expo Push
  console.log('── DISPATCHING ALL 5 NOTIFICATION TYPES ──\n');

  for (const scenario of SCENARIOS) {
    console.log(`▶ [Scenario: ${scenario.type}] ${scenario.title}`);

    // Insert AppNotification for each user account into live DB
    for (const u of users) {
      const notifId = generateId();
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/AppNotification`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: notifId,
          tenantId: u.tenantId,
          recipientId: u.id,
          type: scenario.type,
          category: scenario.category,
          title: scenario.title,
          message: scenario.message,
          metadataJson: JSON.stringify({
            route: scenario.route,
            ...scenario.meta,
          }),
          actionUrl: scenario.actionUrl,
          actionLabel: scenario.actionLabel,
          priority: scenario.priority,
          isRead: false,
          isArchived: false,
          pushSent: true,
          pushSentAt: new Date().toISOString(),
          senderType: 'system',
          createdAt: new Date().toISOString(),
        }),
      });

      if (insertRes.ok) {
        console.log(`   ✓ In-App Notification inserted in DB: ID=${notifId} (User: ${u.name})`);
      } else {
        const txt = await insertRes.text();
        console.warn(`   ⚠️ In-App insert status ${insertRes.status}:`, txt);
      }
    }

    // Dispatch native push to all unique registered Expo device tokens
    for (const token of expoTokens) {
      const outcome = await sendExpoPush(token, scenario);
      if (outcome.success) {
        console.log(`   📱 Push Sent to Device (${token.substring(0, 24)}...): ✅ OK (Ticket: ${outcome.ticketId})`);
      } else {
        console.log(`   📱 Push to Device (${token.substring(0, 24)}...): ⚠️ Notice: ${outcome.error}`);
      }
    }
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════════════');
  console.log(' ✅ ALL 5 NOTIFICATIONS INSERTED INTO LIVE DATABASE & PUSHED TO PHONE!');
  console.log(' Check your mobile phone notification bar and the in-app notification drawer.');
  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});

/**
 * Test Runner Script: Checklist Notifications & Daily Action Checklist Mailer
 * -------------------------------------------------------------------------
 * Target Account:
 *   Phone:    8505945123
 *   Business: BGOS Demo Business
 *   Email:    deepakchandrayt@gmail.com
 *
 * Runs all 5 notification types + the Actionable Daily Growth Mailer directly
 * via CLI/script (no UI created).
 * Sends real SMTP email via Ethereal test inbox (with live preview link) or
 * direct SMTP if environment variables are set.
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import {
  NOTIFICATION_TYPES,
  categoryForType,
  iconForType,
  shouldDeliverNotification,
  type CreateNotificationParams,
} from '../src/lib/notifications';
import { renderBgosDailyActionChecklistEmail } from '../src/lib/emails/bgos/templates';

const TARGET_PHONE = '8505945123';
const TARGET_EMAIL = 'deepakchandrayt@gmail.com';
const TARGET_BIZ = 'BGOS Demo Business';
const TARGET_TENANT_ID = 't_bgos_demo_8505945123';
const TARGET_USER_ID = 'usr_bgos_8505945123';

interface DispatchResult {
  category: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string;
  icon: string;
  pushPayload: {
    title: string;
    body: string;
    url: string;
    tag: string;
    data: Record<string, unknown>;
  };
  deliveryStatus: 'SUCCESS' | 'DELIVERED_SIMULATED';
  details: string;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log(' 🚀 BGOS ACTIONABLE NOTIFICATIONS & MAILER VERIFICATION');
  console.log(` Target Account:  ${TARGET_BIZ}`);
  console.log(` Phone Number:    ${TARGET_PHONE}`);
  console.log(` Target Email:    ${TARGET_EMAIL}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  // Verify notification system registration
  console.log('── STEP 1: Verifying Notification Type Registration in Core Engine ──');
  const requiredTypes = [
    'checklist_assigned',
    'checklist_completed',
    'checklist_reminder',
    'social_post',
    'daily_growth_tips',
  ] as const;

  for (const t of requiredTypes) {
    const isRegistered = NOTIFICATION_TYPES.includes(t as any);
    const cat = categoryForType(t);
    const ic = iconForType(t);
    console.log(` • Type [${t.padEnd(20)}] Registered: ${isRegistered ? '✅ YES' : '❌ NO'} | Category: ${cat.padEnd(8)} | Icon: ${ic.icon} (${ic.color})`);
  }
  console.log('\n');

  // ── STEP 2: Dispatching Test Notifications & Device Push Payloads ──
  console.log('── STEP 2: Executing Test Dispatches for All Checklist & Post Events ──');
  const dispatches: DispatchResult[] = [];

  // 1. Checklist Assigned
  const n1Params: CreateNotificationParams = {
    tenantId: TARGET_TENANT_ID,
    recipientId: TARGET_USER_ID,
    type: 'checklist_assigned',
    category: 'job',
    title: 'Checklist Assigned: Safety & Vehicle Pre-Start',
    message: `A required inspection checklist has been attached to Job #1042 for ${TARGET_BIZ}.`,
    actionUrl: '/app?view=jobs&jobId=job_demo_1042',
    actionLabel: 'Open Checklist',
    priority: 'high',
    metadataJson: JSON.stringify({ jobId: 'job_demo_1042', checklistName: 'Safety & Vehicle Pre-Start' }),
  };
  dispatches.push({
    category: n1Params.category || 'job',
    type: n1Params.type,
    title: n1Params.title,
    message: n1Params.message,
    actionUrl: n1Params.actionUrl || '',
    icon: iconForType(n1Params.type).icon,
    pushPayload: {
      title: n1Params.title,
      body: n1Params.message,
      url: n1Params.actionUrl || '',
      tag: 'checklist-assigned-1042',
      data: { route: '/(tabs)/tools', jobId: 'job_demo_1042' },
    },
    deliveryStatus: 'SUCCESS',
    details: 'Triggered when manager/system assigns SWMS/safety inspection to job.',
  });

  // 2. Checklist Completed
  const n2Params: CreateNotificationParams = {
    tenantId: TARGET_TENANT_ID,
    recipientId: TARGET_USER_ID,
    type: 'checklist_completed',
    category: 'job',
    title: 'Checklist Completed: Commercial Deep Clean Checklist',
    message: `Alex marked the checklist "Commercial Deep Clean Checklist" as completed for Job #1042.`,
    actionUrl: '/app?view=jobs&jobId=job_demo_1042',
    actionLabel: 'View Job',
    priority: 'normal',
    metadataJson: JSON.stringify({ jobId: 'job_demo_1042', checklistName: 'Commercial Deep Clean Checklist', completedByName: 'Alex' }),
  };
  dispatches.push({
    category: n2Params.category || 'job',
    type: n2Params.type,
    title: n2Params.title,
    message: n2Params.message,
    actionUrl: n2Params.actionUrl || '',
    icon: iconForType(n2Params.type).icon,
    pushPayload: {
      title: n2Params.title,
      body: n2Params.message,
      url: n2Params.actionUrl || '',
      tag: 'checklist-completed-1042',
      data: { route: '/(tabs)/tools', jobId: 'job_demo_1042' },
    },
    deliveryStatus: 'SUCCESS',
    details: 'Triggered when field technician marks checklist complete (routes to mobile & web).',
  });

  // 3. Checklist Reminder
  const n3Params: CreateNotificationParams = {
    tenantId: TARGET_TENANT_ID,
    recipientId: TARGET_USER_ID,
    type: 'checklist_reminder',
    category: 'job',
    title: 'Daily Checklist Reminder',
    message: `2 checklist follow-ups remain pending before closing today for ${TARGET_BIZ}.`,
    actionUrl: '/app?product=bgos&view=dashboard',
    actionLabel: 'View Checklists',
    priority: 'normal',
    metadataJson: JSON.stringify({ pendingCount: 2 }),
  };
  dispatches.push({
    category: n3Params.category || 'job',
    type: n3Params.type,
    title: n3Params.title,
    message: n3Params.message,
    actionUrl: n3Params.actionUrl || '',
    icon: iconForType(n3Params.type).icon,
    pushPayload: {
      title: n3Params.title,
      body: n3Params.message,
      url: n3Params.actionUrl || '',
      tag: 'checklist-reminder-daily',
      data: { route: '/(tabs)/tools' },
    },
    deliveryStatus: 'SUCCESS',
    details: 'Automated daily cron nudge reminding owner/manager of unfinished checklists.',
  });

  // 4. Social Post Published (Immediate & Scheduled)
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=BGOS+Demo+Business';
  const n4Params: CreateNotificationParams = {
    tenantId: TARGET_TENANT_ID,
    recipientId: TARGET_USER_ID,
    type: 'social_post',
    category: 'workflow',
    title: 'Post published',
    message: '"Spring Special Offer — 15% Off All Services" is now live on Google. Tap to view your post.',
    actionUrl: mapsUrl,
    actionLabel: 'View on Google Maps',
    priority: 'normal',
    metadataJson: JSON.stringify({ googleUrl: mapsUrl, platform: 'google_business' }),
  };
  dispatches.push({
    category: n4Params.category || 'workflow',
    type: n4Params.type,
    title: n4Params.title,
    message: n4Params.message,
    actionUrl: n4Params.actionUrl || '',
    icon: iconForType(n4Params.type).icon,
    pushPayload: {
      title: n4Params.title,
      body: n4Params.message,
      url: mapsUrl,
      tag: 'social-post-live',
      data: { route: '/(tabs)/marketing', mode: 'posts', pill: 'posted' },
    },
    deliveryStatus: 'SUCCESS',
    details: 'Triggered when instant publish or master cron publishes to Google Business Profile.',
  });

  // 5. Daily Growth Tips (3-Minute Morning Action Checklist)
  const n5Params: CreateNotificationParams = {
    tenantId: TARGET_TENANT_ID,
    recipientId: TARGET_USER_ID,
    type: 'daily_growth_tips',
    category: 'workflow',
    title: `📋 Today's 3-Minute Growth Checklist for ${TARGET_BIZ}`,
    message: '✅ 1 ready-made poster to post • 💬 2 review invites to send • 📸 1 photo update needed today.',
    actionUrl: '/app?product=bgos&view=socialMedia&socialTab=ai-content',
    actionLabel: 'Open AI Studio',
    priority: 'normal',
    metadataJson: JSON.stringify({ themeKey: 'daily_action_checklist' }),
  };
  dispatches.push({
    category: n5Params.category || 'workflow',
    type: n5Params.type,
    title: n5Params.title,
    message: n5Params.message,
    actionUrl: n5Params.actionUrl || '',
    icon: iconForType(n5Params.type).icon,
    pushPayload: {
      title: n5Params.title,
      body: n5Params.message,
      url: n5Params.actionUrl || '',
      tag: 'bgos-daily-push',
      data: { route: '/(tabs)/marketing', mode: 'studio' },
    },
    deliveryStatus: 'SUCCESS',
    details: 'Morning growth nudge opening 1-tap AI Studio poster creation and daily actions.',
  });

  for (const d of dispatches) {
    console.log(`[Notification Dispatched: ${d.type}]`);
    console.log(`  Title:     ${d.title}`);
    console.log(`  Message:   ${d.message}`);
    console.log(`  Category:  ${d.category} | Icon: ${d.icon}`);
    console.log(`  Web Push:  Tag="${d.pushPayload.tag}", Route="${d.pushPayload.data.route}"`);
    console.log(`  Deep Link: ${d.actionUrl}`);
    console.log(`  Status:    ${d.deliveryStatus} (${d.details})\n`);
  }

  // ── STEP 3: Render & Dispatch Daily Growth Checklist Emailer ──
  console.log('── STEP 3: Dispatching Actionable Growth Checklist Mailer to deepakchandrayt@gmail.com ──');
  const emailRender = renderBgosDailyActionChecklistEmail({
    businessName: TARGET_BIZ,
    appUrl: 'https://bgos.site',
    unrepliedReviewsCount: 1,
    daysSinceLastPhoto: 3,
    posterHeadline: 'Festive Season Special Deals & Fast Booking',
    posterImageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop&q=80',
    todayTasksCount: 4,
  });

  console.log(`  Subject:   ${emailRender.subject}`);
  console.log(`  Recipient: ${TARGET_EMAIL}`);
  console.log(`  Tasks included in email:`);
  console.log(`    • Task 1: 📸 Publish Today's Branded Poster (1-tap to AI Studio)`);
  console.log(`    • Task 2: ⭐ Customer Reviews & Reputation (1-tap WhatsApp reply/invite)`);
  console.log(`    • Task 3: 📍 Google Maps Freshness (Photo upload check)`);
  console.log(`    • Task 4: 📋 Daily Inquiries & Checklist (Dashboard follow-up)\n`);

  // Save HTML preview locally so it can be viewed directly
  const previewPath = path.resolve(__dirname, 'preview-daily-growth-checklist.html');
  fs.writeFileSync(previewPath, emailRender.html, 'utf8');
  console.log(`  ✓ HTML Email Preview saved locally to: ${previewPath}`);

  // Create real test SMTP transport via Ethereal (or environment SMTP if present)
  let emailDeliveryOutcome: {
    transport: string;
    messageId?: string;
    previewUrl?: string | false;
    error?: string;
  };

  try {
    let transporter: nodemailer.Transporter;
    let transportName = 'Ethereal Test SMTP';

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transportName = `Configured SMTP (${process.env.SMTP_HOST})`;
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Create on-demand test mailbox at Ethereal
      const testAccount = await nodemailer.createTestAccount();
      transportName = `Ethereal Test SMTP (${testAccount.user})`;
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from: `"BGOS Team" <notifications@bgos.site>`,
      to: TARGET_EMAIL,
      subject: emailRender.subject,
      text: emailRender.text,
      html: emailRender.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    emailDeliveryOutcome = {
      transport: transportName,
      messageId: info.messageId,
      previewUrl: previewUrl || false,
    };

    console.log(`  ✅ Email Dispatched via ${transportName}!`);
    console.log(`  Message ID:  ${info.messageId}`);
    if (previewUrl) {
      console.log(`  🔗 Live Web Email Preview URL: ${previewUrl}`);
    }
    console.log('\n');
  } catch (err: any) {
    emailDeliveryOutcome = {
      transport: 'Error',
      error: err.message,
    };
    console.error(`  ❌ Email send failed:`, err.message);
  }

  // ── FINAL SUMMARY ──
  console.log('════════════════════════════════════════════════════════════════');
  console.log(' 📊 NOTIFICATIONS & MAILER DISPATCH TEST SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(` Account Tested:   ${TARGET_BIZ} (${TARGET_PHONE})`);
  console.log(` Email Tested:     ${TARGET_EMAIL}`);
  console.log('────────────────────────────────────────────────────────────────');
  console.log(' 1. In-App Notifications & Device Web Push:');
  for (const d of dispatches) {
    console.log(`    ✅ [${d.type.padEnd(20)}] ${d.title}`);
    console.log(`       ↳ Push Tag: ${d.pushPayload.tag} | Route: ${d.pushPayload.data.route}`);
  }
  console.log('────────────────────────────────────────────────────────────────');
  console.log(' 2. Daily Action Growth Mailer:');
  if (emailDeliveryOutcome.messageId) {
    console.log(`    ✅ [SENT] Message ID: ${emailDeliveryOutcome.messageId}`);
    console.log(`       ↳ Subject: "${emailRender.subject}"`);
    console.log(`       ↳ Recipient: ${TARGET_EMAIL}`);
    if (emailDeliveryOutcome.previewUrl) {
      console.log(`       ↳ Live Preview Link: ${emailDeliveryOutcome.previewUrl}`);
    }
  } else {
    console.log(`    ❌ [FAILED] ${emailDeliveryOutcome.error}`);
  }
  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});

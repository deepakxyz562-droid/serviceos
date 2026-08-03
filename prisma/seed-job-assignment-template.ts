/**
 * Seed: "New task assignment" Email Template
 * ==========================================
 *
 * Inserts (or updates) a `task-assignment` row in the EmailTemplate table so
 * admins can view and edit the template from the Email Templates UI
 * (/?view=email-templates). The actual outgoing email is rendered by
 * `src/lib/email-templates/job-assignment.ts` — this DB row exists for
 * admin visibility and as a reference for the variable schema.
 *
 * Run via: bun run prisma/seed-job-assignment-template.ts
 *
 * Idempotent: safe to run multiple times — uses findFirst + update/create
 * (Prisma's composite-unique where clause doesn't accept null tenantId).
 */

import { PrismaClient } from '@prisma/client';

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const db = new PrismaClient({ datasourceUrl: directUrl, log: ['error', 'warn'] });

// ── Template metadata ────────────────────────────────────────────────────

const SLUG = 'task-assignment';
const NAME = 'Task Assignment (Jobber-style)';

// Declared variables for the Email Templates editor UI.
// Format: [{ key, label, required, example }]
const VARIABLES_JSON = JSON.stringify([
  { key: 'assigneeName', label: 'Assignee Name', required: true, example: 'Deepak' },
  { key: 'jobNumber', label: 'Job Number', required: true, example: '2' },
  { key: 'jobTitle', label: 'Job Title / Service', required: false, example: 'AC Repair' },
  { key: 'scheduledAt', label: 'Scheduled Start (ISO)', required: true, example: '2026-07-11T11:00:00' },
  { key: 'scheduledEndTime', label: 'Scheduled End (ISO)', required: false, example: '2026-07-11T12:00:00' },
  { key: 'address', label: 'Service Address', required: false, example: '2426 E Riverside Dr, Austin, TX 78741' },
  { key: 'customerName', label: 'Customer Name', required: true, example: 'Deepak' },
  { key: 'customerPhone', label: 'Customer Phone', required: false, example: '206-555-0122' },
  { key: 'customerEmail', label: 'Customer Email', required: false, example: 'deepak@example.com' },
  { key: 'viewJobUrl', label: 'View Job URL', required: true, example: 'https://acme.fieseros.com/?view=jobs&job=abc123' },
]);

const TAGS_JSON = JSON.stringify(['transactional', 'job', 'assignment', 'operational']);

// HTML body uses {{variable}} placeholders matching the variablesJson above.
// This is the SAME visual design as the code-rendered version in
// src/lib/email-templates/job-assignment.ts — kept in sync manually.
// (The code module is the source of truth for outgoing emails; this DB
// row is for admin preview/editing.)
const HTML_BODY = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New task assignment</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#059669;padding:18px 28px;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Fieseros</div>
              <div style="font-size:12px;color:#d1fae5;margin-top:2px;">Task Assignment</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">New task assignment</h1>
              <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">Hi {{assigneeName}},</p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">
                You've been assigned a new task. <strong style="color:#111827;">{{jobTitle}}</strong>
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-size:11px;font-weight:600;color:#047857;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Schedule</div>
                    <div style="font-size:16px;font-weight:600;color:#064e3b;line-height:1.4;">{{scheduledAt}} – {{scheduledEndTime}}</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Assigned to</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:14px;color:#111827;font-weight:600;">{{assigneeName}}</div>
                  </td>
                </tr>
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Job #</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:14px;color:#111827;font-weight:600;">{{jobNumber}}</div>
                  </td>
                </tr>
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Address</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:14px;color:#111827;line-height:1.5;">{{address}}</div>
                  </td>
                </tr>
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Contact details</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;">
                    <div style="font-size:14px;color:#111827;font-weight:600;">{{customerName}}</div>
                    <div style="font-size:14px;color:#111827;line-height:1.5;">Phone: {{customerPhone}}</div>
                    <div style="font-size:14px;color:#111827;line-height:1.5;">Email: {{customerEmail}}</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;">
                <tr>
                  <td align="left">
                    <a href="{{viewJobUrl}}" style="display:inline-block;padding:12px 24px;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">View Job</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Questions? Visit our <a href="mailto:support@fieseros.com" style="color:#059669;text-decoration:none;font-weight:500;">Help Center</a>
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                © ${new Date().getFullYear()} Fieseros, Inc. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const TEXT_BODY = `NEW TASK ASSIGNMENT

Hi {{assigneeName}},

You've been assigned a new task. {{jobTitle}}

Schedule: {{scheduledAt}} – {{scheduledEndTime}}

Assigned to: {{assigneeName}}
Job #: {{jobNumber}}
Address: {{address}}

Contact details:
  {{customerName}}
  Phone: {{customerPhone}}
  Email: {{customerEmail}}

View Job: {{viewJobUrl}}

Questions? Email support@fieseros.com

© ${new Date().getFullYear()} Fieseros, Inc. All rights reserved.`;

// ── Upsert helper (mirrors seed-template-studio.ts pattern) ──────────────

async function upsertEmailTemplate(data: {
  name: string;
  slug: string;
  category: string;
  description?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variablesJson?: string;
  isBuiltIn?: boolean;
  status?: string;
  tagsJson?: string;
  tenantId?: string | null;
}) {
  const existing = await db.emailTemplate.findFirst({
    where: { slug: data.slug, tenantId: data.tenantId ?? null },
  });
  if (existing) {
    return db.emailTemplate.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        variablesJson: data.variablesJson,
        isBuiltIn: data.isBuiltIn,
        status: data.status,
        tagsJson: data.tagsJson,
      },
    });
  }
  return db.emailTemplate.create({ data });
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('📧 Seeding "task-assignment" email template...\n');

  const template = await upsertEmailTemplate({
    name: NAME,
    slug: SLUG,
    category: 'transactional',
    description:
      'Sent to an employee when a new job is assigned to them. Subject "New task assignment". ' +
      'Matches the Jobber task-assignment email layout: greeting → schedule → assigned to → ' +
      'job # → address → contact details → View Job CTA → Help Center footer. ' +
      'NOTE: The actual outgoing email is rendered by src/lib/email-templates/job-assignment.ts. ' +
      'Edits here are for admin reference / variable schema only.',
    subject: 'New task assignment',
    htmlBody: HTML_BODY,
    textBody: TEXT_BODY,
    variablesJson: VARIABLES_JSON,
    isBuiltIn: true,
    status: 'published',
    tagsJson: TAGS_JSON,
    tenantId: null, // global platform template — visible to all tenants
  });

  console.log(`   ✅ Template upserted: ${template.name} (slug=${template.slug}, id=${template.id})`);
  console.log(`   📋 Subject: "${template.subject}"`);
  console.log(`   🏷  Variables: ${VARIABLES_JSON.length} declared`);
  console.log('\nDone. Admins can view this at /?view=email-templates.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

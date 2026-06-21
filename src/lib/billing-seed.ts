/**
 * Trial-lifecycle email templates + plan catalog seeding.
 *
 * Seeds 4 built-in EmailTemplate rows for the trial lifecycle:
 *   - trial-started      (Day 0 — sent when a tenant signs up)
 *   - trial-ending-3-day (Day 11 — 3 days before trial ends; gentle nudge)
 *   - trial-ending-1-day (Day 13 — pre-charge reminder; "your card will be charged $X tomorrow")
 *   - trial-expired       (Day 14+ — sent when trial expires, with "add payment method" CTA)
 *
 * Also seeds the Plan catalog (starter/growth/pro/enterprise) so pricing can
 * be edited by a super-admin without code changes.
 *
 * All seeds are idempotent — uses upsert on the unique (slug, tenantId) for
 * templates and (code) for plans, so re-running is safe.
 */
import { db } from '@/lib/db';

// ─── Email templates ────────────────────────────────────────────────────────

interface TrialTemplateDef {
  slug: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variablesJson: string;
}

const TRIAL_TEMPLATES: TrialTemplateDef[] = [
  {
    slug: 'trial-started',
    name: 'Trial Started',
    subject: 'Welcome to {{appName}} — your 14-day trial has begun 🎉',
    variablesJson:
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"trialEndsAt","label":"Trial End Date","required":true,"example":"July 4, 2026"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"loginUrl","label":"Login URL","required":true,"example":"https://app.serviceos.com"}]',
    htmlBody: `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h1 style="color: #059669;">Welcome to {{appName}}, {{tenantName}}! 🎉</h1>
    <p>Your 14-day free trial is now active. You have full access to every feature — leads, jobs, invoices, WhatsApp, automation, and more.</p>
    <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Trial ends:</strong> {{trialEndsAt}}</p>
      <p style="margin: 8px 0 0;"><strong>What happens then:</strong> Add a payment method before {{trialEndsAt}} to keep your account active. No card needed during the trial.</p>
    </div>
    <a href="{{loginUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open {{appName}}</a>
    <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">Questions? Just reply to this email.</p>
  </body>
</html>`,
    textBody: `Welcome to {{appName}}, {{tenantName}}!

Your 14-day free trial is now active. You have full access to every feature.

Trial ends: {{trialEndsAt}}
What happens then: Add a payment method before {{trialEndsAt}} to keep your account active. No card needed during the trial.

Open {{appName}}: {{loginUrl}}

Questions? Just reply to this email.`,
  },
  {
    slug: 'trial-ending-3-day',
    name: 'Trial Ending Soon (3 days)',
    subject: 'Your {{appName}} trial ends in 3 days — add a payment method',
    variablesJson:
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"trialEndsAt","label":"Trial End Date","required":true,"example":"July 4, 2026"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"billingUrl","label":"Billing URL","required":true,"example":"https://app.serviceos.com/billing"}]',
    htmlBody: `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h1 style="color: #d97706;">Your trial ends in 3 days, {{tenantName}}</h1>
    <p>You're almost at the end of your 14-day {{appName}} trial. We hope you've been enjoying it!</p>
    <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Trial ends:</strong> {{trialEndsAt}}</p>
      <p style="margin: 8px 0 0;">To keep your account active and retain all your data, leads, and workflows, add a payment method before then.</p>
    </div>
    <a href="{{billingUrl}}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Choose a plan</a>
    <p style="margin-top: 24px; font-size: 14px;">No card needed during the trial — only if you decide to continue.</p>
  </body>
</html>`,
    textBody: `Your trial ends in 3 days, {{tenantName}}

You're almost at the end of your 14-day {{appName}} trial.

Trial ends: {{trialEndsAt}}
To keep your account active and retain all your data, leads, and workflows, add a payment method before then.

Choose a plan: {{billingUrl}}

No card needed during the trial — only if you decide to continue.`,
  },
  {
    slug: 'trial-ending-1-day',
    name: 'Pre-charge Reminder (1 day)',
    subject: 'URGENT: Your {{appName}} trial ends tomorrow',
    variablesJson:
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"trialEndsAt","label":"Trial End Date","required":true,"example":"July 4, 2026"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"billingUrl","label":"Billing URL","required":true,"example":"https://app.serviceos.com/billing"},{"key":"planName","label":"Plan Name","required":true,"example":"Growth"},{"key":"planPrice","label":"Plan Price","required":true,"example":"$79/month"}]',
    htmlBody: `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h1 style="color: #dc2626;">Final reminder: your trial ends tomorrow</h1>
    <p>Hi {{tenantName}},</p>
    <p>This is your last reminder before your {{appName}} trial expires <strong>tomorrow ({{trialEndsAt}})</strong>.</p>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Tomorrow:</strong> Your trial will expire.</p>
      <p style="margin: 8px 0 0;"><strong>To continue:</strong> Add a payment method and choose a plan before {{trialEndsAt}}.</p>
      <p style="margin: 8px 0 0;"><strong>Recommended plan:</strong> {{planName}} — {{planPrice}}</p>
    </div>
    <a href="{{billingUrl}}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Add payment method now</a>
    <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">If you don't add a payment method, your account will be paused but your data will be preserved for 30 days.</p>
  </body>
</html>`,
    textBody: `Final reminder: your trial ends tomorrow

Hi {{tenantName}},

This is your last reminder before your {{appName}} trial expires tomorrow ({{trialEndsAt}}).

Tomorrow: Your trial will expire.
To continue: Add a payment method and choose a plan before {{trialEndsAt}}.
Recommended plan: {{planName}} — {{planPrice}}

Add payment method now: {{billingUrl}}

If you don't add a payment method, your account will be paused but your data will be preserved for 30 days.`,
  },
  {
    slug: 'trial-expired',
    name: 'Trial Expired',
    subject: 'Your {{appName}} trial has expired — add a payment method to continue',
    variablesJson:
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"billingUrl","label":"Billing URL","required":true,"example":"https://app.serviceos.com/billing"},{"key":"dataPreservedUntil","label":"Data Preserved Until","required":true,"example":"August 4, 2026"}]',
    htmlBody: `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h1 style="color: #6b7280;">Your trial has expired, {{tenantName}}</h1>
    <p>Your 14-day {{appName}} trial ended. Access to your dashboard, leads, jobs, and workflows is now paused.</p>
    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Good news:</strong> Your data is preserved until <strong>{{dataPreservedUntil}}</strong>.</p>
      <p style="margin: 8px 0 0;">Add a payment method and choose a plan to instantly restore full access.</p>
    </div>
    <a href="{{billingUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Restore access now</a>
    <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">After {{dataPreservedUntil}}, your data will be permanently deleted unless you upgrade.</p>
  </body>
</html>`,
    textBody: `Your trial has expired, {{tenantName}}

Your 14-day {{appName}} trial ended. Access to your dashboard, leads, jobs, and workflows is now paused.

Good news: Your data is preserved until {{dataPreservedUntil}}.
Add a payment method and choose a plan to instantly restore full access.

Restore access now: {{billingUrl}}

After {{dataPreservedUntil}}, your data will be permanently deleted unless you upgrade.`,
  },
];

/** Idempotently seed the 4 trial-lifecycle email templates. Safe to call repeatedly. */
export async function seedTrialEmailTemplates(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;
  for (const tpl of TRIAL_TEMPLATES) {
    try {
      // tenantId=null → global platform template (visible to all tenants).
      // The (slug, tenantId) pair is unique, so upsert is idempotent.
      const existing = await db.emailTemplate.findFirst({
        where: { slug: tpl.slug, tenantId: null },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await db.emailTemplate.create({
        data: {
          name: tpl.name,
          slug: tpl.slug,
          category: 'system',
          subject: tpl.subject,
          htmlBody: tpl.htmlBody,
          textBody: tpl.textBody,
          variablesJson: tpl.variablesJson,
          isBuiltIn: true,
          isDefault: true,
          tenantId: null, // global
        },
      });
      seeded++;
    } catch (err) {
      // Non-fatal: don't let one template failure abort the rest or the caller.
      console.error(`[billing-seed] seedTrialEmailTemplates: failed to seed "${tpl.slug}" (non-fatal):`, err);
    }
  }
  return { seeded, skipped };
}

/** Look up a trial template by slug, render its body with the provided variables. */
export async function renderTrialTemplate(
  slug: string,
  variables: Record<string, string>
): Promise<{ subject: string; html: string; text: string } | null> {
  const tpl = await db.emailTemplate.findFirst({
    where: { slug, tenantId: null },
  });
  if (!tpl) return null;

  const replace = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);

  return {
    subject: replace(tpl.subject),
    html: replace(tpl.htmlBody),
    text: tpl.textBody ? replace(tpl.textBody) : replace(tpl.htmlBody).replace(/<[^>]+>/g, ' '),
  };
}

// ─── Plan catalog ────────────────────────────────────────────────────────────

interface PlanDef {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxJobs: number;
  maxWorkflows: number;
  features: Record<string, boolean>;
  popular?: boolean;
  sortOrder: number;
}

const PLAN_DEFS: PlanDef[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'For solo entrepreneurs & freelancers',
    monthlyPrice: 29,
    yearlyPrice: 290,
    maxUsers: 1,
    maxJobs: 100,
    maxWorkflows: 10,
    features: {
      whatsappIntegration: true,
      customWorkflows: false,
      apiAccess: false,
      prioritySupport: false,
      leadPipeline: false,
      whiteLabel: false,
    },
    sortOrder: 1,
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'For growing service businesses',
    monthlyPrice: 79,
    yearlyPrice: 790,
    maxUsers: 5,
    maxJobs: 1000,
    maxWorkflows: 50,
    features: {
      whatsappIntegration: true,
      customWorkflows: true,
      apiAccess: true,
      prioritySupport: true,
      leadPipeline: true,
      whiteLabel: false,
    },
    popular: true,
    sortOrder: 2,
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'For scaling organizations',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxUsers: 999,
    maxJobs: 99999,
    maxWorkflows: 999,
    features: {
      whatsappIntegration: true,
      customWorkflows: true,
      apiAccess: true,
      prioritySupport: true,
      leadPipeline: true,
      whiteLabel: false,
    },
    sortOrder: 3,
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'For large enterprises & franchises',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 100,
    maxJobs: 10000,
    maxWorkflows: 1000,
    features: {
      whatsappIntegration: true,
      customWorkflows: true,
      apiAccess: true,
      prioritySupport: true,
      leadPipeline: true,
      whiteLabel: true,
    },
    sortOrder: 4,
  },
];

/** Idempotently seed the Plan catalog. Safe to call repeatedly. */
export async function seedPlans(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;
  for (const p of PLAN_DEFS) {
    try {
      const existing = await db.plan.findUnique({ where: { code: p.code } });
      if (existing) {
        skipped++;
        continue;
      }
      await db.plan.create({
        data: {
          code: p.code,
          name: p.name,
          description: p.description,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: p.yearlyPrice,
          maxUsers: p.maxUsers,
          maxJobs: p.maxJobs,
          maxWorkflows: p.maxWorkflows,
          featuresJson: JSON.stringify(p.features),
          popular: p.popular ?? false,
          sortOrder: p.sortOrder,
        },
      });
      seeded++;
    } catch (err) {
      // Don't let one plan failure abort the rest (or the caller). This is
      // common on serverless (Supabase REST) when the Plan table doesn't
      // exist yet, has RLS blocking writes, or a concurrent request already
      // inserted the same code. Log and move on — the GET route wraps
      // seedPlans() in its own try/catch too, so this is defense-in-depth.
      console.error(`[billing-seed] seedPlans: failed to seed plan "${p.code}" (non-fatal):`, err);
    }
  }
  return { seeded, skipped };
}

/** Get all active plans, sorted by sortOrder. Used by the billing UI. */
export async function getActivePlans() {
  return db.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

/** Get a single plan by code. Returns null if not found. */
export async function getPlanByCode(code: string) {
  return db.plan.findUnique({ where: { code } });
}

export { PLAN_DEFS };

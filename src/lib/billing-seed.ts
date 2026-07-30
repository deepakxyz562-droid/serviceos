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
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"trialEndsAt","label":"Trial End Date","required":true,"example":"July 4, 2026"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"loginUrl","label":"Login URL","required":true,"example":"https://serviceos.cc"}]',
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
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"trialEndsAt","label":"Trial End Date","required":true,"example":"July 4, 2026"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"billingUrl","label":"Billing URL","required":true,"example":"https://serviceos.cc/billing"}]',
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
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"trialEndsAt","label":"Trial End Date","required":true,"example":"July 4, 2026"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"billingUrl","label":"Billing URL","required":true,"example":"https://serviceos.cc/billing"},{"key":"planName","label":"Plan Name","required":true,"example":"Growth"},{"key":"planPrice","label":"Plan Price","required":true,"example":"$25/month"}]',
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
      '[{"key":"tenantName","label":"Tenant Name","required":true,"example":"AquaFlow"},{"key":"appName","label":"App Name","required":true,"example":"ServiceOS"},{"key":"billingUrl","label":"Billing URL","required":true,"example":"https://serviceos.cc/billing"},{"key":"dataPreservedUntil","label":"Data Preserved Until","required":true,"example":"August 4, 2026"}]',
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
  /** Strikethrough "original" price (0 = no discount shown). Synced to Plan.originalMonthlyPrice. */
  originalMonthlyPrice?: number;
  /** Strikethrough "original" yearly price (0 = no discount shown). Synced to Plan.originalYearlyPrice. */
  originalYearlyPrice?: number;
  /** Optional override badge text like "Launch offer". Synced to Plan.discountBadge. */
  discountBadge?: string;
  maxUsers: number;
  maxJobs: number;
  maxWorkflows: number;
  features: Record<string, boolean>;
  limits?: Record<string, number | string>;
  isAddon?: boolean;
  parentPlanCode?: string | null;
  marketplaceAccess?: string; // none | browse_only | receive_bookings | priority
  popular?: boolean;
  sortOrder: number;
}

const PLAN_DEFS: PlanDef[] = [
  {
    code: 'starter',
    name: 'Starter',
    description:
      'For solo professionals. CRM, jobs, estimates, invoicing, scheduling, dispatch board, customer portal, digital signatures, online payments.',
    monthlyPrice: 29,
    yearlyPrice: 290, // 2 months free
    originalMonthlyPrice: 49,
    originalYearlyPrice: 490,
    maxUsers: 1,
    maxJobs: 200,
    maxWorkflows: 10,
    features: {
      customerPortal: true,
      estimates: true,
      invoicing: true,
      scheduling: true,
      dispatchBoard: true,
      // Issue 6: GPS Tracking is NOT available on Starter. It unlocks on
      // Business (live technician map) and is referenced as a higher-tier
      // differentiator on the home page pricing cards.
      gpsTracking: false,
      customer360: true,
      salesPipeline: false,
      reviews: true,
      knowledgeBase: true,
      documentCenter: true,
      timeTracking: true,
      expenses: true,
      digitalSignatures: true,
      beforeAfterPhotos: true,
      onlinePayments: true,
    },
    limits: {
      maxEmployees: 1,
      maxBranches: 1,
      maxServiceAreas: 3,
      maxUsers: 1,
      maxJobs: 200,
      maxWorkflows: 10,
      storageQuotaMb: 5120, // 5GB
    },
    marketplaceAccess: 'receive_bookings',
    sortOrder: 1,
  },
  {
    code: 'growth',
    name: 'Professional',
    description:
      'For growing teams. Everything in Starter + WhatsApp, email, AI Assistant, AI quote/job/reply/form generators, workflows, form builder, marketing campaigns, broadcast, customer segments, template studio, omnichannel inbox, live chat, API access, webhooks.',
    monthlyPrice: 79,
    yearlyPrice: 790, // 2 months free
    originalMonthlyPrice: 129,
    originalYearlyPrice: 1290,
    maxUsers: 5,
    maxJobs: 999999, // effectively unlimited
    maxWorkflows: 50,
    features: {
      // Starter features
      customerPortal: true,
      estimates: true,
      invoicing: true,
      scheduling: true,
      dispatchBoard: true,
      gpsTracking: true,
      customer360: true,
      salesPipeline: true,
      reviews: true,
      knowledgeBase: true,
      documentCenter: true,
      timeTracking: true,
      expenses: true,
      digitalSignatures: true,
      beforeAfterPhotos: true,
      onlinePayments: true,
      // Growth (Professional) additions
      whatsappIntegration: true,
      emailIntegration: true,
      smsNumbers: true,
      aiAssistant: true,
      aiQuoteGenerator: true,
      aiJobSummary: true,
      aiSuggestedReplies: true,
      aiFormGenerator: true,
      customWorkflows: true,
      formBuilder: true,
      marketingCampaigns: true,
      broadcast: true,
      customerSegments: true,
      templateStudio: true,
      omnichannelInbox: true,
      liveChat: true,
      apiAccess: true,
      webhooks: true,
    },
    limits: {
      maxEmployees: 5,
      maxBranches: 1,
      maxServiceAreas: 10,
      maxUsers: 5,
      maxJobs: 999999,
      maxWorkflows: 50,
      storageQuotaMb: 51200, // 50GB
    },
    marketplaceAccess: 'receive_bookings',
    popular: true,
    sortOrder: 2,
  },
  {
    code: 'business',
    name: 'Business',
    description:
      'For multi-branch service businesses. Everything in Professional + AI Receptionist, AI Agents, AI phone numbers, AI call history, AI Dispatcher, inventory, purchase orders, recurring jobs, live technician map (GPS), advanced reports, role-based permissions.',
    monthlyPrice: 149,
    yearlyPrice: 1490, // 2 months free
    originalMonthlyPrice: 249,
    originalYearlyPrice: 2490,
    maxUsers: 20,
    maxJobs: 999999,
    maxWorkflows: 999,
    features: {
      // Starter features
      customerPortal: true,
      estimates: true,
      invoicing: true,
      scheduling: true,
      dispatchBoard: true,
      gpsTracking: true,
      customer360: true,
      salesPipeline: true,
      reviews: true,
      knowledgeBase: true,
      documentCenter: true,
      timeTracking: true,
      expenses: true,
      digitalSignatures: true,
      beforeAfterPhotos: true,
      onlinePayments: true,
      // Growth (Professional) additions
      whatsappIntegration: true,
      emailIntegration: true,
      smsNumbers: true,
      aiAssistant: true,
      aiQuoteGenerator: true,
      aiJobSummary: true,
      aiSuggestedReplies: true,
      aiFormGenerator: true,
      customWorkflows: true,
      formBuilder: true,
      marketingCampaigns: true,
      broadcast: true,
      customerSegments: true,
      templateStudio: true,
      omnichannelInbox: true,
      liveChat: true,
      apiAccess: true,
      webhooks: true,
      // Business additions
      aiReceptionist: true,
      aiAgents: true,
      aiPhoneNumbers: true,
      aiCallHistory: true,
      aiDispatcher: true,
      inventory: true,
      purchaseOrders: true,
      recurringJobs: true,
      routeOptimization: true,
      advancedReports: true,
      rolePermissions: true,
    },
    limits: {
      maxEmployees: 20,
      maxBranches: 10,
      maxServiceAreas: 50,
      maxUsers: 20,
      maxJobs: 999999,
      maxWorkflows: 999,
      storageQuotaMb: 204800, // 200GB
    },
    marketplaceAccess: 'priority',
    sortOrder: 3,
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description:
      'For large organizations. Everything in Business + white-label branding, advanced security, custom data retention, dedicated support. Contact us for custom pricing.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 999999,
    maxJobs: 999999,
    maxWorkflows: 999,
    features: {
      // Starter features
      customerPortal: true,
      estimates: true,
      invoicing: true,
      scheduling: true,
      dispatchBoard: true,
      gpsTracking: true,
      customer360: true,
      salesPipeline: true,
      reviews: true,
      knowledgeBase: true,
      documentCenter: true,
      timeTracking: true,
      expenses: true,
      digitalSignatures: true,
      beforeAfterPhotos: true,
      onlinePayments: true,
      // Growth (Professional) additions
      whatsappIntegration: true,
      emailIntegration: true,
      smsNumbers: true,
      aiAssistant: true,
      aiQuoteGenerator: true,
      aiJobSummary: true,
      aiSuggestedReplies: true,
      aiFormGenerator: true,
      customWorkflows: true,
      formBuilder: true,
      marketingCampaigns: true,
      broadcast: true,
      customerSegments: true,
      templateStudio: true,
      omnichannelInbox: true,
      liveChat: true,
      apiAccess: true,
      webhooks: true,
      // Business additions
      aiReceptionist: true,
      aiAgents: true,
      aiPhoneNumbers: true,
      aiCallHistory: true,
      aiDispatcher: true,
      inventory: true,
      purchaseOrders: true,
      recurringJobs: true,
      routeOptimization: true,
      advancedReports: true,
      rolePermissions: true,
      // Enterprise additions
      whiteLabel: true,
      advancedSecurity: true,
      dataRetention: true,
      dedicatedSupport: true,
    },
    limits: {
      maxEmployees: 999999,
      maxBranches: 999999,
      maxServiceAreas: 999999,
      maxUsers: 999999,
      maxJobs: 999999,
      maxWorkflows: 999,
      storageQuotaMb: 999999,
    },
    marketplaceAccess: 'priority',
    sortOrder: 4,
  },
  {
    code: 'ai_pro_addon',
    name: 'AI Pro Add-on',
    description: 'More AI usage — additional monthly AI credits for power users.',
    monthlyPrice: 19,
    yearlyPrice: 190,
    originalMonthlyPrice: 0,
    originalYearlyPrice: 0,
    maxUsers: 0,
    maxJobs: 0,
    maxWorkflows: 0,
    features: { aiCreditsBoost: true },
    isAddon: true,
    parentPlanCode: null,
    marketplaceAccess: 'none',
    sortOrder: 10,
  },
  {
    code: 'marketplace_featured',
    name: 'Marketplace Featured Listing',
    description:
      'Stand out in the marketplace with a featured badge and priority placement.',
    monthlyPrice: 19,
    yearlyPrice: 190,
    originalMonthlyPrice: 0,
    originalYearlyPrice: 0,
    maxUsers: 0,
    maxJobs: 0,
    maxWorkflows: 0,
    features: { marketplaceFeatured: true },
    isAddon: true,
    parentPlanCode: null,
    marketplaceAccess: 'receive_bookings',
    sortOrder: 11,
  },
  {
    code: 'marketplace_premium',
    name: 'Marketplace Premium Featured',
    description:
      'Top placement + premium badge + instant booking eligibility.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    originalMonthlyPrice: 0,
    originalYearlyPrice: 0,
    maxUsers: 0,
    maxJobs: 0,
    maxWorkflows: 0,
    features: { marketplacePremium: true },
    isAddon: true,
    parentPlanCode: null,
    marketplaceAccess: 'priority',
    sortOrder: 12,
  },
];

/**
 * Idempotently seed/sync the Plan catalog. Safe to call repeatedly.
 *
 * Uses upsert so existing Plan rows are kept in sync with the canonical
 * PLAN_DEFS (price changes, feature flags, descriptions propagate). This
 * matters because pricing is now centralized in PLAN_DEFS — when we change
 * a price here, the DB row must follow or the billing UI / PayPal orders
 * would charge the stale amount. The only fields an admin can override
 * without being clobbered are `isActive`, `popular`, `featuresJson`, and
 * `limitsJson` — the JSON blobs are deliberately NOT touched on update so
 * that superadmin edits made via the Billing UI persist across re-seeds.
 */
export async function seedPlans(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;
  for (const p of PLAN_DEFS) {
    try {
      await db.plan.upsert({
        where: { code: p.code },
        update: {
          name: p.name,
          description: p.description,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: p.yearlyPrice,
          originalMonthlyPrice: p.originalMonthlyPrice ?? 0,
          originalYearlyPrice: p.originalYearlyPrice ?? 0,
          discountBadge: p.discountBadge ?? null,
          maxUsers: p.maxUsers,
          maxJobs: p.maxJobs,
          maxWorkflows: p.maxWorkflows,
          // NOTE: featuresJson + limitsJson are intentionally OMITTED from
          // the `update` block so admin edits (via the superadmin billing UI)
          // are preserved across re-seeds. Only the `create` path seeds them.
          isAddon: p.isAddon ?? false,
          parentPlanCode: p.parentPlanCode ?? null,
          marketplaceAccess: p.marketplaceAccess ?? 'none',
          popular: p.popular ?? false,
          sortOrder: p.sortOrder,
        },
        create: {
          code: p.code,
          name: p.name,
          description: p.description,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: p.yearlyPrice,
          originalMonthlyPrice: p.originalMonthlyPrice ?? 0,
          originalYearlyPrice: p.originalYearlyPrice ?? 0,
          discountBadge: p.discountBadge ?? null,
          maxUsers: p.maxUsers,
          maxJobs: p.maxJobs,
          maxWorkflows: p.maxWorkflows,
          featuresJson: JSON.stringify(p.features),
          limitsJson: JSON.stringify(p.limits ?? {}),
          isAddon: p.isAddon ?? false,
          parentPlanCode: p.parentPlanCode ?? null,
          marketplaceAccess: p.marketplaceAccess ?? 'none',
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
      console.error(`[billing-seed] seedPlans: failed to upsert plan "${p.code}" (non-fatal):`, err);
      skipped++;
    }
  }
  // Migrate any existing tenants from 'pro' → 'business'
  try {
    const proTenants = await db.tenant.findMany({ where: { plan: 'pro' } });
    if (proTenants.length > 0) {
      await db.tenant.updateMany({ where: { plan: 'pro' }, data: { plan: 'business' } });
      console.log(`[billing-seed] Migrated ${proTenants.length} tenant(s) from 'pro' → 'business'`);
    }
  } catch (err) {
    // Non-fatal — the 'pro' plan may have already been removed
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

// ─────────────────────────────────────────────────────────────────────────────
// Plan-based Feature Gating — master catalog + resolver.
//
// This is the single source of truth for which features exist on the platform,
// which plan tiers (trial/starter/growth/business/enterprise) they belong to,
// and the runtime lookup functions used by both server (`plan-gate.ts`) and
// client (`use-tenant-plan.ts`) code.
//
// Database-backed: each (planCode, featureKey) pair is materialised as a row in
// the `PlanFeatureMatrix` table. The first lookup for a missing row seeds it
// from `DEFAULT_PLAN_MATRIX` so the matrix self-populates and the superadmin
// can override any cell via the matrix UI.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db';

// ─── Feature catalogue ───────────────────────────────────────────────────────

export type PlanFeatureCategory =
  | 'crm'
  | 'communication'
  | 'automation'
  | 'operations'
  | 'finance'
  | 'inventory'
  | 'admin';

export interface PlanFeatureDef {
  /** Stable identifier stored in PlanFeatureMatrix.featureKey. */
  key: string;
  /** Human-readable name shown in the superadmin matrix UI. */
  label: string;
  /** Short help text shown under the label. */
  description: string;
  /** Grouping used to section the matrix UI. */
  category: PlanFeatureCategory;
}

/**
 * Master list of all plan-gated features. Add a new entry here when a new
 * billable module ships, then run `seedPlanFeatureMatrix()` to backfill rows
 * for every plan tier.
 */
export const PLAN_FEATURE_DEFS: PlanFeatureDef[] = [
  // ── CRM — enabled on all paid plans (and trial) ───────────────────────────
  { key: 'customers', label: 'Customers', description: 'Customer database', category: 'crm' },
  { key: 'leads', label: 'Leads', description: 'Lead pipeline', category: 'crm' },
  { key: 'jobs', label: 'Jobs', description: 'Job management', category: 'crm' },
  { key: 'quotes', label: 'Quotes', description: 'Quote builder', category: 'crm' },
  { key: 'invoices', label: 'Invoices', description: 'Invoice generation', category: 'crm' },
  { key: 'reports', label: 'Reports', description: 'Analytics dashboard', category: 'crm' },
  { key: 'customer_360', label: 'Customer 360', description: 'Unified customer timeline + history', category: 'crm' },
  { key: 'sales_pipeline', label: 'Sales Pipeline', description: 'Kanban sales pipeline', category: 'crm' },
  { key: 'reviews', label: 'Reviews', description: 'Review requests + reputation management', category: 'crm' },

  // ── Communication — growth+ (AI receptionist + SMS numbers business+) ─────
  { key: 'live_chat', label: 'Live Chat', description: 'Website live chat widget', category: 'communication' },
  { key: 'sms_numbers', label: 'SMS Numbers', description: 'Buy dedicated phone numbers for SMS + call forwarding', category: 'communication' },
  { key: 'ai_receptionist', label: 'AI Receptionist', description: 'AI-answered voice calls via Vapi', category: 'communication' },
  { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp Business integration', category: 'communication' },
  { key: 'email_integration', label: 'Email Integration', description: 'Two-way email sync + transactional sending', category: 'communication' },
  { key: 'omnichannel_inbox', label: 'Omnichannel Inbox', description: 'Unified inbox across all channels', category: 'communication' },
  { key: 'ai_assistant', label: 'AI Assistant', description: 'In-app AI assistant for staff', category: 'communication' },
  { key: 'ai_quote_generator', label: 'AI Quote Generator', description: 'Generate quotes from job context', category: 'communication' },
  { key: 'ai_job_summary', label: 'AI Job Summary', description: 'Auto-summarize completed jobs', category: 'communication' },
  { key: 'ai_suggested_replies', label: 'AI Suggested Replies', description: 'Suggested replies for customer messages', category: 'communication' },
  { key: 'ai_form_generator', label: 'AI Form Generator', description: 'Generate custom forms from a prompt', category: 'communication' },

  // ── Automation — growth+ ─────────────────────────────────────────────────
  { key: 'workflows', label: 'Workflows', description: 'Visual workflow builder', category: 'automation' },
  { key: 'form_builder', label: 'Form Builder', description: 'Drag-and-drop custom form builder', category: 'automation' },
  { key: 'marketing_campaigns', label: 'Marketing Campaigns', description: 'SMS/WhatsApp/email bulk campaigns', category: 'automation' },
  { key: 'broadcast', label: 'Broadcast', description: 'One-to-many messaging', category: 'automation' },
  { key: 'customer_segments', label: 'Customer Segments', description: 'Build segments + smart lists', category: 'automation' },
  { key: 'template_studio', label: 'Template Studio', description: 'Reusable message + document templates', category: 'automation' },
  { key: 'retargeting', label: 'Retargeting', description: 'Audience retargeting rules', category: 'automation' },
  { key: 'journey_automation', label: 'Journey Automation', description: 'Customer journey automation', category: 'automation' },

  // ── Operations — starter+ ─────────────────────────────────────────────────
  { key: 'dispatch_board', label: 'Dispatch Board', description: 'Visual dispatch + assignment board', category: 'operations' },
  { key: 'gps_tracking', label: 'GPS Tracking', description: 'Live field-staff GPS tracking', category: 'operations' },
  { key: 'customer_portal', label: 'Customer Portal', description: 'Customer-facing portal for bookings + invoices', category: 'operations' },
  { key: 'employee_portal', label: 'Employee Portal', description: 'Field-staff portal for jobs + timesheets', category: 'operations' },
  { key: 'online_booking', label: 'Online Booking', description: 'Public booking page for customers', category: 'operations' },
  { key: 'time_tracking', label: 'Time Tracking', description: 'Clock in/out + timesheets per job', category: 'operations' },
  { key: 'expenses', label: 'Expenses', description: 'Track job expenses + reimbursements', category: 'operations' },
  { key: 'digital_signatures', label: 'Digital Signatures', description: 'Collect signatures on quotes, invoices, waivers', category: 'operations' },
  { key: 'before_after_photos', label: 'Before/After Photos', description: 'Photo documentation on jobs', category: 'operations' },
  { key: 'checklists', label: 'Checklists', description: 'Job + QA checklists', category: 'operations' },
  // NOTE: `route_optimization` flag retained for backwards-compat with seeded PlanFeatureMatrix
  // rows, but is DISABLED on every tier (the standalone route-optimization-view.tsx was a stub
  // and has been deleted). The real, working feature is Smart Auto-Dispatch (see dispatch-view
  // + /api/dispatch/smart), which is gated by `dispatch_board` + `gps_tracking` instead.
  { key: 'route_optimization', label: 'Smart Auto-Dispatch', description: 'Auto-assign jobs to the nearest available technician', category: 'operations' },

  // ── Finance — starter+ ───────────────────────────────────────────────────
  { key: 'online_payments', label: 'Online Payments', description: 'Card + PayPal payments via checkout links', category: 'finance' },
  { key: 'recurring_invoices', label: 'Recurring Invoices', description: 'Auto-billing schedules', category: 'finance' },
  { key: 'service_plans', label: 'Service Plans', description: 'Recurring service agreements + subscriptions', category: 'finance' },
  { key: 'warranties', label: 'Warranties', description: 'Job + product warranties', category: 'finance' },
  { key: 'tax_rules', label: 'Tax Rules', description: 'Configurable tax rates + exemptions', category: 'finance' },
  { key: 'multi_currency', label: 'Multi-Currency', description: 'Invoice + charge in multiple currencies', category: 'finance' },

  // ── Inventory — business+ ────────────────────────────────────────────────
  { key: 'inventory', label: 'Inventory', description: 'Stock-on-hand + SKU tracking', category: 'inventory' },
  { key: 'purchase_orders', label: 'Purchase Orders', description: 'POs to vendors + receiving', category: 'inventory' },
  { key: 'recurring_jobs', label: 'Recurring Jobs', description: 'Schedule recurring + contract jobs', category: 'inventory' },

  // ── Admin ────────────────────────────────────────────────────────────────
  { key: 'white_label', label: 'White Label', description: 'Custom branding (logo, colors, domain)', category: 'admin' },
  { key: 'api_access', label: 'API Access', description: 'Developer API keys', category: 'admin' },
  { key: 'webhooks', label: 'Webhooks', description: 'Outbound event webhooks', category: 'admin' },
  { key: 'knowledge_base', label: 'Knowledge Base', description: 'Internal + customer KB articles', category: 'admin' },
  { key: 'document_center', label: 'Document Center', description: 'Document storage + sharing', category: 'admin' },
  { key: 'role_permissions', label: 'Role Permissions', description: 'Granular role-based access control', category: 'admin' },
  { key: 'advanced_reports', label: 'Advanced Reports', description: 'Custom + scheduled reports', category: 'admin' },
  { key: 'data_retention', label: 'Data Retention', description: 'Custom data retention policies', category: 'admin' },
  { key: 'advanced_security', label: 'Advanced Security', description: 'SSO, audit logs, IP allowlists', category: 'admin' },
];

// ─── Plan tiers ──────────────────────────────────────────────────────────────

/**
 * The 5 plan tiers we gate against. `'trial'` is a virtual tier — when
 * `tenant.planStatus === 'trial'`, callers should resolve to `'trial'`
 * regardless of `tenant.plan`. See `resolvePlanTier()`.
 */
export const PLAN_TIERS = [
  'trial',
  'starter',
  'growth',
  'business',
  'enterprise',
] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

/**
 * Default matrix — initial seed values for the `PlanFeatureMatrix` table.
 * Superadmin can override any cell via the matrix UI; those overrides
 * persist in the DB and are respected by all lookups.
 */
export const DEFAULT_PLAN_MATRIX: Record<PlanTier, Record<string, boolean>> = {
  // Trial: full CRM + operations + finance + KB + docs so users can explore.
  // workflows=true so trial users can experiment; everything else gated off.
  trial: {
    // CRM (all)
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, customer_360: true, sales_pipeline: true, reviews: true,
    // Communication (none)
    live_chat: false, sms_numbers: false, ai_receptionist: false, whatsapp: false,
    email_integration: false, omnichannel_inbox: false, ai_assistant: false,
    ai_quote_generator: false, ai_job_summary: false, ai_suggested_replies: false,
    ai_form_generator: false,
    // Automation (workflows only — so trial users can experiment)
    workflows: true, form_builder: false, marketing_campaigns: false, broadcast: false,
    customer_segments: false, template_studio: false, retargeting: false, journey_automation: false,
    // Operations (all basic — route_optimization is disabled on every tier; the standalone
    // route-optimization-view.tsx was a stub and has been deleted. Real auto-dispatch lives in
    // dispatch-view via /api/dispatch/smart, gated by dispatch_board + gps_tracking.)
    // dispatch_board + gps_tracking are growth+/business+ per tier model (solo operator doesn't need them)
    dispatch_board: false, gps_tracking: false, customer_portal: true, employee_portal: true,
    online_booking: true, time_tracking: true, expenses: true, digital_signatures: true,
    before_after_photos: true, checklists: true, route_optimization: false,
    // Finance (recurring_invoices is growth+ per tier model)
    online_payments: true, recurring_invoices: false, service_plans: true, warranties: true,
    tax_rules: true, multi_currency: true,
    // Inventory (none)
    inventory: false, purchase_orders: false, recurring_jobs: false,
    // Admin (KB + docs only)
    white_label: false, api_access: false, webhooks: false, knowledge_base: true,
    document_center: true, role_permissions: false, advanced_reports: false,
    data_retention: false, advanced_security: false,
  },
  // Starter: trial MINUS workflows (locked behind growth+)
  starter: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, customer_360: true, sales_pipeline: true, reviews: true,
    live_chat: false, sms_numbers: false, ai_receptionist: false, whatsapp: false,
    email_integration: false, omnichannel_inbox: false, ai_assistant: false,
    ai_quote_generator: false, ai_job_summary: false, ai_suggested_replies: false,
    ai_form_generator: false,
    workflows: false, form_builder: false, marketing_campaigns: false, broadcast: false,
    customer_segments: false, template_studio: false, retargeting: false, journey_automation: false,
    // Starter = solo operator: no dispatch_board, no gps_tracking, no recurring_invoices
    dispatch_board: false, gps_tracking: false, customer_portal: true, employee_portal: true,
    online_booking: true, time_tracking: true, expenses: true, digital_signatures: true,
    before_after_photos: true, checklists: true, route_optimization: false,
    online_payments: true, recurring_invoices: false, service_plans: true, warranties: true,
    tax_rules: true, multi_currency: true,
    inventory: false, purchase_orders: false, recurring_jobs: false,
    white_label: false, api_access: false, webhooks: false, knowledge_base: true,
    document_center: true, role_permissions: false, advanced_reports: false,
    data_retention: false, advanced_security: false,
  },
  // Professional (internal code: 'growth') — adds AI/messaging/automation stack
  growth: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, customer_360: true, sales_pipeline: true, reviews: true,
    live_chat: true, sms_numbers: false, ai_receptionist: false, whatsapp: true,
    email_integration: true, omnichannel_inbox: true, ai_assistant: true,
    ai_quote_generator: true, ai_job_summary: true, ai_suggested_replies: true,
    ai_form_generator: true,
    workflows: true, form_builder: true, marketing_campaigns: true, broadcast: true,
    customer_segments: true, template_studio: true, retargeting: false, journey_automation: false,
    // Professional: dispatch_board + recurring_invoices enabled; gps_tracking still business+
    dispatch_board: true, gps_tracking: false, customer_portal: true, employee_portal: true,
    online_booking: true, time_tracking: true, expenses: true, digital_signatures: true,
    before_after_photos: true, checklists: true, route_optimization: false,
    online_payments: true, recurring_invoices: true, service_plans: true, warranties: true,
    tax_rules: true, multi_currency: true,
    inventory: false, purchase_orders: false, recurring_jobs: false,
    white_label: false, api_access: true, webhooks: true, knowledge_base: true,
    document_center: true, role_permissions: false, advanced_reports: false,
    data_retention: false, advanced_security: false,
  },
  // Business — adds AI Receptionist, SMS numbers, inventory, RBAC, reports
  // (route_optimization stays false — see note above the trial block; the dead stub view is gone)
  business: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, customer_360: true, sales_pipeline: true, reviews: true,
    live_chat: true, sms_numbers: true, ai_receptionist: true, whatsapp: true,
    email_integration: true, omnichannel_inbox: true, ai_assistant: true,
    ai_quote_generator: true, ai_job_summary: true, ai_suggested_replies: true,
    ai_form_generator: true,
    workflows: true, form_builder: true, marketing_campaigns: true, broadcast: true,
    customer_segments: true, template_studio: true, retargeting: false, journey_automation: false,
    dispatch_board: true, gps_tracking: true, customer_portal: true, employee_portal: true,
    online_booking: true, time_tracking: true, expenses: true, digital_signatures: true,
    before_after_photos: true, checklists: true, route_optimization: false,
    online_payments: true, recurring_invoices: true, service_plans: true, warranties: true,
    tax_rules: true, multi_currency: true,
    inventory: true, purchase_orders: true, recurring_jobs: true,
    white_label: false, api_access: true, webhooks: true, knowledge_base: true,
    document_center: true, role_permissions: true, advanced_reports: true,
    data_retention: false, advanced_security: false,
  },
  // Enterprise — adds white-label, data retention, advanced security
  // (route_optimization stays false — see note above the trial block; the dead stub view is gone)
  enterprise: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, customer_360: true, sales_pipeline: true, reviews: true,
    live_chat: true, sms_numbers: true, ai_receptionist: true, whatsapp: true,
    email_integration: true, omnichannel_inbox: true, ai_assistant: true,
    ai_quote_generator: true, ai_job_summary: true, ai_suggested_replies: true,
    ai_form_generator: true,
    workflows: true, form_builder: true, marketing_campaigns: true, broadcast: true,
    customer_segments: true, template_studio: true, retargeting: false, journey_automation: false,
    dispatch_board: true, gps_tracking: true, customer_portal: true, employee_portal: true,
    online_booking: true, time_tracking: true, expenses: true, digital_signatures: true,
    before_after_photos: true, checklists: true, route_optimization: false,
    online_payments: true, recurring_invoices: true, service_plans: true, warranties: true,
    tax_rules: true, multi_currency: true,
    inventory: true, purchase_orders: true, recurring_jobs: true,
    white_label: true, api_access: true, webhooks: true, knowledge_base: true,
    document_center: true, role_permissions: true, advanced_reports: true,
    data_retention: true, advanced_security: true,
  },
};

/**
 * Pricing legend shown in the superadmin matrix UI. Pure presentational
 * metadata — never used for billing logic (the Plan table is authoritative
 * for prices). USD pricing.
 */
export const PLAN_TIER_LEGEND: Record<PlanTier, string> = {
  trial: 'free 14-day',
  starter: '$29/mo',
  growth: '$79/mo',
  business: '$149/mo',
  enterprise: 'Contact us',
};

/**
 * Display names for each plan tier. Used by the billing UI, upgrade modal,
 * and trial banner. NOTE: the 'growth' internal code is displayed as
 * 'Professional' in the UI (the underlying tier string in the DB / API stays
 * 'growth' so existing logic is unaffected — this is purely a presentational
 * mapping).
 */
export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Professional',
  business: 'Business',
  enterprise: 'Enterprise',
};

// ─── Tier resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the effective plan tier for a tenant.
 *
 * `'trial'` is virtual: if `planStatus === 'trial'`, we always return `'trial'`
 * regardless of `plan` (so a trial user on the 'growth' plan is still gated by
 * the trial column). When not on trial, the `plan` string is matched against
 * the canonical tier list and falls back to `'starter'` if unknown.
 */
export function resolvePlanTier(plan: string, planStatus: string): PlanTier {
  if (planStatus === 'trial') return 'trial';
  if ((PLAN_TIERS as readonly string[]).includes(plan)) return plan as PlanTier;
  return 'starter'; // safe default
}

/**
 * Numeric rank for a plan tier — higher = more features.
 * Used to compare the current tenant's tier against a menu item's `minPlan`.
 *
 *   planRank('trial') = 0
 *   planRank('starter') = 1
 *   planRank('growth') = 2
 *   planRank('business') = 3
 *   planRank('enterprise') = 4
 *
 * Unknown plans default to 0 (trial-level access) so a malformed tenant
 * record doesn't accidentally unlock paid features.
 */
export function planRank(tier: string): number {
  const idx = PLAN_TIERS.indexOf(tier as PlanTier);
  return idx === -1 ? 0 : idx;
}

/**
 * Client-side mirror of `resolvePlanTier`. Exported so client hooks can
 * compute the tier from `useAppStore(s => s.auth.tenant)` without importing
 * the (server-only) `db`-depending module path.
 */
export function resolvePlanTierClient(plan: string | undefined | null, planStatus: string | undefined | null): PlanTier {
  if (planStatus === 'trial') return 'trial';
  if (plan && (PLAN_TIERS as readonly string[]).includes(plan)) return plan as PlanTier;
  return 'starter';
}

// ─── DB-backed lookups ───────────────────────────────────────────────────────

/**
 * Lookup: is this feature enabled for this plan tier?
 *
 * 1. Try the `PlanFeatureMatrix` row for (planTier, featureKey).
 * 2. If found → return its `enabled` value.
 * 3. If not found → fall back to `DEFAULT_PLAN_MATRIX[planTier][featureKey]`,
 *    upsert the row with that default (so the matrix self-populates for the
 *    superadmin UI), and return the value.
 *
 * Unknown feature keys default to `false` (fail-closed).
 */
export async function isFeatureEnabledForPlan(
  featureKey: string,
  planTier: PlanTier,
): Promise<boolean> {
  // Fast path — row already exists in the DB.
  try {
    const existing = await db.planFeatureMatrix.findUnique({
      where: {
        planCode_featureKey: { planCode: planTier, featureKey },
      },
      select: { enabled: true },
    });
    if (existing) return existing.enabled;
  } catch (err) {
    // The table may not exist yet on some Supabase setups or during `next
    // build` module evaluation. Fall through to the default-matrix lookup
    // so the feature still resolves (fail-open for core CRM, fail-closed
    // for add-ons) instead of throwing.
    console.warn(`[plan-features] PlanFeatureMatrix lookup failed for (${planTier}, ${featureKey}):`, err);
  }

  // Slow path — miss. Resolve from defaults, then backfill the row.
  const defaultValue =
    DEFAULT_PLAN_MATRIX[planTier]?.[featureKey] ?? false;

  try {
    await db.planFeatureMatrix.upsert({
      where: {
        planCode_featureKey: { planCode: planTier, featureKey },
      },
      update: {}, // don't clobber an existing row (race safety)
      create: {
        planCode: planTier,
        featureKey,
        enabled: defaultValue,
      },
    });
  } catch (err) {
    // Non-fatal — another concurrent request may have inserted the row, or
    // the table isn't reachable. We still return the default so the caller
    // gets a deterministic answer.
    console.warn(`[plan-features] PlanFeatureMatrix upsert failed for (${planTier}, ${featureKey}):`, err);
  }

  return defaultValue;
}

/**
 * Bulk lookup: get all feature flags for a plan tier.
 *
 * Used by the sidebar (via `/api/plan-features/check`) and the superadmin
 * matrix UI. Returns a `{ [featureKey]: boolean }` map covering every key in
 * `PLAN_FEATURE_DEFS`, falling back to `DEFAULT_PLAN_MATRIX` on any miss.
 */
export async function getFeaturesForPlan(
  planTier: PlanTier,
): Promise<Record<string, boolean>> {
  // Start from the default matrix so callers always get every key, even if
  // the DB row hasn't been seeded yet.
  const result: Record<string, boolean> = {
    ...DEFAULT_PLAN_MATRIX[planTier],
  };

  try {
    const rows = await db.planFeatureMatrix.findMany({
      where: { planCode: planTier },
      select: { featureKey: true, enabled: true },
    });
    for (const row of rows) {
      result[row.featureKey] = row.enabled;
    }
  } catch (err) {
    // DB not reachable — return the default matrix as a graceful fallback.
    console.warn(`[plan-features] getFeaturesForPlan(${planTier}) DB read failed:`, err);
  }

  return result;
}

/**
 * Seed the entire `PlanFeatureMatrix` table from `DEFAULT_PLAN_MATRIX`.
 *
 * Idempotent — uses `upsert` with an empty `update` so existing overrides
 * are preserved. Returns the number of new rows actually inserted (rows that
 * already existed are not counted).
 */
export async function seedPlanFeatureMatrix(): Promise<{ seeded: number }> {
  let seeded = 0;

  for (const tier of PLAN_TIERS) {
    const defaults = DEFAULT_PLAN_MATRIX[tier];
    for (const [featureKey, enabled] of Object.entries(defaults)) {
      try {
        // `upsert` with `update: {}` is a "create-if-missing" — it will NOT
        // clobber an admin override on an existing row.
        const row = await db.planFeatureMatrix.upsert({
          where: {
            planCode_featureKey: { planCode: tier, featureKey },
          },
          update: {},
          create: {
            planCode: tier,
            featureKey,
            enabled,
          },
        });
        // Prisma's upsert returns the row; we can't tell from the row alone
        // whether it was created or already existed (createdAt vs updatedAt
        // would, but that's two extra fields). Use a count-by-create approach
        // by checking if createdAt === updatedAt (true only on initial insert).
        if (row.createdAt.getTime() === row.updatedAt.getTime()) {
          seeded++;
        }
      } catch (err) {
        console.warn(`[plan-features] seed: failed to upsert (${tier}, ${featureKey}):`, err);
      }
    }
  }

  return { seeded };
}

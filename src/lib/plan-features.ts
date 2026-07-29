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
  | 'finance'
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
  // ── Core CRM — enabled on all plans (including trial) ─────────────────────
  { key: 'customers', label: 'Customers', description: 'Customer database', category: 'crm' },
  { key: 'leads', label: 'Leads', description: 'Lead pipeline', category: 'crm' },
  { key: 'jobs', label: 'Jobs', description: 'Job management', category: 'crm' },
  { key: 'quotes', label: 'Quotes', description: 'Quote builder', category: 'finance' },
  { key: 'invoices', label: 'Invoices', description: 'Invoice generation', category: 'finance' },
  { key: 'reports', label: 'Reports', description: 'Analytics dashboard', category: 'crm' },
  { key: 'live_chat', label: 'Live Chat', description: 'Website live chat widget', category: 'communication' },

  // ── Communication add-ons — trial/starter locked ──────────────────────────
  { key: 'sms_numbers', label: 'SMS Numbers', description: 'Buy dedicated phone numbers for SMS + call forwarding', category: 'communication' },
  { key: 'ai_receptionist', label: 'AI Receptionist', description: 'AI-answered voice calls via Vapi', category: 'communication' },
  { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp Business integration', category: 'communication' },
  { key: 'email_campaigns', label: 'Email Campaigns', description: 'Bulk email marketing', category: 'communication' },

  // ── Marketing — growth+ only ──────────────────────────────────────────────
  { key: 'campaigns', label: 'Marketing Campaigns', description: 'SMS/WhatsApp bulk campaigns', category: 'automation' },
  { key: 'broadcast', label: 'Broadcast', description: 'One-to-many messaging', category: 'automation' },
  { key: 'retargeting', label: 'Retargeting', description: 'Audience retargeting rules', category: 'automation' },

  // ── Automation — growth+ only ─────────────────────────────────────────────
  { key: 'workflows', label: 'Workflows', description: 'Visual workflow builder', category: 'automation' },
  { key: 'journey_automation', label: 'Journey Automation', description: 'Customer journey automation', category: 'automation' },

  // ── Admin — business+ only ────────────────────────────────────────────────
  { key: 'white_label', label: 'White Label', description: 'Custom branding', category: 'admin' },
  { key: 'api_access', label: 'API Access', description: 'Developer API keys', category: 'admin' },
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
  trial: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, live_chat: true,
    sms_numbers: false, ai_receptionist: false, whatsapp: false, email_campaigns: false,
    campaigns: false, broadcast: false, retargeting: false,
    workflows: true, journey_automation: false,
    white_label: false, api_access: false,
  },
  starter: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, live_chat: true,
    sms_numbers: false, ai_receptionist: false, whatsapp: false, email_campaigns: false,
    campaigns: false, broadcast: false, retargeting: false,
    workflows: true, journey_automation: false,
    white_label: false, api_access: false,
  },
  growth: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, live_chat: true,
    sms_numbers: true, ai_receptionist: true, whatsapp: true, email_campaigns: true,
    campaigns: true, broadcast: true, retargeting: true,
    workflows: true, journey_automation: true,
    white_label: false, api_access: false,
  },
  business: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, live_chat: true,
    sms_numbers: true, ai_receptionist: true, whatsapp: true, email_campaigns: true,
    campaigns: true, broadcast: true, retargeting: true,
    workflows: true, journey_automation: true,
    white_label: false, api_access: true,
  },
  enterprise: {
    customers: true, leads: true, jobs: true, quotes: true, invoices: true,
    reports: true, live_chat: true,
    sms_numbers: true, ai_receptionist: true, whatsapp: true, email_campaigns: true,
    campaigns: true, broadcast: true, retargeting: true,
    workflows: true, journey_automation: true,
    white_label: true, api_access: true,
  },
};

/**
 * Pricing legend shown in the superadmin matrix UI. Pure presentational
 * metadata — never used for billing logic (the Plan table is authoritative
 * for prices).
 */
export const PLAN_TIER_LEGEND: Record<PlanTier, string> = {
  trial: 'free 14-day',
  starter: '£5/mo',
  growth: '£29/mo',
  business: '£79/mo',
  enterprise: 'Contact us',
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

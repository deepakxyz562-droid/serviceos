/**
 * Revenue feature toggles.
 *
 * RevenueFeatureToggle is the global on/off + pricing metadata for each
 * monetisable feature (commission, featured listings, AI credits, SMS/WhatsApp
 * billing, white-label, premium integrations). SuperAdmin controls the global
 * toggle and the pricing JSON; per-tenant overrides (when allowed) live in the
 * existing FeatureFlag table keyed by the same featureKey.
 *
 * Resolution order for isRevenueFeatureEnabled(featureKey, tenantId?):
 *   1. Load RevenueFeatureToggle by featureKey.
 *      - If missing or globally disabled → false.
 *      - If !perTenantOverride → return `enabled` (global only).
 *   2. If tenantId provided AND perTenantOverride is true:
 *      - Look up FeatureFlag(tenantId, featureKey).
 *      - If a flag row exists, return its `enabled` value (override wins).
 *      - Else fall back to defaultForNewTenants.
 *   3. Else (no tenantId) → return global `enabled`.
 *
 * The seeder is idempotent — it only inserts rows that don't yet exist, so
 * admin edits to displayName / pricing / enabled are preserved on re-runs.
 */
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface RevenueFeatureDef {
  featureKey: string;
  displayName: string;
  description: string;
  enabled: boolean;
  perTenantOverride: boolean;
  defaultForNewTenants: boolean;
  pricingJson: string;
  configJson: string;
}

/**
 * Canonical revenue feature definitions.
 *
 * Keep this array in sync with the RevenueFeatureToggle table — running
 * seedRevenueFeatureToggles() will insert any missing rows.
 */
export const REVENUE_FEATURE_DEFS: RevenueFeatureDef[] = [
  {
    featureKey: 'marketplace_commission',
    displayName: 'Marketplace Commission',
    description: '5% commission on marketplace-generated jobs',
    enabled: true,
    perTenantOverride: false,
    defaultForNewTenants: true,
    pricingJson: '{"commissionPct": 5}',
    configJson: '{}',
  },
  {
    featureKey: 'featured_listing',
    displayName: 'Featured Listing',
    description: 'Priority placement in marketplace search results',
    enabled: true,
    perTenantOverride: true,
    defaultForNewTenants: false,
    pricingJson: '{"cost": 20, "currency": "USD", "billingCycle": "monthly"}',
    configJson: '{}',
  },
  {
    featureKey: 'ai_credits',
    displayName: 'AI Credits',
    description: 'Pay-per-use AI features beyond plan quota',
    enabled: true,
    perTenantOverride: true,
    defaultForNewTenants: true,
    pricingJson: '{"cost": 15, "currency": "USD", "billingCycle": "monthly", "credits": 1000}',
    configJson: '{}',
  },
  {
    featureKey: 'sms_billing',
    displayName: 'SMS Usage Billing',
    description: 'Pay-per-use SMS messages',
    enabled: true,
    perTenantOverride: false,
    defaultForNewTenants: true,
    pricingJson: '{"costPerSms": 0.05, "currency": "USD"}',
    configJson: '{}',
  },
  {
    featureKey: 'whatsapp_billing',
    displayName: 'WhatsApp Usage Billing',
    description: 'Pay-per-use WhatsApp messages',
    enabled: true,
    perTenantOverride: false,
    defaultForNewTenants: true,
    pricingJson: '{"costPerMsg": 0.03, "currency": "USD"}',
    configJson: '{}',
  },
  {
    featureKey: 'white_label_billing',
    displayName: 'White Label Portal',
    description: 'Custom branding and domain',
    enabled: true,
    perTenantOverride: true,
    defaultForNewTenants: false,
    pricingJson: '{"cost": 20, "currency": "USD", "billingCycle": "monthly"}',
    configJson: '{}',
  },
  {
    featureKey: 'premium_integrations',
    displayName: 'Premium Integrations',
    description: 'QuickBooks, Xero, advanced API access',
    enabled: true,
    perTenantOverride: true,
    defaultForNewTenants: false,
    pricingJson: '{"cost": 15, "currency": "USD", "billingCycle": "monthly"}',
    configJson: '{}',
  },
];

/**
 * Idempotent seeder. Inserts any RevenueFeatureToggle rows that don't yet
 * exist (by featureKey). Existing rows are left untouched so admin edits to
 * displayName / pricing / enabled / perTenantOverride are preserved.
 *
 * @returns { seeded: number, skipped: number }
 */
export async function seedRevenueFeatureToggles(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;

  try {
    // Load all existing toggles in one round-trip.
    const existing = await db.revenueFeatureToggle.findMany({
      where: { featureKey: { in: REVENUE_FEATURE_DEFS.map((d) => d.featureKey) } },
      select: { featureKey: true },
    });
    const existingKeys = new Set(existing.map((e) => e.featureKey));

    for (const def of REVENUE_FEATURE_DEFS) {
      if (existingKeys.has(def.featureKey)) {
        skipped++;
        continue;
      }
      try {
        await db.revenueFeatureToggle.create({
          data: {
            featureKey: def.featureKey,
            displayName: def.displayName,
            description: def.description,
            enabled: def.enabled,
            perTenantOverride: def.perTenantOverride,
            defaultForNewTenants: def.defaultForNewTenants,
            pricingJson: def.pricingJson,
            configJson: def.configJson,
          },
        });
        seeded++;
      } catch (error) {
        // Race / unique-constraint → treat as skipped (already there)
        logger.warn({ error, featureKey: def.featureKey }, 'seedRevenueFeatureToggles: create failed, skipping');
        skipped++;
      }
    }

    logger.info({ seeded, skipped }, 'seedRevenueFeatureToggles: complete');
    return { seeded, skipped };
  } catch (error) {
    logger.error({ error }, 'seedRevenueFeatureToggles: failed');
    return { seeded, skipped };
  }
}

/**
 * Resolve whether a revenue feature is enabled for a given tenant.
 *
 * Resolution order (see module docstring for full detail):
 *   1. Global RevenueFeatureToggle must exist and be enabled.
 *   2. If perTenantOverride is true AND tenantId is provided:
 *        - FeatureFlag(tenantId, featureKey).enabled wins if a row exists.
 *        - Else fall back to defaultForNewTenants.
 *   3. Otherwise return the global `enabled` value.
 *
 * Returns false on any error (fail-closed — features off unless explicitly on).
 */
export async function isRevenueFeatureEnabled(featureKey: string, tenantId?: string): Promise<boolean> {
  if (!featureKey) return false;

  try {
    const toggle = await db.revenueFeatureToggle.findUnique({
      where: { featureKey },
      select: {
        enabled: true,
        perTenantOverride: true,
        defaultForNewTenants: true,
      },
    });

    // Missing toggle or globally disabled → off.
    if (!toggle || !toggle.enabled) return false;

    // No per-tenant override allowed (or no tenant supplied) → global value.
    if (!toggle.perTenantOverride || !tenantId) return toggle.enabled;

    // Per-tenant override allowed — check FeatureFlag row.
    const flag = await db.featureFlag.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      select: { enabled: true },
    });

    if (flag) return flag.enabled;

    // No explicit override row — fall back to the default for new tenants.
    return toggle.defaultForNewTenants;
  } catch (error) {
    logger.error({ error, featureKey, tenantId }, 'isRevenueFeatureEnabled: failed');
    return false;
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { createAllCreemProducts } from '@/lib/creem';

/**
 * POST /api/superadmin/creem/create-all-products
 *
 * Creates all expected Creem products in one shot:
 *   - starter  × (monthly + yearly)
 *   - growth   × (monthly + yearly)
 *   - business × (monthly + yearly)
 *   - sms_number (monthly only — $5/month add-on)
 *   - AI_RECEPTIONIST_STARTER/PRO/BUSINESS (monthly — Phase 9.8 addon plans)
 *
 * Enterprise is contact-sales (monthlyPrice=0) so it is SKIPPED by
 * `createAllCreemProducts()`.
 *
 * The returned product IDs are MERGED into
 * `RevenueFeatureToggle.configJson.products` — existing keys are only
 * overwritten when the new creation succeeded. Failures are reported back so
 * the UI can show partial success.
 *
 * Auth: superadmin only. Returns 403 otherwise.
 *
 * Response: { created: [...], failed: [...], savedCount: number }
 */
const CREEM_FEATURE_KEY = 'creem_billing';

export async function POST() {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 }
      );
    }

    // ── Create the products (calls Creem API) ─────────────────────────────
    // Failures are collected (not thrown) so we can persist the partial set.
    const result = await createAllCreemProducts();

    // ── Persist successful IDs into RevenueFeatureToggle.configJson.products ──
    // Merge with existing — only overwrite a key/cycle when the new creation
    // succeeded. Don't touch keys that already had a value if the new creation
    // failed (preserve the previous good ID).
    let savedCount = 0;
    if (result.created.length > 0) {
      const toggle = await db.revenueFeatureToggle.findUnique({
        where: { featureKey: CREEM_FEATURE_KEY },
      });

      let prevConfig: Record<string, unknown> = {};
      try {
        prevConfig = toggle?.configJson ? JSON.parse(toggle.configJson) : {};
      } catch {
        prevConfig = {};
      }
      const prevProducts =
        (prevConfig.products as
          | Record<string, { monthly?: string; yearly?: string }>
          | undefined) || {};

      const nextProducts: Record<string, { monthly?: string; yearly?: string }> = {
        ...prevProducts,
      };
      for (const c of result.created) {
        const entry = { ...(nextProducts[c.planCode] || {}) };
        if (c.cycle === 'monthly') entry.monthly = c.productId;
        else if (c.cycle === 'yearly') entry.yearly = c.productId;
        nextProducts[c.planCode] = entry;
      }

      const nextConfig = { ...prevConfig, products: nextProducts };

      if (toggle) {
        await db.revenueFeatureToggle.update({
          where: { featureKey: CREEM_FEATURE_KEY },
          data: {
            // Don't change the `enabled` flag here — the admin may have
            // intentionally disabled it. We only update the product map.
            configJson: JSON.stringify(nextConfig),
          },
        });
      } else {
        // No existing toggle row — create one with just the products map. The
        // admin still needs to add an API key separately before checkout works
        // (createAllCreemProducts() would have thrown earlier if no key was
        // configured, so reaching here means a key IS set, but the row may not
        // exist yet if the admin configured Creem via env vars directly).
        await db.revenueFeatureToggle.create({
          data: {
            featureKey: CREEM_FEATURE_KEY,
            displayName: 'Creem Billing',
            description: 'Creem merchant-of-record checkout (PayPal fallback).',
            enabled: true,
            perTenantOverride: false,
            defaultForNewTenants: true,
            pricingJson: '{}',
            configJson: JSON.stringify(nextConfig),
          },
        });
      }
      savedCount = result.created.length;
    }

    return NextResponse.json({
      created: result.created,
      failed: result.failed,
      savedCount,
    });
  } catch (error) {
    console.error('[superadmin/creem/create-all-products] error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create products',
        created: [],
        failed: [],
        savedCount: 0,
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/addons/seed-catalog
 * ─────────────────────────────────────────────────────────────────────────
 * Seeds (or refreshes) the AddonProduct + AddonPlan catalog and the
 * RevenueFeatureToggle row that the checkout route reads.
 *
 * This is the runtime equivalent of the seed block in prisma/seed.ts —
 * call this after a deploy where prisma/seed.ts was NOT run (e.g. on an
 * existing production DB that cannot be wiped).
 *
 * Idempotent: uses upsert on `code` — safe to call repeatedly.
 *
 * Auth: SUPERADMIN only. The catalog is platform-wide, not per-tenant.
 */
const ADDON_PRODUCTS = [
  {
    code: 'AI_RECEPTIONIST',
    name: 'AI Receptionist',
    description:
      '24/7 AI receptionist for calls, chats, and bookings. Handles lead capture, appointment booking, and human transfer.',
    isActive: true,
    sortOrder: 1,
    plans: [
      { code: 'AI_RECEPTIONIST_STARTER', name: 'AI Receptionist Starter', description: '150 AI voice minutes per month. 1 concurrent call. 1 phone number included.', price: 29.0, currency: 'USD', billingCycle: 'monthly', includedSeconds: 9000, maxCallDurationSeconds: 600, maxConcurrentCalls: 1, includedNumbers: 1, sortOrder: 1 },
      { code: 'AI_RECEPTIONIST_PRO', name: 'AI Receptionist Pro', description: '400 AI voice minutes per month. 3 concurrent calls. 1 phone number included.', price: 59.0, currency: 'USD', billingCycle: 'monthly', includedSeconds: 24000, maxCallDurationSeconds: 600, maxConcurrentCalls: 3, includedNumbers: 1, sortOrder: 2 },
      { code: 'AI_RECEPTIONIST_BUSINESS', name: 'AI Receptionist Business', description: '1,000 AI voice minutes per month. 10 concurrent calls. 1 phone number included.', price: 129.0, currency: 'USD', billingCycle: 'monthly', includedSeconds: 60000, maxCallDurationSeconds: 600, maxConcurrentCalls: 10, includedNumbers: 1, sortOrder: 3 },
      { code: 'AI_RECEPTIONIST_ENTERPRISE', name: 'AI Receptionist Enterprise', description: 'Custom AI voice minutes, concurrency, and numbers. BYOK available.', price: 0, currency: 'USD', billingCycle: 'monthly', includedSeconds: 0, maxCallDurationSeconds: 0, maxConcurrentCalls: 0, includedNumbers: 0, sortOrder: 4 },
    ],
  },
  {
    code: 'AI_PHONE_NUMBER',
    name: 'Additional AI Phone Number',
    description: 'Additional phone number for AI Receptionist. $5/month per number.',
    isActive: true,
    sortOrder: 2,
    plans: [
      { code: 'AI_PHONE_NUMBER_ADDITIONAL', name: 'Additional AI Phone Number', description: 'One additional phone number for AI Receptionist.', price: 5.0, currency: 'USD', billingCycle: 'monthly', includedSeconds: 0, maxCallDurationSeconds: 0, maxConcurrentCalls: 0, includedNumbers: 1, sortOrder: 1 },
    ],
  },
];

export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'SuperAdmin only — the addon catalog is platform-wide' },
        { status: 403 },
      );
    }

    const results: string[] = [];

    for (const product of ADDON_PRODUCTS) {
      const { plans, ...productData } = product;
      const upsertedProduct = await db.addonProduct.upsert({
        where: { code: productData.code },
        create: productData,
        update: {
          name: productData.name,
          description: productData.description,
          isActive: productData.isActive,
          sortOrder: productData.sortOrder,
        },
      });
      results.push(`${upsertedProduct.code}: ${upsertedProduct.name}`);

      for (const plan of plans) {
        const upsertedPlan = await db.addonPlan.upsert({
          where: { code: plan.code },
          create: { ...plan, addonProductId: upsertedProduct.id },
          update: {
            name: plan.name,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            billingCycle: plan.billingCycle,
            includedSeconds: plan.includedSeconds,
            maxCallDurationSeconds: plan.maxCallDurationSeconds,
            maxConcurrentCalls: plan.maxConcurrentCalls,
            includedNumbers: plan.includedNumbers,
            isActive: true,
            sortOrder: plan.sortOrder,
            addonProductId: upsertedProduct.id,
          },
        });
        results.push(
          `  ${upsertedPlan.code}: $${upsertedPlan.price}/${upsertedPlan.billingCycle} (${Math.floor(upsertedPlan.includedSeconds / 60)} min)`,
        );
      }
    }

    await db.revenueFeatureToggle.upsert({
      where: { featureKey: 'ai_receptionist_billing' },
      create: {
        featureKey: 'ai_receptionist_billing',
        displayName: 'AI Receptionist Billing',
        description:
          'Creem product ID map for AI Receptionist addon plans. SuperAdmin populates configJson.products[planCode][cycle] with real Creem product IDs.',
        enabled: true,
        perTenantOverride: false,
        defaultForNewTenants: true,
        pricingJson: JSON.stringify({ currency: 'USD', billingCycle: 'monthly' }),
        configJson: JSON.stringify({ products: {} }),
      },
      update: {
        displayName: 'AI Receptionist Billing',
        description:
          'Creem product ID map for AI Receptionist addon plans. SuperAdmin populates configJson.products[planCode][cycle] with real Creem product IDs.',
      },
    });
    results.push('ai_receptionist_billing toggle (configJson.products = {} — populate via SuperAdmin Revenue Dashboard)');

    return NextResponse.json({
      ok: true,
      seeded: results,
      note:
        'RevenueFeatureToggle.configJson.products is empty. The SuperAdmin Revenue Dashboard must populate it with real Creem product IDs (e.g. {"AI_RECEPTIONIST_STARTER":{"monthly":"prod_xxx"}}) before /api/addons/checkout will succeed.',
    });
  } catch (error) {
    console.error('[POST /api/addons/seed-catalog] error:', error);
    return NextResponse.json(
      { error: 'Failed to seed addon catalog' },
      { status: 500 },
    );
  }
}

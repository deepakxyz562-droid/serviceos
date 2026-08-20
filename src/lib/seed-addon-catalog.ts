/**
 * Seed script for AddonProduct + AddonPlan
 * =========================================
 *
 * Seeds the add-on catalog with the AI Receptionist product + its 3 price tiers.
 *
 * Run with: `bun run src/lib/seed-addon-catalog.ts`
 *
 * Idempotent: uses upsert on `code` — safe to run multiple times.
 *
 * NOTE: `creemProductId` and `creemPriceId` are left null — they're populated
 * by the superadmin when they create the corresponding products in Creem.
 * The tenant checkout flow will fail with a clear error if these aren't set.
 */

import { db } from '@/lib/db';

const ADDON_PRODUCTS = [
  {
    code: 'AI_RECEPTIONIST',
    name: 'AI Receptionist',
    description:
      '24/7 AI receptionist for calls, chats, and bookings. Handles lead capture, appointment booking, and human transfer.',
    isActive: true,
    sortOrder: 1,
    plans: [
      {
        code: 'AI_RECEPTIONIST_STARTER',
        name: 'AI Receptionist Starter',
        description: '50 AI voice minutes per month. 1 concurrent call. 1 phone number included.',
        price: 29.0,
        currency: 'USD',
        billingCycle: 'monthly',
        includedSeconds: 3000, // 50 min × 60
        maxCallDurationSeconds: 600, // 10 min
        maxConcurrentCalls: 1,
        includedNumbers: 1,
        sortOrder: 1,
      },
      {
        code: 'AI_RECEPTIONIST_PRO',
        name: 'AI Receptionist Pro',
        description:
          '200 AI voice minutes per month. 3 concurrent calls. 1 phone number included. (Provisional — pricing subject to validation.)',
        price: 59.0,
        currency: 'USD',
        billingCycle: 'monthly',
        includedSeconds: 12000, // 200 min × 60
        maxCallDurationSeconds: 600,
        maxConcurrentCalls: 3,
        includedNumbers: 1,
        sortOrder: 2,
      },
      {
        code: 'AI_RECEPTIONIST_BUSINESS',
        name: 'AI Receptionist Business',
        description: '500 AI voice minutes per month. 10 concurrent calls. 1 phone number included.',
        price: 129.0,
        currency: 'USD',
        billingCycle: 'monthly',
        includedSeconds: 30000, // 500 min × 60
        maxCallDurationSeconds: 600,
        maxConcurrentCalls: 10,
        includedNumbers: 1,
        sortOrder: 3,
      },
      {
        code: 'AI_RECEPTIONIST_ENTERPRISE',
        name: 'AI Receptionist Enterprise',
        description: 'Custom AI voice minutes, concurrency, and numbers. BYOK available.',
        price: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        includedSeconds: 0, // custom
        maxCallDurationSeconds: 0, // custom
        maxConcurrentCalls: 0, // custom
        includedNumbers: 0, // custom
        sortOrder: 4,
      },
    ],
  },
  {
    code: 'AI_PHONE_NUMBER',
    name: 'Additional AI Phone Number',
    description: 'Additional phone number for AI Receptionist. $5/month per number.',
    isActive: true,
    sortOrder: 2,
    plans: [
      {
        code: 'AI_PHONE_NUMBER_ADDITIONAL',
        name: 'Additional AI Phone Number',
        description: 'One additional phone number for AI Receptionist.',
        price: 5.0,
        currency: 'USD',
        billingCycle: 'monthly',
        includedSeconds: 0,
        maxCallDurationSeconds: 0,
        maxConcurrentCalls: 0,
        includedNumbers: 1,
        sortOrder: 1,
      },
    ],
  },
];

export async function seedAddonCatalog() {
  console.log('[seed-addon-catalog] starting...');

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

    console.log(`[seed-addon-catalog] ${upsertedProduct.code}: ${upsertedProduct.name}`);

    for (const plan of plans) {
      const upsertedPlan = await db.addonPlan.upsert({
        where: { code: plan.code },
        create: {
          ...plan,
          addonProductId: upsertedProduct.id,
        },
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

      console.log(`  └─ ${upsertedPlan.code}: $${upsertedPlan.price}/${upsertedPlan.billingCycle} (${upsertedPlan.includedSeconds}s)`);
    }
  }

  console.log('[seed-addon-catalog] done.');
}

// Allow running directly: `bun run src/lib/seed-addon-catalog.ts`
if (require.main === module) {
  seedAddonCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed-addon-catalog] FAILED:', err);
      process.exit(1);
    });
}

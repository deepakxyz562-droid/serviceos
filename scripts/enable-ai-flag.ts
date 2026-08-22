/**
 * Enable the ai_receptionist FeatureFlag for the test tenant.
 * Uses the app's db adapter (loads credentials from .env) — no key transcription issues.
 */
import { db } from '../src/lib/db';

const TENANT_ID = 'q3ELcE45UhpTCjg-MsvI1aHfP';

async function main() {
  console.log(`[enable-ai-flag] enabling ai_receptionist for tenant ${TENANT_ID}`);

  // Use updateMany on the composite unique key filter
  const result = await db.featureFlag.updateMany({
    where: {
      tenantId: TENANT_ID,
      featureKey: 'ai_receptionist',
    },
    data: { enabled: true },
  });

  console.log(`[enable-ai-flag] updated ${result.count} row(s)`);

  // Verify
  const flag = await db.featureFlag.findUnique({
    where: {
      tenantId_featureKey: {
        tenantId: TENANT_ID,
        featureKey: 'ai_receptionist',
      },
    },
    select: { enabled: true, featureKey: true },
  });

  console.log('[enable-ai-flag] verification:', flag);
  console.log(flag?.enabled ? '✅ ai_receptionist is now ENABLED' : '❌ Still disabled');
}

main().catch((e) => {
  console.error('[enable-ai-flag] FAILED:', e);
  process.exit(1);
});

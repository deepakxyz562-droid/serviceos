/**
 * Seed script for AiProviderConfig — populates the Vapi platform credential.
 *
 * Run with: `bun run src/lib/seed-provider-config.ts`
 *
 * Idempotent: upserts on `provider` unique key.
 *
 * SECURITY: The Vapi API key is encrypted via AES-256-GCM before storage.
 * The plaintext key is never written to the DB. The encryption key comes
 * from AI_PROVIDER_ENCRYPTION_KEY (env) — not hardcoded.
 */

import { db } from '@/lib/db';
import { encryptKey } from '@/lib/ai-key-crypto';
import { PROVIDER_CAPABILITIES } from '@/lib/ai-receptionist-service';

export async function seedProviderConfig() {
  console.log('[seed-provider-config] starting...');

  const providers = [
    {
      provider: 'VAPI' as const,
      displayName: 'Vapi.ai Platform',
      apiKey: process.env.VAPI_API_KEY,
      capabilities: PROVIDER_CAPABILITIES.VAPI,
      configJson: '{}',
    },
    {
      provider: 'TWILIO' as const,
      displayName: 'Twilio Telephony',
      apiKey: process.env.TWILIO_AUTH_TOKEN, // Twilio Auth Token (the secret)
      capabilities: PROVIDER_CAPABILITIES.TWILIO,
      configJson: JSON.stringify({
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      }),
    },
  ];

  for (const p of providers) {
    const encryptedApiKey = p.apiKey ? encryptKey(p.apiKey) : null;
    const capabilitiesStr = p.capabilities.join(',');

    const config = await db.aiProviderConfig.upsert({
      where: { provider: p.provider },
      create: {
        provider: p.provider,
        displayName: p.displayName,
        encryptedApiKey,
        capabilities: capabilitiesStr,
        status: 'ACTIVE',
        configJson: p.configJson || '{}',
      },
      update: {
        displayName: p.displayName,
        encryptedApiKey,
        capabilities: capabilitiesStr,
        status: 'ACTIVE',
        configJson: p.configJson || '{}',
      },
    });

    console.log(
      `[seed-provider-config] ${config.provider}: ${config.displayName} ` +
        `(status=${config.status}, hasKey=${!!config.encryptedApiKey}, ` +
        `capabilities=${capabilitiesStr})`,
    );
  }

  console.log('[seed-provider-config] done.');
}

// Allow running directly
if (require.main === module) {
  seedProviderConfig()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed-provider-config] FAILED:', err);
      process.exit(1);
    });
}

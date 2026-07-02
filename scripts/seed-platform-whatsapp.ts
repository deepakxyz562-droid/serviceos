/**
 * Seed a platform WhatsApp Business CommunicationProvider.
 *
 * Run with: bun run scripts/seed-platform-whatsapp.ts
 *
 * This creates a platform-level WhatsApp provider (isPlatform=true) that
 * all tenants can fall back to when they haven't connected their own
 * WhatsApp Business account.
 *
 * Trial users get 10 free messages via this platform provider
 * (see: Subscription.trialWhatsappCredits in credit-management.ts).
 *
 * Credentials are read from env vars first, with hardcoded fallbacks:
 *   WHATSAPP_ACCESS_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 *   WHATSAPP_WABA_ID
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding platform WhatsApp CommunicationProvider...\n');

  // WhatsApp credentials — reads from env vars, falls back to known values
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? 'EAAeZCCSIuiJMBRzwDZAAoqOao91PHidrTWqJ2QHMbxnu3wQDtfv7GhOdwFMW8LSgZAAK0mX6eptmS94nZCr1PUJzNpoqaL8C6NcinZClBMDbdGVe05RzNYZAL6CjTPiESYxdv0evV671MAenaAO99cAb7JZBKUPl6aEzcnY8v4YPNvsFIdUze4K4ZBRc06Q1rZCFVg83ZAZBaFxUZADx1ZBEAiwfZCaMkfKXaTEZALZBZBaZAd68eOBrKVIawn7Yc43zjM3qhwk8FLykErhKyPZCCbeLfa2Afqy';
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '1117830511419208';
  const WABA_ID = process.env.WHATSAPP_WABA_ID ?? '2076211023292638';

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error(
      'WhatsApp credentials not found. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars.'
    );
  }

  // Find any tenant. CommunicationProvider requires tenantId, so we
  // attach to the first tenant. Because isPlatform=true, the resolver
  // will use it across all tenants that don't have their own WhatsApp.
  let tenant = await db.tenant.findFirst({
    where: { slug: 'serviceos-demo' },
    select: { id: true, name: true },
  });
  if (!tenant) {
    tenant = await db.tenant.findFirst({ select: { id: true, name: true } });
  }
  if (!tenant) {
    throw new Error('No tenant found. Run `bun run prisma/seed.ts` first.');
  }
  console.log(`  Attaching to tenant: ${tenant.name} (${tenant.id})`);

  const configJson = JSON.stringify({
    accessToken: ACCESS_TOKEN,
    phoneNumberId: PHONE_NUMBER_ID,
    wabaId: WABA_ID,
  });

  // Upsert: look for existing platform WhatsApp provider
  const existing = await db.communicationProvider.findFirst({
    where: { type: 'whatsapp', isPlatform: true },
  });

  let provider;
  if (existing) {
    provider = await db.communicationProvider.update({
      where: { id: existing.id },
      data: {
        name: 'WhatsApp Business (Platform)',
        provider: 'meta',
        isPlatform: true,
        isDefault: true,
        status: 'active',
        sendingEnabled: true,
        configJson,
        tenantId: tenant.id,
      },
    });
    console.log(`✓ Updated existing platform WhatsApp provider (id=${provider.id})`);
  } else {
    provider = await db.communicationProvider.create({
      data: {
        name: 'WhatsApp Business (Platform)',
        type: 'whatsapp',
        provider: 'meta',
        isPlatform: true,
        isDefault: true,
        status: 'active',
        sendingEnabled: true,
        configJson,
        tenantId: tenant.id,
      },
    });
    console.log(`✓ Created new platform WhatsApp provider (id=${provider.id})`);
  }

  // Also ensure at least one subscription has platformWhatsappEnabled=true
  // so trial users can use their 10 free messages
  const updatedSubs = await db.subscription.updateMany({
    where: { platformWhatsappEnabled: false },
    data: { platformWhatsappEnabled: true },
  });
  console.log(`✓ Updated ${updatedSubs.count} subscription(s) to enable platform WhatsApp`);

  console.log('\n✅ Done. Provider details:');
  console.log(`   name           : ${provider.name}`);
  console.log(`   phoneNumberId  : ${PHONE_NUMBER_ID}`);
  console.log(`   wabaId         : ${WABA_ID}`);
  console.log(`   isPlatform     : ${provider.isPlatform}`);
  console.log(`   isDefault      : ${provider.isDefault}`);
  console.log('');
  console.log('📱 Trial users now get 10 free WhatsApp messages via this platform provider.');
  console.log('   Credits are tracked in: Subscription.trialWhatsappCredits / trialWhatsappUsed');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

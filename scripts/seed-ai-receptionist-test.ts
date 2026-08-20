/**
 * Seed AI Receptionist test data
 * ==============================
 *
 * Creates a complete test tenant with:
 *   - Owner user (dev-login compatible)
 *   - AI Receptionist subscription (ACTIVE)
 *   - Entitlement (ACTIVE, 50 min)
 *   - AiReceptionist (ACTIVE) + AiAgentVersion (PUBLISHED) + AiProviderDeployment (ACTIVE)
 *   - PhoneNumber (active, with Vapi binding) + PhoneConnection (ACTIVE, AI_RECEPTIONIST)
 *
 * Run: bun run scripts/seed-ai-receptionist-test.ts
 *
 * Idempotent: safe to run multiple times.
 */

import { db } from '../src/lib/db';
import { seedAddonCatalog } from '../src/lib/seed-addon-catalog';

async function main() {
  console.log('Seeding AI Receptionist test data...');

  // 1. Seed the addon catalog
  await seedAddonCatalog();

  // 2. Create or find the test tenant
  const tenant = await db.tenant.upsert({
    where: { slug: 'ai-receptionist-test' },
    create: {
      name: 'AI Receptionist Test Co.',
      slug: 'ai-receptionist-test',
      industry: 'plumbing',
      phone: '+13125550101',
      email: 'owner@ai-receptionist-test.local',
      plan: 'pro',
      planStatus: 'active',
      onboardingCompleted: true,
      onboardingStep: 10,
    },
    update: {},
  });
  console.log('Tenant:', tenant.id, tenant.name);

  // 3. Create or find the owner user
  const user = await db.user.upsert({
    where: { email: 'ai-test@fieseros.local' },
    create: {
      email: 'ai-test@fieseros.local',
      name: 'AI Test Owner',
      role: 'owner',
      isActive: true,
      tenantId: tenant.id,
    },
    update: {
      role: 'owner',
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('User:', user.id, user.email);

  // 4. Find the Starter plan
  const starterPlan = await db.addonPlan.findUnique({
    where: { code: 'AI_RECEPTIONIST_STARTER' },
    include: { addonProduct: true },
  });
  if (!starterPlan) throw new Error('AI_RECEPTIONIST_STARTER plan not found');
  console.log('Plan:', starterPlan.code);

  // 5. Create or find the subscription (ACTIVE)
  const subscription = await db.tenantAddonSubscription.upsert({
    where: { creemSubscriptionId: 'test-creem-sub-001' },
    create: {
      tenantId: tenant.id,
      addonPlanId: starterPlan.id,
      addonProductId: starterPlan.addonProductId,
      status: 'ACTIVE',
      creemSubscriptionId: 'test-creem-sub-001',
      creemCustomerId: 'test-creem-cust-001',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Subscription:', subscription.id, subscription.status);

  // 6. Create or find the entitlement (ACTIVE)
  const existingEntitlement = await db.addonEntitlement.findFirst({
    where: { tenantAddonSubscriptionId: subscription.id, status: 'ACTIVE' },
  });
  const entitlement = existingEntitlement || await db.addonEntitlement.create({
    data: {
      tenantId: tenant.id,
      tenantAddonSubscriptionId: subscription.id,
      includedSeconds: starterPlan.includedSeconds,
      maxCallDurationSeconds: starterPlan.maxCallDurationSeconds,
      maxConcurrentCalls: starterPlan.maxConcurrentCalls,
      includedNumbers: starterPlan.includedNumbers,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      cachedRemainingSeconds: starterPlan.includedSeconds,
      lastCalculatedAt: new Date(),
    },
  });
  console.log('Entitlement:', entitlement.id, `${entitlement.includedSeconds}s included`);

  // 7. Create or find the AiReceptionist (ACTIVE)
  const receptionist = await db.aiReceptionist.upsert({
    where: { id: (await db.aiReceptionist.findFirst({ where: { tenantId: tenant.id } }))?.id || 'recv-test-001' },
    create: {
      id: 'recv-test-001',
      tenantId: tenant.id,
      name: 'Sarah',
      status: 'ACTIVE',
      greeting: 'Hi, thanks for calling! How can I help you today?',
      handoffEnabled: true,
      handoffTransferTarget: '+13125550199',
      handoffFallbackMode: 'VOICEMAIL',
      businessHoursMode: 'use_tenant_hours',
    },
    update: {
      status: 'ACTIVE',
    },
  });
  console.log('Receptionist:', receptionist.id, receptionist.name, receptionist.status);

  // 8. Create or find the AiAgentVersion (PUBLISHED)
  const existingVersion = await db.aiAgentVersion.findFirst({
    where: { aiReceptionistId: receptionist.id, status: 'PUBLISHED' },
  });
  const version = existingVersion || await db.aiAgentVersion.create({
    data: {
      aiReceptionistId: receptionist.id,
      versionNumber: 1,
      status: 'PUBLISHED',
      systemPrompt: 'You are Sarah, an AI receptionist for a plumbing business. Be friendly and helpful.',
      voice: 'rachel',
      voiceProvider: 'elevenlabs',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      greeting: 'Hi, thanks for calling! How can I help you today?',
      personality: 'friendly',
      responseStyle: 'concise',
      maxDurationSeconds: 600,
      silenceTimeoutSeconds: 120,
      publishedAt: new Date(),
    },
  });
  console.log('Version:', version.id, 'v' + version.versionNumber, version.status);

  // Link the version as current
  await db.aiReceptionist.update({
    where: { id: receptionist.id },
    data: { currentVersionId: version.id },
  });

  // 9. Create or find the AiProviderDeployment (ACTIVE)
  const existingDeployment = await db.aiProviderDeployment.findFirst({
    where: { aiAgentVersionId: version.id, status: 'ACTIVE' },
  });
  const deployment = existingDeployment || await db.aiProviderDeployment.create({
    data: {
      aiAgentVersionId: version.id,
      provider: 'VAPI',
      externalAssistantId: 'vapi-assistant-test-001',
      externalPhoneNumberId: 'vapi-number-test-001',
      status: 'ACTIVE',
      deploymentConfigJson: '{}',
      lastSyncedAt: new Date(),
    },
  });
  console.log('Deployment:', deployment.id, deployment.status);

  // 10. Create or find the PhoneNumber (active, with Vapi binding)
  const phoneNumber = await db.phoneNumber.upsert({
    where: { number: '+13125550101' },
    create: {
      number: '+13125550101',
      displayName: 'Main Line',
      provider: 'twilio',
      capabilities: 'sms,voice',
      type: 'dedicated',
      status: 'active',
      providerSid: 'PNtest001',
      voiceMode: 'ai_vapi',
      vapiNumberId: 'vapi-number-test-001',
      vapiAssistantId: 'vapi-assistant-test-001',
      tenantId: tenant.id,
      monthlyCost: 5.0,
    },
    update: {
      status: 'active',
      vapiNumberId: 'vapi-number-test-001',
      vapiAssistantId: 'vapi-assistant-test-001',
      tenantId: tenant.id,
    },
  });
  console.log('Phone Number:', phoneNumber.id, phoneNumber.number, phoneNumber.status);

  // 11. Create or find the PhoneConnection (ACTIVE, AI_RECEPTIONIST)
  const existingConn = await db.phoneConnection.findFirst({
    where: { phoneNumberId: phoneNumber.id, tenantId: tenant.id },
  });
  const connection = existingConn || await db.phoneConnection.create({
    data: {
      tenantId: tenant.id,
      phoneNumberId: phoneNumber.id,
      connectionType: 'DIRECT',
      routingMode: 'AI_RECEPTIONIST',
      fallbackRoutingMode: 'VOICEMAIL',
      status: 'ACTIVE',
      verifiedAt: new Date(),
    },
  });
  console.log('Phone Connection:', connection.id, connection.routingMode, connection.status);

  // 12. Enable the platform kill switch (if the model exists)
  try {
    await db.revenueFeatureToggle.upsert({
      where: { featureKey: 'ai_receptionist_addon' },
      create: {
        featureKey: 'ai_receptionist_addon',
        displayName: 'AI Receptionist Add-on',
        description: 'Global kill switch for the AI Receptionist platform',
        enabled: true,
      },
      update: { enabled: true },
    });
    console.log('Kill switch: enabled');
  } catch (e) {
    console.log('Kill switch: skipped', e instanceof Error ? `(${e.message})` : '');
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  AI RECEPTIONIST TEST DATA SEEDED');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Login email: ai-test@fieseros.local');
  console.log('  (Use /api/auth/dev-login with this email — no password)');
  console.log('  Tenant: ' + tenant.name);
  console.log('  Phone: ' + phoneNumber.number);
  console.log('  Receptionist: ' + receptionist.name + ' (' + receptionist.status + ')');
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });

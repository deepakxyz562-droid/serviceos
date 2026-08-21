import { db } from '@/lib/db';
import { createDirectConnection } from '@/lib/phone-number-service';

async function setupLiveTenantNumber() {
  console.log('Binding +19843517779 to live tenant in PostgreSQL...');

  const phoneNumberE164 = '+19843517779';

  // 1. Find or create tenant
  let tenant = await db.tenant.findFirst();
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        id: 'tenant_live_demo',
        slug: 'live-demo-tenant',
        name: 'Live Staging Tenant',
      },
    });
  }

  const tenantId = tenant.id;
  console.log(`Using Tenant: ${tenant.name} (${tenantId})`);

  // 2. Ensure AddonProduct & AddonPlan exist
  let plan = await db.addonPlan.findFirst({ where: { code: 'AI_RECEPTIONIST_STARTER' } });
  if (!plan) {
    let product = await db.addonProduct.findUnique({ where: { code: 'AI_RECEPTIONIST' } });
    if (!product) {
      product = await db.addonProduct.create({
        data: {
          id: 'prod_ai_receptionist',
          code: 'AI_RECEPTIONIST',
          name: 'AI Receptionist',
          description: 'Autonomous AI Voice Receptionist',
          category: 'VOICE_AI',
          status: 'ACTIVE',
        },
      });
    }

    plan = await db.addonPlan.create({
      data: {
        id: 'plan_ai_receptionist_starter',
        addonProductId: product.id,
        code: 'AI_RECEPTIONIST_STARTER',
        name: 'Starter Plan',
        priceMonthlyUsd: 49.00,
        includedSeconds: 3000,
        maxCallDurationSeconds: 600,
        maxConcurrentCalls: 3,
        includedNumbers: 1,
        status: 'ACTIVE',
      },
    });
  }

  // 3. Ensure active subscription & entitlement
  let subscription = await db.tenantAddonSubscription.findFirst({
    where: { tenantId, status: 'ACTIVE' },
  });

  if (!subscription) {
    subscription = await db.tenantAddonSubscription.create({
      data: {
        tenantId,
        addonProductId: plan.addonProductId,
        addonPlanId: plan.id,
        status: 'ACTIVE',
      },
    });
  }

  let entitlement = await db.addonEntitlement.findFirst({
    where: { tenantId, status: 'ACTIVE' },
  });

  if (!entitlement) {
    entitlement = await db.addonEntitlement.create({
      data: {
        tenantAddonSubscriptionId: subscription.id,
        tenantId,
        includedSeconds: 3000,
        maxCallDurationSeconds: 600,
        maxConcurrentCalls: 3,
        includedNumbers: 1,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status: 'ACTIVE',
      },
    });
  }

  // 4. Provision / bind PhoneNumber
  let phone = await db.phoneNumber.findFirst({ where: { number: phoneNumberE164 } });
  if (!phone) {
    phone = await db.phoneNumber.create({
      data: {
        number: phoneNumberE164,
        tenantId,
        status: 'active',
      },
    });
  } else if (phone.tenantId !== tenantId) {
    phone = await db.phoneNumber.update({
      where: { id: phone.id },
      data: { tenantId, status: 'active' },
    });
  }

  // 5. Ensure PhoneConnection is set to AI_RECEPTIONIST
  let connection = await db.phoneConnection.findFirst({
    where: { phoneNumberId: phone.id, tenantId },
  });

  if (!connection) {
    connection = await createDirectConnection({
      tenantId,
      phoneNumberId: phone.id,
      routingMode: 'AI_RECEPTIONIST',
    });
  } else {
    await db.phoneConnection.update({
      where: { id: connection.id },
      data: { routingMode: 'AI_RECEPTIONIST', status: 'ACTIVE' },
    });
  }

  console.log('✅ SUCCESS: +19843517779 is now ACTIVE and bound to AI Receptionist!');
  console.log(`   Tenant ID: ${tenantId}`);
  console.log(`   Phone Number: ${phoneNumberE164}`);
  console.log(`   Routing Mode: AI_RECEPTIONIST`);
}

setupLiveTenantNumber()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to setup tenant number:', err);
    process.exit(1);
  });

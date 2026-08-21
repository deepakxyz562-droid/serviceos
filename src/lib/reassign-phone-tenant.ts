import { db } from '@/lib/db';
import { createDirectConnection } from '@/lib/phone-number-service';

async function reassignTenantNumber() {
  console.log('Reassigning +19843517779 to Singh Fabrication...');

  const phoneNumberE164 = '+19843517779';

  // 1. Find Singh Fabrication tenant by slug
  let singhTenant = await db.tenant.findUnique({
    where: { slug: 'singh-fabrication' },
  });

  if (!singhTenant) {
    const tenants = await db.tenant.findMany({ select: { id: true, name: true, slug: true }, take: 100 });
    singhTenant = tenants.find((t) => t.name.toLowerCase().includes('singh')) || null;
  }

  if (!singhTenant) {
    const uniqueSlug = `singh-fabrication-${Date.now()}`;
    console.log(`Creating "Singh Fabrication" tenant with slug ${uniqueSlug}...`);
    singhTenant = await db.tenant.create({
      data: {
        id: `tenant_singh_${Date.now()}`,
        slug: uniqueSlug,
        name: 'Singh Fabrication',
      },
    });
  }

  const newTenantId = singhTenant.id;
  console.log(`Target Tenant: ${singhTenant.name} (${newTenantId})`);

  // 2. Remove old connection & phone number mapping from previous tenant
  const oldPhone = await db.phoneNumber.findFirst({ where: { number: phoneNumberE164 } });
  if (oldPhone) {
    await db.phoneConnection.deleteMany({ where: { phoneNumberId: oldPhone.id } });
    await db.phoneNumber.deleteMany({ where: { id: oldPhone.id } });
    console.log(`Cleaned old number binding for ${phoneNumberE164}`);
  }

  // 3. Ensure AddonProduct & AddonPlan exist
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

  // 4. Ensure active subscription & entitlement for Singh Fabrication
  let subscription = await db.tenantAddonSubscription.findFirst({
    where: { tenantId: newTenantId, status: 'ACTIVE' },
  });

  if (!subscription) {
    subscription = await db.tenantAddonSubscription.create({
      data: {
        tenantId: newTenantId,
        addonProductId: plan.addonProductId,
        addonPlanId: plan.id,
        status: 'ACTIVE',
      },
    });
  }

  let entitlement = await db.addonEntitlement.findFirst({
    where: { tenantId: newTenantId, status: 'ACTIVE' },
  });

  if (!entitlement) {
    entitlement = await db.addonEntitlement.create({
      data: {
        tenantAddonSubscriptionId: subscription.id,
        tenantId: newTenantId,
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

  // 5. Create new PhoneNumber for Singh Fabrication
  const newPhone = await db.phoneNumber.create({
    data: {
      number: phoneNumberE164,
      tenantId: newTenantId,
      status: 'active',
    },
  });

  // 6. Create PhoneConnection with AI_RECEPTIONIST mode
  const connection = await createDirectConnection({
    tenantId: newTenantId,
    phoneNumberId: newPhone.id,
    routingMode: 'AI_RECEPTIONIST',
  });

  console.log('✅ REASSIGNMENT SUCCESSFUL!');
  console.log(`   Tenant Name:  ${singhTenant.name}`);
  console.log(`   Tenant ID:    ${newTenantId}`);
  console.log(`   Phone Number: ${phoneNumberE164}`);
  console.log(`   Routing Mode: AI_RECEPTIONIST`);
}

reassignTenantNumber()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to reassign number:', err);
    process.exit(1);
  });

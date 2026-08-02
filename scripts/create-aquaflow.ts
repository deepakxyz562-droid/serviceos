import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Rajesh@123', 12);

  // Check if already exists; if so, fill in any missing records.
  const existing = await db.user.findUnique({
    where: { email: 'rajesh@aquaflow.com' },
    include: { tenant: true, workspace: true },
  });
  if (existing && existing.tenantId) {
    console.log('rajesh@aquaflow.com already exists — filling gaps.');
    const tenant = existing.tenant!;
    const workspace = existing.workspace;
    // Employee
    let emp = await db.employee.findFirst({ where: { userId: existing.id } });
    if (!emp) {
      emp = await db.employee.create({
        data: {
          name: existing.name || 'Rajesh Sharma',
          phone: existing.phone || '+918505945123',
          email: existing.email,
          role: 'owner',
          status: 'available',
          workspaceId: workspace?.id,
          userId: existing.id,
        },
      });
      console.log('  ✅ Created missing Employee:', emp.id);
    }
    // Subscription
    let sub = await db.subscription.findFirst({ where: { tenantId: tenant.id } });
    if (!sub) {
      sub = await db.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'growth',
          status: 'active',
          amount: 79,
          currency: 'INR',
          billingCycle: 'monthly',
          startDate: new Date(Date.now() - 60 * 86400000),
          endDate: new Date(Date.now() + 305 * 86400000),
          maxUsers: 10, maxJobs: 500, maxWorkflows: 50,
          featuresJson: JSON.stringify({ omnichannel: true, marketingHub: true, aiChatbot: true, customWorkflows: true, advancedAnalytics: true, apiAccess: true }),
          aiQuota: 1000, whatsappQuota: 5000, emailQuota: 5000,
        },
      });
      console.log('  ✅ Created missing Subscription:', sub.id);
    }
    // Service
    let svc = await db.service.findFirst({ where: { tenantId: tenant.id } });
    if (!svc) {
      svc = await db.service.create({
        data: {
          name: 'General Plumbing Repair',
          description: 'Standard plumbing repair and maintenance',
          basePrice: 1500, duration: 120, category: 'repair',
          tenantId: tenant.id,
        },
      });
      console.log('  ✅ Created missing Service:', svc.id);
    }
    console.log('Tenant ID:', tenant.id, '| Workspace ID:', workspace?.id, '| Employee ID:', emp.id);
    return;
  }
  if (existing) {
    console.log('User exists but has no tenant — please delete and re-run.');
    return;
  }

  // 1. Tenant
  const tenant = await db.tenant.create({
    data: {
      name: 'AquaFlow Plumbing',
      slug: 'aquaflow',
      industry: 'plumbing',
      email: 'rajesh@aquaflow.com',
      phone: '+91-80-4567-8900',
      address: '42 MG Road, Bengaluru, KA 560001',
      country: 'IN',
      currency: 'INR',
      plan: 'growth',
      planStatus: 'active',
      onboardingCompleted: true,
      settingsJson: JSON.stringify({
        timezone: 'Asia/Kolkata',
        workingHours: { start: '09:00', end: '18:00' },
        autoAssign: true,
        notifyOnNewLead: true,
      }),
    },
  });
  console.log('✅ Tenant:', tenant.name, tenant.slug);

  // 2. Owner user
  const owner = await db.user.create({
    data: {
      email: 'rajesh@aquaflow.com',
      name: 'Rajesh Sharma',
      role: 'owner',
      passwordHash,
      phone: '+918505945123',
      isActive: true,
      tenantId: tenant.id,
    },
  });

  // 3. Workspace
  const workspace = await db.workspace.create({
    data: {
      name: 'AquaFlow Plumbing',
      slug: 'aquaflow',
      industry: 'plumbing',
      plan: 'growth',
      ownerId: owner.id,
      tenantId: tenant.id,
      settingsJson: JSON.stringify({
        defaultJobDuration: 120,
        autoAssignNearest: true,
        notificationPreferences: { email: true, whatsapp: true, sms: false },
      }),
    },
  });

  // Link user to workspace
  await db.user.update({ where: { id: owner.id }, data: { workspaceId: workspace.id } });

  // 4. Employee record (so jobs can be assigned to rajesh)
  const employee = await db.employee.create({
    data: {
      name: 'Rajesh Sharma',
      phone: '+918505945123',
      email: 'rajesh@aquaflow.com',
      role: 'owner',
      status: 'available',
      workspaceId: workspace.id,
      userId: owner.id,
    },
  });

  // 5. Subscription
  await db.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: 'growth',
      status: 'active',
      amount: 79,
      currency: 'INR',
      billingCycle: 'monthly',
      startDate: new Date(Date.now() - 60 * 86400000),
      endDate: new Date(Date.now() + 305 * 86400000),
      maxUsers: 10,
      maxJobs: 500,
      maxWorkflows: 50,
      featuresJson: JSON.stringify({
        omnichannel: true, marketingHub: true, aiChatbot: true,
        customWorkflows: true, advancedAnalytics: true, apiAccess: true,
      }),
      aiQuota: 1000,
      whatsappQuota: 5000,
      emailQuota: 5000,
    },
  });

  // 6. A plumbing service for invoicing
  const service = await db.service.create({
    data: {
      name: 'General Plumbing Repair',
      description: 'Standard plumbing repair and maintenance',
      basePrice: 1500,
      duration: 120,
      category: 'repair',
      tenantId: tenant.id,
    },
  });

  console.log('✅ User: rajesh@aquaflow.com / Rajesh@123');
  console.log('✅ Workspace + Employee + Subscription + Service created');
  console.log('Tenant ID:', tenant.id);
  console.log('Workspace ID:', workspace.id);
  console.log('Employee ID:', employee.id);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());

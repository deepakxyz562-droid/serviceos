import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';

const db = new PrismaClient({
  datasourceUrl: directUrl,
  log: ['error', 'warn'],
});

async function main() {
  console.log('🔧 Upserting support@fieseros.com account (#Mahadev12)...');

  const passwordHash = await bcrypt.hash('#Mahadev12', 10);
  const email = 'support@fieseros.com';

  // 1. Tenant
  let tenant = await db.tenant.findFirst({
    where: {
      OR: [
        { slug: 'fieseros-support-tenant' },
        { email },
      ],
    },
  });

  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: 'Fieseros Support',
        slug: 'fieseros-support-tenant',
        email,
        phone: '+91 61279 67087',
        plan: 'growth',
        planStatus: 'active',
        onboardingCompleted: true,
        onboardingStep: 5,
        industry: 'Field Services',
      },
    });
    console.log('✅ Created tenant:', tenant.id);
  } else {
    tenant = await db.tenant.update({
      where: { id: tenant.id },
      data: {
        plan: 'growth',
        planStatus: 'active',
        onboardingCompleted: true,
        suspendedAt: null,
      },
    });
    console.log('✅ Updated tenant:', tenant.id);
  }

  // 2. Workspace with productType: 'bgos'
  let workspace = await db.workspace.findFirst({
    where: {
      tenantId: tenant.id,
      productType: 'bgos',
    },
  });

  if (!workspace) {
    const existingWs = await db.workspace.findFirst({
      where: { tenantId: tenant.id },
    });
    if (existingWs) {
      workspace = await db.workspace.update({
        where: { id: existingWs.id },
        data: { productType: 'bgos' },
      });
      console.log('✅ Updated workspace to bgos:', workspace.id);
    } else {
      workspace = await db.workspace.create({
        data: {
          name: 'Fieseros Support Workspace',
          slug: 'fieseros-support-bgos',
          productType: 'bgos',
          tenantId: tenant.id,
          ownerId: 'placeholder',
          industry: 'Field Services',
        },
      });
      console.log('✅ Created BGOS workspace:', workspace.id);
    }
  }

  // 3. User
  let user = await db.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: 'Fieseros Support',
        passwordHash,
        role: 'owner',
        isActive: true,
        isSuperAdmin: false,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    });
    console.log('✅ Created user:', user.id);
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        name: user.name || 'Fieseros Support',
        passwordHash,
        role: 'owner',
        isActive: true,
        isSuperAdmin: false,
        emailVerified: true,
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    });
    console.log('✅ Updated user credentials:', user.id);
  }

  await db.workspace.update({
    where: { id: workspace.id },
    data: { ownerId: user.id },
  }).catch(() => {});

  // 4. Employee
  const emp = await db.employee.findFirst({
    where: { userId: user.id },
  });
  if (!emp) {
    await db.employee.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        name: user.name || 'Fieseros Support',
        phone: '+91 61279 67087',
        email: user.email,
        role: 'owner',
        status: 'available',
      },
    }).catch(() => {});
    console.log('✅ Ensured employee profile');
  }

  console.log('🎉 Done! User support@fieseros.com / #Mahadev12 is ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

/**
 * Create SuperAdmin user for ServiceOS
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@serviceos.cc';
  const password = 'Admin@2024';
  const name = 'Super Admin';

  // Check if superadmin already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Update to be super admin
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        isSuperAdmin: true,
        role: 'admin',
        name,
      },
    });
    console.log('✅ Updated existing user to SuperAdmin:', email);
    console.log('   Password: (unchanged)');
    return;
  }

  // Create superadmin user (no tenant - platform-level user)
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'admin',
      isSuperAdmin: true,
      authProvider: 'email',
      isActive: true,
      tenantId: null, // No tenant - platform admin
      workspaceId: null,
    },
  });

  console.log('✅ SuperAdmin user created successfully!');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('   User ID:', user.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

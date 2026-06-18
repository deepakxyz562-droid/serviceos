import { db } from '../src/lib/db';
import { verifyPassword } from '../src/lib/auth';

async function main() {
  const user = await db.user.findUnique({
    where: { email: 'demo@flowforge.io' },
    select: { id: true, email: true, role: true, tenantId: true, isActive: true, passwordHash: true, authProvider: true },
  });
  console.log('User found:', user ? {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    isActive: user.isActive,
    authProvider: user.authProvider,
    hasPasswordHash: !!user.passwordHash,
    hashPrefix: user.passwordHash?.substring(0, 30) + '...',
  } : 'NOT FOUND');

  if (user?.passwordHash) {
    for (const pw of ['demo123', 'Owner@123', 'password', 'demo', 'Demo@123', 'ServiceOS@123']) {
      const ok = await verifyPassword(pw, user.passwordHash);
      console.log(`  verifyPassword("${pw}") = ${ok}`);
    }
  }

  // Also check the tenant
  const tenant = await db.tenant.findUnique({
    where: { slug: 'aquafix-plumbing' },
    select: { id: true, name: true, slug: true },
  });
  console.log('\nTenant (aquafix-plumbing):', tenant);
  console.log('User.tenantId matches tenant.id?', user?.tenantId === tenant?.id);

  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });

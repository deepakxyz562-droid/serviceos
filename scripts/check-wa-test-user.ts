import { db } from '../src/lib/db';
import { verifyPassword } from '../src/lib/auth';

async function main() {
  const user = await db.user.findUnique({
    where: { email: 'whatsapp-test@serviceos.local' },
    select: { id: true, email: true, role: true, tenantId: true, isActive: true, passwordHash: true, authProvider: true },
  });
  console.log('User:', user ? {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    isActive: user.isActive,
    authProvider: user.authProvider,
    hasPasswordHash: !!user.passwordHash,
  } : 'NOT FOUND');

  if (user?.passwordHash) {
    for (const pw of ['Owner@123', 'demo123', 'whatsapp', 'test123', 'password']) {
      const ok = await verifyPassword(pw, user.passwordHash);
      console.log(`  verifyPassword("${pw}") = ${ok}`);
    }
  }
  await db.$disconnect();
}
main().catch(console.error);

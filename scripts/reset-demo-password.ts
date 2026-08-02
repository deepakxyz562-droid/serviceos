import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function main() {
  const newHash = await hashPassword('demo123');
  const updated = await db.user.update({
    where: { email: 'demo@flowforge.io' },
    data: { passwordHash: newHash },
    select: { id: true, email: true, role: true, tenantId: true, isActive: true },
  });
  console.log('Password reset for user:', updated);

  // Also verify
  const user = await db.user.findUnique({ where: { email: 'demo@flowforge.io' }, select: { passwordHash: true } });
  if (user?.passwordHash) {
    const ok = await (await import('bcryptjs')).default.compare('demo123', user.passwordHash);
    console.log('Verify new password "demo123":', ok);
  }
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });

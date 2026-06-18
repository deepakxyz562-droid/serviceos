import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function main() {
  const newHash = await hashPassword('Owner@123');
  const updated = await db.user.update({
    where: { email: 'whatsapp-test@serviceos.local' },
    data: { passwordHash: newHash },
    select: { id: true, email: true, role: true, tenantId: true },
  });
  console.log('Password set for:', updated);
  await db.$disconnect();
}
main().catch(console.error);

import { directPrisma } from '../src/lib/direct-prisma';
import { hashPassword } from '../src/lib/auth';

async function main() {
  const c = await directPrisma.customer.findFirst({
    where: { email: 'deepakchandrayt@gmail.com' },
  });
  if (!c) { console.log('not found'); return; }
  const updated = await directPrisma.customer.update({
    where: { id: c.id },
    data: {
      portalEnabled: true,
      passwordHash: await hashPassword('Deepak@123'),
      activatedAt: new Date(),
    },
  });
  console.log(`✓ Enabled portal for customer ${updated.id}: portalEnabled=${updated.portalEnabled}, hasPass=${!!updated.passwordHash}, activatedAt=${updated.activatedAt}`);
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>process.exit(0));

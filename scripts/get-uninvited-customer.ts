import { directPrisma } from '../src/lib/direct-prisma';
async function main() {
  const c = await directPrisma.customer.findFirst({
    where: { invitationStatus: 'none' },
    select: { id: true, name: true, email: true, phone: true, invitationStatus: true }
  });
  console.log(JSON.stringify(c));
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>process.exit(0));

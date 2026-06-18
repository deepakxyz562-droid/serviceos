import { directPrisma } from '../src/lib/direct-prisma';
async function main() { const c = await directPrisma.contact.count(); console.log('Contact count in local DB:', c); }
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>process.exit(0));

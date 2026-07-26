import { db } from '../src/lib/db';
async function main() {
  const oldGate = await db.tenant.count({ where: { marketplaceOptIn: true, suspendedAt: null } });
  const newGate = await db.tenant.count({ where: { publicProfileEnabled: true, suspendedAt: null } });
  const newlyVisible = await db.tenant.count({
    where: { publicProfileEnabled: true, marketplaceOptIn: false, suspendedAt: null }
  });
  console.log('Old gate (marketplaceOptIn=true):           ', oldGate);
  console.log('New gate (publicProfileEnabled=true):        ', newGate);
  console.log('Newly visible providers (were hidden before):', newlyVisible);
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

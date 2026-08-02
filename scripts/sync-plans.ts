import { db } from '../src/lib/db';
import { seedPlans, getActivePlans } from '../src/lib/billing-seed';

async function main() {
  console.log('Seeding plans (upsert)...');
  const result = await seedPlans();
  console.log('Seed result:', result);
  const plans = await getActivePlans();
  console.log('Active plans after seed:');
  for (const p of plans) {
    console.log(`  ${p.code}: $${p.monthlyPrice}/mo, $${p.yearlyPrice}/yr (popular=${p.popular}, active=${p.isActive})`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

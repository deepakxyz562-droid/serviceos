import { db } from '../src/lib/db';

async function main() {
  const tenants = await db.tenant.findMany({
    select: { id: true, name: true, slug: true, industry: true, onboardingCompleted: true, suspendedAt: true },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Found ${tenants.length} tenants:`);
  for (const t of tenants) {
    console.log(`  - slug="${t.slug}"  name="${t.name}"  industry="${t.industry ?? 'null'}"  onboardingCompleted=${t.onboardingCompleted}  suspendedAt=${t.suspendedAt ?? 'null'}`);
  }
  const userCount = await db.user.count();
  const customerCount = await db.customer.count();
  const employeeCount = await db.employee.count();
  console.log(`\nCounts: users=${userCount} customers=${customerCount} employees=${employeeCount}`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });

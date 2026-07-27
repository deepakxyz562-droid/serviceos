/**
 * verify-marketplace-seed.ts — quick check that OSM seed data landed.
 * Run: bun run scripts/verify-marketplace-seed.ts
 */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ log: ['error'] });

async function main() {
  const total = await db.tenant.count();
  const free = await db.tenant.count({ where: { listingTier: 'free' } });
  const claimed = await db.tenant.count({ where: { claimed: true } });
  const unclaimed = await db.tenant.count({ where: { claimed: false } });
  const optIn = await db.tenant.count({ where: { marketplaceOptIn: true } });
  const publicProfile = await db.tenant.count({
    where: { publicProfileEnabled: true },
  });
  const withCoords = await db.tenant.count({
    where: { AND: [{ latitude: { not: null } }, { longitude: { not: null } }] },
  });

  console.log('=== Marketplace Seed Verification ===');
  console.log(`Total tenants:              ${total}`);
  console.log(`Free listings (tier=free):  ${free}`);
  console.log(`Claimed listings:           ${claimed}`);
  console.log(`Unclaimed listings:         ${unclaimed}`);
  console.log(`marketplaceOptIn=true:      ${optIn}`);
  console.log(`publicProfileEnabled=true:  ${publicProfile}`);
  console.log(`With lat/lng coords:        ${withCoords}`);

  // Breakdown by industry
  const all = await db.tenant.findMany({
    where: { listingTier: 'free' },
    select: { industry: true, city: true, country: true },
  });
  const byIndustry = new Map<string, number>();
  const byCity = new Map<string, number>();
  for (const t of all) {
    const ind = t.industry ?? '(none)';
    byIndustry.set(ind, (byIndustry.get(ind) ?? 0) + 1);
    const c = t.city ?? '(none)';
    byCity.set(c, (byCity.get(c) ?? 0) + 1);
  }
  console.log('\nBreakdown by industry:');
  for (const [k, v] of [...byIndustry.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
  console.log('\nBreakdown by city (top 10):');
  for (const [k, v] of [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }

  // Sample listings
  console.log('\nSample free listings (first 8):');
  const samples = await db.tenant.findMany({
    where: { listingTier: 'free' },
    select: {
      name: true,
      slug: true,
      industry: true,
      city: true,
      phone: true,
      rating: true,
      reviewCount: true,
      latitude: true,
      longitude: true,
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  });
  for (const s of samples) {
    console.log(
      `  • ${s.name}  [${s.industry}]  ${s.city}  ⭐${s.rating} (${s.reviewCount})  ${s.phone ?? '—'}  (${s.latitude?.toFixed(3)},${s.longitude?.toFixed(3)})  /${s.slug}`,
    );
  }

  await db.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

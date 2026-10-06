import { db } from '@/lib/db';
import { slugifyCity } from '@/lib/seo/schemas';

const STATIC_CITY_LIMIT = 50;

/**
 * Warm the highest-signal contractor city pages at build time. Remaining
 * cities are still generated on demand through dynamicParams + ISR.
 */
export async function getContractorStaticCityParams(industryId: string) {
  const tenants = await db.tenant.findMany({
    where: {
      publicProfileEnabled: true,
      marketplaceOptIn: true,
      suspendedAt: null,
      OR: [
        { industry: { equals: industryId } },
        { businessCategoriesJson: { contains: `"${industryId}"` } },
      ],
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 500,
    select: { city: true },
  });

  const cities = new Set<string>();
  for (const tenant of tenants) {
    if (!tenant.city) continue;
    cities.add(slugifyCity(tenant.city));
    if (cities.size === STATIC_CITY_LIMIT) break;
  }

  return Array.from(cities, (city) => ({ city }));
}

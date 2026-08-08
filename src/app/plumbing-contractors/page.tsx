import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getIndustryByContractorsPath } from "@/lib/seo/industry-config";
import { IndustryContractorsLanding } from "@/components/seo/industry-contractors-page";

const CONTRACTORS_PATH = "/plumbing-contractors";
const cfg = getIndustryByContractorsPath(CONTRACTORS_PATH)!;

export const metadata: Metadata = {
  title: `${cfg.name} Contractors Directory | Fieseros Marketplace`,
  description: `Find verified ${cfg.contractorNoun} across cities. Compare reviews, request quotes, and book services on the Fieseros Marketplace.`,
  alternates: { canonical: `https://fieseros.com${cfg.contractorsBasePath}` },
  robots: { index: true, follow: true },
};

// Force dynamic so newly-onboarded providers appear without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Query distinct cities that have marketplace providers in this industry.
  // Industry match: primary industry OR businessCategoriesJson contains the id
  // (mirrors the existing /[companySlug]/[city]/page.tsx query so multi-category
  // tenants show up under each of their industries).
  const tenants = await db.tenant.findMany({
    where: {
      publicProfileEnabled: true,
      marketplaceOptIn: true,
      suspendedAt: null,
      OR: [
        { industry: { equals: cfg.industryId } },
        { businessCategoriesJson: { contains: `"${cfg.industryId}"` } },
      ],
    },
    select: { city: true, state: true },
  });

  // Group by city (case-insensitive key), keep the first-seen display form.
  const cityMap = new Map<string, { city: string; state: string | null; count: number }>();
  for (const t of tenants) {
    if (!t.city) continue;
    const key = t.city.toLowerCase();
    const existing = cityMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      cityMap.set(key, { city: t.city, state: t.state, count: 1 });
    }
  }
  const cities = Array.from(cityMap.values()).sort(
    (a, b) => b.count - a.count || a.city.localeCompare(b.city),
  );

  return <IndustryContractorsLanding config={cfg} cities={cities} />;
}

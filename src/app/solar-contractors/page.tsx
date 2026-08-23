import type { Metadata } from "next";
import { getIndustryByContractorsPath } from "@/lib/seo/industry-config";
import { IndustryContractorsLanding } from "@/components/seo/industry-contractors-page";
import { fetchContractorHubCities } from "@/lib/seo/contractor-cache";

const CONTRACTORS_PATH = "/solar-contractors";
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
  // Cached via sharedCacheWrap (Redis + in-memory fallback, 30s fresh / 5min stale).
  // See src/lib/seo/contractor-cache.ts for details.
  const cities = await fetchContractorHubCities(cfg.industryId);

  return <IndustryContractorsLanding config={cfg} cities={cities} />;
}

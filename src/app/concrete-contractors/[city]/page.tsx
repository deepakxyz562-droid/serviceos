import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getIndustryByContractorsPath } from "@/lib/seo/industry-config";
import { IndustryContractorsCityPage } from "@/components/seo/industry-contractors-page";
import { slugifyCity } from "@/lib/seo/schemas";
import {
  computeCardType,
  fetchFeaturedListingsMap,
} from "@/lib/marketplace-featured";
import type { ProviderListItem } from "@/components/marketplace/types";

const CONTRACTORS_PATH = "/concrete-contractors";
const cfg = getIndustryByContractorsPath(CONTRACTORS_PATH)!;

// Force dynamic so newly-onboarded providers appear without a rebuild (matches
// the existing marketplace browse page policy).
export const dynamic = "force-dynamic";

// Generate static params for known cities so the pages can be ISR-friendly.
// Wrapped in try/catch so a DB failure during build doesn't crash the build —
// the route still works at runtime via force-dynamic, just without ISR.
export async function generateStaticParams() {
  try {
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
      select: { city: true },
    });
    const cities = new Set(
      tenants.map((t) => t.city).filter(Boolean).map((c) => slugifyCity(c)),
    );
    return Array.from(cities).map((city) => ({ city }));
  } catch (err) {
    console.error("[contractors-city] generateStaticParams failed:", err);
    return [];
  }
}

function deslugifyCity(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = deslugifyCity(citySlug);
  return {
    title: `${cfg.name} Contractors in ${city} | Fieseros Marketplace`,
    description: `Find verified ${cfg.contractorNoun} in ${city}. Compare reviews, request quotes, and book services on the Fieseros Marketplace.`,
    alternates: { canonical: `https://fieseros.com${cfg.contractorsBasePath}/${citySlug}` },
    robots: { index: true, follow: true },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;
  const city = deslugifyCity(citySlug);

  // Query providers in this industry + city. Mirrors the existing
  // /[companySlug]/[city]/page.tsx query so seed data and claimed businesses
  // both show up. NOTE: `mode: "insensitive"` is intentionally omitted —
  // SQLite (local dev) does not support it (Prisma throws a validation error)
  // and PostgreSQL's default collation is case-insensitive for text.
  let tenants: Array<{
    id: string;
    name: string;
    slug: string;
    publicSlug: string | null;
    tagline: string | null;
    industry: string | null;
    city: string | null;
    state: string | null;
    country: string;
    currency: string;
    rating: number;
    reviewCount: number;
    description: string | null;
    coverImage: string | null;
    pricingType: string | null;
    callOutFee: number;
    emergencyServiceAvailable: boolean;
    businessCategoriesJson: string;
    serviceAreasJson: string;
    identityVerified: boolean;
    businessVerified: boolean;
    insuranceVerified: boolean;
    stripeConnected: boolean;
    planStatus: string | null;
    plan: string | null;
    claimed: boolean;
    listingTier: string | null;
    trialEndsAt: Date | null;
    phone: string | null;
    googleBusinessProfileUrl: string | null;
    googleBusinessVerified: boolean;
    latitude: number | null;
    longitude: number | null;
    serviceRadiusKm: number;
  }> = [];
  try {
    tenants = await db.tenant.findMany({
      where: {
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
        // Combine industry + city filter groups with AND so BOTH apply.
        // (A bare top-level `OR` key would be silently overwritten by the
        // next `OR` key in the object literal — JS dedupes duplicate keys.)
        AND: [
          {
            OR: [
              { industry: { equals: cfg.industryId } },
              { businessCategoriesJson: { contains: `"${cfg.industryId}"` } },
            ],
          },
          {
            OR: [
              { city: { contains: city } },
              { city: { contains: citySlug } },
              { state: { contains: city } },
              { state: { contains: citySlug } },
              { serviceAreasJson: { contains: city } },
              { serviceAreasJson: { contains: citySlug } },
            ],
          },
        ],
      },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 50,
    });
  } catch (err) {
    console.error("[contractors-city] tenant.findMany failed:", err);
  }

  // Featured-listing map for card-type computation.
  const tenantIds = tenants.map((t) => t.id);
  let featuredMap: Map<string, { tenantId: string; type: string; priority: number; isActive: boolean; endDate: Date | string | null }> = new Map();
  try {
    featuredMap = await fetchFeaturedListingsMap(tenantIds);
  } catch (err) {
    console.error("[contractors-city] fetchFeaturedListingsMap failed:", err);
  }

  // Map to ProviderListItem[] for ProviderCard.
  const providers: ProviderListItem[] = tenants.map((t) => {
    let serviceAreas: string[] = [];
    try {
      const arr = JSON.parse(t.serviceAreasJson || "[]");
      if (Array.isArray(arr)) serviceAreas = arr.slice(0, 10);
    } catch {
      // ignore
    }
    const hasFL = featuredMap.has(t.id);
    const cardType = computeCardType(
      {
        claimed: t.claimed,
        plan: t.plan,
        planStatus: t.planStatus,
        trialEndsAt: t.trialEndsAt,
        listingTier: t.listingTier,
      },
      hasFL,
    );
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      publicSlug: t.publicSlug,
      tagline: t.tagline,
      industry: t.industry,
      city: t.city,
      state: t.state,
      country: t.country,
      currency: t.currency,
      rating: t.rating,
      reviewCount: t.reviewCount,
      description: t.description,
      coverImage: t.coverImage,
      pricingType: t.pricingType,
      callOutFee: t.callOutFee,
      emergencyServiceAvailable: t.emergencyServiceAvailable,
      serviceAreas,
      services: [],
      featured: cardType === "featured" ? "featured" : null,
      cardType,
      claimed: t.claimed,
      listingTier: t.listingTier,
      phone: t.phone,
      identityVerified: t.identityVerified,
      businessVerified: t.businessVerified,
      insuranceVerified: t.insuranceVerified,
      stripeConnected: t.stripeConnected,
      planStatus: t.planStatus,
      plan: t.plan,
      googleBusinessProfileUrl: t.googleBusinessProfileUrl,
      googleBusinessVerified: t.googleBusinessVerified,
      jobsCount: Math.round((t.reviewCount ?? 0) * 3),
      responseTimeMins:
        t.reviewCount >= 500 ? 5 : Math.max(8, 60 - Math.floor((t.reviewCount ?? 0) / 10)),
      latitude: t.latitude,
      longitude: t.longitude,
      serviceRadiusKm: t.serviceRadiusKm,
    } satisfies ProviderListItem;
  });

  // Don't 404 even with zero providers — the page stays SEO-indexable so
  // long-tail city searches can still land here and funnel to /#signup.
  return <IndustryContractorsCityPage config={cfg} city={city} providers={providers} />;
}

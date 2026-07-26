import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProviderProfile } from '@/components/marketplace/provider-profile';
import type { ProviderProfileResponse } from '@/components/marketplace/types';
import { Wrench, Sparkles } from 'lucide-react';

export const revalidate = 300; // ISR — revalidate every 5 minutes

/**
 * Provider profile page — server-rendered for SEO.
 *
 * URL: /marketplace/[slug]
 *
 * Fetches the tenant + services + reviews + portfolio + certifications +
 * featured listing in parallel on the server, then passes the data as
 * `initialData` to the <ProviderProfile> client component so it doesn't
 * need to re-fetch on the client (works without JS, indexable by Google).
 *
 * Returns 404 via notFound() if the tenant doesn't exist, is suspended,
 * or hasn't opted into the marketplace.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── generateStaticParams: pre-render the 12 seeded slugs at build time ─────

const SEEDED_SLUGS = [
  'metro-hvac-solutions',
  'elite-plumbing-pros',
  'bright-spark-electric',
  'fresh-start-cleaning',
  'green-thumb-landscaping',
  'shield-pest-control',
  'summit-roofing-co',
  'premier-painting-services',
  'rapid-lockout-rescue',
  'appliance-md',
  'crystal-blue-pools',
  'mobile-mechanic-pros',
];

export async function generateStaticParams() {
  return SEEDED_SLUGS.map((slug) => ({ slug }));
}

// ─── generateMetadata: SEO title + description ─────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: 'Provider not found' };

  let tenant: { name: string; tagline: string | null; description: string | null; seoTitle: string | null; seoDescription: string | null; city: string | null; state: string | null; industry: string | null } | null = null;
  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [{ slug }, { publicSlug: slug }],
        suspendedAt: null,
        marketplaceOptIn: true,
      },
      select: {
        name: true,
        tagline: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        city: true,
        state: true,
        industry: true,
      },
    });
  } catch (err) {
    console.error('[marketplace/[slug]] metadata fetch failed:', err);
  }

  if (!tenant) {
    return {
      title: 'Provider not found — ServiceOS Marketplace',
      robots: { index: false, follow: false },
    };
  }

  // Build the SEO title — prefer the tenant's curated seoTitle, otherwise
  // synthesize one from name + tagline using an em-dash separator.
  // Note: if seoTitle is set in the DB, it overrides the synthesized version.
  const synthesizedTitle = `${tenant.name} — ${tenant.tagline ?? 'Trusted Local Service Professional'}`;
  const title = tenant.seoTitle?.trim() ? tenant.seoTitle : synthesizedTitle;
  const description =
    tenant.seoDescription ??
    (tenant.description
      ? tenant.description.slice(0, 155)
      : `${tenant.name} is a verified service professional on ServiceOS Marketplace. Read reviews, compare quotes, and book instantly.`);

  const canonical = `https://serviceos.com/marketplace/${slug}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'profile',
      images: [],
    },
  };
}

// ─── Data fetch — mirrors /api/marketplace/providers/[slug] ─────────────────

async function fetchProviderProfile(slug: string): Promise<ProviderProfileResponse | null> {
  let tenant: Awaited<ReturnType<typeof db.tenant.findFirst>> = null;
  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [{ slug }, { publicSlug: slug }],
        suspendedAt: null,
        marketplaceOptIn: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        tagline: true,
        description: true,
        industry: true,
        city: true,
        state: true,
        country: true,
        currency: true,
        rating: true,
        reviewCount: true,
        coverImage: true,
        galleryJson: true,
        businessHoursJson: true,
        serviceAreasJson: true,
        socialLinksJson: true,
        faqsJson: true,
        pricingType: true,
        callOutFee: true,
        emergencyServiceAvailable: true,
        languagesJson: true,
        vatNumber: true,
        licenceNumber: true,
        insuranceProvider: true,
        insurancePolicyNumber: true,
        employeesCount: true,
        businessCategoriesJson: true,
        seoTitle: true,
        seoDescription: true,
        email: true,
        phone: true,
        identityVerified: true,
        businessVerified: true,
        insuranceVerified: true,
        stripeConnected: true,
        marketplaceOptIn: true,
      },
    });
  } catch (err) {
    console.error('[marketplace/[slug]] tenant fetch failed:', err);
    return null;
  }

  if (!tenant) return null;

  // Parallel fetch of related data
  const [services, portfolio, certifications, reviews, featured] = await Promise.all([
    db.service.findMany({
      where: { tenantId: tenant.id, isActive: true, isPublic: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        longDescription: true,
        basePrice: true,
        duration: true,
        image: true,
        category: true,
      },
      orderBy: { category: 'asc' },
    }),
    db.providerPortfolio.findUnique({
      where: { tenantId: tenant.id },
      select: {
        itemsJson: true,
        videosJson: true,
        awardsJson: true,
        projectsJson: true,
        teamJson: true,
      },
    }),
    db.providerCertification.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        issuer: true,
        issueDate: true,
        expiryDate: true,
        isVerified: true,
        certificateNumber: true,
        documentUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.review.findMany({
      where: { tenantId: tenant.id, status: 'published' },
      select: {
        id: true,
        rating: true,
        comment: true,
        authorName: true,
        source: true,
        responseJson: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    db.featuredListing.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      select: { id: true, type: true, priority: true },
    }),
  ]).catch((err) => {
    console.error('[marketplace/[slug]] parallel fetch failed:', err);
    return [[], null, [], [], null];
  });

  const safeParse = <T,>(json: string | null | undefined, fallback: T): T => {
    if (!json) return fallback;
    try {
      const parsed = JSON.parse(json);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  return {
    tenant: {
      ...tenant,
      gallery: safeParse(tenant.galleryJson, []),
      businessHours: safeParse(tenant.businessHoursJson, {}),
      serviceAreas: safeParse(tenant.serviceAreasJson, []),
      socialLinks: safeParse(tenant.socialLinksJson, {}),
      faqs: safeParse(tenant.faqsJson, []),
      languages: safeParse(tenant.languagesJson, []),
      businessCategories: safeParse(tenant.businessCategoriesJson, []),
      galleryJson: undefined,
      businessHoursJson: undefined,
      serviceAreasJson: undefined,
      socialLinksJson: undefined,
      faqsJson: undefined,
      languagesJson: undefined,
      businessCategoriesJson: undefined,
    },
    services,
    portfolio: portfolio
      ? {
          items: safeParse(portfolio.itemsJson, []),
          videos: safeParse(portfolio.videosJson, []),
          awards: safeParse(portfolio.awardsJson, []),
          projects: safeParse(portfolio.projectsJson, []),
          team: safeParse(portfolio.teamJson, []),
        }
      : { items: [], videos: [], awards: [], projects: [], team: [] },
    certifications,
    reviews: reviews.map((r) => ({
      ...r,
      response: safeParse(r.responseJson, null),
      responseJson: undefined,
    })),
    featured: featured ? { type: featured.type, priority: featured.priority } : null,
  } as unknown as ProviderProfileResponse;
}

// ─── Page component ────────────────────────────────────────────────────────

export default async function ProviderProfilePage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const data = await fetchProviderProfile(slug);
  if (!data || !data.tenant) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with back-to-marketplace link */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2" aria-label="ServiceOS home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Wrench className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold text-foreground">ServiceOS</span>
          </a>
          <nav className="flex items-center gap-3">
            <a
              href="/marketplace"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back to marketplace
            </a>
          </nav>
        </div>
      </header>

      {/* Structured data — JSON-LD for LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: data.tenant.name,
            description: data.tenant.description ?? data.tenant.tagline ?? undefined,
            url: `https://serviceos.com/marketplace/${slug}`,
            telephone: data.tenant.phone ?? undefined,
            email: data.tenant.email ?? undefined,
            address: {
              '@type': 'PostalAddress',
              addressLocality: data.tenant.city ?? undefined,
              addressRegion: data.tenant.state ?? undefined,
              addressCountry: data.tenant.country ?? undefined,
            },
            aggregateRating:
              data.tenant.rating && data.tenant.reviewCount
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: data.tenant.rating,
                    reviewCount: data.tenant.reviewCount,
                  }
                : undefined,
            priceRange: data.tenant.pricingType ?? undefined,
          }),
        }}
      />

      {/* Main profile (client component, hydrated with server-fetched data) */}
      <main className="flex-1">
        <ProviderProfile
          slug={slug}
          backHref="/marketplace"
          initialData={data}
        />
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{data.tenant.name}</p>
              <p className="text-xs text-muted-foreground">Verified provider on ServiceOS Marketplace</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a href="/marketplace" className="hover:text-foreground">← All providers</a>
            <a href="/" className="hover:text-foreground">ServiceOS Home</a>
            <a href="/#pricing" className="hover:text-foreground">List your business</a>
            <span>© {new Date().getFullYear()} ServiceOS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { notFound, permanentRedirect } from 'next/navigation';
import { db } from '@/lib/db';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import {
  getBgosPublicBusinessProfile,
  getBgosPublicCanonicalUrl,
} from '@/lib/bgos-public-business';
import { getCanonicalUrlBySlug } from '@/lib/public-business';

// Force dynamic rendering — this route must ALWAYS run the DB lookup + redirect
// on every request. Never statically cached (a cached redirect would go stale
// if the tenant's industry/city changes).
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MarketplaceSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  // 1. Strict boundary check: If this slug is a BGOS merchant, redirect to their BGOS canonical URL!
  const bgosProfile = await getBgosPublicBusinessProfile(slug);
  if (bgosProfile) {
    permanentRedirect(getBgosPublicCanonicalUrl(bgosProfile.slug));
  }

  // 2. If it is a canonical Fieseros trade contractor, redirect to their 3-segment URL
  const marketplaceCanonical = await getCanonicalUrlBySlug(slug);
  if (marketplaceCanonical) {
    permanentRedirect(marketplaceCanonical);
  }

  let tenant: {
    slug: string;
    industry: string | null;
    city: string | null;
    suspendedAt: Date | null;
    signupMode: string | null;
  } | null = null;

  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [{ slug }, { publicSlug: slug }],
      },
      select: { slug: true, industry: true, city: true, suspendedAt: true, signupMode: true },
    });
  } catch (err) {
    console.error('[marketplace/[slug] redirect] tenant lookup failed:', err);
    notFound();
  }

  if (!tenant || tenant.suspendedAt) {
    notFound();
  }

  // Exclude BGOS tenants
  if (tenant.signupMode === 'bgos') {
    permanentRedirect(`https://bgos.site/${tenant.slug}`);
  }

  // Never construct a broken /general/unknown URL when industry or city is missing!
  if (!tenant.industry || !tenant.city) {
    permanentRedirect('/marketplace');
  }

  const industrySeg = mapIndustryToUrlSlug(tenant.industry);
  const citySeg = slugifyCity(tenant.city);
  permanentRedirect(`/${industrySeg}/${citySeg}/${tenant.slug}`);
}

import { notFound, permanentRedirect } from 'next/navigation';
import { db } from '@/lib/db';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';

// Force dynamic rendering — this route must ALWAYS run the DB lookup + redirect
// on every request. Never statically cached (a cached redirect would go stale
// if the tenant's industry/city changes).
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * /marketplace/[slug] — LEGACY REDIRECT ROUTE.
 *
 * This used to be a full SSR provider-profile page (the "marketplace
 * storefront"). It has been consolidated into the canonical public business
 * hub at /{industry}/{city}/{slug} (see src/app/[companySlug]/[city]/[slug]/
 * page.tsx) so that every business has exactly ONE public URL — the
 * geo-targeted, SEO-optimized 3-segment URL that Google rewards for local
 * search ("plumber in delhi", "electrician mumbai", …).
 *
 * This file now exists solely to 301-redirect every legacy /marketplace/[slug]
 * URL (bookmarks, Google's index, inbound links) to its canonical
 * /{industry}/{city}/{slug} equivalent. A 301 passes ~100% of link equity.
 *
 * Behavior:
 *   - Tenant found & not suspended → 308 redirect to /{industry}/{city}/{slug}
 *   - Tenant not found / suspended → 404 (matches the old page's behavior)
 *
 * NOTE: This route is in its own segment (NOT inside the (browse) route group)
 * so the marketplace browse page's loading.tsx Suspense boundary does NOT wrap
 * this redirect — that boundary would otherwise intercept the NEXT_REDIRECT
 * error and render the loading skeleton (200) instead of the 308 redirect.
 *
 * NOTE: permanentRedirect() throws NEXT_REDIRECT internally — do NOT wrap in
 * try/catch (the catch would swallow the redirect).
 */
export default async function MarketplaceSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  let tenant: {
    slug: string;
    industry: string | null;
    city: string | null;
    suspendedAt: Date | null;
  } | null = null;

  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [{ slug }, { publicSlug: slug }],
      },
      select: { slug: true, industry: true, city: true, suspendedAt: true },
    });
  } catch (err) {
    console.error('[marketplace/[slug] redirect] tenant lookup failed:', err);
    notFound();
  }

  if (!tenant || tenant.suspendedAt) {
    notFound();
  }

  const industrySeg = mapIndustryToUrlSlug(tenant.industry);
  const citySeg = slugifyCity(tenant.city);
  permanentRedirect(`/${industrySeg}/${citySeg}/${tenant.slug}`);
}

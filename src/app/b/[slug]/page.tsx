import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { permanentRedirect } from 'next/navigation';
import { BgosPublicBusinessPage } from '@/components/bgos/bgos-public-business-page';
import { getPrimaryBusinessChatbotMeta } from '@/lib/bgos-business-chatbot';
import { StructuredData } from '@/components/seo/structured-data';
import { shouldRenderBgosCardHost } from '@/lib/bgos-business-sanitizers';
import {
  getBgosPublicBusinessProfile,
  getBgosPublicCanonicalUrl,
} from '@/lib/bgos-public-business';
import { getCanonicalUrlBySlug } from '@/lib/public-business';
import { getLocalBusinessSchema } from '@/lib/seo/schemas';

export const dynamic = 'force-dynamic';

type RouteProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstString(val: string | string[] | undefined): string | null {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return null;
}

function resolveForceView(search?: Record<string, string | string[] | undefined>): string | null {
  if (!search) return null;
  if (getFirstString(search.marketplace) === '1') return 'marketplace';
  return getFirstString(search.view);
}

function toAbsoluteAssetUrl(url: string | null | undefined, canonicalUrl: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, canonicalUrl).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: RouteProps): Promise<Metadata> {
  const [{ slug }, reqHeaders, resolvedSearch] = await Promise.all([
    params,
    headers(),
    searchParams ?? Promise.resolve({}),
  ]);
  const host = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host') || '';
  const forceView = resolveForceView(resolvedSearch);
  const profile = await getBgosPublicBusinessProfile(slug);
  const decision = shouldRenderBgosCardHost({
    host,
    marketplaceOptIn: profile?.marketplaceOptIn ?? null,
    forceView,
  });

  if (decision.action === 'redirect_marketplace') {
    const canonical = await getCanonicalUrlBySlug(slug);
    return {
      robots: { index: false, follow: false },
      ...(canonical ? { alternates: { canonical } } : {}),
    };
  }

  if (!profile) {
    return {
      title: 'Business Not Found',
      robots: { index: false, follow: false },
    };
  }

  if (profile.pageVisibility.published === false) {
    return {
      title: `${profile.businessName} — Page Paused`,
      robots: { index: false, follow: false },
    };
  }

  const ogImage = toAbsoluteAssetUrl(profile.coverImage || profile.logoUrl, profile.canonicalUrl);

  return {
    title: profile.seoTitle,
    description: profile.seoDescription,
    robots: { index: true, follow: true },
    alternates: { canonical: profile.canonicalUrl },
    openGraph: {
      title: profile.businessName,
      description: profile.seoDescription,
      url: profile.canonicalUrl,
      siteName: profile.businessName,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: profile.businessName,
      description: profile.seoDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ShortBusinessUrlPage({
  params,
  searchParams,
}: RouteProps) {
  const [{ slug }, reqHeaders, resolvedSearch] = await Promise.all([
    params,
    headers(),
    searchParams ?? Promise.resolve({}),
  ]);
  const host = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host') || '';
  const forceView = resolveForceView(resolvedSearch);
  const profile = await getBgosPublicBusinessProfile(slug);
  const decision = shouldRenderBgosCardHost({
    host,
    marketplaceOptIn: profile?.marketplaceOptIn ?? null,
    forceView,
  });

  if (decision.action === 'redirect_marketplace') {
    const canonical = await getCanonicalUrlBySlug(slug);
    if (canonical) {
      permanentRedirect(canonical);
    }
  }

  if (decision.action === 'redirect_bgos_host') {
    if (profile) {
      permanentRedirect(getBgosPublicCanonicalUrl(profile.slug));
    }
    const marketplaceCanonical = await getCanonicalUrlBySlug(slug);
    if (marketplaceCanonical) {
      permanentRedirect(marketplaceCanonical);
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold mb-2">Business page not found</h1>
            <p className="text-sm text-slate-500">
              We couldn&apos;t find a business page at{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                /b/{slug}
              </code>
              . Please double-check the link with the business owner.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (profile.pageVisibility.published === false) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold mb-2">{profile.businessName}</h1>
            <p className="text-sm text-slate-500">
              This public business page is temporarily paused by the owner. Please check back later or contact the business directly.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const localBusinessSchema = getLocalBusinessSchema({
    name: profile.businessName,
    description: profile.seoDescription,
    url: profile.canonicalUrl,
    slug: profile.slug,
    industry: profile.category,
    phone: profile.phone || undefined,
    email: profile.email || undefined,
    address: profile.address || undefined,
    city: profile.city || undefined,
    state: profile.state || undefined,
    postalCode: profile.postalCode || undefined,
    country: profile.country,
    logo: toAbsoluteAssetUrl(profile.logoUrl, profile.canonicalUrl),
    coverImage: toAbsoluteAssetUrl(profile.coverImage, profile.canonicalUrl),
    rating: profile.rating > 0 && profile.reviewCount > 0 ? profile.rating : undefined,
    reviewCount: profile.rating > 0 && profile.reviewCount > 0 ? profile.reviewCount : undefined,
    openingHours: profile.hours
      .filter((h) => h.open)
      .map((h) => ({
        days: [h.day],
        opens: h.openTime,
        closes: h.closeTime,
      })),
    sameAs: Object.values(profile.socialLinks).filter((v) => /^https?:\/\//i.test(v)),
    geo:
      profile.latitude !== null && profile.longitude !== null
        ? { latitude: profile.latitude, longitude: profile.longitude }
        : undefined,
  });

  const chatbotMeta =
    profile.pageVisibility.showChatbot !== false
      ? await getPrimaryBusinessChatbotMeta(profile.tenantId).catch(() => null)
      : null;

  return (
    <>
      <StructuredData data={localBusinessSchema} />
      <BgosPublicBusinessPage profile={profile} chatbotMeta={chatbotMeta} />
    </>
  );
}

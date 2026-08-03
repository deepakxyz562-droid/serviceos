import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import HomePageClient from '@/components/home/home-page-client';
import { FeaturedEuropeanLocation } from '@/components/home/featured-european-location';
import { HomeSeoContent } from '@/components/seo/home-seo-content';

/**
 * The HTTP-only auth cookie name. Mirrors `TOKEN_NAME` in `src/lib/auth.ts`.
 * Kept as a local constant (not imported) because `auth.ts` is a server-only
 * module that pulls in `next/headers` + the JWT lib — importing it here would
 * needlessly bloat the page's server bundle. We only need the cookie NAME to
 * check presence (we never decode the token on the client shell).
 */
const AUTH_COOKIE = 'fieseros_session';

/**
 * Homepage — server component shell (P0-1 SEO fix).
 *
 * Previously this file was a `'use client'` component that dynamically
 * imported the LandingPage with `ssr: false`, which made ALL homepage
 * content invisible to Googlebot and other crawlers (the #1 SEO blocker).
 *
 * Fix: This is now a server component that:
 *   1. Exports full `metadata` (title, description, OG, Twitter, canonical)
 *      — server components can export metadata, client components cannot.
 *   2. Renders `<HomeSeoContent />` — a lightweight server-rendered block
 *      with the hero H1, key features, and FAQ as static HTML. This is
 *      always in the initial server response so crawlers see real content
 *      even without executing JavaScript.
 *   3. Renders `<HomePageClient />` — the auth-routing logic + interactive
 *      LandingPage (loaded with ssr:false because the 2290-line component
 *      is too heavy for Turbopack to SSR efficiently).
 *
 * The SEO content is visible to:
 *   • Googlebot's first HTML parse (before JS execution)
 *   • Bingbot and other crawlers that don't execute JS
 *   • Social scrapers (Facebook, Twitter, LinkedIn)
 *   • Users with JavaScript disabled
 *
 * Auth-gated views (AppLayout, portals, AuthPage, Onboarding) remain
 * ssr:false inside HomePageClient — they're behind auth and shouldn't be
 * crawled anyway.
 */
export const metadata: Metadata = {
  title: 'Fieseros — The Operating System for Service Businesses',
  description:
    'Fieseros is the all-in-one operating system for service businesses. Replace scattered texts, emails, and spreadsheets with one platform for leads, dispatch, invoicing, and automated Email, SMS & Push notifications. Start free today.',
  keywords: [
    'field service software',
    'service business software',
    'job management software',
    'plumbing software',
    'HVAC software',
    'scheduling and dispatch',
    'invoicing software',
    'CRM for service businesses',
    'technician app',
    'workflow automation',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Fieseros — The Operating System for Service Businesses',
    description:
      'Replace scattered texts, emails, and spreadsheets with one powerful platform for leads, dispatch, invoicing, and automated notifications.',
    url: '/',
    siteName: 'Fieseros',
    type: 'website',
    images: [
      {
        url: '/og/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Fieseros — The Operating System for Service Businesses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fieseros — The Operating System for Service Businesses',
    description:
      'Replace scattered texts, emails, and spreadsheets with one powerful platform for service businesses.',
    images: ['/og/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default async function HomePage() {
  // ── FOUC fix: skip SEO content for authenticated users ─────────────────
  // On hard refresh while authenticated, the server-rendered <HomeSeoContent>
  // (hero H1, feature cards, FAQ, CTAs) would briefly appear before the
  // client-side `checkSession()` resolves and swaps to the CRM dashboard —
  // a visible "flash of unauthenticated content" (FOUC).
  //
  // Fix: detect the auth cookie on the server. When present, skip rendering
  // <HomeSeoContent /> entirely so the initial HTML contains only the
  // <HomePageClient /> shell (which shows a spinner while the authed view
  // loads). The client then renders the correct dashboard with no flash.
  //
  // Crawlers and anonymous visitors never send the cookie → they always get
  // the full SEO content (preserving the P0-1 SEO fix). The cookie check
  // opts the page out of static caching, but this route was already
  // effectively dynamic (all views use ssr:false) so there's no regression.
  //
  // Edge case (expired JWT inside the cookie): the server still skips SEO
  // content, the client calls /api/auth/me, gets 401, falls back to the
  // landing page. The user sees: spinner → landing page. No wrong-content
  // flash — strictly better than the previous behavior.
  const cookieStore = await cookies();
  const hasAuthCookie = Boolean(cookieStore.get(AUTH_COOKIE)?.value);

  return (
    <>
      {/*
        PERF-1 (LCP fix): Preload the hero dashboard image.
        -----------------------------------------------
        DualAudienceLanding uses ssr:false (it's a 2290-line component too
        heavy for Turbopack to SSR), so the <Image priority> inside it never
        emits its automatic preload hint — the browser can't preload an image
        whose <img> tag isn't in the initial HTML. The image request only
        fires AFTER the 70KB JS chunk downloads + React hydrates, pushing
        LCP to 6.2s.

        Fix: manually emit the preload link that <Image priority> would have
        emitted. imageSrcSet/imageSizes match the exact optimized URLs that
        next/image will request at runtime, so the browser preloads the
        correct AVIF/WebP variant and the hydrated <Image> hits cache
        instantly → LCP drops from ~6.2s to ~1.5-2s.

        Only emitted for anonymous visitors (authed users skip the landing
        page entirely and go straight to the dashboard).
      */}
      {!hasAuthCookie && (
        <link
          rel="preload"
          as="image"
          imageSrcSet="/_next/image?url=%2Fimages%2Flanding%2Fhero-dashboard.png&w=640&q=75 640w, /_next/image?url=%2Fimages%2Flanding%2Fhero-dashboard.png&w=1080&q=75 1080w, /_next/image?url=%2Fimages%2Flanding%2Fhero-dashboard.png&w=1200&q=75 1200w"
          imageSizes="(max-width: 1024px) 100vw, 80vw"
          fetchPriority="high"
        />
      )}
      {/* Server-rendered SEO content — visible to crawlers + anonymous visitors.
          Skipped for authenticated users to prevent FOUC on hard refresh. */}
      {!hasAuthCookie && <HomeSeoContent />}
      {/* Hourly-rotating European city spotlight — server-rendered, populated
          by the standalone external cron at /api/cron/featured-location.
          Skipped for authenticated users (they go straight to the dashboard). */}
      {!hasAuthCookie && <FeaturedEuropeanLocation />}
      {/* Interactive client app — auth routing + landing page */}
      <HomePageClient />
    </>
  );
}

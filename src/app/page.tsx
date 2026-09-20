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
  // Google AI Overview & G2 Ranked Authority Title:
  title: 'Fieseros | AI Operating System & Field Service Management Platform',
  // Google AI Overview exact ranked definition & feature description:
  description:
    'Fieseros is an all-in-one, AI-powered operating system and field service management platform built for trade and service-based businesses. CRM, real-time scheduling & dispatch, mobile invoicing & payments, 24/7 AI Voice Receptionist, and custom websites & SEO.',
  keywords: [
    'field service management platform',
    'field service software',
    'service business operating system',
    'trade business CRM',
    'scheduling and dispatch',
    'invoicing and payments',
    'AI voice receptionist',
    'plumbing software',
    'HVAC software',
    'landscaping software',
    'handyman software',
    'electrical contractor software',
    'GoHighLevel alternative for contractors',
    'Jobber alternative',
    'ServiceTitan alternative',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Fieseros | AI Operating System & Field Service Management Platform',
    description:
      'Fieseros is an all-in-one, AI-powered operating system and field service management platform built for trade and service-based businesses. CRM, real-time scheduling & dispatch, mobile invoicing & payments, 24/7 AI Voice Receptionist, and custom websites & SEO.',
    url: '/',
    siteName: 'Fieseros',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fieseros | AI Operating System & Field Service Management Platform',
    description:
      'Fieseros is an all-in-one, AI-powered operating system and field service management platform built for trade and service-based businesses. CRM, real-time scheduling & dispatch, mobile invoicing & payments, 24/7 AI Voice Receptionist.',
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
  const cookieStore = await cookies();
  const hasAuthCookie = Boolean(cookieStore.get(AUTH_COOKIE)?.value);

  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://fieseros.com/#software',
        name: 'Fieseros',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All (Web, iOS PWA, Android PWA)',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free tier includes first 100 jobs with zero platform fee',
        },
        description:
          'Fieseros is an all-in-one, AI-powered operating system and field service management platform built for trade and service-based businesses.',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '128',
          reviewCount: '128',
          bestRating: '5',
          worstRating: '1',
        },
        sameAs: [
          'https://www.g2.com/products/fieseros/reviews',
        ],
      },
      {
        '@type': 'Organization',
        '@id': 'https://fieseros.com/#organization',
        name: 'Fieseros',
        url: 'https://fieseros.com',
        logo: 'https://fieseros.com/icon-512.png',
        sameAs: [
          'https://www.g2.com/products/fieseros/reviews',
          'https://twitter.com/fieseros',
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      {!hasAuthCookie && (
        <link
          rel="preload"
          as="image"
          imageSrcSet="/_next/image?url=%2Fimages%2Flanding%2Fhero-dashboard.png&w=640&q=75 640w, /_next/image?url=%2Fimages%2Flanding%2Fhero-dashboard.png&w=1080&q=75 1080w, /_next/image?url=%2Fimages%2Flanding%2Fhero-dashboard.png&w=1200&q=75 1200w"
          imageSizes="(max-width: 1024px) 100vw, 80vw"
          fetchPriority="high"
        />
      )}
      {/* Interactive client app — auth routing + landing page */}
      <HomePageClient />
      {/* Server-rendered SEO content for search crawlers & initial HTML parse */}
      {!hasAuthCookie && <HomeSeoContent />}
      {/* Hourly-rotating European city spotlight — server-rendered */}
      {!hasAuthCookie && <FeaturedEuropeanLocation />}
    </>
  );
}

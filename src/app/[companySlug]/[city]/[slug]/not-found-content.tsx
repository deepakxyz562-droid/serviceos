'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  SearchX,
  Search,
  MapPin,
  Rocket,
  ArrowLeft,
  Home,
  ChevronRight,
} from 'lucide-react'
import {
  mapIndustryToPluralSlug,
  resolveIndustryFromAnySlug,
} from '@/lib/seo/plural-industry-slugs'
import { getIndustryDisplayName } from '@/lib/seo/industry-software-pages'

/**
 * Client-side content for the 404 "business not found" page.
 *
 * not-found.tsx is a server component and doesn't receive `params`, so it
 * can't know which industry/city/slug the visitor was looking for. This
 * client child reads the URL via `usePathname()` and renders the contextual
 * "next steps" UI: search the marketplace, browse the same industry in the
 * same city, or claim a free listing.
 *
 * The JSON-LD BreadcrumbList schema is rendered inline (rather than via the
 * <Breadcrumbs> server component) because this is a client component and
 * can't import server components directly.
 */
function prettifySlug(slug: string): string {
  if (!slug) return ''
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function NotFoundContent() {
  const pathname = usePathname()
  // pathname = "/auto-repair/san-diego/mobile-mechanic-pros"
  const segments = pathname.split('/').filter(Boolean)
  const [industry, city, slug] = segments

  const resolvedIndustryId = industry ? resolveIndustryFromAnySlug(industry) : null
  const industryLabel = resolvedIndustryId
    ? (getIndustryDisplayName(resolvedIndustryId) || prettifySlug(industry))
    : prettifySlug(industry)
  const cityLabel = prettifySlug(city)

  const pluralSlug = resolvedIndustryId
    ? mapIndustryToPluralSlug(resolvedIndustryId)
    : null
  const browseCityHref = pluralSlug && city
    ? `/${pluralSlug}/${city}`
    : `/marketplace${city ? `?city=${encodeURIComponent(city)}` : ''}`
  const browseIndustryHref = pluralSlug ? `/${pluralSlug}` : '/marketplace'

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Marketplace', url: '/marketplace' },
    { name: `${industryLabel} in ${cityLabel}`, url: browseCityHref },
    { name: 'Listing unavailable', url: pathname },
  ]

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `https://fieseros.com${item.url}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="flex-1">
        <div className="border-b bg-muted/20">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <nav aria-label="Breadcrumb" className="text-sm">
              <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                {breadcrumbItems.map((item, i) => (
                  <li key={item.url} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    {i === breadcrumbItems.length - 1 ? (
                      <span className="font-medium text-foreground" aria-current="page">
                        {item.name}
                      </span>
                    ) : (
                      <Link
                        href={item.url}
                        className="hover:text-foreground transition-colors"
                      >
                        {item.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <SearchX className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            This business listing couldn&apos;t be found
          </h1>

          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            We couldn&apos;t find a{' '}
            <span className="font-medium text-foreground">{industryLabel}</span> business
            {slug && (
              <>
                {' '}matching{' '}
                <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{slug}</span>
              </>
            )}
            {city && (
              <>
                {' '}in{' '}
                <span className="font-medium text-foreground">{cityLabel}</span>
              </>
            )}
            . The listing may have been removed, renamed, or the URL might be slightly off.
          </p>

          {/* Next-step cards */}
          <nav
            aria-label="What to do next"
            className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left"
          >
            <Link
              href="/marketplace"
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md"
            >
              <Search className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span className="font-semibold text-foreground group-hover:text-emerald-700">
                Search the marketplace
              </span>
              <span className="text-sm text-muted-foreground">
                Find verified {industryLabel.toLowerCase()} professionals near you.
              </span>
            </Link>

            <Link
              href={browseCityHref}
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md"
            >
              <MapPin className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span className="font-semibold text-foreground group-hover:text-emerald-700">
                Browse {industryLabel} in {cityLabel}
              </span>
              <span className="text-sm text-muted-foreground">
                See other providers in this area.
              </span>
            </Link>

            <Link
              href="/#signup"
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md"
            >
              <Rocket className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span className="font-semibold text-foreground group-hover:text-emerald-700">
                Claim your free listing
              </span>
              <span className="text-sm text-muted-foreground">
                Run a {industryLabel.toLowerCase()} business? List it for free.
              </span>
            </Link>
          </nav>

          <div className="mt-10 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={browseIndustryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {industryLabel} listings
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <Home className="h-4 w-4" />
              Homepage
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

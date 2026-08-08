import type { Metadata } from 'next'
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header'
import { CornerstoneFooter } from '@/components/seo/cornerstone-footer'
import NotFoundContent from './not-found-content'

/**
 * 404 boundary for the /[industry]/[city]/[slug] marketplace detail route.
 *
 * When `page.tsx` calls `notFound()` (because the business doesn't exist in
 * the DB), Next.js renders this file instead. This returns a TRUE HTTP 404
 * status code — not a soft 200/noindex — so Google de-indexes cleaned-out
 * listings quickly instead of treating them as "soft 404s" that linger in
 * the index for weeks.
 *
 * The friendly "business not found" UI (with contextual links to browse the
 * same industry/city, search the marketplace, or claim a listing) is rendered
 * by the <NotFoundContent /> client child, which uses `usePathname()` to
 * derive the industry/city/slug segments from the URL (not-found.tsx itself
 * doesn't receive `params`).
 *
 * Metadata: robots:noindex,follow — belt-and-suspenders alongside the 404
 * status. The 404 alone is sufficient for de-indexing, but the noindex tag
 * ensures correctness even if a CDN/proxy caches the response as 200.
 */
export const metadata: Metadata = {
  title: 'Business listing not found — Fieseros Marketplace',
  description:
    'This business listing may have been removed or is no longer available. Browse the Fieseros marketplace for other verified service providers near you.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketplaceHeader />
      <NotFoundContent />
      <CornerstoneFooter />
    </div>
  )
}

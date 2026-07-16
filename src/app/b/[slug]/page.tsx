import { permanentRedirect } from 'next/navigation'
import { getCanonicalUrlBySlug } from '@/lib/public-business'

/**
 * Short URL alias for public business hubs.
 *
 * /b/john-plumbing → 301 redirect to /plumber/dallas/john-plumbing
 *
 * This is the shareable link businesses put on:
 *   - business cards
 *   - WhatsApp messages
 *   - QR codes
 *   - print ads
 *
 * The canonical URL (/{industry}/{city}/{slug}) is what Google indexes.
 * The short URL just redirects to it.
 */

export const revalidate = 3600  // ISR: 1 hour

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const canonical = await getCanonicalUrlBySlug(slug)
  if (!canonical) return { robots: { index: false, follow: false } }
  return {
    robots: { index: false, follow: false },  // never index the short URL
    alternates: { canonical },
  }
}

export default async function ShortBusinessUrlPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const canonical = await getCanonicalUrlBySlug(slug)

  if (!canonical) {
    // Show a friendly "business not found" page rather than a hard 404.
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-2">Business not found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn&apos;t find a ServiceOS business profile at <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">/b/{slug}</code>.
              The link may be incorrect or the business may no longer be active.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Go to ServiceOS
            </a>
          </div>
        </main>
      </div>
    )
  }

  // 301 to the canonical /{industry}/{city}/{slug} URL.
  permanentRedirect(canonical)
}

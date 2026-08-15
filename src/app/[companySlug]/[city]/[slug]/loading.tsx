import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the public business detail page
 * (`/{industry}/{city}/{slug}`).
 *
 * Shown automatically by the Next.js App Router while the server component
 * (`page.tsx`) is fetching the business + services + reviews + certifications
 * + featured-listing + similar-providers data. The detail route is a single
 * synchronous server component with no `<Suspense>` boundaries, so without
 * this file the user saw a frozen previous page (or a blank screen) for the
 * entire fetch window — perceived as "the View Profile redirect is slow".
 *
 * This skeleton mirrors the real page layout (header → breadcrumb → hero →
 * trust badges → 2-column grid with content sections + sticky booking sidebar
 * → footer) so the transition to real content is visually seamless. Styled to
 * match `src/app/marketplace/(browse)/loading.tsx` (Skeleton components,
 * emerald accent, responsive, sticky footer).
 *
 * The skeleton appears INSTANTLY when navigation begins (the App Router
 * streams `loading.tsx` before the server component resolves) and is swapped
 * atomically for the real page once `Promise.all` completes.
 */
export default function PublicBusinessDetailLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header (mirrors MarketplaceHeader) ─────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="hidden sm:block h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Breadcrumb bar ────────────────────────────────────────────── */}
        <div className="border-b bg-muted/20">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-1.5 text-sm">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* ── Hero (mirrors PublicBusinessHero) ────────────────────────── */}
        <section className="border-b bg-gradient-to-b from-emerald-50/60 to-background dark:from-emerald-950/20">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            {/* Back to marketplace */}
            <Skeleton className="h-4 w-36 mb-6" />
            {/* Logo + name + meta */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl shrink-0" />
              <div className="flex-1 w-full">
                <Skeleton className="h-8 sm:h-9 lg:h-10 w-2/3 max-w-md mb-2" />
                <Skeleton className="h-4 w-1/2 max-w-sm mb-3" />
                <div className="flex flex-wrap items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Compact trust badges ─────────────────────────────────────── */}
        <div className="border-b">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>

        {/* ── Main content grid (lg:grid-cols-3) ───────────────────────── */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left column — content sections (col-span-2) */}
            <div className="lg:col-span-2 space-y-12">
              {/* Quick Facts */}
              <SkeletonBlock title={<Skeleton className="h-6 w-32 mb-4" />}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`qf-${i}`} className="rounded-lg border p-3 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              </SkeletonBlock>

              {/* About business */}
              <SkeletonBlock title={<Skeleton className="h-6 w-48 mb-4" />}>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </SkeletonBlock>

              {/* Services */}
              <SkeletonBlock title={<Skeleton className="h-6 w-40 mb-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`svc-${i}`} className="rounded-lg border overflow-hidden">
                      <Skeleton className="h-24 w-full rounded-none" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                        <div className="flex items-center justify-between pt-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-8 w-24 rounded-md" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SkeletonBlock>

              {/* Gallery */}
              <SkeletonBlock title={<Skeleton className="h-6 w-28 mb-4" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={`gal-${i}`} className="aspect-square w-full rounded-lg" />
                  ))}
                </div>
              </SkeletonBlock>

              {/* Reviews */}
              <SkeletonBlock title={<Skeleton className="h-6 w-24 mb-4" />}>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`rev-${i}`} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16 ml-auto" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  ))}
                </div>
              </SkeletonBlock>
            </div>

            {/* Right column — sticky booking sidebar (col-span-1) */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-20 space-y-4">
                {/* Claim / verified-owner banner */}
                <Skeleton className="h-16 w-full rounded-xl" />

                {/* Booking CTA card */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <Skeleton className="h-20 w-full rounded-none" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </div>
                </div>

                {/* Business info card */}
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <Skeleton className="h-5 w-32 mb-2" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`info-${i}`} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 flex-1 max-w-[180px]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer (mirrors CornerstoneFooter shell) ──────────────────── */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`fcol-${i}`} className="space-y-2">
                <Skeleton className="h-4 w-20 mb-2" />
                {Array.from({ length: 4 }).map((__, j) => (
                  <Skeleton key={`fl-${i}-${j}`} className="h-3 w-full max-w-[140px]" />
                ))}
              </div>
            ))}
          </div>
          <Skeleton className="h-3 w-64 mx-auto mt-8" />
        </div>
      </footer>

      {/* Spacer for mobile sticky CTA bar (matches page.tsx) */}
      <div className="h-16 lg:hidden" aria-hidden />
    </div>
  );
}

/**
 * Helper: a titled content section skeleton. Renders a section with a
 * skeleton heading and children content, matching the real page's
 * `<section><h2>…</h2>…</section>` structure.
 */
function SkeletonBlock({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      {title}
      {children}
    </section>
  );
}

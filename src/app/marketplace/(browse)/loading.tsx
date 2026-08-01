import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the marketplace browse page.
 *
 * Shown automatically by the Next.js App Router while the server component
 * (`page.tsx`) is fetching providers + featured listings. Mirrors the layout
 * of the real page (header + hero + sidebar + 6-card grid) so the transition
 * to real content is visually seamless.
 */
export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/20" />
        <div className="w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 text-center mx-auto">
          <Skeleton className="mx-auto h-6 w-64 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-10 w-3/4 max-w-2xl" />
          <Skeleton className="mx-auto mt-3 h-5 w-2/3 max-w-xl" />
          <Skeleton className="mx-auto mt-6 h-14 w-full max-w-2xl rounded-2xl" />
          <Skeleton className="mx-auto mt-2 h-3 w-72" />
        </div>
      </section>

      {/* Main grid */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar skeleton */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <Skeleton className="h-3 w-32" />
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={`v-${i}`} className="h-9 w-full rounded-md" />
                ))}
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </aside>

          {/* Main column skeleton */}
          <div>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-2 h-4 w-56" />
              </div>
              <Skeleton className="hidden sm:block h-4 w-40" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`card-${i}`}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <Skeleton className="h-40 w-full rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

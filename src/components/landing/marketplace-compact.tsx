'use client';

import * as React from 'react';
import {
  ArrowRight,
  Search,
  ShieldCheck,
  Zap,
  FileText,
  Siren,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Sparkles,
  Thermometer,
  Trees,
  Bug,
  Home,
  Paintbrush,
  Truck,
  Plug,
  Key,
  PawPrint,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { slugifyCity } from '@/lib/seo/schemas';
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';
import {
  mpUrl,
  type ProviderListItem,
  type ProviderListResponse,
} from '@/components/marketplace/types';
import { ProviderCard } from '@/components/marketplace/provider-card';

const SERVICE_CATEGORIES: { name: string; icon: LucideIcon; slug: string }[] = [
  { name: 'Plumbing', icon: Wrench, slug: 'plumbing' },
  { name: 'Electrical', icon: Zap, slug: 'electrical' },
  { name: 'Cleaning', icon: Sparkles, slug: 'cleaning' },
  { name: 'HVAC', icon: Thermometer, slug: 'hvac' },
  { name: 'Landscaping', icon: Trees, slug: 'landscaping' },
  { name: 'Pest Control', icon: Bug, slug: 'pest-control' },
  { name: 'Roofing', icon: Home, slug: 'roofing' },
  { name: 'Painting', icon: Paintbrush, slug: 'painting' },
  { name: 'Moving', icon: Truck, slug: 'moving' },
  { name: 'Appliance Repair', icon: Plug, slug: 'appliance-repair' },
  { name: 'Locksmith', icon: Key, slug: 'locksmith' },
  { name: 'Pet Care', icon: PawPrint, slug: 'pet-care' },
];

function FlowCard({
  icon: Icon,
  tone,
  title,
  tagline,
  description,
  steps,
}: {
  icon: typeof Zap;
  tone: string;
  title: string;
  tagline: string;
  description: string;
  steps: string[];
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className={cn('flex items-center gap-3 bg-gradient-to-r p-4 text-white', tone)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-bold">{title}</p>
          <p className="text-xs text-white/80">{tagline}</p>
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-auto space-y-1.5 pt-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {i + 1}
              </span>
              <span className="text-foreground">{s}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketplaceCompact({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted?: () => void;
  onSignIn?: () => void;
}) {
  const [featured, setFeatured] = React.useState<ProviderListItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = React.useState(true);

  // Featured providers
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeaturedLoading(true);
      try {
        // Fetch featured providers first (server-side filter via ?featured=true).
        // If zero featured are returned (e.g. fresh seed DB), fall back to the
        // top-rated 8 so the section is never empty.
        const featuredRes = await fetch(
          mpUrl('/api/marketplace/providers', { limit: 8, featured: true }),
        );
        const featuredData = (await featuredRes.json()) as ProviderListResponse;
        if (cancelled) return;
        const featuredItems = featuredData.items;

        if (featuredItems.length > 0) {
          // Sort featured by rating (featured already ensures they're sponsored)
          const sorted = [...featuredItems].sort(
            (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
          );
          setFeatured(sorted.slice(0, 8));
        } else {
          // Fallback: top-rated 8 so section is never empty
          const topRes = await fetch(
            mpUrl('/api/marketplace/providers', { limit: 8 }),
          );
          const topData = (await topRes.json()) as ProviderListResponse;
          if (cancelled) return;
          const sorted = [...topData.items].sort(
            (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
          );
          setFeatured(sorted.slice(0, 8));
        }
      } catch {
        if (!cancelled) setFeatured([]);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleProviderClick(p: ProviderListItem) {
    const slug = p.slug || p.publicSlug;
    if (slug && typeof window !== 'undefined') {
      // Navigate to the canonical /{pluralIndustry}/{city}/{slug} public hub
      // URL. PLURAL segment avoids a singular→plural 301 redirect on the
      // detail route (which causes a blank white page before loading.tsx
      // mounts during client-side navigation).
      window.location.href = `/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`;
    }
  }

  return (
    <section className="border-t bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header — clean marketplace intro.
            (The AI "describe your problem" feature was removed: it analyzed
            the request but hit a dead-end with 0 nearby providers when no
            location was given. Users now go straight to browsing / requesting
            quotes — clearer, faster, no false promise.) */}
        <div className="mb-8 text-center">
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 mb-3 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            Fieseros Marketplace
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Find trusted <span className="text-amber-600">local pros</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Browse verified businesses, compare quotes, and book instantly — or request a quote and let pros come to you.
          </p>
          <div className="mt-5">
            <Button asChild size="lg" className="gap-2 bg-amber-600 px-6 text-base text-white hover:bg-amber-700">
              <Link href="/marketplace">
                Browse all providers <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Featured providers */}
        <div className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-foreground sm:text-3xl">Featured Providers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Top-rated, verified businesses ready to take your booking right now.
              </p>
            </div>
            <a
              href="/marketplace"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300"
            >
              Browse all <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {featuredLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-72 w-72 shrink-0 rounded-xl" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm text-muted-foreground">No marketplace-eligible providers yet.</p>
                {onGetStarted ? (
                  <Button className="mt-2 gap-2 bg-amber-600 text-white hover:bg-amber-700" onClick={onGetStarted}>
                    List your business <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <FeaturedCarousel
              featured={featured}
              handleProviderClick={handleProviderClick}
            />
          )}
        </div>

        {/* Browse by Service — quick category shortcuts */}
        <div className="mt-12">
          <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardHeader className="gap-1.5 pb-4">
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Search className="h-4 w-4" />
                </span>
                Browse by Service
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Find pros for any job — tap a category to jump straight into the marketplace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {SERVICE_CATEGORIES.map(({ name, icon: Icon, slug }) => (
                  <Link
                    key={slug}
                    href={`/marketplace?search=${encodeURIComponent(name)}`}
                    className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-white/80 p-3 text-left transition-all hover:border-emerald-300 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/50 dark:text-emerald-300 dark:group-hover:bg-emerald-600 dark:group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {name}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-emerald-600/60 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Three ways to get service */}
        <div className="mt-12">
          <div className="mb-5 text-center">
            <h3 className="text-2xl font-bold text-foreground sm:text-3xl">Three Ways to Get Service</h3>
            <p className="mt-1 text-sm text-muted-foreground">Pick the flow that matches your urgency and project size.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FlowCard
              icon={Zap}
              tone="from-emerald-500 to-teal-600"
              title="Instant Booking"
              tagline="Pick a slot, done."
              description="Browse verified providers, choose a service + time, and confirm in seconds. Ideal for cleaning, lawn care, pest control — any routine job."
              steps={['Pick a provider', 'Choose service + time', 'Get confirmed instantly']}
            />
            <FlowCard
              icon={FileText}
              tone="from-amber-500 to-orange-600"
              title="Request Quotes"
              tagline="Compare, then decide."
              description="Describe your project and we'll broadcast it to multiple nearby providers. Compare quotes, reviews, and timelines — then accept the one you like."
              steps={['Describe your project', 'Receive N quotes', 'Pick the best fit']}
            />
            <FlowCard
              icon={Siren}
              tone="from-rose-500 to-red-600"
              title="Emergency Dispatch"
              tagline="Help, fast."
              description="Burst pipe, no power, locked out, gas leak — describe the emergency and we'll dispatch the nearest verified technician, usually en route in under 35 minutes."
              steps={['Describe the emergency', 'We broadcast instantly', 'Tech en route < 35 min']}
            />
          </div>
        </div>

        {/* CTA banner */}
        <div className="mt-12">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 p-7 text-white shadow-xl sm:p-9">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <Badge className="mb-3 bg-white/20 text-white hover:bg-white/20">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> For service businesses
                </Badge>
                <h3 className="text-2xl font-bold sm:text-3xl">Run your business on Fieseros.</h3>
                <p className="mt-2 text-sm text-amber-50">
                  Get discovered by thousands of customers in your area. Manage bookings, dispatch, invoicing, and AI automation — all in one platform.
                </p>
              </div>
              {onGetStarted ? (
                <Button
                  size="lg"
                  className="shrink-0 gap-2 bg-white text-amber-700 hover:bg-amber-50"
                  onClick={onGetStarted}
                >
                  List your business <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Featured Carousel ──────────────────────────────────────────────────────
// Horizontal-scroll carousel with left/right navigation arrows.
// Cards are responsive: 1 on mobile, 2 on tablet, 3-4 on desktop.
// The arrows appear/disappear based on scroll position.

function FeaturedCarousel({
  featured,
  handleProviderClick,
}: {
  featured: ProviderListItem[];
  handleProviderClick: (p: ProviderListItem) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScrollPosition = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  React.useEffect(() => {
    checkScrollPosition();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition);
    return () => {
      el.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition]);

  const scrollByCards = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by ~2 card widths (card + gap ≈ 304px)
    const scrollAmount = direction === 'left' ? -640 : 640;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Navigation arrows — desktop only */}
      {canScrollLeft && (
        <button
          onClick={() => scrollByCards('left')}
          className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-2 shadow-lg transition-all hover:bg-muted md:flex"
          aria-label="Previous providers"
          type="button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scrollByCards('right')}
          className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-2 shadow-lg transition-all hover:bg-muted md:flex"
          aria-label="Next providers"
          type="button"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#0f766e40 transparent',
        }}
      >
        {featured.map((p) => {
          const slug = p.slug || p.publicSlug;
          const canonicalHref = slug
            ? `/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
            : undefined;
          return (
            <div
              key={p.id}
              className="w-[85%] shrink-0 sm:w-[45%] md:w-[31%] lg:w-[23.5%]"
            >
              <ProviderCard
                provider={p}
                featured={!!p.featured}
                onViewProfile={handleProviderClick}
                compact
                className="h-full"
                href={canonicalHref}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile scroll hint — dots indicator */}
      <div className="mt-2 flex justify-center gap-1.5 md:hidden">
        {featured.length > 1 && (
          <span className="text-xs text-muted-foreground">
            ← Swipe to see more →
          </span>
        )}
      </div>
    </div>
  );
}

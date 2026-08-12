'use client';

import * as React from 'react';
import {
  Sparkles,
  Search,
  Loader2,
  ArrowRight,
  Zap,
  FileText,
  Siren,
  ChevronDown,
  ChevronRight,
  Star,
  MapPin,
  ShieldCheck,
  Bot,
  TrendingUp,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  VERTICALS,
  INDUSTRY_CATALOG,
  getIndustriesByVertical,
  getIndustry,
} from '@/lib/industry-catalog';
import { toast } from 'sonner';
import {
  mpUrl,
  type AiRouteResponse,
  type ProviderListItem,
  type ProviderListResponse,
  type ProviderProfile,
  type BookingMode,
} from './types';
import { ProviderCard } from './provider-card';
import { ProviderProfile as ProviderProfileView } from './provider-profile';
import { InstantBookingDialog } from './instant-booking-dialog';
import { QuoteRequestDialog } from './quote-request-dialog';
import { EmergencyDialog } from './emergency-dialog';

interface MarketplaceLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

type View =
  | { kind: 'home' }
  | { kind: 'browse'; industry?: string | null; vertical?: string | null }
  | { kind: 'profile'; slug: string };

const BOOKING_MODE_META: Record<
  BookingMode,
  { label: string; description: string; tone: string; icon: typeof Zap }
> = {
  instant: {
    label: 'Instant Booking',
    description: 'Pick a time and get confirmed immediately — no waiting.',
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    icon: Zap,
  },
  quote_request: {
    label: 'Request Quotes',
    description: 'Describe the job and compare quotes from multiple providers.',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    icon: FileText,
  },
  emergency: {
    label: 'Emergency Dispatch',
    description: 'A verified technician is on the way within minutes.',
    tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    icon: Siren,
  },
  ai_auto: {
    label: 'AI Auto-Assign',
    description: 'Let our AI dispatcher pick the best provider for you.',
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    icon: Bot,
  },
};

export function MarketplaceLanding({
  onGetStarted,
  onSignIn,
  onTryDemo,
}: MarketplaceLandingProps) {
  const [view, setView] = React.useState<View>({ kind: 'home' });
  const [aiText, setAiText] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<AiRouteResponse | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [expandedVertical, setExpandedVertical] = React.useState<string | null>(null);

  const [featured, setFeatured] = React.useState<ProviderListItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = React.useState(true);

  const [instantOpen, setInstantOpen] = React.useState(false);
  const [quoteOpen, setQuoteOpen] = React.useState(false);
  const [emergencyOpen, setEmergencyOpen] = React.useState(false);
  const [aiInstantProvider, setAiInstantProvider] = React.useState<ProviderListItem | null>(null);

  // Featured providers
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeaturedLoading(true);
      try {
        const res = await fetch(mpUrl('/api/marketplace/providers', { limit: 20 }));
        const data = (await res.json()) as ProviderListResponse;
        if (cancelled) return;
        // Sort: featured first, then rating desc
        const sorted = [...data.items].sort((a, b) => {
          if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
          return (b.rating ?? 0) - (a.rating ?? 0);
        });
        setFeatured(sorted);
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

  // Scroll to top when view changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  async function handleAiSearch(e: React.FormEvent) {
    e.preventDefault();
    const text = aiText.trim();
    if (text.length < 5) {
      toast.warning('Tell us a bit more about your problem');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch(mpUrl('/api/marketplace/ai-route'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to analyze your request');
      }
      setAiResult(data as AiRouteResponse);
      // Smooth-scroll to result
      setTimeout(() => {
        document.getElementById('ai-result')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 50);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze';
      setAiError(msg);
      toast.error('AI routing failed', { description: msg });
    } finally {
      setAiLoading(false);
    }
  }

  function handleProceedFromAi() {
    if (!aiResult) return;
    const mode = aiResult.bookingMode;
    if (mode === 'emergency') {
      setEmergencyOpen(true);
    } else if (mode === 'quote_request') {
      setQuoteOpen(true);
    } else if (mode === 'instant' && aiResult.nearbyProviders[0]) {
      // Pick top-rated provider from AI result; fetch full list to get a ProviderListItem
      const top = aiResult.nearbyProviders[0];
      void loadProviderAndBook(top.slug, top.tenantId);
    } else {
      // ai_auto — open quote request as a safe default
      setQuoteOpen(true);
    }
  }

  async function loadProviderAndBook(slug: string, _tenantId: string) {
    void _tenantId;
    try {
      const res = await fetch(mpUrl('/api/marketplace/providers', { limit: 100 }));
      const data = (await res.json()) as ProviderListResponse;
      const match = data.items.find((p) => p.slug === slug || p.publicSlug === slug);
      if (match) {
        setAiInstantProvider(match);
        setInstantOpen(true);
      } else {
        toast.error('Provider not found', {
          description: 'Try browsing the marketplace instead.',
        });
      }
    } catch {
      toast.error('Could not load provider details');
    }
  }

  function handleProviderClick(p: ProviderListItem | ProviderProfile) {
    const slug = (p as ProviderListItem).slug || (p as ProviderListItem).publicSlug;
    if (slug) setView({ kind: 'profile', slug });
  }

  function handleBrowseVertical(verticalId: string) {
    setView({ kind: 'browse', vertical: verticalId });
  }

  function handleBrowseIndustry(industryId: string) {
    setView({ kind: 'browse', industry: industryId });
  }

  // ── Provider profile view ──
  if (view.kind === 'profile') {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader
          onGetStarted={onGetStarted}
          onSignIn={onSignIn}
          onLogoClick={() => setView({ kind: 'home' })}
        />
        <ProviderProfileView
          slug={view.slug}
          onBack={() => setView({ kind: 'home' })}
        />
        <MarketplaceFooter />
      </div>
    );
  }

  // ── Browse results view ──
  if (view.kind === 'browse') {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader
          onGetStarted={onGetStarted}
          onSignIn={onSignIn}
          onLogoClick={() => setView({ kind: 'home' })}
        />
        <BrowseResults
          industry={view.industry ?? null}
          vertical={view.vertical ?? null}
          onProviderClick={handleProviderClick}
          onBack={() => setView({ kind: 'home' })}
        />
        <MarketplaceFooter />
      </div>
    );
  }

  // ── Home view ──
  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader
        onGetStarted={onGetStarted}
        onSignIn={onSignIn}
        onTryDemo={onTryDemo}
        onLogoClick={() => setView({ kind: 'home' })}
      />

      {/* Hero + AI search */}
      <section className="relative overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/20" />
        <div className="absolute -left-32 -top-32 -z-10 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/20" />
        <div className="absolute -right-32 top-20 -z-10 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-700/10" />

        <div className="mx-auto max-w-5xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
          {/* Eyebrow */}
          <div className="mb-4 flex justify-center">
            <Badge className="gap-1.5 border-emerald-200 bg-white/70 px-3 py-1 text-emerald-700 backdrop-blur hover:bg-white/70 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              The AI Marketplace for Local Services
            </Badge>
          </div>

          <h1 className="text-center text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Fieseros —{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
              The AI Operating System
            </span>{' '}
            for Local Service Businesses
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-muted-foreground sm:text-lg">
            Run your business. Get more customers. Automate everything.
          </p>

          {/* AI Describe-Problem Search */}
          <form onSubmit={handleAiSearch} className="mx-auto mt-8 max-w-2xl">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-30 blur-lg" />
              <div className="flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-xl sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="Describe your problem — e.g. “My boiler isn't producing hot water”"
                    className="h-12 border-0 bg-transparent pl-11 text-base shadow-none focus-visible:ring-0"
                    aria-label="Describe your problem"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={aiLoading || aiText.trim().length < 5}
                  className="h-12 gap-2 bg-emerald-600 px-6 text-base text-white hover:bg-emerald-700"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" /> Get Help
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Suggestions */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[
                'AC stopped cooling',
                'Burst pipe under sink',
                'Locked out of apartment',
                'Lawn overgrown',
                'Need house painters',
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAiText(s)}
                  className="rounded-full border bg-white/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-colors hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60"
                >
                  {s}
                </button>
              ))}
            </div>
          </form>

          {/* AI Result */}
          {aiError ? (
            <div id="ai-result" className="mx-auto mt-6 max-w-2xl rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <p className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {aiError}
              </p>
            </div>
          ) : null}

          {aiResult ? (
            <div
              id="ai-result"
              className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-xl"
            >
              <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  AI Routing Result
                  {aiResult.fallback ? (
                    <Badge variant="outline" className="ml-2 text-[10px]">fallback</Badge>
                  ) : null}
                </p>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                {/* Summary */}
                <div>
                  <p className="text-sm leading-relaxed text-foreground">
                    <span className="text-muted-foreground">Summary: </span>
                    {aiResult.extraction.summary}
                  </p>
                </div>

                {/* Extracted chips */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {aiResult.extraction.category ? (
                    <Chip label="Category" value={getIndustry(aiResult.extraction.category)?.name ?? aiResult.extraction.category} />
                  ) : null}
                  {aiResult.extraction.service ? (
                    <Chip label="Service" value={aiResult.extraction.service} />
                  ) : null}
                  <Chip label="Urgency" value={aiResult.extraction.urgency} />
                  {aiResult.extraction.durationMins ? (
                    <Chip label="Est. duration" value={`${aiResult.extraction.durationMins} min`} />
                  ) : null}
                  {aiResult.extraction.location ? (
                    <Chip label="Location" value={aiResult.extraction.location} />
                  ) : null}
                </div>

                {/* Cost estimate */}
                <div className="flex items-center justify-between rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">Estimated cost</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {aiResult.estimatedCost.currency} {aiResult.estimatedCost.low}–{aiResult.estimatedCost.high}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{aiResult.estimatedCost.basis}</p>
                  </div>
                </div>

                {/* Recommended booking mode */}
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recommended next step
                  </p>
                  {(() => {
                    const meta = BOOKING_MODE_META[aiResult.bookingMode];
                    const Icon = meta.icon;
                    return (
                      <div className="flex items-start gap-3">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', meta.tone)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">{meta.description}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Nearby providers */}
                {aiResult.nearbyProviders.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nearby providers ({aiResult.nearbyProviders.length})
                    </p>
                    <div className="max-h-44 space-y-1.5 overflow-y-auto">
                      {aiResult.nearbyProviders.map((p) => (
                        <button
                          key={p.tenantId}
                          type="button"
                          onClick={() => handleProviderClick({
                            id: p.tenantId,
                            name: p.name,
                            slug: p.slug,
                            publicSlug: null,
                            tagline: null,
                            industry: p.industry,
                            city: p.city,
                            state: p.state,
                            country: null,
                            currency: p.currency,
                            rating: p.rating,
                            reviewCount: p.reviewCount,
                            description: null,
                            coverImage: null,
                            pricingType: null,
                            callOutFee: null,
                            emergencyServiceAvailable: p.emergencyServiceAvailable,
                            serviceAreas: [],
                            services: [],
                            featured: null,
                          })}
                          className="flex w-full items-center justify-between gap-2 rounded-md border bg-card p-2 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {p.rating.toFixed(1)} ({p.reviewCount})
                              </span>
                              {p.city ? (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" /> {p.city}
                                </span>
                              ) : null}
                              {p.inServiceArea ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                  In your area
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleProceedFromAi}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {aiResult.bookingMode === 'emergency' ? (
                      <>
                        <Siren className="h-4 w-4" /> Dispatch Now
                      </>
                    ) : aiResult.bookingMode === 'instant' ? (
                      <>
                        <Zap className="h-4 w-4" /> Book Now
                      </>
                    ) : aiResult.bookingMode === 'quote_request' ? (
                      <>
                        <FileText className="h-4 w-4" /> Request Quotes
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4" /> Let AI Assign
                      </>
                    )}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAiResult(null);
                      setAiText('');
                      document.getElementById('browse-verticals')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Not what you meant? Browse categories
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Trust stats — factual product capabilities, not customer-count claims
              (Creem compliance: avoid "N+ providers" / "N+ jobs" without evidence) */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: '25+', label: 'Categories' },
              { value: 'Instant', label: 'Booking' },
              { value: 'Verified', label: 'Providers' },
              { value: '24/7', label: 'Emergency dispatch' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Vertical */}
      <section id="browse-verticals" className="border-t bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Browse by Vertical
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Nine verticals covering every local service — tap one to drill into industries.
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {INDUSTRY_CATALOG.length} industries · 150+ services
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VERTICALS.map((v) => {
              const isExpanded = expandedVertical === v.id;
              const industries = getIndustriesByVertical(v.id);
              return (
                <Card
                  key={v.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-emerald-300 hover:shadow-md',
                    isExpanded && 'border-emerald-400 shadow-md',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedVertical(isExpanded ? null : v.id);
                      if (!isExpanded) {
                        // Also offer direct browse of the vertical
                        void v.id;
                      }
                    }}
                    className="flex w-full items-start gap-3 p-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl dark:bg-emerald-950/50">
                      {v.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{v.name}</h3>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-180',
                          )}
                        />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {v.description}
                      </p>
                    </div>
                  </button>
                  {isExpanded ? (
                    <CardContent className="border-t bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {industries.length === 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleBrowseVertical(v.id)}
                          >
                            Browse all <ArrowRight className="h-3 w-3" />
                          </Button>
                        ) : (
                          <>
                            {industries.map((ind) => (
                              <button
                                key={ind.id}
                                type="button"
                                onClick={() => handleBrowseIndustry(ind.id)}
                                className="flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                              >
                                <span aria-hidden>{ind.emoji}</span>
                                {ind.name}
                              </button>
                            ))}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                              onClick={() => handleBrowseVertical(v.id)}
                            >
                              View all <ChevronRight className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Providers */}
      <section className="border-t bg-muted/30 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Featured Providers
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Top-rated, verified businesses ready to take your booking right now.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-emerald-700 dark:text-emerald-300"
              onClick={() => setView({ kind: 'browse' })}
            >
              Browse all <ArrowRight className="h-4 w-4" />
            </Button>
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
                <p className="text-sm text-muted-foreground">
                  No marketplace-eligible providers yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Be the first — sign up your business and unlock instant bookings.
                </p>
                {onGetStarted ? (
                  <Button className="mt-2 gap-2 bg-emerald-600 text-white hover:bg-emerald-700" onClick={onGetStarted}>
                    List your business <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
              {featured.map((p) => (
                <div key={p.id} className="w-72 shrink-0">
                  <ProviderCard
                    provider={p}
                    featured={!!p.featured}
                    onViewProfile={handleProviderClick}
                    compact
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Three Ways to Get Service
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the flow that matches your urgency and project size.
            </p>
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
      </section>

      {/* CTA banner */}
      <section className="border-t bg-background py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white shadow-xl sm:p-12">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <Badge className="mb-3 bg-white/20 text-white hover:bg-white/20">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> For service businesses
                </Badge>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Run your business on Fieseros.
                </h2>
                <p className="mt-2 text-sm text-emerald-50">
                  Get discovered by thousands of customers in your area. Manage bookings, dispatch, invoicing, and AI automation — all in one platform.
                </p>
              </div>
              {onGetStarted ? (
                <Button
                  size="lg"
                  className="shrink-0 gap-2 bg-white text-emerald-700 hover:bg-emerald-50"
                  onClick={onGetStarted}
                >
                  List your business <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <MarketplaceFooter />

      {/* Dialogs */}
      <InstantBookingDialog
        open={instantOpen}
        onOpenChange={setInstantOpen}
        providerTenantId={aiInstantProvider?.id ?? ''}
        providerName={aiInstantProvider?.name ?? ''}
        currency={aiInstantProvider?.currency ?? 'USD'}
        services={aiInstantProvider?.services ?? []}
      />
      <QuoteRequestDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        defaultTitle={(aiResult?.extraction.service ?? aiText.slice(0, 80)) || undefined}
        defaultDescription={aiResult?.extraction.summary ?? undefined}
        defaultIndustry={aiResult?.extraction.category ?? null}
        defaultBudgetLow={aiResult?.extraction.budgetLow ?? null}
        defaultBudgetHigh={aiResult?.extraction.budgetHigh ?? null}
        defaultUrgency={aiResult?.extraction.urgency ?? 'medium'}
      />
      <EmergencyDialog
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        defaultTitle={aiResult?.extraction.service ?? undefined}
        defaultDescription={aiResult?.extraction.summary ?? undefined}
        defaultIndustry={aiResult?.extraction.category ?? null}
      />
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────

function MarketplaceHeader({
  onGetStarted,
  onSignIn,
  onTryDemo,
  onLogoClick,
}: {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
  onLogoClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-2"
          aria-label="Fieseros home"
        >
          <BrandMark size={32} className="shadow-sm" />
          <span className="text-lg font-bold text-foreground">Fieseros</span>
        </button>

        <nav className="flex items-center gap-2">
          {onTryDemo ? (
            <Button variant="ghost" size="sm" onClick={onTryDemo} className="hidden sm:inline-flex">
              Try demo
            </Button>
          ) : null}
          {onSignIn ? (
            <Button variant="outline" size="sm" onClick={onSignIn}>
              Sign in
            </Button>
          ) : null}
          {onGetStarted ? (
            <Button size="sm" onClick={onGetStarted} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────

function MarketplaceFooter() {
  return (
    <footer className="mt-auto border-t bg-background py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <div>
              <p className="text-sm font-semibold text-foreground">Fieseros</p>
              <p className="text-xs text-muted-foreground">
                AI Marketplace & Operating System for Local Service Businesses
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Fieseros</span>
            <span className="hidden sm:inline">·</span>
            <span>25 industries · 9 verticals · 150+ services</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified providers
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Small UI helpers ──────────────────────────────────────────────────────

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

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
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
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

// ── Browse results ────────────────────────────────────────────────────────

function BrowseResults({
  industry,
  vertical,
  onProviderClick,
  onBack,
}: {
  industry: string | null;
  vertical: string | null;
  onProviderClick: (p: ProviderListItem) => void;
  onBack: () => void;
}) {
  const [items, setItems] = React.useState<ProviderListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const params: Record<string, string> = { limit: '60' };
        if (industry) params.industry = industry;
        const res = await fetch(mpUrl('/api/marketplace/providers', params));
        const data = (await res.json()) as ProviderListResponse;
        if (cancelled) return;
        setItems(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load providers');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [industry]);

  const verticalMeta = vertical
    ? VERTICALS.find((v) => v.id === vertical)
    : null;
  const industryMeta = industry ? getIndustry(industry) : null;
  const title = industryMeta?.name ?? verticalMeta?.name ?? 'All Providers';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
        <ArrowRight className="h-4 w-4 rotate-180" /> Back
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {industryMeta?.description ?? verticalMeta?.description ?? 'Browse verified marketplace providers.'}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-rose-600">
            {error}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No providers found in this category yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Try another vertical — or use the AI search to describe what you need.
            </p>
            <Button variant="outline" className="mt-2" onClick={onBack}>
              Back to marketplace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            Showing {items.length} verified provider{items.length === 1 ? '' : 's'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                featured={!!p.featured}
                onViewProfile={onProviderClick}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

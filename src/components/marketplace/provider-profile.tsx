'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Clock,
  Phone,
  Mail,
  Globe,
  Calendar,
  Zap,
  Award,
  Image as ImageIcon,
  HelpCircle,
  Quote,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getIndustry } from '@/lib/industry-catalog';
import { mpUrl, type ProviderProfileResponse } from './types';
import { InstantBookingDialog } from './instant-booking-dialog';
import { QuoteRequestDialog } from './quote-request-dialog';

interface ProviderProfileProps {
  /** Either tenant id or slug */
  slug: string;
  /**
   * Click handler for the back button. Required when used as a client-side
   * component (e.g. inside the marketplace landing's "profile" view). Omit
   * when rendering from the SSR /marketplace/[slug] route — the SSR page
   * renders its own header with a back link, and `backHref` is used instead.
   */
  onBack?: () => void;
  /**
   * Optional URL for the back link. Used by the SSR route so the back
   * button is a real anchor (works without JS). When provided, takes
   * precedence over onBack.
   */
  backHref?: string;
  /**
   * Optional pre-fetched data. When provided, the component skips the
   * client-side fetch and renders the server-fetched data immediately.
   * Used by the SSR route at /marketplace/[slug] so the page works
   * without JavaScript and is indexable by Google.
   */
  initialData?: ProviderProfileResponse;
}

function RatingStars({ rating, size = 16 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={cn(
            n <= Math.floor(rounded) || n - 0.5 === rounded
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-muted-foreground/40',
          )}
        />
      ))}
    </div>
  );
}

function buildRatingBreakdown(reviews: ProviderProfileResponse['reviews']) {
  const buckets = [0, 0, 0, 0, 0]; // 1..5 stars
  for (const r of reviews) {
    const s = Math.max(1, Math.min(5, Math.round(r.rating)));
    buckets[s - 1] += 1;
  }
  return buckets.reverse(); // 5-star first
}

function formatBusinessHours(
  hours: Record<string, unknown>,
): { day: string; hours: string }[] {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const labels: Record<string, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
  };
  return days.map((d) => {
    const v = hours[d];
    if (v == null || v === '') return { day: labels[d], hours: 'Closed' };
    if (typeof v === 'object') {
      const obj = v as { open?: string; close?: string };
      return {
        day: labels[d],
        hours: obj.open && obj.close ? `${obj.open} – ${obj.close}` : 'Closed',
      };
    }
    return { day: labels[d], hours: String(v) };
  });
}

export function ProviderProfile({ slug, onBack, backHref, initialData }: ProviderProfileProps) {
  const [data, setData] = React.useState<ProviderProfileResponse | null>(initialData ?? null);
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [instantOpen, setInstantOpen] = React.useState(false);
  const [quoteOpen, setQuoteOpen] = React.useState(false);
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    // If server-rendered with initialData, no need to refetch on mount.
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const res = await fetch(mpUrl(`/api/marketplace/providers/${encodeURIComponent(slug)}`));
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(json?.error || 'Failed to load provider profile');
        }
        setData(json as ProviderProfileResponse);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load provider');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, initialData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {backHref ? (
          <a href={backHref} className="inline-flex items-center gap-1 mb-4 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to marketplace
          </a>
        ) : (
          <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <Skeleton className="mb-4 h-48 w-full rounded-xl" />
        <Skeleton className="mb-3 h-8 w-1/2 rounded" />
        <Skeleton className="mb-6 h-4 w-1/3 rounded" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Could not load provider</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? 'Unknown error.'}
        </p>
        {backHref ? (
          <a href={backHref} className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800">
            <ArrowLeft className="h-4 w-4" /> Back to marketplace
          </a>
        ) : (
          <Button variant="outline" className="mt-4" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back to marketplace
          </Button>
        )}
      </div>
    );
  }

  const { tenant, services, portfolio, certifications, reviews, featured } = data;
  const industryMeta = tenant.industry ? getIndustry(tenant.industry) : undefined;
  const rating = tenant.rating ?? 0;
  const reviewCount = tenant.reviewCount ?? 0;
  const ratingBuckets = buildRatingBreakdown(reviews);
  const location = [tenant.city, tenant.state].filter(Boolean).join(', ');
  const verified = tenant.identityVerified && tenant.businessVerified;
  const hours = formatBusinessHours(tenant.businessHours || {});
  const gallery = Array.isArray(tenant.gallery) ? tenant.gallery : [];
  const portfolioItems = Array.isArray(portfolio.items) ? portfolio.items : [];
  const faqs = Array.isArray(tenant.faqs) ? tenant.faqs : [];
  const languages = Array.isArray(tenant.languages) ? tenant.languages : [];
  const serviceAreas = Array.isArray(tenant.serviceAreas) ? tenant.serviceAreas : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {backHref ? (
        <a href={backHref} className="inline-flex items-center gap-1 mb-4 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </a>
      ) : (
        <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Button>
      )}

      {/* Cover image — only render when available (no blank space when missing) */}
      {tenant.coverImage ? (
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600">
          <div className="h-44 sm:h-56">
            <img
              src={tenant.coverImage}
              alt=""
              className="h-full w-full object-cover opacity-90"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ) : null}

      {/* Header row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-background bg-card text-xl font-bold text-emerald-700 shadow-sm dark:text-emerald-300">
            {tenant.name
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join('')}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
              {featured ? (
                <Badge className="gap-1 bg-amber-400 text-amber-950 shadow">
                  <Award className="h-3.5 w-3.5" /> Featured Provider
                </Badge>
              ) : null}
              {tenant.emergencyServiceAvailable ? (
                <Badge className="gap-1 bg-rose-500 text-white shadow">
                  <Zap className="h-3.5 w-3.5" /> 24/7 Emergency
                </Badge>
              ) : null}
              {verified ? (
                <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              ) : null}
            </div>
            {tenant.tagline ? (
              <p className="mt-1 text-sm text-muted-foreground">{tenant.tagline}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                <RatingStars rating={rating} />
                <span className="font-semibold">{rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({reviewCount.toLocaleString()} reviews)
                </span>
              </div>
              {location ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {location}
                </div>
              ) : null}
              {industryMeta ? (
                <Badge variant="outline" className="gap-1">
                  <span aria-hidden>{industryMeta.emoji}</span>
                  {industryMeta.name}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => {
              setSelectedServiceId(null);
              setInstantOpen(true);
            }}
            disabled={services.length === 0}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Calendar className="h-4 w-4" /> Book Now
          </Button>
          <Button
            type="button"
            onClick={() => setQuoteOpen(true)}
            variant="outline"
            className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
          >
            <Quote className="h-4 w-4" /> Request Quote
          </Button>
        </div>
      </div>

      {/* Trust badges */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Identity Verified</p>
            <p className="text-[11px] text-muted-foreground">
              {tenant.identityVerified ? 'Confirmed' : 'Pending'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Business Verified</p>
            <p className="text-[11px] text-muted-foreground">
              {tenant.businessVerified ? 'Confirmed' : 'Pending'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Insured</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {tenant.insuranceProvider ?? (tenant.insuranceVerified ? 'Verified' : 'Pending')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <Award className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Licence</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {tenant.licenceNumber ?? 'Verified'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          {tenant.description ? (
            <Card>
              <CardHeader>
                <CardTitle>About {tenant.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {tenant.description}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle>Services & Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This provider hasn&apos;t listed any services yet — use the &quot;Request Quote&quot; button above to ask for a custom quote.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      className="group rounded-lg border p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{s.name}</p>
                          {s.category ? (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              {s.category}
                            </Badge>
                          ) : null}
                        </div>
                        {s.basePrice != null ? (
                          <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            {tenant.currency || 'USD'} {s.basePrice}
                          </span>
                        ) : null}
                      </div>
                      {s.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      ) : null}
                      {s.duration ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {s.duration} min
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 gap-1 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        onClick={() => {
                          setSelectedServiceId(s.id);
                          setInstantOpen(true);
                        }}
                      >
                        <Calendar className="h-3 w-3" /> Book this
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio / Gallery */}
          {(gallery.length > 0 || portfolioItems.length > 0) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[...gallery, ...portfolioItems.map((p) => p.image).filter(Boolean) as string[]].slice(0, 8).map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="aspect-square overflow-hidden rounded-md border bg-muted"
                    >
                      <img
                        src={src}
                        alt={`Gallery image ${i + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Reviews</span>
                <Badge variant="secondary">
                  {reviewCount.toLocaleString()} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Be the first to leave one after your service!
                </p>
              ) : (
                <>
                  {/* Rating breakdown */}
                  <div className="mb-4 flex items-center gap-6 rounded-lg border bg-muted/30 p-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                        {rating.toFixed(1)}
                      </p>
                      <RatingStars rating={rating} size={14} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {reviewCount.toLocaleString()} reviews
                      </p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {ratingBuckets.map((count, idx) => {
                        const stars = 5 - idx;
                        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2 text-xs">
                            <span className="w-6 text-muted-foreground">{stars}★</span>
                            <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full bg-amber-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-muted-foreground">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individual reviews */}
                  <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                    {reviews.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {r.authorName ?? 'Anonymous'}
                            </p>
                            <RatingStars rating={r.rating} size={12} />
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {r.comment ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {r.comment}
                          </p>
                        ) : null}
                        {r.response?.comment ? (
                          <div className="mt-2 rounded border-l-2 border-emerald-400 bg-emerald-50/40 p-2 text-xs dark:bg-emerald-950/20">
                            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                              Response from {tenant.name}:
                            </p>
                            <p className="mt-0.5 text-muted-foreground">
                              {r.response.comment}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* FAQs */}
          {faqs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" /> Frequently Asked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left text-sm">
                        {f.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {f.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact + hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {tenant.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{tenant.phone}</span>
                </div>
              ) : null}
              {tenant.email ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-xs">{tenant.email}</span>
                </div>
              ) : null}
              {tenant.website ? (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-xs">{tenant.website}</span>
                </div>
              ) : null}

              <Separator />

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Business Hours
                </p>
                <div className="space-y-1 text-xs">
                  {hours.map((h) => (
                    <div key={h.day} className="flex justify-between">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className={cn('font-medium', h.hours === 'Closed' ? 'text-rose-500' : 'text-foreground')}>
                        {h.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {languages.length > 0 ? (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Languages
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {languages.map((l) => (
                        <Badge key={l} variant="secondary" className="text-[10px]">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Service areas */}
          {serviceAreas.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" /> Service Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {serviceAreas.map((a) => (
                    <Badge key={a} variant="outline" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Certifications */}
          {certifications.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4" /> Certifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {certifications.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-2 rounded border bg-card p-2"
                  >
                    {c.isVerified ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.issuer ?? 'Issued'}
                        {c.issueDate
                          ? ` · ${new Date(c.issueDate).getFullYear()}`
                          : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <InstantBookingDialog
        open={instantOpen}
        onOpenChange={setInstantOpen}
        providerTenantId={tenant.id}
        providerName={tenant.name}
        currency={tenant.currency}
        services={services}
        defaultServiceId={selectedServiceId}
      />
      <QuoteRequestDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        defaultTitle={`Quote request for ${tenant.name}`}
        defaultIndustry={tenant.industry}
        defaultCity={tenant.city}
      />
    </div>
  );
}

'use client';

import * as React from 'react';
import {
  Zap,
  Building2,
  Shield,
  Globe,
  Check,
  ChevronRight,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── Pricing — DB-backed at runtime (see CrmPricing useEffect) ──────────────
//   The local FALLBACK_PRICING_PLANS array is used if the fetch to
//   /api/plans/public fails (network error, DB unreachable, etc.).
//   Canonical plan codes: starter | growth | business | enterprise.
//   Mid-tier code is `growth` but its display name is "Professional".
//   Prices: Starter $29/mo · Professional $79/mo · Business $149/mo ·
//   Enterprise Custom. Original (strikethrough) prices: $49/$129/$249/—.

export interface PricingPlan {
  code: string; // canonical DB plan code: starter | growth | business | enterprise
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  /** Strikethrough "original" monthly price (0/null = no strikethrough shown). */
  originalMonthlyPrice: number;
  description: string;
  icon: LucideIcon;
  features: string[];
  popular?: boolean;
  cta: string;
  highlight?: boolean;
}

export const FALLBACK_PRICING_PLANS: PricingPlan[] = [
  {
    // FREE TIER — 100 Lifetime Jobs PLG entry point
    code: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    originalMonthlyPrice: 0,
    description: '100 Lifetime Jobs — Get started free, no credit card',
    icon: Zap,
    features: [
      '1 User (Solo)',
      '100 Lifetime Jobs Total',
      'Unlimited Customers & Leads',
      'Lead Inbox & Quick Capture',
      'Quotes & Estimates',
      'Invoices & Receipts',
      'Calendar & Scheduling',
      'Online Booking Page',
      'Digital Signatures',
      '100 MB Storage',
    ],
    cta: 'Get Started Free',
  },
  {
    // LAUNCH SPECIAL — $5/mo founding member offer. Monthly billing only.
    code: 'launch_special',
    name: 'Launch Special',
    monthlyPrice: 5,
    yearlyPrice: 0, // Monthly only — no annual option
    originalMonthlyPrice: 29,
    description: 'Founding member offer — first 100 only',
    icon: Zap,
    features: [
      'Up to 5 Users',
      'CRM & Customer Management',
      'Quotes & Estimates',
      'Jobs & Scheduling',
      'Calendar',
      'Invoices & Online Payments',
      'Customer Portal',
      'Employee Portal',
      'Online Booking',
      'Time Tracking & Expenses',
      'Before & After Photos',
      'Digital Signatures',
      'Customer 360',
      'Reviews Management',
      'Basic Reports',
      '5 GB Storage',
    ],
    cta: 'Claim Launch Special',
    popular: true,
  },
  {
    code: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    originalMonthlyPrice: 49,
    description: 'For solo pros & new businesses',
    icon: Zap,
    features: [
      'Up to 5 Users',
      'CRM & Customer Management',
      'Quotes & Estimates',
      'Jobs & Scheduling',
      'Calendar',
      'Invoices & Online Payments',
      'Customer Portal',
      'Employee Portal',
      'Online Booking',
      'Time Tracking & Expenses',
      'Before & After Photos',
      'Digital Signatures',
      'Customer 360',
      'Reviews Management',
      'Basic Reports',
      '5 GB Storage',
    ],
    cta: 'Start Free Trial',
  },
  {
    code: 'growth',
    name: 'Professional',
    monthlyPrice: 79,
    yearlyPrice: 790,
    originalMonthlyPrice: 129,
    description: 'For growing teams — most popular',
    icon: Building2,
    features: [
      'Everything in Starter, plus:',
      'Up to 10 Users',
      'Unlimited Customers & Jobs',
      'Email + SMS + Push Notifications',
      'WhatsApp (BYO Meta API)',
      'Omnichannel Inbox',
      'AI Assistant + AI Quote Generator',
      'AI Job Summary & Suggested Replies',
      'Workflow Builder + Forms Builder',
      'Marketing Campaigns & Broadcast',
      'Customer Segments',
      'Template Studio',
      'Live Chat Widget',
      'API Access & Webhooks',
      '50 GB Storage',
    ],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    code: 'business',
    name: 'Business',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    originalMonthlyPrice: 249,
    description: 'For multi-branch operators',
    icon: Shield,
    features: [
      'Everything in Professional, plus:',
      'Up to 25 Users',
      'AI Receptionist (Voice Agents)',
      'AI Phone Numbers + Call History',
      'AI Dispatcher (Smart Dispatch)',
      'Inventory Management',
      'Purchase Orders',
      'Recurring Jobs',
      'Live Technician Map (GPS)',
      'Advanced Reports',
      'Role Permissions',
      '200 GB Storage',
    ],
    cta: 'Start Free Trial',
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    originalMonthlyPrice: 0,
    description: 'For large organizations',
    icon: Globe,
    features: [
      'Everything in Business, plus:',
      'Unlimited Users & Storage',
      'White Label Branding',
      'Advanced Security & Audit Logs',
      'Data Retention Policies',
      'Dedicated Support',
      'Custom Onboarding',
    ],
    cta: 'Contact Sales',
  },
];

export function CrmPricing({ onGetStarted }: { onGetStarted?: () => void }) {
  const [yearly, setYearly] = React.useState(false);
  const [plans, setPlans] = React.useState<PricingPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);

  const checkScrollability = React.useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    const cardWidth = 320;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveSlideIndex(Math.min(Math.max(index, 0), Math.max(plans.length - 1, 0)));
  }, [plans.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 330;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollability, { passive: true });
    checkScrollability();
    return () => el.removeEventListener('scroll', checkScrollability);
  }, [checkScrollability, plans]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/plans/public');
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.plans || !Array.isArray(data.plans)) return;
        // Index the DB plans by code so we can overlay DB values onto the
        // curated marketing copy (features list + icon stay hardcoded).
        const dbByCode = new Map<string, any>(
          data.plans.map((p: any) => [p.code, p]),
        );
        // Issue 6 fix: iterate over the CURATED fallback list (not the DB
        // list) so a missing/inactive DB row falls back to its hardcoded
        // entry instead of disappearing. This guarantees all 4 cards
        // (Starter, Professional/growth, Business, Enterprise) always render.
        //
        // EXCEPTION: launch_special is a time-limited promo. When the
        // superadmin deactivates it (isActive=false → /api/plans/public
        // omits it), the hardcoded fallback card must ALSO be hidden so the
        // promo disappears from the pricing grid. Other plans keep the
        // resilient fallback behaviour (a missing DB row is treated as a
        // transient failure, not an intentional hide).
        const mapped: PricingPlan[] = FALLBACK_PRICING_PLANS
          .filter((curated) => {
            if (curated.code !== 'launch_special') return true;
            // Only render launch_special when the DB explicitly returned it
            // (i.e. it's active in the Plan catalog). Otherwise drop it.
            return dbByCode.has('launch_special');
          })
          .map((curated) => {
          const dbPlan = dbByCode.get(curated.code);
          if (!dbPlan) return curated; // keep hardcoded fallback for this tier
          return {
            ...curated,
            name: dbPlan.name || curated.name,
            monthlyPrice: dbPlan.monthlyPrice !== null && dbPlan.monthlyPrice !== undefined && Number(dbPlan.monthlyPrice) > 0
              ? Number(dbPlan.monthlyPrice)
              : (curated.monthlyPrice !== null && curated.monthlyPrice !== undefined && curated.monthlyPrice > 0
                  ? curated.monthlyPrice
                  : null),
            yearlyPrice: dbPlan.yearlyPrice !== null && dbPlan.yearlyPrice !== undefined && Number(dbPlan.yearlyPrice) > 0
              ? Number(dbPlan.yearlyPrice)
              : (curated.yearlyPrice !== null && curated.yearlyPrice !== undefined && curated.yearlyPrice > 0
                  ? curated.yearlyPrice
                  : null),
            originalMonthlyPrice: Number(dbPlan.originalMonthlyPrice) || curated.originalMonthlyPrice,
            popular: dbPlan.popular ?? curated.popular,
          } as PricingPlan;
        });
        if (cancelled) return;
        setPlans(mapped);
      } catch (err) {
        // Network / parse error — fall back to the curated list so the
        // pricing section still renders.
        console.warn('[landing] Failed to fetch /api/plans/public, using fallback:', err);
        if (!cancelled) setPlans(FALLBACK_PRICING_PLANS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Percentage discount from an original price to a current price.
  // Returns 0 when there's no meaningful discount to show.
  const discountPct = (original: number, current: number) => {
    if (!original || original <= 0 || current >= original) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  return (
    <section id="pricing" className="border-t bg-muted/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Pricing</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Simple, <span className="text-emerald-600">Transparent Pricing</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Start free with 100 Lifetime Jobs. No credit card required. Email, SMS &amp; In-App notifications included on every plan.
          </p>

          {/* Segmented Pill Switcher & Slider Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <div className="inline-flex items-center p-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={cn(
                  'px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer',
                  !yearly
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>Monthly</span>
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={cn(
                  'px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer',
                  yearly
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>Yearly</span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide transition-colors',
                    yearly
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  Save ~17%
                </span>
              </button>
            </div>

            {/* Slider Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous pricing plans"
                className={cn(
                  'size-9 rounded-full border flex items-center justify-center transition cursor-pointer shadow-xs',
                  canScrollLeft
                    ? 'bg-white dark:bg-slate-900 border-border text-foreground hover:border-emerald-500 hover:text-emerald-600'
                    : 'bg-muted/50 border-border/50 text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Next pricing plans"
                className={cn(
                  'size-9 rounded-full border flex items-center justify-center transition cursor-pointer shadow-xs',
                  canScrollRight
                    ? 'bg-white dark:bg-slate-900 border-border text-foreground hover:border-emerald-500 hover:text-emerald-600'
                    : 'bg-muted/50 border-border/50 text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Horizontal Snap Slider Carousel */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 pt-3 px-1 scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={`skeleton-${i}`} className="border-border h-full flex flex-col w-[285px] sm:w-[305px] lg:w-[320px] shrink-0 snap-start">
                  <CardHeader className="pb-2">
                    <div className="w-10 h-10 rounded-lg bg-muted mb-3" />
                    <div className="h-5 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2">
                    <div className="h-9 w-20 bg-muted rounded mb-4" />
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div key={j} className="h-3 w-full bg-muted rounded" />
                    ))}
                  </CardContent>
                  <CardFooter>
                    <div className="h-9 w-full bg-muted rounded" />
                  </CardFooter>
                </Card>
              ))
            ) : (
              plans.map((plan) => {
                const Icon = plan.icon;
                const monthlySave = discountPct(plan.originalMonthlyPrice, plan.monthlyPrice ?? 0);
                const yearlySave = discountPct(
                  plan.originalMonthlyPrice * 12,
                  plan.yearlyPrice ?? 0,
                );
                return (
                  <Card
                    key={plan.code}
                    className={cn(
                      'relative bg-white dark:bg-slate-900 border h-full flex flex-col justify-between transition-all w-[285px] sm:w-[305px] lg:w-[320px] shrink-0 snap-start shadow-xs',
                      plan.popular
                        ? 'border-emerald-500 shadow-lg shadow-emerald-100 dark:shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                        : 'border-border hover:border-emerald-300 hover:shadow-md',
                    )}
                  >
                    {plan.popular ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-emerald-600 text-white font-semibold border-0 px-3 shadow-md text-[11px]">
                          Most Popular
                        </Badge>
                      </div>
                    ) : null}
                    <div>
                      <CardHeader className="pb-2">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                          plan.popular ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800' : 'bg-muted border border-border')}>
                          <Icon className={cn('w-5 h-5', plan.popular ? 'text-emerald-600' : 'text-muted-foreground')} />
                        </div>
                        <CardTitle className="text-foreground text-lg">{plan.name}</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs leading-relaxed">{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          {plan.monthlyPrice === 0 ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-extrabold text-foreground">$0</span>
                              <span className="text-muted-foreground text-sm">/mo (100 Jobs Free)</span>
                            </div>
                          ) : (plan.monthlyPrice !== null && plan.monthlyPrice !== undefined && plan.monthlyPrice > 0) ? (
                            <>
                              {plan.originalMonthlyPrice > 0 && (
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm text-muted-foreground line-through">
                                    ${yearly ? plan.originalMonthlyPrice * 12 : plan.originalMonthlyPrice}
                                  </span>
                                  {(() => {
                                    const pct = yearly ? yearlySave : monthlySave;
                                    return pct > 0 ? (
                                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-0 text-xs px-1.5 py-0">
                                        Save {pct}%
                                      </Badge>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                              <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold text-foreground">
                                  ${yearly ? Math.round((plan.yearlyPrice ?? 0) / 12) : plan.monthlyPrice}
                                </span>
                                <span className="text-muted-foreground text-sm">/mo</span>
                              </div>
                              {yearly && plan.yearlyPrice !== null ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ${plan.yearlyPrice}/year billed annually
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <div className="text-4xl font-bold text-foreground">Custom</div>
                          )}
                        </div>
                        <ul className="space-y-2.5">
                          {plan.features.map((feature, idx) => {
                            const isHeader = idx === 0 && /^everything in/i.test(feature);
                            return (
                              <li key={feature} className="flex items-start gap-2 text-xs sm:text-sm">
                                {!isHeader && <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
                                <span className={cn(isHeader ? 'text-foreground font-semibold' : 'text-foreground/80')}>
                                  {feature}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </div>
                    <CardFooter className="pt-4 border-t border-border/60">
                      <Button
                        onClick={onGetStarted}
                        className={cn('w-full text-xs sm:text-sm font-semibold h-10 cursor-pointer',
                          plan.popular
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 hover:bg-muted text-foreground border border-border')}
                      >
                        {plan.cta} <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>

          {/* Slider Pagination Dots */}
          {plans.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {plans.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!scrollRef.current) return;
                    scrollRef.current.scrollTo({ left: i * 320, behavior: 'smooth' });
                  }}
                  aria-label={`Jump to slide ${i + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                    activeSlideIndex === i
                      ? 'w-6 bg-emerald-600'
                      : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <strong className="text-foreground">All plans include</strong> Email, SMS, Push & In-App notifications, lead capture, invoicing, and the Live Demo.
        </p>
      </div>
    </section>
  );
}

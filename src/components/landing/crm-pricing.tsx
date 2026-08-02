'use client';

import * as React from 'react';
import {
  Zap,
  Building2,
  Shield,
  Globe,
  Check,
  ChevronRight,
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
    code: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    originalMonthlyPrice: 49,
    description: 'For solo pros & new businesses',
    icon: Zap,
    features: [
      '1 User',
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
      'Up to 5 Users',
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
      'Up to 20 Users',
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
  // Plan catalog — fetched from /api/plans/public (no auth required) on
  // mount so prices stay in sync with the DB (editable by super-admins
  // without a deploy). Falls back to FALLBACK_PRICING_PLANS on any fetch
  // failure. We merge DB-backed prices/names/popular flags into the
  // curated marketing copy (features + icon + description stay hardcoded
  // so the landing page reads well — DB feature flags aren't curated for
  // marketing).
  // Issue 6 fix: start with an EMPTY list + a `loading` flag so the first
  // paint shows a skeleton (no hardcoded prices) instead of the fallback
  // prices that get visibly swapped out a moment later (the "flicker").
  const [plans, setPlans] = React.useState<PricingPlan[]>([]);
  const [loading, setLoading] = React.useState(true);

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
        const mapped: PricingPlan[] = FALLBACK_PRICING_PLANS.map((curated) => {
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
          <p className="text-muted-foreground mt-3">Start free for 14 days. No credit card required. Email, SMS & Push notifications included on every plan. WhatsApp available with your own Meta API.</p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={cn('text-sm font-medium', !yearly ? 'text-foreground' : 'text-muted-foreground')}>Monthly</span>
            <button
              type="button"
              onClick={() => setYearly(!yearly)}
              className="relative w-14 h-7 rounded-full bg-muted border border-border transition-colors"
              aria-label="Toggle yearly pricing"
            >
              <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-emerald-600 shadow-sm transition-transform',
                yearly ? 'translate-x-7' : 'translate-x-0.5')} />
            </button>
            <span className={cn('text-sm font-medium flex items-center gap-1', yearly ? 'text-foreground' : 'text-muted-foreground')}>
              Yearly
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Save ~17%</Badge>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {loading ? (
            // Issue 6 fix: skeleton during the initial fetch so the user
            // never sees hardcoded fallback prices that get swapped out.
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="border-border h-full flex flex-col">
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
                  'relative bg-white border h-full flex flex-col transition-all',
                  plan.popular
                    ? 'border-emerald-500 shadow-lg shadow-emerald-100 ring-1 ring-emerald-500/20'
                    : 'border-border hover:border-emerald-300 hover:shadow-md',
                )}
              >
                {plan.popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white font-semibold border-0 px-3 shadow-md">Most Popular</Badge>
                  </div>
                ) : null}
                <CardHeader className="pb-2">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                    plan.popular ? 'bg-emerald-50 border border-emerald-100' : 'bg-muted border border-border')}>
                    <Icon className={cn('w-5 h-5', plan.popular ? 'text-emerald-600' : 'text-muted-foreground')} />
                  </div>
                  <CardTitle className="text-foreground text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-5">
                    {/* Issue 6: treat monthlyPrice === 0 the same as null (Enterprise = Custom).
                        Previously a DB-stored 0 for Enterprise rendered as "$0/mo" instead of "Custom". */}
                    {(plan.monthlyPrice !== null && plan.monthlyPrice !== undefined && plan.monthlyPrice > 0) ? (
                      <>
                        {/* Strikethrough original price + Save % badge */}
                        {plan.originalMonthlyPrice > 0 && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm text-muted-foreground line-through">
                              ${yearly ? plan.originalMonthlyPrice * 12 : plan.originalMonthlyPrice}
                            </span>
                            {(() => {
                              const pct = yearly ? yearlySave : monthlySave;
                              return pct > 0 ? (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs px-1.5 py-0">
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
                      // The first feature in each higher-tier plan is a
                      // header line like "Everything in Starter, plus:" —
                      // render it without a check icon for visual emphasis.
                      const isHeader = idx === 0 && /^everything in/i.test(feature);
                      return (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          {!isHeader && <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
                          <span className={cn(isHeader ? 'text-foreground font-semibold' : 'text-foreground/80')}>
                            {feature}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={onGetStarted}
                    className={cn('w-full',
                      plan.popular
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm'
                        : 'bg-white hover:bg-muted text-foreground border border-border')}
                  >
                    {plan.cta} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <strong className="text-foreground">All plans include</strong> Email, SMS, Push & In-App notifications, lead capture, invoicing, and the Live Demo.
        </p>
      </div>
    </section>
  );
}

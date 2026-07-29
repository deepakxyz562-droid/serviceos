'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Check,
  X,
  Star,
  ArrowLeft,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Plan definitions ──────────────────────────────────────────────────────
// Display names: 'business' tier is shown as 'Pro' in the UI.
// Prices: original (strikethrough) + discounted (40% off).

interface PlanDef {
  id: 'starter' | 'growth' | 'business' | 'enterprise';
  displayName: string;
  tagline: string;
  originalPrice: number | null; // null = "Custom"
  discountedPrice: number | null;
  features: string[];
  highlighted: boolean; // ★ Best
  ctaLabel: string;
}

const PLANS: PlanDef[] = [
  {
    id: 'starter',
    displayName: 'Starter',
    tagline: 'For solo professionals getting started',
    originalPrice: 17,
    discountedPrice: 10,
    features: [
      'Dashboard & calendar',
      'Up to 100 jobs',
      'Leads & contacts management',
      'Quotes & invoices',
      'Basic reports',
      '1 user seat',
    ],
    highlighted: false,
    ctaLabel: 'Choose Starter',
  },
  {
    id: 'growth',
    displayName: 'Growth',
    tagline: 'For growing teams that need automation',
    originalPrice: 42,
    discountedPrice: 25,
    features: [
      'Everything in Starter',
      'Campaigns & Template Studio',
      'Live Chat & Form Builder',
      'Workflows & automations',
      'WhatsApp & SMS integration',
      '5 user seats',
      'Unlimited jobs',
    ],
    highlighted: true,
    ctaLabel: 'Choose Growth',
  },
  {
    id: 'business',
    displayName: 'Pro',
    tagline: 'For established businesses with AI needs',
    originalPrice: 83,
    discountedPrice: 50,
    features: [
      'Everything in Growth',
      'AI Receptionist & AI Agents',
      'Phone numbers & call history',
      'API access',
      'Advanced analytics',
      'Unlimited user seats',
    ],
    highlighted: false,
    ctaLabel: 'Choose Pro',
  },
  {
    id: 'enterprise',
    displayName: 'Enterprise',
    tagline: 'For large organizations with custom needs',
    originalPrice: null,
    discountedPrice: null,
    features: [
      'Everything in Pro',
      'White-label branding',
      'Dedicated support manager',
      'Custom integrations',
      'SLA guarantee',
      'On-premise deployment option',
    ],
    highlighted: false,
    ctaLabel: 'Contact Sales',
  },
];

// ─── Feature comparison matrix ─────────────────────────────────────────────

interface FeatureRow {
  feature: string;
  starter: boolean;
  growth: boolean;
  business: boolean;
  enterprise: boolean;
}

const FEATURE_MATRIX: FeatureRow[] = [
  { feature: 'Dashboard & calendar', starter: true, growth: true, business: true, enterprise: true },
  { feature: 'Leads & contacts', starter: true, growth: true, business: true, enterprise: true },
  { feature: 'Jobs & quotes', starter: true, growth: true, business: true, enterprise: true },
  { feature: 'Invoices & expenses', starter: true, growth: true, business: true, enterprise: true },
  { feature: 'Basic reports', starter: true, growth: true, business: true, enterprise: true },
  { feature: 'Campaigns', starter: false, growth: true, business: true, enterprise: true },
  { feature: 'Template Studio', starter: false, growth: true, business: true, enterprise: true },
  { feature: 'Live Chat', starter: false, growth: true, business: true, enterprise: true },
  { feature: 'Workflows', starter: false, growth: true, business: true, enterprise: true },
  { feature: 'Form Builder', starter: false, growth: true, business: true, enterprise: true },
  { feature: 'WhatsApp & SMS', starter: false, growth: true, business: true, enterprise: true },
  { feature: 'AI Receptionist', starter: false, growth: false, business: true, enterprise: true },
  { feature: 'AI Agents', starter: false, growth: false, business: true, enterprise: true },
  { feature: 'Phone Numbers', starter: false, growth: false, business: true, enterprise: true },
  { feature: 'Call History', starter: false, growth: false, business: true, enterprise: true },
  { feature: 'API access', starter: false, growth: false, business: true, enterprise: true },
  { feature: 'White-label', starter: false, growth: false, business: false, enterprise: true },
];

// ─── Page component ────────────────────────────────────────────────────────

export default function SubscribePage() {
  const router = useRouter();
  const auth = useAppStore((s) => s.auth);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Trial countdown
  const isTrial = auth.tenant?.planStatus === 'trial';
  const trialEndsAt = auth.tenant?.trialEndsAt;

  const { daysRemaining, trialDay } = useMemo(() => {
    if (!trialEndsAt) return { daysRemaining: 0, trialDay: 1 };
    const end = new Date(trialEndsAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const day = Math.min(14, Math.max(1, 14 - days + 1));
    return { daysRemaining: days, trialDay: day };
  }, [trialEndsAt]);

  const isExpired = isTrial && daysRemaining === 0;

  const handleChoosePlan = (plan: PlanDef) => {
    if (plan.id === 'enterprise') {
      toast.info('Contact our sales team at sales@serviceos.com for enterprise pricing.');
      return;
    }
    // Navigate to the billing view with the selected plan pre-selected
    // The billing view handles PayPal/Creem checkout
    router.push(`/?plan=${plan.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* ─── Top bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold">ServiceOS</span>
          </div>
        </div>
      </header>

      {/* ─── Trial countdown banner ───────────────────────────────────── */}
      {isTrial && !isExpired && (
        <div className="bg-amber-50 border-b border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-800 dark:text-amber-300 font-medium">
              ⏰ {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in your trial
            </span>
            <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">
              · Day {trialDay} / 14 · Save 40% on annual plans
            </span>
          </div>
        </div>
      )}

      {/* ─── Main content ─────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Choose your plan
          </h1>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {isTrial
              ? 'Your trial ends soon. Pick a plan to keep all your data and unlock premium features.'
              : 'Scale your field service business with the plan that fits your team.'}
          </p>

          {/* Billing cycle toggle */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                billingCycle === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Yearly
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] h-4 px-1">
                Save 50%
              </Badge>
            </button>
          </div>
        </div>

        {/* ─── Plan cards grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {PLANS.map((plan) => {
            const monthlyPrice = plan.discountedPrice;
            const yearlyPrice = plan.discountedPrice ? plan.discountedPrice * 10 : null; // 10 months (2 months free)
            const displayPrice = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;
            const originalMonthly = plan.originalPrice;
            const originalYearly = plan.originalPrice ? plan.originalPrice * 17 : null;
            const originalDisplay = billingCycle === 'yearly' ? originalYearly : originalMonthly;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col p-5 transition-all',
                  plan.highlighted
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg scale-[1.02]'
                    : 'border-border hover:border-emerald-500/50 hover:shadow-md'
                )}
              >
                {/* ★ Best badge */}
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white border-0 px-3 py-1 text-xs font-semibold flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Best Value
                    </Badge>
                  </div>
                )}

                {/* Plan name + tagline */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">{plan.displayName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {displayPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">${displayPrice}</span>
                      <span className="text-sm text-muted-foreground">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-foreground">Custom</div>
                  )}
                  {originalDisplay && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground line-through">${originalDisplay}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-500/30 text-emerald-600">
                        40% off
                      </Badge>
                    </div>
                  )}
                  {billingCycle === 'yearly' && displayPrice && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ${displayPrice}/yr · 2 months free
                    </p>
                  )}
                </div>

                {/* CTA button */}
                <Button
                  onClick={() => handleChoosePlan(plan)}
                  className={cn(
                    'w-full mb-4',
                    plan.highlighted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-foreground text-background hover:bg-foreground/90'
                  )}
                >
                  {plan.ctaLabel}
                </Button>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* ─── Feature comparison table ───────────────────────────────── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold text-foreground">Feature comparison</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compare what's included in each plan
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-5 py-3 text-sm font-semibold text-foreground">Feature</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">Starter</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-emerald-600">Growth</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">Pro</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-sm text-foreground font-medium">{row.feature}</td>
                    <td className="text-center px-4 py-3">
                      {row.starter ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                    <td className="text-center px-4 py-3 bg-emerald-500/5">
                      {row.growth ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      {row.business ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      {row.enterprise ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile accordion-style list */}
          <div className="md:hidden divide-y">
            {FEATURE_MATRIX.map((row, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-sm font-medium text-foreground mb-2">{row.feature}</p>
                <div className="flex gap-3 text-xs flex-wrap">
                  <span className={cn('flex items-center gap-1', row.starter ? 'text-emerald-600' : 'text-muted-foreground/50')}>
                    {row.starter ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Starter
                  </span>
                  <span className={cn('flex items-center gap-1', row.growth ? 'text-emerald-600' : 'text-muted-foreground/50')}>
                    {row.growth ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Growth
                  </span>
                  <span className={cn('flex items-center gap-1', row.business ? 'text-emerald-600' : 'text-muted-foreground/50')}>
                    {row.business ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Pro
                  </span>
                  <span className={cn('flex items-center gap-1', row.enterprise ? 'text-emerald-600' : 'text-muted-foreground/50')}>
                    {row.enterprise ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Ent
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Trust signals ──────────────────────────────────────────── */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>40% off — limited time</span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>No setup fees</span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* ─── Contact ────────────────────────────────────────────────── */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about which plan is right for you?{' '}
            <a href="mailto:sales@serviceos.com" className="text-emerald-600 hover:underline font-medium">
              Talk to our team
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

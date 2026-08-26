/**
 * FieserosPromoCard
 * =================
 *
 * The "Powered by Fieseros" promotional card shown on public-facing pages
 * (marketplace business hub, hosted forms). This is the web equivalent of
 * the email promotional footer — but adapted for web (Tailwind classes,
 * proper React, server-component compatible).
 *
 * DESIGN PHILOSOPHY (per review direction)
 * ----------------------------------------
 * "The tenant's business must remain the hero. Fieseros should feel like the
 *  technology powering a better business experience."
 *
 * So this is a SMALL PREMIUM CARD, not a footer advertisement. It:
 *   - Sits at the BOTTOM of the page (non-intrusive)
 *   - Uses business-context messaging ("Want to grow your service business?")
 *     instead of generic "Start your free profile"
 *   - Does NOT compete with the business's own CTAs (booking form, etc.)
 *   - Is visually distinct (gradient background, but muted — not loud)
 *
 * WHITE-LABEL ENFORCEMENT
 * -----------------------
 * If `hideFieserosBranding === true` (tenant paid for white-label + their
 * plan allows it), the parent page MUST NOT render this component at all.
 * The parent is responsible for the conditional check — this component
 * always renders the promo when mounted.
 *
 * MESSAGING VARIANTS
 * ------------------
 * The card rotates between 4 value propositions (scheduling, AI, payments,
 * analytics) based on day-of-year, so repeat visitors see different pitches
 * without us tracking per-visitor state.
 *
 * USAGE
 * -----
 *   import { FieserosPromoCard } from '@/components/public/fieseros-promo-card';
 *
 *   // In the page (server component):
 *   const branding = await loadTenantPublicBranding(tenant.id);
 *   {!branding.hideFieserosBranding && <FieserosPromoCard variant="bottom" />}
 */

import Link from 'next/link';
import { TrendingUp, CalendarClock, Bot, CreditCard } from 'lucide-react';

interface FieserosPromoCardProps {
  /** Visual placement — 'bottom' is the default non-intrusive footer card. */
  variant?: 'bottom';
  /** Optional: override the day-based rotation (0-3). If omitted, rotates
   * based on day-of-year so repeat visitors see different pitches. */
  variantIndex?: number;
  /** Optional: additional className for the outer wrapper. */
  className?: string;
}

interface PromoVariant {
  icon: typeof TrendingUp;
  headline: string;
  features: string;
}

const PROMO_VARIANTS: PromoVariant[] = [
  {
    icon: CalendarClock,
    headline: 'Turn inquiries into booked jobs',
    features: 'CRM • Scheduling • Jobs • Invoicing • AI',
  },
  {
    icon: Bot,
    headline: 'Never miss a customer with AI Receptionist',
    features: 'AI Receptionist • Lead Capture • 24/7 Availability',
  },
  {
    icon: CreditCard,
    headline: 'Get paid faster with Fieseros',
    features: 'Invoices • Payments • Recurring Billing • Payouts',
  },
  {
    icon: TrendingUp,
    headline: 'See your whole business in one dashboard',
    features: 'Revenue • Jobs • Team • Customer Insights',
  },
];

export function FieserosPromoCard({
  variant = 'bottom',
  variantIndex,
  className = '',
}: FieserosPromoCardProps) {
  // Pick a variant — rotate by day-of-year so it changes daily.
  const dayOfYear = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const idx = variantIndex ?? dayOfYear % PROMO_VARIANTS.length;
  const promo = PROMO_VARIANTS[idx] ?? PROMO_VARIANTS[0];
  const Icon = promo.icon;

  return (
    <div
      className={`mx-auto mt-8 max-w-md rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-cyan-950/20 ${className}`}
      role="complementary"
      aria-label="Fieseros CRM promotion"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Built for service businesses
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">
            {promo.headline}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {promo.features}
          </p>
          <Link
            href="/"
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Run your business with Fieseros
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

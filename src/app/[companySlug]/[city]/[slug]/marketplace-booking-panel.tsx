'use client';

import * as React from 'react';
import { Calendar, Check, Quote, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstantBookingDialog } from '@/components/marketplace/instant-booking-dialog';
import { QuoteRequestDialog } from '@/components/marketplace/quote-request-dialog';
import type { ProviderService } from '@/components/marketplace/types';

interface MarketplaceBookingPanelProps {
  providerTenantId: string;
  providerName: string;
  providerPhone?: string | null;
  currency: string;
  /** Services shaped as ProviderService[] (id/name/slug/basePrice/duration). */
  services: ProviderService[];
  industry: string | null;
  city: string | null;
  /** Whether the provider offers 24/7 emergency service. */
  emergencyServiceAvailable?: boolean;
}

/**
 * Marketplace booking panel — rendered in the right rail of the public
 * business hub page ONLY when `tenant.marketplaceOptIn === true`.
 *
 * Replaces the lightweight `<PublicBookingForm>` (which just creates a Lead)
 * with the full marketplace booking flows:
 *   - "Book Now"  → `<InstantBookingDialog>` (creates Booking + Job + escrow)
 *   - "Request Quote" → `<QuoteRequestDialog>` (broadcasts to provider)
 *
 * This is the bridge that lets the canonical /{industry}/{city}/{slug} URL
 * serve BOTH the public SEO page AND the marketplace storefront — so we can
 * 301-redirect the old /marketplace/[slug] route here without losing the
 * marketplace booking UX.
 */
export function MarketplaceBookingPanel({
  providerTenantId,
  providerName,
  providerPhone,
  currency,
  services,
  industry,
  city,
  emergencyServiceAvailable,
}: MarketplaceBookingPanelProps) {
  const [instantOpen, setInstantOpen] = React.useState(false);
  const [quoteOpen, setQuoteOpen] = React.useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-emerald-700 to-teal-700 p-5 text-white">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <h3 className="text-lg font-bold">Marketplace Booking</h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-emerald-50">
          <span className="inline-flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Verified Business
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> Instant Booking
          </span>
          <span className="inline-flex items-center gap-1">
            <Quote className="h-3.5 w-3.5" /> Request Quote
          </span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => setInstantOpen(true)}
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

        {emergencyServiceAvailable ? (
          providerPhone ? (
            <a
              href={`tel:${providerPhone.replace(/[^+\d]/g, '')}`}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <Zap className="h-4 w-4" /> 24/7 Emergency Service
            </a>
          ) : (
            <div
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <Zap className="h-4 w-4" /> 24/7 Emergency Service
            </div>
          )
        ) : null}

        {services.length === 0 ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No fixed-price services listed — use &ldquo;Request Quote&rdquo; for a
            custom estimate.
          </p>
        ) : null}
      </div>

      <InstantBookingDialog
        open={instantOpen}
        onOpenChange={setInstantOpen}
        providerTenantId={providerTenantId}
        providerName={providerName}
        currency={currency}
        services={services}
      />
      <QuoteRequestDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        defaultTitle={`Quote request for ${providerName}`}
        defaultIndustry={industry}
        defaultCity={city}
      />
    </>
  );
}

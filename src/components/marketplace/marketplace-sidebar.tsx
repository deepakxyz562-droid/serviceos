'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck, Star, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceSearch } from './use-marketplace-search';
import type { ProviderListItem } from './types';
import { getIndustry, VERTICALS } from '@/lib/industry-catalog';

/**
 * MarketplaceSidebar
 * -------------------
 * Left sidebar for the marketplace browse page. Three sections:
 *
 *   1. CATEGORIES — vertical filter links (server-crawlable <a> tags) with
 *      live provider counts. Active vertical is highlighted.
 *   2. TRUST FILTERS — three toggle checkboxes (Fully verified only /
 *      Rating 4.8+ / 24/7 emergency dispatch) that instantly filter the grid
 *      via the shared Zustand store.
 *   3. STATS CARD — "Four-gate verification" explainer with 4 network metrics
 *      (active providers, avg rating, escrow-protected, median response).
 *
 * This is a client component because the trust filters write to the Zustand
 * store. The category links stay as plain <a> tags so search engines can
 * crawl the facet URLs.
 */

interface MarketplaceSidebarProps {
  providers: ProviderListItem[];
  verticals: readonly Array<{ id: string; name: string; icon: string; description: string }>;
  activeVertical: string | null;
  activeIndustry: string | null;
}

export function MarketplaceSidebar({
  providers,
  verticals,
  activeVertical,
  activeIndustry,
}: MarketplaceSidebarProps) {
  const trustFullyVerified = useMarketplaceSearch((s) => s.trustFullyVerified);
  const trustRatingHigh = useMarketplaceSearch((s) => s.trustRatingHigh);
  const trustEmergency = useMarketplaceSearch((s) => s.trustEmergency);
  const toggleTrustFullyVerified = useMarketplaceSearch((s) => s.toggleTrustFullyVerified);
  const toggleTrustRatingHigh = useMarketplaceSearch((s) => s.toggleTrustRatingHigh);
  const toggleTrustEmergency = useMarketplaceSearch((s) => s.toggleTrustEmergency);

  // Compute network stats from the full provider list
  const totalProviders = providers.length;
  const avgRating = totalProviders > 0
    ? (providers.reduce((sum, p) => sum + (p.rating ?? 0), 0) / totalProviders).toFixed(2)
    : '0.00';
  const fullyVerifiedCount = providers.filter(
    (p) => p.identityVerified && p.businessVerified && p.insuranceVerified && p.stripeConnected,
  ).length;
  const escrowPct = totalProviders > 0
    ? Math.round((fullyVerifiedCount / totalProviders) * 100)
    : 0;
  const responseTimes = providers
    .map((p) => p.responseTimeMins ?? 60)
    .sort((a, b) => a - b);
  const medianResponse = responseTimes.length > 0
    ? responseTimes[Math.floor(responseTimes.length / 2)]
    : 0;
  const medianResponseLabel = medianResponse < 60 ? `${medianResponse}m` : `${Math.floor(medianResponse / 60)}h`;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20 space-y-5">
        {/* ─── Categories ─────────────────────────────────────────────────── */}
        <div>
          <h2 className="mb-2 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Categories
          </h2>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/marketplace"
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  !activeVertical && !activeIndustry
                    ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> All providers
                </span>
                <span className="text-xs">{totalProviders}</span>
              </Link>
            </li>
            {verticals.map((vertical) => {
              const count = providers.filter((p) => {
                const meta = p.industry ? getIndustry(p.industry) : undefined;
                return meta?.vertical === vertical.id;
              }).length;
              const active = activeVertical === vertical.id;
              return (
                <li key={vertical.id}>
                  <Link
                    href={`/marketplace?vertical=${vertical.id}`}
                    className={cn(
                      'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="text-base">{vertical.icon}</span>
                      <span className="truncate">{vertical.name}</span>
                    </span>
                    <span className="shrink-0 text-xs">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ─── Trust filters ──────────────────────────────────────────────── */}
        <div>
          <h2 className="mb-2 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Trust filters
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={toggleTrustFullyVerified}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={trustFullyVerified} />
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Fully verified only</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={toggleTrustRatingHigh}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={trustRatingHigh} />
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Rating 4.8 and above</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={toggleTrustEmergency}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={trustEmergency} />
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">24/7 emergency dispatch</span>
              </button>
            </li>
          </ul>
        </div>

        {/* ─── Stats card (Four-gate verification explainer) ──────────────── */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Four-gate verification</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Identity, business, insurance and payments are checked independently. Providers clearing all four carry the gold Verified mark.
              </p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-emerald-200 pt-3 dark:border-emerald-900">
            <Stat label="Active providers" value={totalProviders.toLocaleString()} />
            <Stat label="Avg rating" value={avgRating} />
            <Stat label="Escrow-protected" value={`${escrowPct}%`} />
            <Stat label="Median response" value={medianResponseLabel} />
          </dl>
        </div>
      </div>
    </aside>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded border-2 transition-colors',
        checked
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-border bg-background',
      )}
      aria-hidden
    >
      {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

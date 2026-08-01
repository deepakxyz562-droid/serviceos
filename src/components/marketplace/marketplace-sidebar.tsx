'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck, Star, Zap, CheckCircle2, Wallet, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceSearch } from './use-marketplace-search';
import type { ProviderListItem } from './types';
import { getIndustry, VERTICALS } from '@/lib/industry-catalog';

/**
 * MarketplaceSidebar
 * -------------------
 * Left sidebar for the marketplace browse page. Three sections:
 *
 *   1. CATEGORIES — vertical filter with COLLAPSIBLE subcategories (industries).
 *      Clicking a vertical name instantly filters the grid (client-side, no
 *      page reload) via the shared Zustand store. Clicking the chevron toggles
 *      the subcategory list. Each subcategory (industry) is also an instant
 *      filter. The <a> hrefs remain for SEO crawlability (progressive
 *      enhancement: without JS, the link navigates normally; with JS,
 *      preventDefault + store update = instant filter).
 *
 *   2. TRUST FILTERS — three toggle checkboxes (Fully verified only /
 *      Rating 4.8+ / 24/7 emergency dispatch) that instantly filter the grid
 *      via the shared Zustand store.
 *
 *   3. STATS CARD — "Four-gate verification" explainer with 4 network metrics
 *      (active providers, avg rating, escrow-protected, median response).
 */

export interface SidebarIndustry {
  id: string;
  name: string;
  emoji: string;
}

export interface SidebarVerticalGroup {
  vertical: { id: string; name: string; icon: string; description: string };
  industries: SidebarIndustry[];
}

interface MarketplaceSidebarProps {
  providers: ProviderListItem[];
  verticals: readonly Array<{ id: string; name: string; icon: string; description: string }>;
  activeVertical: string | null;
  activeIndustry: string | null;
  /** Pre-computed vertical → industries groups (from the server page). */
  verticalGroups?: SidebarVerticalGroup[];
}

export function MarketplaceSidebar({
  providers,
  verticals,
  activeVertical,
  activeIndustry,
  verticalGroups,
}: MarketplaceSidebarProps) {
  const trustFullyVerified = useMarketplaceSearch((s) => s.trustFullyVerified);
  const trustRatingHigh = useMarketplaceSearch((s) => s.trustRatingHigh);
  const trustEmergency = useMarketplaceSearch((s) => s.trustEmergency);
  const toggleTrustFullyVerified = useMarketplaceSearch((s) => s.toggleTrustFullyVerified);
  const toggleTrustRatingHigh = useMarketplaceSearch((s) => s.toggleTrustRatingHigh);
  const toggleTrustEmergency = useMarketplaceSearch((s) => s.toggleTrustEmergency);

  // Vertical/industry filter state from the shared store (instant filtering).
  const storeVertical = useMarketplaceSearch((s) => s.verticalFilter);
  const storeIndustry = useMarketplaceSearch((s) => s.industryFilter);
  const selectVertical = useMarketplaceSearch((s) => s.selectVertical);
  const selectIndustry = useMarketplaceSearch((s) => s.selectIndustry);
  const expandedVerticals = useMarketplaceSearch((s) => s.expandedVerticals);
  const toggleVerticalExpanded = useMarketplaceSearch((s) => s.toggleVerticalExpanded);

  // The store is the source of truth for the active filter. On the very first
  // render (before the browser component seeds the store from URL params), we
  // fall back to the server-provided activeVertical/activeIndustry props so
  // the sidebar highlights the correct item during SSR + initial hydration.
  const currentVertical = storeVertical ?? activeVertical;
  const currentIndustry = storeIndustry ?? activeIndustry;

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

  // Helper: count providers in a vertical
  const countForVertical = (verticalId: string) =>
    providers.filter((p) => {
      const meta = p.industry ? getIndustry(p.industry) : undefined;
      return meta?.vertical === verticalId;
    }).length;

  // Helper: count providers in an industry
  const countForIndustry = (industryId: string) =>
    providers.filter((p) => (p.industry ?? '').toLowerCase().trim() === industryId).length;

  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 h-full flex-col gap-3 overflow-hidden select-none pl-3 sm:pl-3 lg:pl-3 py-4 pr-3 border-r border-border/40">
      {/* ─── Scrollable content region ──────────────────────────────────── */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1.5 marketplace-sidebar-scroll">
          {/* ─── Categories ─────────────────────────────────────────────── */}
          <div>
          <h2 className="mb-2 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Categories
          </h2>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/marketplace"
                onClick={(e) => {
                  e.preventDefault();
                  selectVertical(null);
                }}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  !currentVertical && !currentIndustry
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
              const count = countForVertical(vertical.id);
              const isActive = currentVertical === vertical.id && !currentIndustry;
              const isActiveWithIndustry = currentVertical === vertical.id && !!currentIndustry;
              // A vertical is expanded if the user explicitly toggled it OR if
              // it's the active vertical (auto-expand so the user sees their
              // current subcategory context).
              const isExpanded = expandedVerticals[vertical.id] ?? isActiveWithIndustry ?? false;
              // Find the industries for this vertical from the pre-computed groups.
              const group = verticalGroups?.find((g) => g.vertical.id === vertical.id);
              const industries = group?.industries ?? [];

              return (
                <li key={vertical.id}>
                  <div className="flex items-stretch">
                    {/* Main vertical link — click filters by this vertical */}
                    <Link
                      href={`/marketplace?vertical=${vertical.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        selectVertical(vertical.id);
                      }}
                      className={cn(
                        'flex flex-1 items-center justify-between rounded-md px-3 py-2 text-sm transition-colors min-w-0',
                        isActive
                          ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : isActiveWithIndustry
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden className="text-base shrink-0">{vertical.icon}</span>
                        <span className="truncate">{vertical.name}</span>
                      </span>
                      <span className="shrink-0 text-xs ml-2">{count}</span>
                    </Link>
                    {/* Expand/collapse chevron — only show if this vertical has industries */}
                    {industries.length > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleVerticalExpanded(vertical.id);
                        }}
                        aria-label={isExpanded ? `Collapse ${vertical.name} subcategories` : `Expand ${vertical.name} subcategories`}
                        aria-expanded={isExpanded}
                        className="flex items-center justify-center w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 transition-transform duration-150',
                            isExpanded && 'rotate-90',
                          )}
                        />
                      </button>
                    ) : null}
                  </div>

                  {/* Subcategory (industry) list — shown when expanded */}
                  {isExpanded && industries.length > 0 ? (
                    <ul className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-border/60 pl-2">
                      {industries.map((ind) => {
                        const indCount = countForIndustry(ind.id);
                        const indActive = currentIndustry === ind.id;
                        return (
                          <li key={ind.id}>
                            <Link
                              href={`/marketplace?vertical=${vertical.id}&industry=${ind.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                selectIndustry(ind.id, vertical.id);
                              }}
                              className={cn(
                                'flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                                indActive
                                  ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span aria-hidden className="text-xs">{ind.emoji}</span>
                                <span className="truncate">{ind.name}</span>
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground/70">{indCount}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
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

        {/* ─── Trust badges footer (pinned, always visible) ────────────────
            Moved here from the full-width trust bar that sat above the
            breadcrumb nav. Compact vertical list so it fits a 260px sidebar
            without truncation, and stays visible while the categories /
            filters / stats above scroll independently. */}
        <div className="flex-shrink-0 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="font-medium text-foreground">Verified professionals</span>
            </li>
            <li className="flex items-center gap-2 text-[11px]">
              <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="font-medium text-foreground">Escrow-protected payments</span>
            </li>
            <li className="flex items-center gap-2 text-[11px]">
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">Real customer reviews</span>
            </li>
            <li className="flex items-center gap-2 text-[11px]">
              <Zap className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span className="font-medium text-foreground">24/7 emergency dispatch</span>
            </li>
          </ul>
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

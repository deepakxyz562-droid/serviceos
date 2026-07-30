'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, Check } from 'lucide-react';
import { MENU_CATALOG } from '@/lib/menu-catalog';
import { PLAN_TIERS, planRank, PLAN_DISPLAY_NAMES } from '@/lib/plan-features';
import { useAppStore } from '@/store/app-store';

export type MenuAccessState = 'visible' | 'locked' | 'hidden';

export interface MenuAccessResult {
  state: MenuAccessState;
  minPlan?: string;
  description?: string;
}

export interface UpgradeModalState {
  menuKey: string;
  label: string;
  description: string;
  minPlan: string;
}

let _openHandler: ((state: UpgradeModalState) => void) | null = null;

/**
 * Programmatically open the UpgradeModal from anywhere in the app
 * (sidebar, mobile nav, etc.) without prop-drilling.
 *
 * Usage:
 *   import { openUpgradeModal } from '@/components/layout/upgrade-modal';
 *   openUpgradeModal({ menuKey: 'campaigns', label: 'Campaigns', description: '...', minPlan: 'growth' });
 */
export function openUpgradeModal(state: UpgradeModalState) {
  if (_openHandler) _openHandler(state);
}

/**
 * Returns the MenuCatalogItem for a given key, or null if not found.
 */
export function getMenuCatalogItem(key: string) {
  return MENU_CATALOG.find((item) => item.key === key) || null;
}

/**
 * Checks the visibility/lock state of a menu item for the current tenant.
 * Pure function — caller passes in planTier, isSuperAdmin and planStatus.
 *
 * Behaviour matrix (per the spec):
 *   - Superadmin: always 'visible' (bypass).
 *   - Item has no minPlan or current tier meets/exceeds it: 'visible'.
 *   - Trial users (planStatus === 'trial'): 'locked' — discovery mode. They
 *     SEE items above their tier with a Lock icon, so they learn what they'd
 *     get by upgrading. Clicking opens the UpgradeModal.
 *   - Paid users below the required tier: 'hidden' — clean-workspace mode.
 *     Items above their tier are removed from the sidebar entirely.
 *
 * Returns { state, minPlan, description }. `minPlan`/`description` are only
 * populated when state === 'locked' (callers don't need them for 'hidden'
 * since the item isn't rendered at all).
 */
export function checkMenuAccess(
  menuKey: string,
  planTier: string,
  isSuperAdmin: boolean,
  planStatus?: string,
): MenuAccessResult {
  if (isSuperAdmin) return { state: 'visible' };

  const item = getMenuCatalogItem(menuKey);
  if (!item || !item.minPlan) return { state: 'visible' };

  const currentRank = planRank(planTier);
  const requiredRank = planRank(item.minPlan);
  if (currentRank >= requiredRank) return { state: 'visible' };

  // Trial users see LOCKED items (discovery mode) — they can see what they'd
  // get by upgrading. Paid users see HIDDEN items (clean workspace) — items
  // above their tier are removed entirely.
  if (planStatus === 'trial') {
    return {
      state: 'locked',
      minPlan: item.minPlan,
      description: item.upgradeDescription,
    };
  }
  return { state: 'hidden' };
}

// ─── Plan prices ────────────────────────────────────────────────────────────
// Phase 5: prices now come from the DB-backed Plan catalog via /api/plans so
// superadmins can edit them via the Plan Catalog UI. We keep FALLBACK_PRICES
// as a hard-coded safety net so the modal still renders correctly while the
// fetch is in-flight or if the API is unreachable. A module-level cache
// ensures we only hit /api/plans once per page load, no matter how many times
// the modal is opened.

interface PlanPriceEntry {
  monthlyPrice: number;
  yearlyPrice: number;
  originalMonthlyPrice: number; // 0 = no strikethrough
  discountBadge: string | null;
}

const FALLBACK_PRICES: Record<string, PlanPriceEntry> = {
  starter: { monthlyPrice: 29, yearlyPrice: 290, originalMonthlyPrice: 49, discountBadge: null },
  growth: { monthlyPrice: 79, yearlyPrice: 790, originalMonthlyPrice: 129, discountBadge: null },
  business: { monthlyPrice: 149, yearlyPrice: 1490, originalMonthlyPrice: 249, discountBadge: null },
  enterprise: { monthlyPrice: 0, yearlyPrice: 0, originalMonthlyPrice: 0, discountBadge: null },
};

let _plansCache: Record<string, PlanPriceEntry> | null = null;
let _plansFetchPromise: Promise<Record<string, PlanPriceEntry>> | null = null;

/**
 * Fetch the DB-backed plan prices and cache them at module scope. Returns a
 * map keyed by plan code (starter | growth | business | enterprise). Falls
 * back to FALLBACK_PRICES on any error. Safe to call repeatedly — concurrent
 * callers share the same in-flight promise.
 */
function fetchPlanPrices(): Promise<Record<string, PlanPriceEntry>> {
  if (_plansCache) return Promise.resolve(_plansCache);
  if (_plansFetchPromise) return _plansFetchPromise;
  _plansFetchPromise = (async () => {
    try {
      const res = await fetch('/api/plans');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const plansArr = (json.plans || []) as Array<{
        code: string;
        monthlyPrice: number;
        yearlyPrice: number;
        originalMonthlyPrice?: number;
        originalYearlyPrice?: number;
        discountBadge?: string | null;
        isAddon?: boolean;
      }>;
      const map: Record<string, PlanPriceEntry> = { ...FALLBACK_PRICES };
      for (const p of plansArr) {
        if (p.isAddon) continue; // skip ai_pro_addon, marketplace_*, etc.
        map[p.code] = {
          monthlyPrice: p.monthlyPrice ?? 0,
          yearlyPrice: p.yearlyPrice ?? 0,
          originalMonthlyPrice: p.originalMonthlyPrice ?? 0,
          discountBadge: p.discountBadge ?? null,
        };
      }
      _plansCache = map;
      return map;
    } catch {
      // Network/seed failure — keep using FALLBACK_PRICES.
      _plansCache = FALLBACK_PRICES;
      return _plansCache;
    } finally {
      _plansFetchPromise = null;
    }
  })();
  return _plansFetchPromise;
}

/**
 * Global UpgradeModal — mount ONCE in app-layout.tsx.
 * Other components trigger it via openUpgradeModal().
 */
export function UpgradeModal() {
  const [state, setState] = useState<UpgradeModalState | null>(null);
  const [planPrices, setPlanPrices] = useState<Record<string, PlanPriceEntry>>(FALLBACK_PRICES);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  useEffect(() => {
    _openHandler = (s: UpgradeModalState) => setState(s);
    return () => {
      _openHandler = null;
    };
  }, []);

  // Fetch DB-backed plan prices once on mount (and cache module-level so
  // subsequent modal opens reuse the result). Falls back to FALLBACK_PRICES.
  useEffect(() => {
    let mounted = true;
    fetchPlanPrices().then((prices) => {
      if (mounted && prices !== planPrices) setPlanPrices(prices);
    });
    return () => {
      mounted = false;
    };
  }, [planPrices]);

  const handleClose = () => setState(null);

  const handleUpgrade = () => {
    setState(null);
    // Navigate to the existing Billing view (Sidebar → Finance → Subscription)
    // which has the REAL checkout flow (PayPal + Creem card). The old
    // /subscribe page was a dead-end marketing page with no payment integration.
    setCurrentView('billing');
  };

  if (!state) return null;

  // Determine which plans unlock this feature
  const minRank = planRank(state.minPlan);
  const unlockingPlans = PLAN_TIERS.filter(
    (tier) => planRank(tier) >= minRank && tier !== 'trial'
  );

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">{state.label}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {state.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Available on:
            </p>
            <div className="flex flex-wrap gap-2">
              {unlockingPlans.map((plan) => {
                const prices = planPrices[plan] || FALLBACK_PRICES[plan];
                const hasDiscount =
                  prices &&
                  prices.originalMonthlyPrice > 0 &&
                  prices.originalMonthlyPrice > prices.monthlyPrice &&
                  prices.monthlyPrice > 0;
                return (
                  <Badge
                    key={plan}
                    variant="outline"
                    className="flex items-center gap-1.5 py-1 px-2.5 border-emerald-500/30 bg-emerald-500/5"
                  >
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="font-medium">{PLAN_DISPLAY_NAMES[plan]}</span>
                    {prices && prices.monthlyPrice > 0 && (
                      <span className="text-muted-foreground text-[10px]">
                        {hasDiscount && (
                          <span className="line-through mr-1">
                            ${prices.originalMonthlyPrice}
                          </span>
                        )}
                        ${prices.monthlyPrice}/mo
                      </span>
                    )}
                    {prices && prices.monthlyPrice === 0 && plan === 'enterprise' && (
                      <span className="text-muted-foreground text-[10px]">Custom</span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Save up to 40% — limited time offer for trial users</span>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
            Maybe later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

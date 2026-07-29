'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { PLAN_TIERS, planRank } from '@/lib/plan-features';

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
 * Checks if a menu item is locked for the current tenant.
 * Pure function — caller passes in planTier and isSuperAdmin.
 *
 * Returns { locked, minPlan, description }.
 */
export function checkMenuLock(
  menuKey: string,
  planTier: string,
  isSuperAdmin: boolean
): { locked: boolean; minPlan?: string; description?: string } {
  if (isSuperAdmin) return { locked: false };
  const item = getMenuCatalogItem(menuKey);
  if (!item?.minPlan) return { locked: false };

  const currentRank = planRank(planTier);
  const requiredRank = planRank(item.minPlan);
  if (currentRank >= requiredRank) return { locked: false };

  return {
    locked: true,
    minPlan: item.minPlan,
    description: item.upgradeDescription || '',
  };
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  business: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_PRICES: Record<string, { original: number; discounted: number }> = {
  starter: { original: 17, discounted: 10 },
  growth: { original: 42, discounted: 25 },
  business: { original: 83, discounted: 50 },
  enterprise: { original: 0, discounted: 0 },
};

/**
 * Global UpgradeModal — mount ONCE in app-layout.tsx.
 * Other components trigger it via openUpgradeModal().
 */
export function UpgradeModal() {
  const [state, setState] = useState<UpgradeModalState | null>(null);
  const router = useRouter();

  useEffect(() => {
    _openHandler = (s: UpgradeModalState) => setState(s);
    return () => {
      _openHandler = null;
    };
  }, []);

  const handleClose = () => setState(null);

  const handleUpgrade = () => {
    setState(null);
    router.push('/subscribe');
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
                const prices = PLAN_PRICES[plan];
                return (
                  <Badge
                    key={plan}
                    variant="outline"
                    className="flex items-center gap-1.5 py-1 px-2.5 border-emerald-500/30 bg-emerald-500/5"
                  >
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="font-medium">{PLAN_DISPLAY_NAMES[plan]}</span>
                    {prices && prices.discounted > 0 && (
                      <span className="text-muted-foreground text-[10px]">
                        ${prices.discounted}/mo
                      </span>
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

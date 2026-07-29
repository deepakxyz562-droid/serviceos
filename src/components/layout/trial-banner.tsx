'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { resolvePlanTierClient } from '@/lib/plan-features';
import { Button } from '@/components/ui/button';
import { X, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'trial-banner-dismissed-at';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Trial countdown banner shown in the app header for trial users.
 *
 * Features:
 * - Shows "Day X / 14" progress + "Y days left" countdown
 * - "Save up to 40%" messaging
 * - "Upgrade" button → navigates to the Billing view (Sidebar → Finance → Subscription)
 *   which has the real PayPal + card checkout flow.
 * - Dismiss (×) button → hides banner for 24h (localStorage)
 * - Auto-hides when trial expires (the TrialPaywallOverlay takes over)
 * - Hidden for superadmins and paid users
 */
export function TrialBanner() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const auth = useAppStore((s) => s.auth);

  // Check localStorage via lazy initializer (avoids setState-in-effect lint
  // error and flash-of-banner on mount). SSR-safe: returns true (hidden) on
  // server, then re-evaluates on client mount.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR: hide
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (!dismissedAt) return false; // not dismissed — show banner
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed > DISMISS_DURATION_MS) {
        // 24h elapsed — re-show the banner
        localStorage.removeItem(DISMISS_KEY);
        return false;
      }
      return true; // still within 24h dismiss window
    } catch {
      return false; // localStorage blocked — show banner
    }
  });

  // Don't render for superadmins, paid users, or if trial expired
  const planTier = resolvePlanTierClient(
    auth.tenant?.plan || 'starter',
    auth.tenant?.planStatus || 'active'
  );
  const isSuperAdmin = !!(
    auth.user?.isSuperAdmin ||
    auth.user?.role === 'superadmin' ||
    auth.user?.role === 'super_admin' ||
    (auth.user?.role === 'admin' && !auth.user?.tenantId)
  );

  const isTrial = auth.tenant?.planStatus === 'trial';
  const trialEndsAt = auth.tenant?.trialEndsAt;

  // Calculate days remaining
  let daysRemaining = 0;
  let trialDay = 1;
  if (trialEndsAt) {
    const end = new Date(trialEndsAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    // Day X / 14 = (14 - daysRemaining) + 1, clamped
    trialDay = Math.min(14, Math.max(1, 14 - daysRemaining + 1));
  }

  // Trial expired — don't show banner (paywall overlay handles it)
  const isExpired = isTrial && daysRemaining === 0;

  if (
    isSuperAdmin ||
    !isTrial ||
    isExpired ||
    dismissed ||
    !trialEndsAt
  ) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // localStorage might be blocked — just hide in memory
    }
    setDismissed(true);
  };

  const handleUpgrade = () => {
    // Navigate to the existing Billing view which has the real checkout
    // flow (PayPal + Creem card). The old /subscribe page was a dead-end
    // marketing page with no payment integration — removed.
    setCurrentView('billing');
  };

  // Urgency color: amber for >3 days, red for ≤3 days
  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 px-4 py-2 text-sm border-b transition-colors',
        isUrgent
          ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800'
          : 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
      )}
    >
      {/* Countdown clock icon */}
      <Clock
        className={cn(
          'h-4 w-4 shrink-0',
          isUrgent
            ? 'text-red-600 dark:text-red-400'
            : 'text-amber-600 dark:text-amber-400'
        )}
      />

      {/* Progress: Day X / 14 */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            'font-semibold tabular-nums',
            isUrgent
              ? 'text-red-700 dark:text-red-300'
              : 'text-amber-700 dark:text-amber-300'
          )}
        >
          Day {trialDay} / 14
        </span>
        {/* Progress bar */}
        <div className="hidden sm:flex w-20 h-1.5 rounded-full bg-amber-200/50 dark:bg-amber-800/50 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isUrgent ? 'bg-red-500' : 'bg-amber-500'
            )}
            style={{ width: `${(trialDay / 14) * 100}%` }}
          />
        </div>
      </div>

      <div className="h-4 w-px bg-amber-300/50 dark:bg-amber-700/50 shrink-0 hidden sm:block" />

      {/* Days remaining message */}
      <span
        className={cn(
          'flex-1 truncate',
          isUrgent
            ? 'text-red-700 dark:text-red-300'
            : 'text-amber-700 dark:text-amber-300'
        )}
      >
        <span className="font-semibold">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left</span>
        <span className="hidden md:inline"> in your trial · Save up to 40% on annual plans</span>
        <span className="md:hidden"> · Save 40%</span>
      </span>

      {/* Upgrade button */}
      <Button
        size="sm"
        onClick={handleUpgrade}
        className={cn(
          'h-7 px-3 text-xs shrink-0',
          isUrgent
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-amber-600 text-white hover:bg-amber-700'
        )}
      >
        <Zap className="mr-1 h-3 w-3" />
        Upgrade
      </Button>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className={cn(
          'shrink-0 p-1 rounded-md transition-colors',
          isUrgent
            ? 'text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40'
            : 'text-amber-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40'
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

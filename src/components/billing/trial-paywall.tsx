'use client';

/**
 * Trial-status hook + paywall overlay.
 *
 * Polls /api/subscriptions on mount (and every 60s) to determine whether the
 * tenant's trial has expired. When expired, AppLayout renders the
 * TrialPaywallOverlay which:
 *   - Blurs the underlying app content
 *   - Shows a "Your trial has expired" message
 *   - Forces navigation to the sidebar Subscription page (where the PayPal
 *     checkout lives) via setCurrentView('billing')
 *   - Allows navigation ONLY to 'billing' (and logout) — all other views are
 *     blocked by the overlay
 *
 * This is the client-side paywall. The /api/subscriptions GET endpoint already
 * computes isTrialExpired server-side from tenant.planStatus + trialEndsAt, so
 * the cron job that flips planStatus → 'expired' is what actually triggers
 * this overlay for end users on their next page interaction.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';

export interface TrialStatus {
  isTrialExpired: boolean;
  planStatus: string;
  trialEndsAt: string | null;
  daysRemainingInTrial: number | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useTrialStatus(): TrialStatus {
  const authUser = useAppStore((s) => s.auth.user);
  const isCustomerOrEmployee = authUser?.role === 'customer' || authUser?.role === 'employee';
  // Only poll /api/subscriptions for tenant-scoped (admin/owner/superadmin)
  // sessions. Customers and employees have no tenant billing UI, and polling
  // for them just generates endless 401s (987 in the dev log!).
  const shouldPoll = !!authUser?.id && !isCustomerOrEmployee;

  const [state, setState] = useState<{
    isTrialExpired: boolean;
    planStatus: string;
    trialEndsAt: string | null;
    daysRemainingInTrial: number | null;
    loading: boolean;
  }>({
    isTrialExpired: false,
    planStatus: 'trial',
    trialEndsAt: null,
    daysRemainingInTrial: null,
    loading: shouldPoll,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (!res.ok) return;
      const json = await res.json();
      setState({
        isTrialExpired: json.isTrialExpired === true,
        planStatus: json.status || 'trial',
        trialEndsAt: json.trialEndsAt || null,
        daysRemainingInTrial: json.daysRemainingInTrial ?? null,
        loading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    // PERFORMANCE: Skip entirely for unauthenticated / customer / employee
    // sessions. Previously this fired every 60s forever for every visitor,
    // generating ~987 401 errors in a single dev session.
    if (!shouldPoll) {
      // Defer the setState via a microtask so we don't trigger a synchronous
      // re-render inside the effect body (which React lint flags as a
      // cascading-render hazard).
      Promise.resolve().then(() => {
        setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      });
      return;
    }

    let cancelled = false;
    const doFetch = async () => {
      await refresh();
      if (cancelled) return;
    };
    doFetch();

    // Pause polling when the tab is hidden so background tabs don't burn
    // mobile data/battery.
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(refresh, 60_000);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { refresh(); start(); }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh, shouldPoll]);

  return { ...state, refresh };
}

/**
 * Paywall overlay component. Shown by AppLayout when useTrialStatus returns
 * isTrialExpired=true AND the user isn't already on the 'billing' view.
 */
export function TrialPaywallOverlay({ trialStatus }: { trialStatus: TrialStatus }) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentView = useAppStore((s) => s.currentView);

  if (
    !trialStatus.isTrialExpired ||
    trialStatus.loading ||
    currentView === 'billing' ||
    currentView === 'superadmin'
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-2xl text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-red-600 dark:text-red-400"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Your trial has expired</h2>
        <p className="text-muted-foreground text-sm">
          Access to your dashboard, leads, jobs, and workflows is paused. Add a
          payment method and choose a plan to instantly restore full access.
          Your data is preserved for 30 days.
        </p>
        <button
          onClick={() => setCurrentView('billing')}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 transition-colors"
        >
          Choose a plan to continue
        </button>
        <p className="text-xs text-muted-foreground">
          Questions? Reply to your trial emails or contact support.
        </p>
      </div>
    </div>
  );
}

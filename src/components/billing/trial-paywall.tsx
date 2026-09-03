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

/**
 * PastDueBanner — non-blocking warning banner shown at the TOP of the app
 * when the tenant's `planStatus === 'past_due'`.
 *
 * Unlike TrialPaywallOverlay (which hard-blocks the app), this is a
 * dismissible top banner that nudges the user to update their payment
 * method WITHOUT preventing them from working. The tenant may legitimately
 * need a few days of grace while PayPal/Creem retries the charge, so we
 * don't lock them out — we just make the failure impossible to miss.
 *
 * Behaviour:
 *   - Shows when `planStatus === 'past_due'` (set by the webhook handlers
 *     when PayPal `PAYMENT.SALE.DENIED` / Creem `subscription.payment_failed`
 *     fires).
 *   - Hidden when: loading, on the billing page (where the user is already
 *     fixing it), on the superadmin console, or when the trial paywall is
 *     already active (avoids stacking two alerts).
 *   - "Update payment method" button → `setCurrentView('billing')`.
 *   - Dismissible per-session via the × button (re-appears on next page load).
 */
export function PastDueBanner({ trialStatus }: { trialStatus: TrialStatus }) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentView = useAppStore((s) => s.currentView);
  const [dismissed, setDismissed] = useState(false);

  // Hide when: not past_due, loading, already on billing, superadmin, or
  // when the trial paywall is showing (avoid double-overlay).
  if (
    dismissed ||
    trialStatus.loading ||
    trialStatus.planStatus !== 'past_due' ||
    trialStatus.isTrialExpired || // let the hard paywall take over
    currentView === 'billing' ||
    currentView === 'superadmin'
  ) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[90] w-full bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2.5 flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 text-amber-600 dark:text-amber-400 shrink-0"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-semibold text-amber-900 dark:text-amber-200">
            Your last payment failed.
          </span>{' '}
          <span className="text-amber-800 dark:text-amber-300 hidden sm:inline">
            Your subscription is past due — please update your payment method to avoid service interruption.
          </span>
          <span className="text-amber-800 dark:text-amber-300 sm:hidden">
            Subscription past due — please update payment.
          </span>
        </div>
        <button
          onClick={() => setCurrentView('billing')}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
        >
          Update payment method
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss payment warning"
          className="shrink-0 p-1 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

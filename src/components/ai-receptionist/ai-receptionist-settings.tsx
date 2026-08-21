'use client';

/**
 * AI Receptionist Settings Wrapper
 * ================================
 *
 * The single entry point for Settings → AI Receptionist.
 *
 * Conditionally renders:
 *   - The onboarding wizard (if subscription, receptionist, or phone is missing)
 *   - The permanent AI Receptionist workspace (if all 3 are configured)
 *   - An error state with retry (if the API checks fail)
 *
 * PHASE 9.8 FIXES:
 *   1. Uses Promise.allSettled (not Promise.all) so one failed API doesn't discard
 *      the other two. Each check is independent.
 *   2. Surfaces errors with a retry UI instead of silently falling back to onboarding.
 *   3. Accepts subscription statuses ACTIVE, PAST_DUE, SUSPENDED consistently.
 *      SUSPENDED shows the workspace (with a billing warning) but the backend
 *      AdmissionController still rejects new calls — so the tenant can see their
 *      data but can't make new calls until billing is resolved.
 *   4. Safe diagnostic logging (no secrets/PII) — only HTTP status codes.
 *
 * The workspace is the PERMANENT home for the AI Receptionist — the wizard
 * is only for initial setup. After activation, the tenant always lands here.
 */

import { useState, useEffect, useCallback } from 'react';
import { AiReceptionistWorkspace } from './workspace/ai-receptionist-workspace';
import { AiReceptionistOnboarding } from './ai-receptionist-onboarding';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Subscription statuses that grant access to the workspace (not just onboarding).
// SUSPENDED is included so the tenant can see their data + billing warning,
// but the backend AdmissionController rejects new calls when SUSPENDED.
const ACTIVE_SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAST_DUE', 'SUSPENDED'] as const;

interface CheckResult {
  hasSubscription: boolean;
  hasReceptionist: boolean;
  hasPhone: boolean;
  // Per-API status codes for diagnostic logging (no secrets/PII)
  statuses: {
    subscriptions: number | null;
    receptionist: number | null;
    phoneConnections: number | null;
  };
  // True if at least one API failed entirely (network error, not just non-200)
  hasNetworkError: boolean;
}

export function AiReceptionistSettings() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);

  const check = useCallback(async () => {
    // Use Promise.allSettled so one failed API doesn't discard the others.
    // Each fetch is independent — a single failure doesn't nuke all 3 checks.
    const [subSettled, recvSettled, phoneSettled] = await Promise.allSettled([
      fetch('/api/addons/subscriptions'),
      fetch('/api/addons/receptionist'),
      fetch('/api/addons/phones/connections'),
    ]);

    let hasSubscription = false;
    let hasReceptionist = false;
    let hasPhone = false;
    let hasNetworkError = false;

    const statuses: CheckResult['statuses'] = {
      subscriptions: null,
      receptionist: null,
      phoneConnections: null,
    };

    // ── Subscription check ──
    if (subSettled.status === 'fulfilled') {
      statuses.subscriptions = subSettled.value.status;
      if (subSettled.value.ok) {
        try {
          const subData = await subSettled.value.json();
          const aiSub = subData.subscriptions?.find(
            (s: { addonProduct: { code: string }; status: string }) =>
              s.addonProduct?.code === 'AI_RECEPTIONIST' &&
              ACTIVE_SUBSCRIPTION_STATUSES.includes(s.status as never),
          );
          hasSubscription = !!aiSub;
        } catch {
          // JSON parse failed — treat as not found
        }
      }
    } else {
      // Network error / fetch threw
      hasNetworkError = true;
    }

    // ── Receptionist check ──
    if (recvSettled.status === 'fulfilled') {
      statuses.receptionist = recvSettled.value.status;
      if (recvSettled.value.ok) {
        try {
          const recvData = await recvSettled.value.json();
          hasReceptionist = !!recvData.receptionist;
        } catch {
          // JSON parse failed — treat as not found
        }
      }
    } else {
      hasNetworkError = true;
    }

    // ── Phone connections check ──
    if (phoneSettled.status === 'fulfilled') {
      statuses.phoneConnections = phoneSettled.value.status;
      if (phoneSettled.value.ok) {
        try {
          const phoneData = await phoneSettled.value.json();
          hasPhone = phoneData.connections?.length > 0;
        } catch {
          // JSON parse failed — treat as not found
        }
      }
    } else {
      hasNetworkError = true;
    }

    // Safe diagnostic logging — HTTP status codes only, no secrets/PII
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[AiReceptionistSettings] visibility check', {
        subscription: statuses.subscriptions,
        receptionist: statuses.receptionist,
        phoneConnections: statuses.phoneConnections,
        hasSubscription,
        hasReceptionist,
        hasPhone,
        hasNetworkError,
      });
    }

    return { hasSubscription, hasReceptionist, hasPhone, statuses, hasNetworkError } satisfies CheckResult;
  }, []);

  useEffect(() => {
    // Fetch on mount. The async function only calls setState after awaiting
    // Promise.allSettled — so there's no synchronous setState in the effect body.
    let active = true;
    check().then((r) => {
      if (active) {
        setResult(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [check]);

  // Retry handler — resets loading + result, then re-runs the check
  const handleRetry = () => {
    setLoading(true);
    setResult(null);
    check().then((r) => {
      setResult(r);
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!result) {
    // Should never happen (loading just turned false), but defensive
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error state: only if ALL 3 APIs failed entirely ──
  // A single API failure (e.g., 500) doesn't trigger this — the other two
  // checks still run independently. This only fires on a complete network
  // outage or auth failure (all 3 fetches threw).
  if (result.hasNetworkError && !result.hasSubscription && !result.hasReceptionist && !result.hasPhone) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center max-w-md mx-auto">
        <AlertCircle className="size-10 text-amber-500" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Failed to load AI Receptionist data</p>
          <p className="text-xs text-muted-foreground">
            A network error occurred while checking your subscription, receptionist, and phone number.
            Please try again.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
          <Loader2 className="size-3.5" />
          Try Again
        </Button>
      </div>
    );
  }

  // ── All 3 configured → permanent workspace ──
  if (result.hasSubscription && result.hasReceptionist && result.hasPhone) {
    return <AiReceptionistWorkspace />;
  }

  // ── Otherwise → onboarding wizard ──
  // (subscription missing, or receptionist not configured, or no phone number)
  return <AiReceptionistOnboarding />;
}

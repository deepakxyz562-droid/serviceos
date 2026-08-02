'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Client-side plan + feature access hooks.
//
// `useTenantPlan()` — derives the current tenant's plan info from the
//   `useAppStore(s => s.auth.tenant)` snapshot (already populated by
//   `/api/auth/me` during app boot). Synchronous, no extra fetch.
//
// `useFeatureAccess(featureKey)` — checks whether the current tenant's plan
//   allows the given feature. Performs a fetch to
//   `/api/plan-features/check?feature=xxx` on first call per feature, caches
//   the result in a module-level Map for 60s (SWR-style).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  PLAN_TIERS,
  resolvePlanTierClient,
  type PlanTier,
} from '@/lib/plan-features';

export interface TenantPlanInfo {
  plan: string;
  planStatus: string;
  isTrial: boolean;
  isPaid: boolean;
  isExpired: boolean;
  trialEndsAt: string | null;
  planTier: PlanTier;
}

/**
 * Read the current tenant's plan info from the auth slice of the app store.
 *
 * `tenant` is populated by the `/api/auth/me` fetch on app boot — no extra
 * network round-trip. Returns a stable object so callers can memoize on it.
 */
export function useTenantPlan(): TenantPlanInfo {
  const tenant = useAppStore((s) => s.auth.tenant) as {
    plan?: string;
    planStatus?: string;
    trialEndsAt?: string | null;
  } | null;

  const plan = tenant?.plan || 'starter';
  const planStatus = tenant?.planStatus || 'active';
  const trialEndsAt = tenant?.trialEndsAt ?? null;
  const planTier = resolvePlanTierClient(plan, planStatus);

  const isTrial = planStatus === 'trial';
  const isPaid = !isTrial && (PLAN_TIERS as readonly string[]).includes(plan);
  const isExpired = (() => {
    if (planStatus === 'expired') return true;
    if (isTrial && trialEndsAt) {
      try {
        return new Date(trialEndsAt).getTime() < Date.now();
      } catch {
        return false;
      }
    }
    return false;
  })();

  return {
    plan,
    planStatus,
    isTrial,
    isPaid,
    isExpired,
    trialEndsAt,
    planTier,
  };
}

// ─── Module-level cache for useFeatureAccess ─────────────────────────────────
//
// One entry per featureKey. Cached for 60s (SWR-style): after the cache entry
// expires, the next mount of a component using `useFeatureAccess` will trigger
// a background refetch while still returning the stale value immediately.
//
// The cache is per-session (per browser tab) — survives React unmount/remount
// and route transitions, but is wiped on full page reload.

interface FeatureCacheEntry {
  enabled: boolean;
  fetchedAt: number;
  loading: boolean;
}

const FEATURE_CACHE_TTL_MS = 60_000; // 60s
const featureCache = new Map<string, FeatureCacheEntry>();
// Subscribers — components waiting for an in-flight fetch to resolve. Each
// featureKey maps to a Set of callbacks that fire when the fetch lands.
const featureSubscribers = new Map<string, Set<() => void>>();

function notifySubscribers(featureKey: string) {
  const subs = featureSubscribers.get(featureKey);
  if (subs) {
    subs.forEach((cb) => cb());
  }
}

function subscribeToFeature(featureKey: string, cb: () => void): () => void {
  if (!featureSubscribers.has(featureKey)) {
    featureSubscribers.set(featureKey, new Set());
  }
  featureSubscribers.get(featureKey)!.add(cb);
  return () => {
    const subs = featureSubscribers.get(featureKey);
    if (subs) {
      subs.delete(cb);
      if (subs.size === 0) featureSubscribers.delete(featureKey);
    }
  };
}

async function fetchFeature(featureKey: string): Promise<void> {
  const existing = featureCache.get(featureKey);
  if (existing?.loading) return; // another component already kicked off the fetch

  // Mark as loading so concurrent callers don't double-fetch.
  featureCache.set(featureKey, {
    enabled: existing?.enabled ?? false,
    fetchedAt: existing?.fetchedAt ?? 0,
    loading: true,
  });

  try {
    const res = await fetch(
      `/api/plan-features/check?feature=${encodeURIComponent(featureKey)}&XTransformPort=3000`,
      { credentials: 'include' },
    );
    const data = await res.json().catch(() => ({}));
    const enabled =
      res.ok && typeof data.enabled === 'boolean' ? data.enabled : false;
    featureCache.set(featureKey, {
      enabled,
      fetchedAt: Date.now(),
      loading: false,
    });
  } catch {
    // Network failure — fail-closed, but allow a retry on next mount.
    featureCache.set(featureKey, {
      enabled: false,
      fetchedAt: Date.now(),
      loading: false,
    });
  }
  notifySubscribers(featureKey);
}

export interface UseFeatureAccessResult {
  enabled: boolean;
  loading: boolean;
}

/**
 * Check whether the current tenant's plan allows the given feature.
 *
 * Returns `{ enabled, loading }`. On first call per feature (per session),
 * triggers a fetch to `/api/plan-features/check?feature=xxx`. Subsequent
 * calls within 60s return the cached value instantly with `loading: false`.
 *
 * Components should render their gated UI as "locked" whenever
 * `enabled === false` (regardless of `loading`), so the initial paint
 * matches the post-fetch state in the vast majority of cases (cache hit).
 */
export function useFeatureAccess(featureKey: string | null | undefined): UseFeatureAccessResult {
  // Force re-render when our cache entry changes via the subscriber pattern.
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!featureKey) return;

    const entry = featureCache.get(featureKey);
    const isStale =
      !entry || (Date.now() - entry.fetchedAt > FEATURE_CACHE_TTL_MS && !entry.loading);

    if (isStale) {
      void fetchFeature(featureKey);
    }

    const unsubscribe = subscribeToFeature(featureKey, () => {
      setVersion((v) => v + 1);
    });

    return unsubscribe;
  }, [featureKey]);

  if (!featureKey) {
    return { enabled: true, loading: false }; // no gate → allow
  }

  const entry = featureCache.get(featureKey);
  if (!entry) {
    // First mount — fetch in flight, return fail-closed default.
    return { enabled: false, loading: true };
  }

  return {
    enabled: entry.enabled,
    loading: entry.loading,
  };
}

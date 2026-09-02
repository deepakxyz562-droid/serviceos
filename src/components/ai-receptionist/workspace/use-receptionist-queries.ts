'use client';

/**
 * Shared React Query hooks for the AI Receptionist data layer.
 *
 * Phase A: Both `ai-receptionist-settings.tsx` (the Settings wrapper that
 * decides whether to show onboarding or workspace) and `use-ai-receptionist-data.ts`
 * (the Workspace data hook) consume these hooks.
 *
 * Benefits over the previous raw `fetch()` pattern:
 *   - React Query deduplicates: both components requesting the same data
 *     (e.g., subscriptions) result in ONE network request, not two.
 *   - Cached data is reused: switching tabs or remounting doesn't re-fetch
 *     stale-yet-valid data.
 *   - Targeted invalidation: mutations can invalidate specific keys
 *     (e.g., invalidate `qk.receptionist.usage()` after a call ends).
 *   - Consistent loading/error states managed by React Query.
 *
 * No new API endpoints — these hooks call the SAME endpoints the raw fetch()
 * calls did. The optimization is purely client-side (deduplication + caching).
 */

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import { authFetch } from '@/lib/client-auth';
import type {
  ReceptionistData,
  SubscriptionData,
  PhoneConnectionData,
  UsageData,
} from './use-ai-receptionist-data';

// ── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAST_DUE', 'SUSPENDED'] as const;

// Freshness contracts (consistent with the rest of the codebase):
//   - Settings/subscription/connections: 30s stale time (rarely change)
//   - Usage: 10s stale time (changes during calls)
//   - Calls: 30s stale time (recent calls don't change often)
const STALE_TIME_SETTINGS = 30_000;
const STALE_TIME_USAGE = 10_000;
const STALE_TIME_CALLS = 30_000;

// ── Shared types ────────────────────────────────────────────────────────────

export interface SubscriptionsResponse {
  subscriptions: Array<{
    id: string;
    status: string;
    addonProduct: { code: string };
    addonPlan: {
      code: string;
      name: string;
      price: number;
      currency: string;
      includedMinutes: number;
      maxConcurrentCalls: number;
      includedNumbers: number;
    };
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }>;
}

export interface ReceptionistResponse {
  receptionist: ReceptionistData | null;
}

export interface PhoneConnectionsResponse {
  connections: PhoneConnectionData[];
}

// ── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch the AI Receptionist subscription.
 *
 * Filters the addon subscriptions to find the AI_RECEPTIONIST product with
 * an ACTIVE/PAST_DUE/SUSPENDED status. Returns null if no active sub.
 *
 * Shared by both Settings (for the hasSubscription check) + Workspace.
 */
export function useAddonSubscription() {
  return useQuery<SubscriptionData | null>({
    queryKey: qk.addons.subscriptions(),
    queryFn: async () => {
      const res = await authFetch('/api/addons/subscriptions');
      if (!res.ok) return null;
      const data: SubscriptionsResponse = await res.json();
      const aiSub = data.subscriptions?.find(
        (s) =>
          s.addonProduct?.code === 'AI_RECEPTIONIST' &&
          ACTIVE_SUBSCRIPTION_STATUSES.includes(s.status as never),
      );
      return aiSub ?? null;
    },
    staleTime: STALE_TIME_SETTINGS,
    gcTime: 5 * 60_000, // 5 min garbage collection
    retry: 1,
  });
}

/**
 * Fetch the AI Receptionist configuration.
 *
 * Returns the receptionist record (greeting, handoff settings, etc.) or null
 * if not configured.
 *
 * Shared by both Settings (for the hasReceptionist check) + Workspace.
 */
export function useReceptionistSettings() {
  return useQuery<ReceptionistData | null>({
    queryKey: qk.receptionist.settings(),
    queryFn: async () => {
      const res = await authFetch('/api/addons/receptionist');
      if (!res.ok) return null;
      const data: ReceptionistResponse = await res.json();
      return data.receptionist || null;
    },
    staleTime: STALE_TIME_SETTINGS,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * Fetch phone connections for the AI Receptionist.
 *
 * Returns the list of phone number connections (Vapi numbers linked to the
 * tenant's receptionist). Empty array if no phones configured.
 *
 * Shared by both Settings (for the hasPhone check) + Workspace.
 */
export function usePhoneConnections() {
  return useQuery<PhoneConnectionData[]>({
    queryKey: qk.addons.phones.connections(),
    queryFn: async () => {
      const res = await authFetch('/api/addons/phones/connections');
      if (!res.ok) return [];
      const data: PhoneConnectionsResponse = await res.json();
      return data.connections || [];
    },
    staleTime: STALE_TIME_SETTINGS,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * Fetch AI Receptionist usage (minutes used / remaining).
 *
 * Phase B will optimize this to read the cached value instead of recomputing
 * the ledger on every call. For now, this hook just wraps the existing endpoint
 * in a React Query query so it benefits from caching + deduplication.
 *
 * Workspace-only (Settings doesn't need usage).
 */
export function useReceptionistUsage() {
  return useQuery<UsageData | null>({
    queryKey: qk.receptionist.usage(),
    queryFn: async () => {
      const res = await authFetch('/api/addons/usage');
      if (!res.ok) return null;
      return await res.json();
    },
    staleTime: STALE_TIME_USAGE,
    gcTime: 2 * 60_000,
    retry: 1,
  });
}

/**
 * Fetch recent AI calls.
 *
 * @param limit Number of calls to fetch (default 5 for Overview, 100 for Calls tab)
 */
export function useReceptionistCalls(limit: number = 5) {
  return useQuery({
    queryKey: qk.receptionist.calls(limit),
    queryFn: async () => {
      const res = await authFetch(`/api/vapi/calls?limit=${limit}`);
      if (!res.ok) return { calls: [], total: 0, todayCount: 0 };
      return await res.json();
    },
    staleTime: STALE_TIME_CALLS,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

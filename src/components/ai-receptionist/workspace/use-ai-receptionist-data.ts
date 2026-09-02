'use client';

/**
 * useAiReceptionistData
 * =====================
 *
 * Shared hook that fetches the core AI Receptionist state used across all
 * workspace tabs:
 *   - receptionist (or null)
 *   - subscription (or null)
 *   - phone connections (list)
 *   - usage (from the ledger — single source of truth)
 *
 * Phase A: Migrated from raw fetch() to shared React Query hooks.
 * The subscription, receptionist, and phone connections queries use the SAME
 * query keys as `ai-receptionist-settings.tsx`, so React Query deduplicates
 * them — when the Settings wrapper has already fetched these 3 resources,
 * the Workspace gets cached data instantly (no duplicate network requests).
 *
 * Every tab consumes this hook so we don't re-fetch the same data in each
 * tab. The hook exposes a `refresh()` function so individual tabs can
 * invalidate the cache after a mutation (e.g., after releasing a phone
 * number).
 */

import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import {
  useReceptionistSettings,
  useAddonSubscription,
  usePhoneConnections,
  useReceptionistUsage,
} from './use-receptionist-queries';

export interface ReceptionistData {
  id: string;
  name: string;
  status: string;
  currentVersionId: string | null;
  greeting: string | null;
  afterHoursGreeting: string | null;
  businessHoursMode: string;
  handoffEnabled: boolean;
  handoffTransferTarget: string | null;
  handoffFallbackMode: string;
  smsSendBackEnabled: boolean;
  smsSendBackTemplate: string | null;
  trustedPhonesJson: string;
  knownCallerGreetingTemplate: string | null;
  backgroundNoiseEnabled: boolean;
  responseDelaySeconds: number;
  knowledgeConfigJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  code: string;
  name: string;
  price: number;
  currency: string;
  includedMinutes: number;
  maxConcurrentCalls: number;
  includedNumbers: number;
}

export interface SubscriptionData {
  id: string;
  status: string;
  addonPlan: SubscriptionPlan;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PhoneConnectionData {
  id: string;
  phoneNumberId: string;
  externalPhoneNumberId: string | null;
  connectionType: string;
  routingMode: string;
  routingTarget: string | null;
  fallbackRoutingMode: string | null;
  fallbackRoutingTarget: string | null;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
  phoneNumber: {
    id: string;
    number: string;
    displayName: string | null;
    status: string;
  };
  externalPhoneNumber: {
    id: string;
    e164: string;
    label: string | null;
    verificationStatus: string;
    verifiedAt: string | null;
  } | null;
}

export interface UsageData {
  hasEntitlement: boolean;
  includedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  includedSeconds: number;
  usedSeconds: number;
  reservedSeconds: number;
  remainingSeconds: number;
  usedPercent: number;
  remainingPercent: number;
  activeCalls: number;
  maxConcurrentCalls: number;
  maxCallDurationSeconds: number;
  includedNumbers: number;
  periodStart: string | null;
  periodEnd: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  plan: { code: string; name: string; price: number; currency: string } | null;
}

interface AiReceptionistState {
  loading: boolean;
  receptionist: ReceptionistData | null;
  subscription: SubscriptionData | null;
  connections: PhoneConnectionData[];
  usage: UsageData | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAiReceptionistData(): AiReceptionistState {
  const queryClient = useQueryClient();

  // Phase A: These use the SAME query keys as ai-receptionist-settings.tsx,
  // so React Query deduplicates/caches across both components.
  const recvQuery = useReceptionistSettings();
  const subQuery = useAddonSubscription();
  const connQuery = usePhoneConnections();
  const usageQuery = useReceptionistUsage();

  const loading =
    recvQuery.isLoading ||
    subQuery.isLoading ||
    connQuery.isLoading ||
    usageQuery.isLoading;

  const error =
    recvQuery.isError || subQuery.isError || connQuery.isError || usageQuery.isError
      ? 'Failed to load AI Receptionist data'
      : null;

  // Targeted invalidation — refresh only the specific queries that changed,
  // not a blanket refetch of everything.
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.receptionist.settings() }),
      queryClient.invalidateQueries({ queryKey: qk.addons.subscriptions() }),
      queryClient.invalidateQueries({ queryKey: qk.addons.phones.connections() }),
      queryClient.invalidateQueries({ queryKey: qk.receptionist.usage() }),
    ]);
  };

  return {
    loading,
    receptionist: recvQuery.data ?? null,
    subscription: subQuery.data ?? null,
    connections: connQuery.data ?? [],
    usage: usageQuery.data ?? null,
    error,
    refresh,
  };
}

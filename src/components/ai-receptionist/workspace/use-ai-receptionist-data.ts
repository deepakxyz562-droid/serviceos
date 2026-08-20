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
 * Every tab consumes this hook so we don't re-fetch the same data in each
 * tab. The hook exposes a `refresh()` function so individual tabs can
 * invalidate the cache after a mutation (e.g., after releasing a phone
 * number).
 */

import { useState, useEffect, useCallback } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [receptionist, setReceptionist] = useState<ReceptionistData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [connections, setConnections] = useState<PhoneConnectionData[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [recvRes, subRes, connRes, usageRes] = await Promise.all([
        fetch('/api/addons/receptionist'),
        fetch('/api/addons/subscriptions'),
        fetch('/api/addons/phones/connections'),
        fetch('/api/addons/usage'),
      ]);

      if (recvRes.ok) {
        const data = await recvRes.json();
        setReceptionist(data.receptionist || null);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        const aiSub = subData.subscriptions?.find(
          (s: { addonProduct: { code: string }; status: string }) =>
            s.addonProduct?.code === 'AI_RECEPTIONIST' &&
            ['ACTIVE', 'PAST_DUE', 'SUSPENDED'].includes(s.status),
        );
        setSubscription(aiSub || null);
      }

      if (connRes.ok) {
        const connData = await connRes.json();
        setConnections(connData.connections || []);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }
    } catch {
      setError('Failed to load AI Receptionist data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    loading,
    receptionist,
    subscription,
    connections,
    usage,
    error,
    refresh: fetchAll,
  };
}

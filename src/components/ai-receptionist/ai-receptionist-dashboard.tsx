'use client';

/**
 * AI Receptionist Dashboard
 * ========================
 *
 * The main tenant-facing UI for the AI Receptionist add-on.
 *
 * Shows:
 *   - Receptionist status (ACTIVE/PAUSED/DRAFT)
 *   - Usage (used/included minutes, remaining)
 *   - Call history (recent calls)
 *   - Quick actions (configure, buy number, test)
 *
 * Phase 9: This is the landing page for the AI Receptionist tab in Settings.
 * The tenant sees their AI Receptionist status + usage + recent calls at a glance.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  Plus,
  Activity,
  TrendingUp,
  Zap,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface ReceptionistData {
  id: string;
  name: string;
  status: string;
  greeting: string | null;
  createdAt: string;
}

interface UsageData {
  includedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  includedSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
  maxConcurrentCalls: number;
  maxCallDurationSeconds: number;
}

interface CallRecord {
  id: string;
  status: string;
  fromNumber: string | null;
  durationSec: number;
  billableSeconds: number;
  costUsd: number;
  outcomeType: string | null;
  summary: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

interface SubscriptionData {
  status: string;
  addonPlan: {
    code: string;
    name: string;
    price: number;
    includedMinutes: number;
    maxConcurrentCalls: number;
  };
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function AiReceptionistDashboard() {
  const [loading, setLoading] = useState(true);
  const [receptionist, setReceptionist] = useState<ReceptionistData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch receptionist
      const recvRes = await fetch('/api/addons/receptionist');
      if (recvRes.ok) {
        const data = await recvRes.json();
        setReceptionist(data.receptionist || null);
      }

      // Fetch subscription
      const subRes = await fetch('/api/addons/subscriptions');
      if (subRes.ok) {
        const subData = await subRes.json();
        const aiSub = subData.subscriptions?.find(
          (s: { addonProduct: { code: string } }) => s.addonProduct?.code === 'AI_RECEPTIONIST',
        );
        if (aiSub) setSubscription(aiSub);
      }

      // Fetch call history
      // Note: Phase 9 uses the existing /api/vapi/calls endpoint or the new listCallsForTenant
      // For now, we just show a placeholder
    } catch {
      setError('Failed to load AI Receptionist data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="size-10 text-amber-500" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No subscription → show upsell
  if (!subscription) {
    return <NoSubscriptionCard />;
  }

  // Subscription exists but no receptionist → show setup prompt
  if (!receptionist) {
    return <SetupPromptCard />;
  }

  // Receptionist exists → show dashboard
  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Phone className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{receptionist.name}</CardTitle>
                <CardDescription>AI Receptionist</CardDescription>
              </div>
            </div>
            <StatusBadge status={receptionist.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium">{subscription.addonPlan?.name || 'AI Receptionist'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Billing Cycle</p>
              <p className="font-medium">
                {subscription.currentPeriodEnd
                  ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      <UsageCard usage={usage} subscription={subscription} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickAction
          icon={Settings}
          label="Configure"
          description="Greeting, voice, handoff"
          href="?section=ai&tab=configure"
        />
        <QuickAction
          icon={Phone}
          label="Phone Numbers"
          description="Buy, configure, release"
          href="?section=ai&tab=phones"
        />
        <QuickAction
          icon={Activity}
          label="Call History"
          description="Recent AI calls"
          href="?section=ai&tab=calls"
        />
      </div>

      {/* Recent Calls */}
      <CallHistoryCard calls={calls} />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    PAUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
    ARCHIVED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <Badge className={colors[status] || colors.DRAFT} variant="secondary">
      {status === 'ACTIVE' && <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
      {status}
    </Badge>
  );
}

function UsageCard({ usage, subscription }: { usage: UsageData | null; subscription: SubscriptionData }) {
  const includedMinutes = subscription.addonPlan?.includedMinutes || 0;
  const usedMinutes = usage?.usedMinutes || 0;
  const remainingMinutes = Math.max(0, includedMinutes - usedMinutes);
  const usedPct = includedMinutes > 0 ? (usedMinutes / includedMinutes) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-600" />
          Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">AI Minutes Used</span>
            <span className="text-sm font-medium">
              {usedMinutes} / {includedMinutes} min
            </span>
          </div>
          <Progress value={usedPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {remainingMinutes} minutes remaining this billing cycle
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            <div>
              <p className="text-muted-foreground text-xs">Max Concurrent</p>
              <p className="font-medium">{subscription.addonPlan?.maxConcurrentCalls || 1} calls</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-blue-500" />
            <div>
              <p className="text-muted-foreground text-xs">Max Call Duration</p>
              <p className="font-medium">{Math.floor((usage?.maxCallDurationSeconds || 600) / 60)} min</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <a href={href} className="block">
      <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function CallHistoryCard({ calls }: { calls: CallRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PhoneCall className="size-4 text-emerald-600" />
          Recent Calls
        </CardTitle>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <PhoneCall className="size-8 mb-2 opacity-30" />
            <p className="text-sm">No calls yet</p>
            <p className="text-xs">Calls will appear here once your AI Receptionist is active</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {calls.map((call) => (
              <CallRow key={call.id} call={call} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CallRow({ call }: { call: CallRecord }) {
  const outcomeColors: Record<string, string> = {
    booked: 'bg-emerald-100 text-emerald-700',
    lead_created: 'bg-blue-100 text-blue-700',
    transferred: 'bg-amber-100 text-amber-700',
    info_only: 'bg-slate-100 text-slate-600',
    missed: 'bg-red-100 text-red-700',
    spam: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">
          {call.status === 'ended' ? (
            <PhoneIncoming className="size-4 text-emerald-500" />
          ) : call.status === 'failed' ? (
            <PhoneMissed className="size-4 text-red-500" />
          ) : (
            <PhoneOutgoing className="size-4 text-blue-500" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{call.fromNumber || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground truncate">
            {call.summary || call.outcomeType || call.status}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {Math.floor(call.durationSec / 60)}m {call.durationSec % 60}s
        </span>
        {call.outcomeType && (
          <Badge variant="secondary" className={outcomeColors[call.outcomeType] || ''}>
            {call.outcomeType}
          </Badge>
        )}
      </div>
    </div>
  );
}

function NoSubscriptionCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-6 max-w-md mx-auto text-center">
        <div className="flex items-center justify-center size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Phone className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">AI Receptionist</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your 24/7 AI receptionist for calls, chats, and bookings. Handles lead capture,
            appointment booking, and human transfer — so you never miss a customer.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-600">$29</p>
            <p className="text-xs text-muted-foreground">Starter / mo</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">50</p>
            <p className="text-xs text-muted-foreground">AI minutes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">1</p>
            <p className="text-xs text-muted-foreground">Phone number</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="size-4" />
          Get AI Receptionist
        </Button>
      </CardContent>
    </Card>
  );
}

function SetupPromptCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="flex items-center justify-center size-12 rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Shield className="size-6 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Set Up Your AI Receptionist</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your subscription is active. Configure your AI Receptionist to start receiving calls.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Settings className="size-4" />
          Configure Receptionist
        </Button>
      </CardContent>
    </Card>
  );
}

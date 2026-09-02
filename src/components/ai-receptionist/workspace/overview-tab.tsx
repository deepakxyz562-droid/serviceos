'use client';

/**
 * OverviewTab
 * ===========
 *
 * The landing view for the AI Receptionist workspace. Shows:
 *   - Receptionist status + phone number + plan
 *   - Usage summary (from the ledger — single source of truth)
 *   - Quick actions (configure, phones, calls, test)
 *   - Recent calls (last 5)
 */

import { useState, useEffect } from 'react';
import { useReceptionistCalls } from './use-receptionist-queries';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  CheckCircle2,
  Settings,
  Activity,
  PhoneOutgoing as TestCallIcon,
  TrendingUp,
  Zap,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import type { useAiReceptionistData } from './use-ai-receptionist-data';
import { cn } from '@/lib/utils';

type Data = ReturnType<typeof useAiReceptionistData>;

interface OverviewTabProps {
  data: Data;
  onNavigate: (tab: 'overview' | 'calls' | 'phones' | 'receptionist' | 'usage' | 'test' | 'health') => void;
  onTestCall: () => void;
}

export function OverviewTab({ data, onNavigate, onTestCall }: OverviewTabProps) {
  const { receptionist, subscription, connections, usage } = data;
  const primaryConnection = connections[0];

  return (
    <div className="space-y-5">
      {/* Status hero card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                <Phone className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Your AI Receptionist number</p>
                <p className="text-xl font-semibold truncate">
                  {primaryConnection?.phoneNumber?.number || 'No number'}
                </p>
                {primaryConnection?.phoneNumber?.displayName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {primaryConnection.phoneNumber.displayName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onTestCall} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <TestCallIcon className="size-4" />
                Test Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Minutes Used"
          value={usage ? `${usage.usedMinutes} / ${usage.includedMinutes}` : '—'}
          sub={usage ? `${usage.remainingMinutes} min left` : ''}
          accent="emerald"
        />
        <StatCard
          icon={PhoneCall}
          label="Active Calls"
          value={usage ? `${usage.activeCalls} / ${usage.maxConcurrentCalls}` : '—'}
          sub="concurrent"
          accent="blue"
        />
        <StatCard
          icon={Clock}
          label="Max Duration"
          value={usage ? `${Math.floor(usage.maxCallDurationSeconds / 60)} min` : '—'}
          sub="per call"
          accent="amber"
        />
        <StatCard
          icon={Zap}
          label="Plan"
          value={subscription?.addonPlan?.name || '—'}
          sub={subscription?.addonPlan ? `$${subscription.addonPlan.price}/mo` : ''}
          accent="violet"
        />
      </div>

      {/* Usage progress */}
      {usage && usage.hasEntitlement && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" />
                AI Minutes
              </span>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('usage')}>
                Details <ArrowRight className="size-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="text-muted-foreground">
                  {usage.usedMinutes} of {usage.includedMinutes} minutes used
                </span>
                <span className="font-medium">{usage.usedPercent}%</span>
              </div>
              <Progress
                value={usage.usedPercent}
                className={cn(
                  'h-2',
                  usage.usedPercent >= 90 && '[&>div]:bg-red-500',
                  usage.usedPercent >= 75 && usage.usedPercent < 90 && '[&>div]:bg-amber-500',
                )}
              />
            </div>
            {usage.remainingMinutes <= 5 && usage.remainingMinutes > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-xs">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-300">
                    {usage.remainingMinutes} minutes remaining
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                    Your receptionist will stop accepting new AI calls when your
                    included minutes are exhausted.
                  </p>
                </div>
              </div>
            )}
            {usage.remainingMinutes === 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 text-xs">
                <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-300">
                    AI minutes exhausted
                  </p>
                  <p className="text-red-700 dark:text-red-400 mt-0.5">
                    New calls will be routed to your fallback until the next billing cycle.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction
            icon={Settings}
            label="Configure"
            description="Greeting, voice, hours"
            onClick={() => onNavigate('receptionist')}
          />
          <QuickAction
            icon={Phone}
            label="Phone Numbers"
            description="Manage routing"
            onClick={() => onNavigate('phones')}
          />
          <QuickAction
            icon={Activity}
            label="Call History"
            description="Recent calls"
            onClick={() => onNavigate('calls')}
          />
          <QuickAction
            icon={TestCallIcon}
            label="Test Call"
            description="Verify it works"
            onClick={onTestCall}
            accent
          />
        </div>
      </div>

      {/* Recent calls */}
      <RecentCallsCard onNavigate={onNavigate} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    violet: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn('flex items-center justify-center size-7 rounded-lg', colors[accent])}>
            <Icon className="size-4" />
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  label,
  description,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <Card
        className={cn(
          'hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors h-full',
          accent && 'border-emerald-200 dark:border-emerald-900',
        )}
      >
        <CardContent className="p-4">
          <div
            className={cn(
              'flex items-center justify-center size-8 rounded-lg mb-2',
              accent
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-muted',
            )}
          >
            <Icon
              className={cn(
                'size-4',
                accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
              )}
            />
          </div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </button>
  );
}

function RecentCallsCard({
  onNavigate,
}: {
  onNavigate: (tab: 'calls') => void;
}) {
  // Phase A: Migrated from raw fetch() to the shared React Query hook.
  const { data, isLoading: loading } = useReceptionistCalls(5);
  const calls = (data?.calls as Array<{
    id: string;
    callType: string;
    status: string;
    fromNumber: string | null;
    toNumber: string | null;
    customerPhone: string | null;
    durationSec: number;
    outcomeType: string | null;
    summary: string | null;
    startedAt: string | null;
    createdAt: string;
  }>) ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="size-4 text-emerald-600" />
            Recent Calls
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('calls')}>
            View all <ArrowRight className="size-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PhoneCall className="size-8 mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No calls yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Calls will appear here once your receptionist receives its first call
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {calls.map((call) => (
              <RecentCallRow key={call.id} call={call} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const OUTCOME_META: Record<string, { label: string; className: string }> = {
  booked: {
    label: 'Booked',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  lead_created: {
    label: 'Lead Created',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  transferred: {
    label: 'Transferred',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  info_only: {
    label: 'Info Only',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  missed: {
    label: 'Missed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  spam: {
    label: 'Spam',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

function RecentCallRow({ call }: { call: {
  id: string;
  callType: string;
  status: string;
  fromNumber: string | null;
  toNumber: string | null;
  customerPhone: string | null;
  durationSec: number;
  outcomeType: string | null;
  summary: string | null;
  startedAt: string | null;
  createdAt: string;
} }) {
  const otherParty = call.callType === 'outbound' ? call.toNumber : call.fromNumber || call.customerPhone;
  const outcome = call.outcomeType ? OUTCOME_META[call.outcomeType] : null;
  const isFailed = call.status === 'failed';

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="shrink-0">
        {isFailed ? (
          <PhoneMissed className="size-4 text-red-500" />
        ) : call.callType === 'outbound' ? (
          <PhoneOutgoing className="size-4 text-blue-500" />
        ) : (
          <PhoneIncoming className="size-4 text-emerald-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {otherParty || 'Unknown'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {call.summary || (outcome ? outcome.label : call.status)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {call.durationSec > 0
            ? `${Math.floor(call.durationSec / 60)}m ${call.durationSec % 60}s`
            : '—'}
        </span>
        {outcome && (
          <Badge variant="secondary" className={outcome.className}>
            {outcome.label}
          </Badge>
        )}
      </div>
    </div>
  );
}

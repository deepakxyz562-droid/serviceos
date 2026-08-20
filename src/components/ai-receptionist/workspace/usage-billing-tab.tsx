'use client';

/**
 * UsageBillingTab
 * ===============
 *
 * Shows usage driven by the backend ledger (NOT frontend calculation):
 *
 *   UsageLedger (immutable) + UsageReservation (active)
 *          ↓
 *   computeRemainingSeconds()
 *          ↓
 *   /api/addons/usage
 *          ↓
 *   This UI
 *
 * Also shows plan + subscription status + upgrade CTA.
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Calendar,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { UsageData, SubscriptionData } from './use-ai-receptionist-data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UsageBillingTabProps {
  usage: UsageData | null;
  subscription: SubscriptionData | null;
}

export function UsageBillingTab({ usage, subscription }: UsageBillingTabProps) {
  const [loading, setLoading] = useState(!usage);
  const [localUsage, setLocalUsage] = useState<UsageData | null>(usage);

  useEffect(() => {
    setLocalUsage(usage);
    setLoading(false);
  }, [usage]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/addons/usage');
      if (res.ok) {
        setLocalUsage(await res.json());
      }
    } catch {
      toast.error('Failed to refresh usage');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !localUsage) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!localUsage || !localUsage.hasEntitlement) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <CreditCard className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No active subscription. Subscribe to AI Receptionist to start using AI minutes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const plan = subscription?.addonPlan;
  const periodEnd = localUsage.periodEnd ? new Date(localUsage.periodEnd) : null;
  const daysLeft = periodEnd
    ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Usage & Billing</h3>
          <p className="text-sm text-muted-foreground">
            Real-time usage from your call ledger
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Usage card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" />
            AI Minutes
          </CardTitle>
          <CardDescription>
            {localUsage.remainingMinutes} minutes remaining this billing cycle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Big number display */}
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{localUsage.usedMinutes}</span>
                <span className="text-lg text-muted-foreground">/ {localUsage.includedMinutes} min</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {localUsage.usedPercent}% used · {localUsage.remainingMinutes} min left
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                localUsage.remainingMinutes === 0
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : localUsage.remainingMinutes <= 5
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              )}
            >
              {localUsage.remainingMinutes === 0
                ? 'Exhausted'
                : localUsage.remainingMinutes <= 5
                  ? 'Low'
                  : 'Healthy'}
            </Badge>
          </div>

          <Progress
            value={localUsage.usedPercent}
            className={cn(
              'h-3',
              localUsage.usedPercent >= 90 && '[&>div]:bg-red-500',
              localUsage.usedPercent >= 75 && localUsage.usedPercent < 90 && '[&>div]:bg-amber-500',
            )}
          />

          {/* Warning when near limit */}
          {localUsage.remainingMinutes <= 5 && localUsage.remainingMinutes > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-xs">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-300">
                  Only {localUsage.remainingMinutes} minutes remaining
                </p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Your receptionist will stop accepting new AI calls when your
                  included minutes are exhausted.
                </p>
              </div>
            </div>
          )}
          {localUsage.remainingMinutes === 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 text-xs">
              <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-300">
                  AI minutes exhausted
                </p>
                <p className="text-red-700 dark:text-red-400 mt-0.5">
                  New calls will be routed to your fallback until the next billing cycle.
                  Upgrade your plan for more minutes.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan + billing cycle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <CreditCard className="size-4" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-lg font-semibold">{plan?.name || 'AI Receptionist'}</p>
              <p className="text-sm text-muted-foreground">
                ${plan?.price || 0}/{subscription?.addonPlan ? 'mo' : ''}
              </p>
            </div>
            <Separator />
            <div className="space-y-1.5 text-sm">
              <FeatureRow label="Included minutes" value={`${Math.floor((localUsage.includedSeconds || 0) / 60)} min`} />
              <FeatureRow label="Concurrent calls" value={`${localUsage.maxConcurrentCalls}`} />
              <FeatureRow label="Max call duration" value={`${Math.floor(localUsage.maxCallDurationSeconds / 60)} min`} />
              <FeatureRow label="Phone numbers" value={`${localUsage.includedNumbers}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              Billing Cycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  localUsage.subscriptionStatus === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                )}
              >
                {localUsage.subscriptionStatus || 'Unknown'}
              </Badge>
              {localUsage.cancelAtPeriodEnd && (
                <Badge variant="outline" className="text-amber-700">
                  Cancels at period end
                </Badge>
              )}
            </div>
            <Separator />
            <div className="space-y-1.5 text-sm">
              {localUsage.periodStart && (
                <FeatureRow
                  label="Period start"
                  value={format(new Date(localUsage.periodStart), 'MMM d, yyyy')}
                />
              )}
              {periodEnd && (
                <FeatureRow
                  label="Period end"
                  value={format(periodEnd, 'MMM d, yyyy')}
                />
              )}
              {daysLeft !== null && (
                <FeatureRow
                  label="Days remaining"
                  value={`${daysLeft} days`}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Zap className="size-4" />
            Live Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{localUsage.activeCalls}</p>
              <p className="text-xs text-muted-foreground">Active calls now</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.floor(localUsage.reservedSeconds / 60)}</p>
              <p className="text-xs text-muted-foreground">Minutes reserved</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.floor(localUsage.usedSeconds / 60)}</p>
              <p className="text-xs text-muted-foreground">Minutes consumed</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-3 text-center">
            Usage is computed from the immutable call ledger in real time — no estimates.
          </p>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/10">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <TrendingUp className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium">Need more minutes?</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to a higher plan for more included minutes and concurrent calls.
              </p>
            </div>
          </div>
          <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30 gap-2 shrink-0">
            Upgrade Plan <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

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
  Sparkles,
  ShieldCheck,
  PhoneCall,
  Activity,
  Check,
  Info,
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLocalUsage(usage);
    setLoading(false);
  }, [usage]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/addons/usage');
      if (res.ok) {
        setLocalUsage(await res.json());
        toast.success('Usage statistics updated');
      }
    } catch {
      toast.error('Failed to refresh usage');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !localUsage) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!localUsage || !localUsage.hasEntitlement) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-muted text-muted-foreground mb-4">
            <CreditCard className="size-7" />
          </div>
          <h4 className="text-base font-semibold text-foreground">No Active AI Receptionist Subscription</h4>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Activate an AI Receptionist plan to unlock 24/7 autonomous phone answering, appointment booking, and caller qualification.
          </p>
          <Button className="mt-6 gap-2 shadow-sm font-medium">
            <Sparkles className="size-4" />
            Explore AI Receptionist Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plan = subscription?.addonPlan;
  const periodEnd = localUsage.periodEnd ? new Date(localUsage.periodEnd) : null;
  const daysLeft = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isLowMinutes = localUsage.remainingMinutes <= 10 && localUsage.remainingMinutes > 0;
  const isExhausted = localUsage.remainingMinutes === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Usage & Subscription</h3>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium">
              Live Ledger Verified
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time tracking of AI talk time, active call concurrency, and monthly plan limits.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={refreshing}
          className="h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
          Refresh Stats
        </Button>
      </div>

      {/* Top 4 KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Remaining Minutes */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">AI Talk Time Left</span>
              <Clock className="size-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">{localUsage.remainingMinutes}</span>
              <span className="text-xs text-muted-foreground">/ {localUsage.includedMinutes} min</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {localUsage.usedMinutes} minutes used ({localUsage.usedPercent}%)
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Live Concurrency */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Live Call Channels</span>
              <Activity className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">{localUsage.activeCalls}</span>
              <span className="text-xs text-muted-foreground">/ {localUsage.maxConcurrentCalls} max</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {localUsage.activeCalls === 0 ? 'Channels ready for calls' : 'Inbound calls active now'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Max Duration */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Max Call Length</span>
              <PhoneCall className="size-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {Math.floor(localUsage.maxCallDurationSeconds / 60)}
              </span>
              <span className="text-xs text-muted-foreground">min / call</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Guaranteed cutoff safeguard
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Days Remaining */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Cycle Renewal</span>
              <Calendar className="size-4 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">{daysLeft ?? '—'}</span>
              <span className="text-xs text-muted-foreground">days left</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Resets on {periodEnd ? format(periodEnd, 'MMM d') : 'billing date'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Consumption Gauge Card */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Monthly Minutes Meter
              </CardTitle>
              <CardDescription className="text-xs">
                Accurate to the second via immutable call ledger records
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-medium',
                isExhausted
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : isLowMinutes
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              )}
            >
              {isExhausted ? 'Quota Exhausted' : isLowMinutes ? 'Low Minutes Warning' : 'Healthy Allocation'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">{localUsage.usedMinutes} min consumed</span>
              <span className="text-muted-foreground font-medium">{localUsage.remainingMinutes} min remaining</span>
            </div>
            <Progress
              value={localUsage.usedPercent}
              className={cn(
                'h-3.5 rounded-full bg-muted',
                localUsage.usedPercent >= 90 && '[&>div]:bg-red-500',
                localUsage.usedPercent >= 70 && localUsage.usedPercent < 90 && '[&>div]:bg-amber-500',
                localUsage.usedPercent < 70 && '[&>div]:bg-emerald-500'
              )}
            />
          </div>

          {/* Warning Notices */}
          {isLowMinutes && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-900/60 text-xs">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Running Low on AI Minutes ({localUsage.remainingMinutes} min left)
                </p>
                <p className="text-amber-700/90 dark:text-amber-400 mt-0.5 leading-relaxed">
                  When minutes reach 0, new inbound calls will seamlessly route to your configured fallback destination (voicemail or staff phone).
                </p>
              </div>
            </div>
          )}

          {isExhausted && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">
                  Monthly Minutes Limit Reached
                </p>
                <p className="text-destructive/80 mt-0.5 leading-relaxed">
                  Inbound calls are currently routing to your fallback destination. Upgrade your plan to instantly restore 24/7 AI answering.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Details & Billing Cycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Plan */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <CreditCard className="size-4 text-primary" />
              Active Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">{plan?.name || 'AI Receptionist'}</p>
                <p className="text-xs text-muted-foreground">Dedicated Voice Assistant Tier</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">${plan?.price || 0}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                  Auto-Renews
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              <FeatureItem label="Included AI Talk Time" value={`${localUsage.includedMinutes} Minutes`} />
              <FeatureItem label="Simultaneous Channels" value={`${localUsage.maxConcurrentCalls} Concurrent Calls`} />
              <FeatureItem label="Per-Call Duration Limit" value={`${Math.floor(localUsage.maxCallDurationSeconds / 60)} Minutes`} />
              <FeatureItem label="Dedicated Business Lines" value={`${localUsage.includedNumbers} Included Number`} />
            </div>
          </CardContent>
        </Card>

        {/* Billing Cycle Details */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Calendar className="size-4 text-primary" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-medium',
                    localUsage.subscriptionStatus === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                  )}
                >
                  {localUsage.subscriptionStatus === 'ACTIVE' ? 'Active & Good Standing' : localUsage.subscriptionStatus || 'Active'}
                </Badge>
              </div>
              {localUsage.cancelAtPeriodEnd && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                  Cancels at period end
                </Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              {localUsage.periodStart && (
                <FeatureItem
                  label="Cycle Start Date"
                  value={format(new Date(localUsage.periodStart), 'MMM d, yyyy')}
                />
              )}
              {periodEnd && (
                <FeatureItem
                  label="Next Billing & Reset Date"
                  value={format(periodEnd, 'MMM d, yyyy')}
                />
              )}
              {daysLeft !== null && (
                <FeatureItem
                  label="Days Left in Period"
                  value={`${daysLeft} days`}
                />
              )}
              <FeatureItem
                label="Overages Safeguard"
                value="Protected (No surprise charges)"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Callout */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary shrink-0 shadow-inner">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Need Higher Call Volume or Extra Lines?</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Scale your capacity with high-concurrency plans, custom voice clones, and additional phone numbers.
              </p>
            </div>
          </div>
          <Button className="shrink-0 gap-1.5 shadow-sm font-medium">
            Explore Upgrades
            <ArrowRight className="size-3.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

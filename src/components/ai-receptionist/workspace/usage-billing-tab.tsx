'use client';

/**
 * UsageBillingTab
 * ===============
 *
 * Native Subscription & Usage Control Center for AI Receptionist.
 *
 * Drives real-time usage from the immutable backend ledger:
 *   UsageLedger + UsageReservation → /api/addons/usage → Real-time UI
 *
 * Component Hierarchy:
 *   UsageBillingTab
 *   ├── UsageHeader (Title, Verified Badge, Refresh)
 *   ├── UsageAlerts (Near-limit, Exhausted, Cancelled banners)
 *   ├── UsageSummary (4-tile KPI grid + consumption gauge)
 *   ├── ActivePlanCard & BillingCycleCard
 *   ├── ReceptionistPlanCards (Inline 3-tier comparison: Starter, Pro, Business)
 *   │   └── ReceptionistPlanCard
 *   ├── UpgradeConfirmationDialog
 *   └── DowngradeConfirmationDialog
 */

import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Calendar,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  PhoneCall,
  Activity,
  Check,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { UsageData, SubscriptionData } from './use-ai-receptionist-data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AI_RECEPTIONIST_PLANS,
  getAiReceptionistPlanByCode,
  type AiReceptionistPlanConfig,
} from '@/lib/ai-receptionist-plans';

interface UsageBillingTabProps {
  usage: UsageData | null;
  subscription: SubscriptionData | null;
}

export function UsageBillingTab({ usage, subscription }: UsageBillingTabProps) {
  const [loading, setLoading] = useState(!usage);
  const [localUsage, setLocalUsage] = useState<UsageData | null>(usage);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Dialog state
  const [upgradePlan, setUpgradePlan] = useState<AiReceptionistPlanConfig | null>(null);
  const [downgradePlan, setDowngradePlan] = useState<AiReceptionistPlanConfig | null>(null);

  const planTiersRef = useRef<HTMLDivElement | null>(null);

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

  const handleStartCheckout = async (planCode: string) => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/addons/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonPlanCode: planCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received from payment provider');
      }
    } catch (err: any) {
      toast.error(err.message || 'Subscription checkout failed');
      setCheckoutLoading(false);
    }
  };

  const scrollToPlanTiers = () => {
    if (planTiersRef.current) {
      planTiersRef.current.scrollIntoView({ behavior: 'smooth' });
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

  // Resolve current active plan configuration
  const currentPlanCode = subscription?.addonPlan?.code || localUsage?.planCode;
  const currentPlanConfig = getAiReceptionistPlanByCode(currentPlanCode);
  const hasActiveSubscription = !!(localUsage?.hasEntitlement && subscription?.addonPlan);

  // ── UNSUBSCRIBED STATE ──────────────────────────────────────────────────
  if (!localUsage || !localUsage.hasEntitlement) {
    return (
      <div className="space-y-8">
        <Card className="border-dashed bg-gradient-to-b from-muted/30 to-background shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-4 ring-1 ring-emerald-500/20">
              <Sparkles className="size-7" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              AI Receptionist Isn't Active Yet
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
              Your AI receptionist answers inbound calls, qualifies leads, captures contact info, and schedules service appointments automatically 24 hours a day, 7 days a week.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="size-3.5" />
              Includes dedicated business phone number & 14-day risk-free trial
            </div>
          </CardContent>
        </Card>

        {/* Inline Plan Cards for Unsubscribed Tenants */}
        <div ref={planTiersRef} className="space-y-4">
          <div className="text-center sm:text-left">
            <h4 className="text-lg font-bold tracking-tight text-foreground">
              Choose an AI Receptionist Plan
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select the inbound capacity that fits your business. You can upgrade, downgrade, or cancel at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {AI_RECEPTIONIST_PLANS.map((plan) => (
              <ReceptionistPlanCard
                key={plan.code}
                plan={plan}
                currentPlanCode={null}
                onSelect={() => setUpgradePlan(plan)}
                loading={checkoutLoading && upgradePlan?.code === plan.code}
              />
            ))}
          </div>
        </div>

        {/* Upgrade / Subscribe Modal */}
        {upgradePlan && (
          <UpgradeConfirmationDialog
            open={!!upgradePlan}
            onOpenChange={(open) => !open && setUpgradePlan(null)}
            targetPlan={upgradePlan}
            currentPlan={null}
            onConfirm={() => handleStartCheckout(upgradePlan.code)}
            loading={checkoutLoading}
          />
        )}
      </div>
    );
  }

  // ── ACTIVE SUBSCRIPTION STATE ───────────────────────────────────────────
  const periodEnd = localUsage.periodEnd ? new Date(localUsage.periodEnd) : null;
  const daysLeft = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isLowMinutes = localUsage.remainingMinutes <= 20 && localUsage.remainingMinutes > 0;
  const isExhausted = localUsage.remainingMinutes === 0;
  const isNearLimit = localUsage.usedPercent >= 80 && !isExhausted;

  return (
    <div className="space-y-6">
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Usage & Subscription</h3>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium">
              Live Ledger Verified
            </Badge>
            {localUsage.subscriptionStatus === 'ACTIVE' && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-normal">
                {currentPlanConfig?.name || 'Active Plan'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time tracking of AI talk time, active call concurrency, and monthly plan limits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            Refresh Stats
          </Button>
        </div>
      </div>

      {/* ── 2. Usage Warning / Limit Alerts ── */}
      {isExhausted && (
        <Card className="border-destructive/30 bg-destructive/10 text-destructive shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-5 shrink-0 mt-0.5 text-destructive" />
              <div>
                <p className="font-semibold text-sm">
                  You've reached your {localUsage.includedMinutes}-minute monthly limit
                </p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Upgrade your plan to continue answering customer calls automatically without interruption.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={scrollToPlanTiers}
              className="shrink-0 gap-1.5 shadow-xs"
            >
              <Zap className="size-3.5" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {isNearLimit && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-sm">
                  You've used {localUsage.usedMinutes} of {localUsage.includedMinutes} minutes ({localUsage.remainingMinutes} min left)
                </p>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                  You are approaching your monthly AI Receptionist limit. Upgrade your plan to ensure uninterrupted 24/7 coverage.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={scrollToPlanTiers}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 shadow-xs"
            >
              <Zap className="size-3.5" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {localUsage.cancelAtPeriodEnd && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Calendar className="size-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold text-sm">Subscription Scheduled for Cancellation</p>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                  Your AI Receptionist will remain active until {periodEnd ? format(periodEnd, 'MMMM d, yyyy') : 'the end of your period'}.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (currentPlanConfig) setUpgradePlan(currentPlanConfig);
                else scrollToPlanTiers();
              }}
              className="shrink-0 gap-1.5 bg-background border-amber-300"
            >
              Reactivate AI Receptionist
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── 3. Top 4 KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Remaining Minutes */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Minutes Remaining</span>
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
              <span className="text-xs font-medium">Concurrent Calls</span>
              <Activity className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">{localUsage.activeCalls}</span>
              <span className="text-xs text-muted-foreground">/ {localUsage.maxConcurrentCalls} max</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {localUsage.activeCalls === 0 ? 'All channels available' : `${localUsage.activeCalls} active call(s) now`}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Dedicated Phone Numbers */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Phone Numbers</span>
              <PhoneCall className="size-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {localUsage.includedNumbers}
              </span>
              <span className="text-xs text-muted-foreground">dedicated</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Attached to this agent
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Days Remaining */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Billing Renewal</span>
              <Calendar className="size-4 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">{daysLeft ?? '—'}</span>
              <span className="text-xs text-muted-foreground">days left</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Resets on {periodEnd ? format(periodEnd, 'MMM d, yyyy') : 'billing date'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Main Consumption Gauge ── */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Monthly Minutes Usage
              </CardTitle>
              <CardDescription className="text-xs">
                {localUsage.usedMinutes} of {localUsage.includedMinutes} minutes consumed ({localUsage.usedPercent}%)
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-medium',
                isExhausted
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : isNearLimit
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              )}
            >
              {isExhausted ? 'Quota Exhausted' : isNearLimit ? 'Near Limit' : 'Healthy Allocation'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">{localUsage.usedMinutes} min used</span>
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
        </CardContent>
      </Card>

      {/* ── 5. Plan Details & Billing Information ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Plan */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <CreditCard className="size-4 text-primary" />
              Active Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">{currentPlanConfig?.name || subscription?.addonPlan?.name || 'AI Receptionist'}</p>
                <p className="text-xs text-muted-foreground">{currentPlanConfig?.tagline || 'Autonomous Voice Tier'}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">
                  ${currentPlanConfig?.price || subscription?.addonPlan?.price || 0}
                  <span className="text-xs font-normal text-muted-foreground">/mo</span>
                </p>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                  Auto-Renews
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              <FeatureItem label="Included Monthly Talk Time" value={`${localUsage.includedMinutes} Minutes`} />
              <FeatureItem label="Concurrent Call Channels" value={`${localUsage.maxConcurrentCalls} Channel${localUsage.maxConcurrentCalls > 1 ? 's' : ''}`} />
              <FeatureItem label="Maximum Per-Call Duration" value={`${Math.floor(localUsage.maxCallDurationSeconds / 60)} Minutes`} />
              <FeatureItem label="Dedicated Telephony Lines" value={`${localUsage.includedNumbers} Included Number`} />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Cycle */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Calendar className="size-4 text-primary" />
              Billing Cycle Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between">
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
              {periodEnd && (
                <span className="text-xs text-muted-foreground">
                  Renews {format(periodEnd, 'MMM d, yyyy')}
                </span>
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
                  label="Next Reset Date"
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

      {/* ── 6. Inline Plan Cards (Native Control Center) ── */}
      <div ref={planTiersRef} className="space-y-4 pt-4 border-t border-border/60">
        <div>
          <h4 className="text-base font-bold tracking-tight text-foreground">
            Available Subscription Tiers
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seamlessly scale your monthly talk time and call concurrency as your business grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {AI_RECEPTIONIST_PLANS.map((plan) => {
            const isCurrent = currentPlanConfig?.code === plan.code;
            const isHigherTier = currentPlanConfig ? plan.price > currentPlanConfig.price : false;
            const isLowerTier = currentPlanConfig ? plan.price < currentPlanConfig.price : false;

            return (
              <ReceptionistPlanCard
                key={plan.code}
                plan={plan}
                currentPlanCode={currentPlanConfig?.code || null}
                onSelect={() => {
                  if (isCurrent) return;
                  if (isLowerTier) {
                    setDowngradePlan(plan);
                  } else {
                    setUpgradePlan(plan);
                  }
                }}
                loading={checkoutLoading && (upgradePlan?.code === plan.code || downgradePlan?.code === plan.code)}
              />
            );
          })}
        </div>
      </div>

      {/* ── 7. Modals ── */}
      {upgradePlan && (
        <UpgradeConfirmationDialog
          open={!!upgradePlan}
          onOpenChange={(open) => !open && setUpgradePlan(null)}
          targetPlan={upgradePlan}
          currentPlan={currentPlanConfig || null}
          onConfirm={() => handleStartCheckout(upgradePlan.code)}
          loading={checkoutLoading}
        />
      )}

      {downgradePlan && currentPlanConfig && (
        <DowngradeConfirmationDialog
          open={!!downgradePlan}
          onOpenChange={(open) => !open && setDowngradePlan(null)}
          targetPlan={downgradePlan}
          currentPlan={currentPlanConfig}
          onConfirm={() => handleStartCheckout(downgradePlan.code)}
          loading={checkoutLoading}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function FeatureItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

interface ReceptionistPlanCardProps {
  plan: AiReceptionistPlanConfig;
  currentPlanCode: string | null;
  onSelect: () => void;
  loading: boolean;
}

function ReceptionistPlanCard({
  plan,
  currentPlanCode,
  onSelect,
  loading,
}: ReceptionistPlanCardProps) {
  const isCurrent = currentPlanCode === plan.code;
  const currentPlan = getAiReceptionistPlanByCode(currentPlanCode);
  const isUpgrade = currentPlan ? plan.price > currentPlan.price : false;
  const isDowngrade = currentPlan ? plan.price < currentPlan.price : false;

  let buttonLabel = `Choose ${plan.name}`;
  if (isCurrent) {
    buttonLabel = 'Current Plan';
  } else if (isUpgrade) {
    buttonLabel = `Upgrade to ${plan.name}`;
  } else if (isDowngrade) {
    buttonLabel = `Change to ${plan.name}`;
  }

  return (
    <Card
      className={cn(
        'relative flex flex-col justify-between transition-all duration-200 border-border/80 shadow-xs',
        plan.highlighted && 'ring-2 ring-primary border-primary shadow-sm',
        isCurrent && 'bg-muted/20 border-primary/40 ring-1 ring-primary/30'
      )}
    >
      {plan.badge && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-0.5 shadow-xs">
            {plan.badge}
          </Badge>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="outline" className="bg-background text-foreground border-primary text-[10px] font-semibold px-2.5 py-0.5 shadow-xs">
            Current Active Plan
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">{plan.name}</CardTitle>
          <Badge variant="secondary" className="text-[11px] font-medium">
            {plan.minutes} min / mo
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1">
          {plan.tagline}
        </CardDescription>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">${plan.price}</span>
          <span className="text-xs text-muted-foreground font-medium">/ month</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        <Separator />
        <ul className="space-y-2 text-xs">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-muted-foreground leading-tight">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <div className="p-6 pt-0">
        <Button
          onClick={onSelect}
          disabled={isCurrent || loading}
          variant={isCurrent ? 'outline' : isUpgrade || (!currentPlanCode && plan.highlighted) ? 'default' : 'outline'}
          className={cn(
            'w-full text-xs font-semibold h-9 shadow-xs',
            !isCurrent && (isUpgrade || (!currentPlanCode && plan.highlighted)) && 'bg-primary hover:bg-primary/90 text-primary-foreground'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
              Connecting...
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upgrade Confirmation Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface UpgradeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: AiReceptionistPlanConfig;
  currentPlan: AiReceptionistPlanConfig | null;
  onConfirm: () => void;
  loading: boolean;
}

function UpgradeConfirmationDialog({
  open,
  onOpenChange,
  targetPlan,
  currentPlan,
  onConfirm,
  loading,
}: UpgradeConfirmationDialogProps) {
  const isInitialSubscribe = !currentPlan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <DialogTitle className="text-lg">
              {isInitialSubscribe ? `Subscribe to ${targetPlan.name}` : `Upgrade to ${targetPlan.name}`}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {isInitialSubscribe
              ? `Unlock 24/7 AI answering with ${targetPlan.minutes} monthly minutes and dedicated phone service.`
              : `Increase your talk time to ${targetPlan.minutes} minutes and concurrency to ${targetPlan.concurrentCalls} channels.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Plan Price Card */}
          <div className="p-3.5 rounded-xl bg-muted/50 border border-border/80 flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground text-sm">{targetPlan.name} Plan</span>
              <p className="text-muted-foreground text-[11px] mt-0.5">Billed monthly • Cancel anytime</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-foreground">${targetPlan.price}</span>
              <span className="text-muted-foreground text-[11px]">/mo</span>
            </div>
          </div>

          {/* Included Features */}
          <div className="space-y-2">
            <span className="font-semibold text-foreground text-xs">Included in this plan:</span>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex items-center gap-2 text-foreground">
                <Check className="size-3.5 text-emerald-600 shrink-0" />
                <span><strong>{targetPlan.minutes} AI receptionist minutes</strong> per month</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Check className="size-3.5 text-emerald-600 shrink-0" />
                <span><strong>{targetPlan.phoneNumbers} dedicated phone number</strong> included</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Check className="size-3.5 text-emerald-600 shrink-0" />
                <span>Up to <strong>{targetPlan.concurrentCalls} concurrent calls</strong> simultaneously</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Check className="size-3.5 text-emerald-600 shrink-0" />
                <span>Autonomous appointment booking & CRM lead capture</span>
              </div>
            </div>
          </div>

          {/* Current vs New comparison (if upgrading) */}
          {currentPlan && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Current Plan:</span>
                <span className="font-medium text-foreground">{currentPlan.name} (${currentPlan.price}/mo)</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>New Plan:</span>
                <span>{targetPlan.name} (${targetPlan.price}/mo)</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="bg-primary text-primary-foreground gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Preparing Checkout...
              </>
            ) : (
              <>
                Continue to Checkout
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Downgrade Confirmation Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface DowngradeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: AiReceptionistPlanConfig;
  currentPlan: AiReceptionistPlanConfig;
  onConfirm: () => void;
  loading: boolean;
}

function DowngradeConfirmationDialog({
  open,
  onOpenChange,
  targetPlan,
  currentPlan,
  onConfirm,
  loading,
}: DowngradeConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" />
            <DialogTitle className="text-lg text-foreground">
              Change to {targetPlan.name}?
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Your AI Receptionist plan will change from <strong>{currentPlan.name}</strong> to <strong>{targetPlan.name}</strong>. Please review the updated limits below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="border border-border/80 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold">Feature</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Current ({currentPlan.name})</TableHead>
                  <TableHead className="text-xs font-semibold text-center text-primary">New ({targetPlan.name})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">Monthly Minutes</TableCell>
                  <TableCell className="text-center">{currentPlan.minutes} min</TableCell>
                  <TableCell className="text-center font-bold text-foreground">{targetPlan.minutes} min</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">Concurrent Calls</TableCell>
                  <TableCell className="text-center">{currentPlan.concurrentCalls}</TableCell>
                  <TableCell className="text-center font-bold text-foreground">{targetPlan.concurrentCalls}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">Phone Numbers</TableCell>
                  <TableCell className="text-center">{currentPlan.phoneNumbers}</TableCell>
                  <TableCell className="text-center font-bold text-foreground">{targetPlan.phoneNumbers}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">Monthly Price</TableCell>
                  <TableCell className="text-center">${currentPlan.price}/mo</TableCell>
                  <TableCell className="text-center font-bold text-emerald-600">${targetPlan.price}/mo</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs">
            <p className="font-semibold">Important Plan Adjustment Notice</p>
            <p className="mt-0.5 leading-relaxed text-amber-800/90 dark:text-amber-300/80">
              When changing plans, your concurrency channels and monthly allocation will adjust to the new limits on confirmation.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="bg-primary text-primary-foreground gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Updating...
              </>
            ) : (
              'Confirm Plan Change'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

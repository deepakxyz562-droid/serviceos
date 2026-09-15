'use client';

/**
 * AiReceptionistWorkspace
 * ========================
 *
 * Modern, cohesive AI Receptionist workspace across the CRM.
 *
 * Features:
 *   - Sleek header with live agent status, connected line pill, and plan badge
 *   - Customer-friendly actions ("Sync Live Agent", "Test Call")
 *   - Guided setup progress banner for pending configurations
 *   - Standard responsive segmented navigation tabs
 *   - URL-synced tab state (?aiTab=...)
 */

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  Phone,
  Bot,
  TrendingUp,
  PhoneOutgoing,
  HeartPulse,
  Loader2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAiReceptionistData } from './use-ai-receptionist-data';
import { OverviewTab } from './overview-tab';
import { CallsTab } from './calls-tab';
import { PhoneNumbersTab } from './phone-numbers-tab';
import { ReceptionistTab } from './receptionist-tab';
import { UsageBillingTab } from './usage-billing-tab';
import { TestCallTab } from './test-call-tab';
import { SystemHealthTab } from './system-health-tab';
import { TestCallDialog } from './test-call-dialog';
import { BuyNumberDialog } from './buy-number-dialog';
import { cn } from '@/lib/utils';

export type TabId =
  | 'overview'
  | 'receptionist'
  | 'calls'
  | 'phones'
  | 'usage'
  | 'test'
  | 'health';

interface TabDef {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { id: 'receptionist', label: 'Agent & Voice', shortLabel: 'Agent', icon: Bot },
  { id: 'calls', label: 'Call History', shortLabel: 'Calls', icon: PhoneCall },
  { id: 'phones', label: 'Phone Numbers', shortLabel: 'Numbers', icon: Phone },
  { id: 'usage', label: 'Usage & Minutes', shortLabel: 'Usage', icon: TrendingUp },
  { id: 'test', label: 'Test Simulator', shortLabel: 'Test', icon: PhoneOutgoing },
  { id: 'health', label: 'System Diagnostics', shortLabel: 'Diagnostics', icon: HeartPulse },
];

function getTabFromUrl(): TabId {
  if (typeof window === 'undefined') return 'overview';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('aiTab') as TabId;
  return TABS.some((t) => t.id === tab) ? tab : 'overview';
}

function setTabInUrl(tab: TabId) {
  const url = new URL(window.location.href);
  url.searchParams.set('aiTab', tab);
  window.history.replaceState({}, '', url.toString());
}

export function AiReceptionistWorkspace() {
  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromUrl());
  const [testCallOpen, setTestCallOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const data = useAiReceptionistData();

  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setTabInUrl(tab);
  };

  // Synchronize AI prompt, voice persona, and CRM function-calling tools with the live voice engine
  const handleSyncAgent = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/addons/receptionist/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        toast.success(
          result.action === 'created'
            ? 'AI Receptionist activated and synchronized!'
            : 'AI Agent synchronized — prompt, voice, and CRM booking tools updated',
        );
        await data.refresh();
      } else {
        toast.error(result.error || 'Agent synchronization failed');
      }
    } catch {
      toast.error('Network error during synchronization');
    } finally {
      setSyncing(false);
    }
  };

  if (data.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="relative flex items-center justify-center size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
          <Loader2 className="size-6 animate-spin" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Loading AI Receptionist workspace...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/10">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center max-w-md mx-auto">
          <div className="flex items-center justify-center size-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Unable to load AI Receptionist</h3>
            <p className="text-xs text-muted-foreground">{data.error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={data.refresh} className="gap-2">
            <RefreshCw className="size-3.5" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const receptionist = data.receptionist;
  const isAiActive = receptionist?.status === 'ACTIVE';
  const primaryPhone = data.connections[0]?.phoneNumber;
  const hasSubscription = !!data.subscription;
  const hasPhone = data.connections.length > 0;
  const hasReceptionist = !!data.receptionist;

  const isSetupComplete = hasSubscription && hasReceptionist && hasPhone && isAiActive;
  const setupStepCount = [hasSubscription, hasReceptionist, hasPhone, isAiActive].filter(Boolean).length;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* ── Modern Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1 border-b border-border/40">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm ring-1 ring-emerald-500/20 shrink-0">
            <Bot className="size-6" />
            {isAiActive && (
              <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground tracking-tight truncate">
                {receptionist?.name || 'AI Receptionist'}
              </h2>
              <StatusBadge status={receptionist?.status || (isSetupComplete ? 'ACTIVE' : 'DRAFT')} />
              {data.subscription?.addonPlan && (
                <Badge variant="outline" className="text-xs font-normal bg-muted/40 border-border/60">
                  {data.subscription.addonPlan.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {primaryPhone?.number ? (
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Phone className="size-3 text-emerald-600 dark:text-emerald-400" />
                  {primaryPhone.number}
                  {primaryPhone.displayName && (
                    <span className="text-muted-foreground font-normal">({primaryPhone.displayName})</span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Phone className="size-3" />
                  No phone line attached
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                24/7 Voice AI
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAgent}
            disabled={syncing || !data.receptionist}
            className="gap-2 text-xs h-9"
            title="Synchronize AI prompt, voice, and CRM tools (bookings, leads) with the voice engine"
          >
            {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span>Sync Live Agent</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setTestCallOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs h-9 shadow-sm"
          >
            <PhoneOutgoing className="size-3.5" />
            <span>Test Call</span>
          </Button>
        </div>
      </div>

      {/* ── Guided Setup Hub Banner (Shown when setup is incomplete) ── */}
      {!isSetupComplete && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5">
                    Setup Progress: {setupStepCount} / 4 Complete
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">Get your AI Receptionist ready to answer</span>
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Complete these quick steps so your AI can answer calls, capture customer leads, and book appointments automatically.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!hasPhone && (
                  <Button
                    size="sm"
                    onClick={() => setBuyDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-8"
                  >
                    <Phone className="size-3" />
                    Get Dedicated Number
                  </Button>
                )}
                {!isAiActive && hasPhone && (
                  <Button
                    size="sm"
                    onClick={handleSyncAgent}
                    disabled={syncing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-8"
                  >
                    {syncing ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                    Activate &amp; Sync
                  </Button>
                )}
              </div>
            </div>

            {/* Step Checkpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-border/40">
              <SetupStep
                num={1}
                label="Subscription Plan"
                desc={hasSubscription ? (data.subscription?.addonPlan?.name || 'Active') : 'Select plan'}
                done={hasSubscription}
                actionLabel={hasSubscription ? undefined : 'View Plans'}
                onAction={() => handleTabChange('usage')}
              />
              <SetupStep
                num={2}
                label="Agent & Persona"
                desc={hasReceptionist ? receptionist?.name || 'Configured' : 'Customize voice'}
                done={hasReceptionist}
                actionLabel={hasReceptionist ? undefined : 'Configure'}
                onAction={() => handleTabChange('receptionist')}
              />
              <SetupStep
                num={3}
                label="Dedicated Number"
                desc={hasPhone ? (primaryPhone?.number || 'Attached') : 'Claim your number'}
                done={hasPhone}
                actionLabel={hasPhone ? undefined : 'Get Number'}
                onAction={() => setBuyDialogOpen(true)}
              />
              <SetupStep
                num={4}
                label="Live Activation"
                desc={isAiActive ? 'Live & Answering' : 'Sync & Activate'}
                done={isAiActive}
                actionLabel={isAiActive ? undefined : 'Activate'}
                onAction={handleSyncAgent}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modern Navigation Tabs ── */}
      <div className="space-y-6">
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <nav className="inline-flex p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/50 gap-1 min-w-full sm:min-w-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150',
                    isActive
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors',
                      isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                    )}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Active Tab Content ── */}
        <div className="min-w-0">
          {activeTab === 'overview' && (
            <OverviewTab
              data={data}
              onNavigate={handleTabChange}
              onTestCall={() => setTestCallOpen(true)}
              onBuyNumber={() => setBuyDialogOpen(true)}
            />
          )}
          {activeTab === 'receptionist' && (
            <ReceptionistTab
              receptionist={receptionist}
              onChanged={data.refresh}
            />
          )}
          {activeTab === 'calls' && <CallsTab />}
          {activeTab === 'phones' && (
            <PhoneNumbersTab
              connections={data.connections}
              onChanged={data.refresh}
              onBuyNumber={() => setBuyDialogOpen(true)}
            />
          )}
          {activeTab === 'usage' && (
            <UsageBillingTab usage={data.usage} subscription={data.subscription} />
          )}
          {activeTab === 'test' && <TestCallTab />}
          {activeTab === 'health' && <SystemHealthTab />}
        </div>
      </div>

      {/* ── Test Call Dialog ── */}
      <TestCallDialog open={testCallOpen} onOpenChange={setTestCallOpen} />

      {/* ── Buy Number Dialog ── */}
      <BuyNumberDialog
        open={buyDialogOpen}
        onOpenChange={setBuyDialogOpen}
        onSuccess={async () => {
          await data.refresh();
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; pulse?: boolean }> = {
    ACTIVE: {
      label: 'Live & Answering',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-300/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
      pulse: true,
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-amber-100 text-amber-800 border-amber-300/50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    },
    DRAFT: {
      label: 'Draft (Ready to Sync)',
      className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
    },
    ARCHIVED: {
      label: 'Archived',
      className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300',
    },
  };
  const c = config[status] || config.DRAFT;
  return (
    <Badge variant="outline" className={cn('gap-1.5 text-xs font-medium py-0.5 px-2.5 shadow-none', c.className)}>
      {c.pulse && <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {c.label}
    </Badge>
  );
}

function SetupStep({
  num,
  label,
  desc,
  done,
  actionLabel,
  onAction,
}: {
  num: number;
  label: string;
  desc: string;
  done: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2.5 rounded-lg border transition-all text-xs',
        done
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-foreground'
          : 'bg-background border-border/60 text-muted-foreground',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            'flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0',
            done
              ? 'bg-emerald-600 text-white'
              : 'bg-muted text-muted-foreground border border-border',
          )}
        >
          {done ? <CheckCircle2 className="size-3" /> : num}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
        </div>
      </div>
      {actionLabel && onAction && !done && (
        <button
          onClick={onAction}
          className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
}


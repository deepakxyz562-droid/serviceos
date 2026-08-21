'use client';

/**
 * AiReceptionistWorkspace
 * ========================
 *
 * The permanent AI Receptionist workspace — shown after onboarding is complete.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │  [Status badge]    AI Receptionist    [Test Call]│
 *   ├────────────┬─────────────────────────────────────┤
 *   │  Sidebar   │  Active tab content                  │
 *   │  Overview  │                                      │
 *   │  Calls     │                                      │
 *   │  Phones    │                                      │
 *   │  Recv      │                                      │
 *   │  Usage     │                                      │
 *   │  Test      │                                      │
 *   │  Health    │                                      │
 *   └────────────┴─────────────────────────────────────┘
 *
 * Navigation uses `?section=ai&aiTab=<tab>` so deep links work and the
 * browser back button is meaningful.
 *
 * The sidebar collapses to a horizontal scroll on mobile.
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

type TabId =
  | 'overview'
  | 'calls'
  | 'phones'
  | 'receptionist'
  | 'usage'
  | 'test'
  | 'health';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'calls', label: 'Calls', icon: PhoneCall },
  { id: 'phones', label: 'Phone Numbers', icon: Phone },
  { id: 'receptionist', label: 'Receptionist', icon: Bot },
  { id: 'usage', label: 'Usage & Billing', icon: TrendingUp },
  { id: 'test', label: 'Test Call', icon: PhoneOutgoing },
  { id: 'health', label: 'System Health', icon: HeartPulse },
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
  // Lazy-init from URL so deep links work on first render (no effect needed).
  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromUrl());
  const [testCallOpen, setTestCallOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const data = useAiReceptionistData();

  // Subscribe to back/forward navigation (only the event listener, not setState on mount)
  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setTabInUrl(tab);
  };

  // Phase 9.8: Redeploy the assistant to Vapi (refreshes tools + prompt).
  // This is how an existing tenant picks up the 13 function-call tools —
  // their assistant was created BEFORE the tools array was added.
  const handleRedeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch('/api/addons/receptionist/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        toast.success(result.action === 'created'
          ? 'AI Receptionist deployed to Vapi'
          : 'AI Receptionist updated — tools + prompt refreshed');
        await data.refresh();
      } else {
        toast.error(result.error || 'Deployment failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeploying(false);
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm text-muted-foreground">{data.error}</p>
        <Button variant="outline" size="sm" onClick={data.refresh}>
          Try Again
        </Button>
      </div>
    );
  }

  const receptionist = data.receptionist;
  const isAiActive = receptionist?.status === 'ACTIVE';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
            <Bot className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {receptionist?.name || 'AI Receptionist'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={receptionist?.status || 'DRAFT'} />
              {data.connections[0]?.phoneNumber && (
                <span className="text-xs text-muted-foreground">
                  {data.connections[0].phoneNumber.number}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedeploy}
            disabled={deploying || !data.receptionist}
            className="gap-2"
            title="Redeploy the Vapi assistant to refresh CRM tools (create_lead, schedule_job, etc.)"
          >
            {deploying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span className="hidden sm:inline">Redeploy</span>
          </Button>
          <Button
            onClick={() => setTestCallOpen(true)}
            disabled={!isAiActive}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <PhoneOutgoing className="size-4" />
            Test Call
          </Button>
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar (horizontal on mobile, vertical on desktop) */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:w-52 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap lg:w-full transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Active tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <OverviewTab
              data={data}
              onNavigate={handleTabChange}
              onTestCall={() => setTestCallOpen(true)}
            />
          )}
          {activeTab === 'calls' && <CallsTab />}
          {activeTab === 'phones' && (
            <PhoneNumbersTab
              connections={data.connections}
              onChanged={data.refresh}
            />
          )}
          {activeTab === 'receptionist' && (
            <ReceptionistTab
              receptionist={receptionist}
              onChanged={data.refresh}
            />
          )}
          {activeTab === 'usage' && (
            <UsageBillingTab usage={data.usage} subscription={data.subscription} />
          )}
          {activeTab === 'test' && <TestCallTab />}
          {activeTab === 'health' && <SystemHealthTab />}
        </div>
      </div>

      {/* Test Call dialog (shared across tabs) */}
      <TestCallDialog open={testCallOpen} onOpenChange={setTestCallOpen} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; pulse?: boolean }> = {
    ACTIVE: {
      label: 'Active',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      pulse: true,
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    DRAFT: {
      label: 'Draft',
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    ARCHIVED: {
      label: 'Archived',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  };
  const c = config[status] || config.DRAFT;
  return (
    <Badge variant="secondary" className={cn('gap-1.5', c.className)}>
      {c.pulse && <span className="size-1.5 rounded-full bg-current animate-pulse" />}
      {c.label}
    </Badge>
  );
}

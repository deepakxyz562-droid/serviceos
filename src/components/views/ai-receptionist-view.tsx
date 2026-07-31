'use client';

import { useState, useEffect } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Bot,
  Plus,
  Settings as SettingsIcon,
  Activity,
  Phone,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Mic,
  PhoneForwarded,
  Sparkles,
  History,
  CalendarCheck,
  UserPlus,
  Info,
  Ban,
  Timer,
  Gauge,
  PauseCircle,
  PlayCircle,
  Save,
  ShieldOff,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AiAgentsView } from '@/components/views/ai-agents-view';
import { AiCallHistoryView } from '@/components/views/ai-call-history-view';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  status: string;
  active: boolean;
  totalCalls: number;
  totalSeconds: number;
  lastCallAt: string | null;
  vapiAssistantId: string | null;
  phoneNumbers?: { id: string; phoneNumber: string; friendlyName: string | null }[];
}

interface RecentCall {
  id: string;
  callType: string;
  status: string;
  customerPhone: string | null;
  durationSec: number;
  costUsd: number;
  startedAt: string | null;
  endedReason: string | null;
  summary: string | null;
  outcomeType: string | null;
  timeSavedSec: number;
  agent: { id: string; name: string } | null;
}

interface DashboardData {
  agents: Agent[];
  recentCalls: RecentCall[];
  allCalls: RecentCall[];
  stats: {
    total: number;
    totalDurationSec: number;
    totalCost: number;
    todayCount: number;
  };
  vapiConfigured: boolean;
}

// ── Phase R7: Billing counter (mirror of AiBillingCounter row) ─────────
interface BillingData {
  callsUsed: number;
  callsLimit: number;
  pausedAtLimit: boolean;
  monthStart: string;
  remaining: number;
}

// ── Phase R8: Disabled callers (mirror of /api/vapi/calls/disabled row) ─
interface DisabledCaller {
  phone: string;
  disabledAt: string; // ISO timestamp
  disabledCallId: string;
  callCount: number;
}

// Outcome type → color/icon metadata for both dashboard + call detail.
const OUTCOME_META: Record<
  string,
  { label: string; pill: string; bar: string; icon: React.ReactNode }
> = {
  booked: {
    label: 'Booked',
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    icon: <CalendarCheck className="size-3.5" />,
  },
  lead_created: {
    label: 'Lead Created',
    pill: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    bar: 'bg-blue-500',
    icon: <UserPlus className="size-3.5" />,
  },
  transferred: {
    label: 'Transferred',
    pill: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    bar: 'bg-amber-500',
    icon: <PhoneForwarded className="size-3.5" />,
  },
  info_only: {
    label: 'Info Only',
    pill: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300',
    bar: 'bg-slate-400',
    icon: <Info className="size-3.5" />,
  },
  missed: {
    label: 'Missed',
    pill: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    bar: 'bg-red-500',
    icon: <Ban className="size-3.5" />,
  },
  spam: {
    label: 'Spam',
    pill: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    bar: 'bg-red-400',
    icon: <Ban className="size-3.5" />,
  },
};

const OUTCOME_ORDER = ['booked', 'lead_created', 'transferred', 'info_only', 'missed'] as const;

function outcomeBadgeClass(outcome: string | null | undefined): string {
  if (!outcome) return 'bg-muted text-muted-foreground border-border';
  return (OUTCOME_META[outcome] ?? OUTCOME_META.info_only).pill;
}

function callerBadgeClass(caller: string | null | undefined): string {
  switch (caller) {
    case 'customer':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'lead':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function AiReceptionistView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [disabledCallers, setDisabledCallers] = useState<DisabledCaller[]>([]);
  const [reEnablingPhone, setReEnablingPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'dashboard' | 'agents' | 'history'>('dashboard');
  const { auth } = useAppStore();
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setPendingSettingsSection = useAppStore((s) => s.setPendingSettingsSection);

  // Admin-only: owners + admins can edit billing settings; employees are
  // read-only. Super-admins without a tenantId can't reach this view (no
  // tenant context), so we don't need to special-case them here.
  const canEditBilling =
    auth.user?.role === 'owner' ||
    auth.user?.role === 'admin' ||
    auth.user?.role === 'superadmin' ||
    auth.user?.role === 'super_admin';

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const [agentsRes, callsRes, billingRes, disabledRes] = await Promise.all([
        fetch('/api/vapi/agents'),
        // Fetch up to 500 calls so we can compute outcome breakdowns + time-saved
        // totals client-side (avoids needing a dedicated stats endpoint). The
        // recent-calls card slices the first 8 from this same payload.
        fetch('/api/vapi/calls?limit=500'),
        // Phase R7: billing counter (callsUsed / callsLimit / pausedAtLimit).
        // Errors are swallowed so a missing/broken billing endpoint never
        // blocks the dashboard from rendering.
        fetch('/api/vapi/billing'),
        // Phase R8: disabled callers (allowlist enforcement — callers with
        // any AiCall.aiDisabled=true). Errors are swallowed so a missing
        // endpoint never blocks the dashboard.
        fetch('/api/vapi/calls/disabled'),
      ]);
      const agentsData = await agentsRes.json().catch(() => ({ agents: [], vapiConfigured: false }));
      const callsData = await callsRes.json().catch(() => ({ calls: [], stats: { total: 0, totalDurationSec: 0, totalCost: 0, todayCount: 0 } }));
      const billingData = await billingRes.json().catch(() => null);
      const disabledData = await disabledRes.json().catch(() => ({ callers: [] }));

      const allCalls: RecentCall[] = callsData.calls || [];
      setData({
        agents: agentsData.agents || [],
        allCalls,
        recentCalls: allCalls.slice(0, 8),
        stats: callsData.stats || { total: 0, totalDurationSec: 0, totalCost: 0, todayCount: 0 },
        vapiConfigured: agentsData.vapiConfigured || false,
      });
      if (billingData && typeof billingData.callsUsed === 'number') {
        setBilling({
          callsUsed: billingData.callsUsed,
          callsLimit: billingData.callsLimit ?? 30,
          pausedAtLimit: Boolean(billingData.pausedAtLimit),
          monthStart: billingData.monthStart || new Date().toISOString(),
          remaining: Number.isFinite(billingData.remaining) ? billingData.remaining : Math.max(0, (billingData.callsLimit ?? 30) - billingData.callsUsed),
        });
      }
      setDisabledCallers(Array.isArray(disabledData.callers) ? disabledData.callers : []);
    } catch {
      toast.error('Failed to load AI Receptionist data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fmtDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  // Format seconds → "Xh Ym" or "Xm" for the Time Saved stat.
  const fmtTimeSaved = (sec: number) => {
    if (sec <= 0) return '0m';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const fmtCost = (usd: number) => `$${usd.toFixed(2)}`;

  // Phase R8 — re-enable a previously-disabled caller. Calls
  // PATCH /api/vapi/calls/disabled with the phone number, which flips
  // aiDisabled=false on ALL AiCall rows for that phone+tenant. On success,
  // removes the caller from the local list and toasts.
  const handleReEnableCaller = async (phone: string) => {
    setReEnablingPhone(phone);
    try {
      const res = await fetch('/api/vapi/calls/disabled', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to re-enable caller');
      setDisabledCallers((prev) => prev.filter((c) => c.phone !== phone));
      toast.success(`Re-enabled ${phone} (${data.reEnabledCount ?? 0} call${(data.reEnabledCount ?? 0) !== 1 ? 's' : ''} updated)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to re-enable caller');
    } finally {
      setReEnablingPhone(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <PhoneCall className="size-6 text-emerald-600" />
            AI Receptionist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voice AI that answers calls, books appointments, and captures leads — 24/7.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setActiveView('aiAgents')}>
            <Bot className="size-3.5" />
            Manage Agents
          </Button>
        </div>
      </div>

      {/* ─── Tabs: Dashboard | AI Agents | Call History ─────────── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-11">
          <TabsTrigger value="dashboard" className="text-sm min-h-[44px]">
            <PhoneCall className="size-4 mr-1.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="agents" className="text-sm min-h-[44px]">
            <Bot className="size-4 mr-1.5" /> AI Agents
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm min-h-[44px]">
            <History className="size-4 mr-1.5" /> Call History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
      {/* ─── Phase R7: Low-remaining / paused billing banner ─────────── */}
      {billing && billing.pausedAtLimit && (
        <Alert variant="default" className="border-red-200 dark:border-red-800 bg-red-50/70 dark:bg-red-950/10">
          <PauseCircle className="size-4 text-red-600" />
          <AlertTitle className="text-red-700 dark:text-red-400">AI Receptionist is paused at the monthly limit</AlertTitle>
          <AlertDescription>
            You&apos;ve used all {billing.callsLimit} conversations this month. The AI will keep answering calls
            (so you don&apos;t miss anything), but they&apos;re flagged as overage.{' '}
            {canEditBilling && (
              <span className="font-medium">
                Bump the limit or unpause in the Billing card below.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {billing && !billing.pausedAtLimit && billing.remaining <= 10 && (
        <Alert variant="default" className="border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/10">
          <Gauge className="size-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            You have {billing.remaining} AI conversation{billing.remaining !== 1 ? 's' : ''} left this month
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {canEditBilling && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/vapi/billing', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pausedAtLimit: true }),
                      });
                      if (!res.ok) throw new Error('Failed');
                      toast.success('AI Receptionist paused at limit');
                      fetchData(true);
                    } catch {
                      toast.error('Failed to pause AI Receptionist');
                    }
                  }}
                >
                  <PauseCircle className="size-3.5" />
                  Pause
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5"
                onClick={() => {
                  setPendingSettingsSection('ai');
                  setActiveView('settings');
                }}
              >
                <Sparkles className="size-3.5" />
                Upgrade
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ─── BYOK status banner ─────────────────────────────────────── */}
      {!data?.vapiConfigured && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-amber-700 dark:text-amber-400">Vapi API key not configured</div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add your Vapi.ai API key in Settings → AI Voice to start using AI Receptionist.
                It only takes a minute (BYOK — you pay Vapi directly, ServiceOS pays $0).
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Phone numbers (for both SMS and AI voice) are managed in Inbox &amp; Automation → Phone Numbers.
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => {
              setPendingSettingsSection('ai');
              setActiveView('settings');
            }}>
              <SettingsIcon className="size-3.5" />
              Configure AI Voice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Stats grid ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={data?.stats.total ?? 0}
          subtitle={`${data?.stats.todayCount ?? 0} today`}
          icon={<PhoneCall className="size-5" />}
          color="emerald"
        />
        <StatCard
          title="Talk Time"
          value={fmtDuration(data?.stats.totalDurationSec ?? 0)}
          subtitle="all time"
          icon={<Clock className="size-5" />}
          color="blue"
        />
        <StatCard
          title="Total Cost"
          value={fmtCost(data?.stats.totalCost ?? 0)}
          subtitle="paid to Vapi"
          icon={<DollarSign className="size-5" />}
          color="violet"
        />
        <StatCard
          title="Active Agents"
          value={data?.agents.filter((a) => a.active).length ?? 0}
          subtitle={`${data?.agents.length ?? 0} total`}
          icon={<Bot className="size-5" />}
          color="amber"
        />
      </div>

      {/* ─── Outcomes breakdown + Time Saved ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OutcomesCard calls={data?.allCalls ?? []} />
        <TimeSavedCard
          totalSec={data?.allCalls.reduce((sum, c) => sum + (c.timeSavedSec || 0), 0) ?? 0}
          callCount={data?.allCalls.length ?? 0}
        />
      </div>

      {/* ─── Phase R7: Monthly billing / quota card ─────────────────── */}
      <BillingCard
        billing={billing}
        canEdit={canEditBilling}
        onSaved={(updated) => {
          setBilling(updated);
          fetchData(true);
        }}
      />

      {/* ─── Quick actions ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          icon={<Bot className="size-5" />}
          title="AI Agents"
          description="Create & configure voice assistants"
          onClick={() => setActiveView('aiAgents')}
        />
        <QuickAction
          icon={<Phone className="size-5" />}
          title="Phone Numbers"
          description="Buy numbers & enable AI voice"
          onClick={() => setActiveView('smsNumbers')}
        />
        <QuickAction
          icon={<PhoneIncoming className="size-5" />}
          title="Call History"
          description="Listen & review transcripts"
          onClick={() => setActiveView('aiCallHistory')}
        />
        <QuickAction
          icon={<SettingsIcon className="size-5" />}
          title="AI Voice Settings"
          description="Vapi API key & webhook"
          onClick={() => {
            setPendingSettingsSection('ai');
            setActiveView('settings');
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Agents overview (2 cols) ─────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="size-4" />
                  Your AI Agents
                </CardTitle>
                <CardDescription>Active voice assistants handling your calls</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveView('aiAgents')}>
                View all
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {data?.agents.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto mb-3 flex items-center justify-center size-12 rounded-full bg-muted">
                  <Bot className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No agents yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first AI agent to start answering calls.</p>
                <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setActiveView('aiAgents')}>
                  <Plus className="size-3.5" />
                  Create Agent
                </Button>
              </div>
            ) : (
              data?.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'flex items-center justify-center size-9 rounded-full shrink-0',
                        agent.active ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'
                      )}
                    >
                      <Bot className={cn('size-4', agent.active ? 'text-emerald-600' : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{agent.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{agent.totalCalls} calls</span>
                        <span>•</span>
                        <span>{fmtDuration(agent.totalSeconds)}</span>
                        {agent.lastCallAt && (
                          <>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(agent.lastCallAt), { addSuffix: true })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0',
                      agent.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {agent.active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ─── Recent calls (1 col) ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4" />
                  Recent Calls
                </CardTitle>
                <CardDescription>Latest activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveView('aiCallHistory')}>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {data?.recentCalls.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto mb-3 flex items-center justify-center size-12 rounded-full bg-muted">
                  <PhoneMissed className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No calls yet</p>
                <p className="text-xs text-muted-foreground mt-1">Calls will appear here once your agents start receiving them.</p>
              </div>
            ) : (
              data?.recentCalls.map((call) => (
                <div key={call.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <div
                    className={cn(
                      'flex items-center justify-center size-8 rounded-full shrink-0',
                      call.callType === 'inbound'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    {call.callType === 'inbound' ? (
                      <PhoneIncoming className="size-4 text-emerald-600" />
                    ) : (
                      <PhoneOutgoing className="size-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{call.customerPhone || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{fmtDuration(call.durationSec)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {call.agent?.name || 'No agent'} •{' '}
                      {call.startedAt ? format(new Date(call.startedAt), 'MMM d, h:mm a') : 'Pending'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Disabled callers (Phase R8) ────────────────────────────── */}
      {/* Only rendered when there's at least one disabled caller — keeps the
          dashboard clean for tenants that haven't disabled anyone. */}
      {disabledCallers.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldOff className="size-4 text-red-600" />
                  Disabled Callers
                </CardTitle>
                <CardDescription>
                  Callers flagged for the AI to skip. Future calls from these
                  numbers are tagged for review.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 shrink-0">
                {disabledCallers.length} blocked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {disabledCallers.map((caller) => (
                <div
                  key={caller.phone}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-9 rounded-full shrink-0 bg-red-100 dark:bg-red-900/30">
                      <ShieldOff className="size-4 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate font-mono">
                        {caller.phone}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>
                          {caller.callCount} call{caller.callCount !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span>
                          disabled {formatDistanceToNow(new Date(caller.disabledAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={reEnablingPhone === caller.phone}
                    onClick={() => handleReEnableCaller(caller.phone)}
                  >
                    {reEnablingPhone === caller.phone ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="size-3.5" />
                    )}
                    Re-enable
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── How it works ──────────────────────────────────────────── */}
      <Card className="bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-emerald-600" />
            How AI Receptionist Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex gap-3">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-semibold shrink-0">1</div>
              <div>
                <div className="font-medium">Add Vapi Key</div>
                <p className="text-xs text-muted-foreground mt-0.5">Settings → AI Voice (BYOK)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-semibold shrink-0">2</div>
              <div>
                <div className="font-medium">Create AI Agent</div>
                <p className="text-xs text-muted-foreground mt-0.5">Configure voice, prompt, tools</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-semibold shrink-0">3</div>
              <div>
                <div className="font-medium">Get a Number</div>
                <p className="text-xs text-muted-foreground mt-0.5">Buy via Phone Numbers and enable AI Voice mode on it</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-semibold shrink-0">4</div>
              <div>
                <div className="font-medium">Receive Calls</div>
                <p className="text-xs text-muted-foreground mt-0.5">AI answers, books, captures leads</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AiAgentsView />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <AiCallHistoryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'violet' | 'amber';
}) {
  const colorMap = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
          <div className={cn('flex items-center justify-center size-8 rounded-lg', colorMap[color])}>{icon}</div>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-xl border bg-card text-left hover:bg-muted/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
    >
      <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 group-hover:scale-110 transition-transform shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{description}</div>
      </div>
    </button>
  );
}

// ── Outcomes breakdown card ──────────────────────────────────────────────
// Shows the breakdown of call outcomes (Booked / Lead Created / Transferred
// / Info Only / Missed) as colored progress bars + pills with counts. The
// data comes from the dashboard's allCalls array (fetched with limit=500).
function OutcomesCard({ calls }: { calls: RecentCall[] }) {
  // Tally per-outcome counts. Calls without an outcomeType fall into a
  // separate "Unset" bucket that we surface only if non-zero (so a fresh
  // tenant with no enriched calls doesn't see a confusing "Unset" row).
  const counts: Record<string, number> = {};
  let unset = 0;
  for (const c of calls) {
    if (c.outcomeType && OUTCOME_META[c.outcomeType]) {
      counts[c.outcomeType] = (counts[c.outcomeType] || 0) + 1;
    } else {
      unset += 1;
    }
  }
  const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
  const total = calls.length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              Call Outcomes
            </CardTitle>
            <CardDescription>
              {totalClassified > 0
                ? `${totalClassified} of ${total} calls classified`
                : 'No classified calls yet'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {OUTCOME_ORDER.map((key) => {
              const meta = OUTCOME_META[key];
              const count = counts[key] || 0;
              return (
                <Badge
                  key={key}
                  variant="outline"
                  className={cn('gap-1 text-[10px] font-medium', meta.pill)}
                >
                  {meta.icon}
                  {meta.label}
                  <span className="ml-0.5 tabular-nums">{count}</span>
                </Badge>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {total === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No call data to break down yet.
          </div>
        ) : (
          OUTCOME_ORDER.map((key) => {
            const meta = OUTCOME_META[key];
            const count = counts[key] || 0;
            const pct = totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-32 shrink-0">
                  <span className={cn('size-2 rounded-full', meta.bar)} />
                  <span className="text-xs font-medium">{meta.label}</span>
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full transition-all', meta.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {count} {count === 1 ? 'call' : 'calls'} · {pct}%
                </div>
              </div>
            );
          })
        )}
        {unset > 0 && (
          <div className="pt-1 text-[10px] text-muted-foreground">
            {unset} call{unset !== 1 ? 's' : ''} not yet classified.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Time Saved stat card ────────────────────────────────────────────────
// Sums AiCall.timeSavedSec across all fetched calls and formats as
// "Xh Ym" / "Xm". Phase R3's webhook computes timeSavedSec = duration * 1.5.
function TimeSavedCard({ totalSec, callCount }: { totalSec: number; callCount: number }) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const display = totalSec <= 0 ? '0m' : h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Time Saved
          </span>
          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
            <Timer className="size-5" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{display}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          across {callCount} call{callCount !== 1 ? 's' : ''}
        </div>
        <Separator className="my-3" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Estimated staff hours saved by AI handling these calls automatically
          (~1.5× call duration).
        </p>
      </CardContent>
    </Card>
  );
}

// ── Phase R7: Billing / monthly quota card ──────────────────────────────
// Shows the tenant's monthly AI call usage with a progress bar, remaining
// count, paused badge, and (for admins) a settings dialog to change the
// limit + toggle pausedAtLimit. Calls PUT /api/vapi/billing on save.
function BillingCard({
  billing,
  canEdit,
  onSaved,
}: {
  billing: BillingData | null;
  canEdit: boolean;
  onSaved: (updated: BillingData) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [callsLimitInput, setCallsLimitInput] = useState<string>('');
  const [pausedInput, setPausedInput] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  // Sync the dialog's local input state whenever the dialog opens (so we
  // always start from the latest server values, not whatever the user
  // typed last time they opened it).
  useEffect(() => {
    if (dialogOpen) {
      setCallsLimitInput(String(billing?.callsLimit ?? 30));
      setPausedInput(Boolean(billing?.pausedAtLimit));
    }
  }, [dialogOpen, billing]);

  const callsUsed = billing?.callsUsed ?? 0;
  const callsLimit = billing?.callsLimit ?? 30;
  const remaining = billing?.remaining ?? callsLimit;
  const paused = Boolean(billing?.pausedAtLimit);
  // Cap the visual bar at 100 — overage calls (callsUsed > callsLimit) just
  // pin the bar full + show the overage count as a separate badge.
  const pct = callsLimit > 0 ? Math.min(100, Math.round((callsUsed / callsLimit) * 100)) : 100;
  const overage = Math.max(0, callsUsed - callsLimit);

  // Bar colour shifts amber at 75%+ and red at 100%+ (or paused).
  const barColor =
    paused || callsUsed >= callsLimit
      ? 'bg-red-500'
      : pct >= 75
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const monthStartLabel = billing?.monthStart
    ? format(new Date(billing.monthStart), 'MMM d, yyyy')
    : '—';

  const handleSave = async () => {
    const newLimit = Math.max(1, Math.floor(Number(callsLimitInput) || 30));
    setSaving(true);
    try {
      const res = await fetch('/api/vapi/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callsLimit: newLimit,
          pausedAtLimit: pausedInput,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed');
      }
      const updated = await res.json();
      const next: BillingData = {
        callsUsed: updated.callsUsed ?? callsUsed,
        callsLimit: updated.callsLimit ?? newLimit,
        pausedAtLimit: Boolean(updated.pausedAtLimit),
        monthStart: updated.monthStart || billing?.monthStart || new Date().toISOString(),
        remaining: Number.isFinite(updated.remaining)
          ? updated.remaining
          : Math.max(0, (updated.callsLimit ?? newLimit) - (updated.callsUsed ?? callsUsed)),
      };
      onSaved(next);
      toast.success('Billing settings saved');
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save billing settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="size-4" />
              Monthly Conversation Quota
            </CardTitle>
            <CardDescription>
              AI Receptionist usage resets on the 1st of each month. Billing month started {monthStartLabel}.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {paused && (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 gap-1"
              >
                <PauseCircle className="size-3" />
                Paused at limit
              </Badge>
            )}
            {!paused && overage === 0 && pct < 75 && (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 gap-1"
              >
                <CheckCircle2 className="size-3" />
                Healthy
              </Badge>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <SettingsIcon className="size-3.5" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage headline — big "used / limit" + remaining */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {callsUsed}
              <span className="text-muted-foreground font-normal"> / {callsLimit}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              conversations used this month
            </div>
          </div>
          <div className="text-right">
            <div className={cn(
              'text-2xl font-bold tracking-tight tabular-nums',
              remaining === 0 ? 'text-red-600' : remaining <= 10 ? 'text-amber-600' : 'text-emerald-600',
            )}>
              {remaining}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              remaining{overage > 0 ? ` · ${overage} overage` : ''}
            </div>
          </div>
        </div>

        {/* Progress bar — color shifts amber at 75%+, red at 100%+ (or paused).
            Uses the same plain-div pattern as OutcomesCard for per-instance
            color control — shadcn's <Progress> uses bg-primary which can't
            be recolored per-instance without CSS vars. */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% of monthly conversation quota used`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{pct}% used</span>
            <span>
              {paused
                ? 'AI continues answering but calls are flagged'
                : callsUsed >= callsLimit
                  ? 'Limit reached — AI still answers (overage)'
                  : pct >= 75
                    ? 'Approaching limit'
                    : 'Within limit'}
            </span>
          </div>
        </div>

        <Separator />

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          The AI Receptionist always answers calls so you never miss a lead — even when the
          monthly limit is reached. Calls beyond the limit are flagged as overage. Adjust the
          limit or pause the AI any time{canEdit ? '' : ' (admin only)'}.
        </p>
      </CardContent>

      {/* ── Settings dialog (admin only) ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Billing settings</DialogTitle>
            <DialogDescription>
              Set the monthly AI conversation limit and whether the AI should keep answering
              past the limit. Changes apply immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="billing-calls-limit">Monthly conversation limit</Label>
              <Input
                id="billing-calls-limit"
                type="number"
                min={1}
                step={1}
                value={callsLimitInput}
                onChange={(e) => setCallsLimitInput(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Used {callsUsed} of {callsLimit} this month. Remaining will be{' '}
                {Math.max(0, (Math.max(1, Math.floor(Number(callsLimitInput) || 30))) - callsUsed)}.
              </p>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="billing-paused-toggle" className="flex items-center gap-2">
                  {pausedInput ? (
                    <PauseCircle className="size-4 text-red-500" />
                  ) : (
                    <PlayCircle className="size-4 text-emerald-500" />
                  )}
                  Pause at limit
                </Label>
                <p className="text-xs text-muted-foreground">
                  When ON, the AI is flagged as paused once the limit is hit. The AI will still
                  answer calls (so no lead is missed), but each call is logged as overage and a
                  billing-pause warning is written to the server log.
                </p>
              </div>
              <Switch
                id="billing-paused-toggle"
                checked={pausedInput}
                onCheckedChange={setPausedInput}
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  agent: { id: string; name: string } | null;
}

interface DashboardData {
  agents: Agent[];
  recentCalls: RecentCall[];
  stats: {
    total: number;
    totalDurationSec: number;
    totalCost: number;
    todayCount: number;
  };
  vapiConfigured: boolean;
}

export function AiReceptionistView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const [agentsRes, callsRes] = await Promise.all([
        fetch('/api/vapi/agents'),
        fetch('/api/vapi/calls?limit=8'),
      ]);
      const agentsData = await agentsRes.json().catch(() => ({ agents: [], vapiConfigured: false }));
      const callsData = await callsRes.json().catch(() => ({ calls: [], stats: { total: 0, totalDurationSec: 0, totalCost: 0, todayCount: 0 } }));

      setData({
        agents: agentsData.agents || [],
        recentCalls: callsData.calls || [],
        stats: callsData.stats || { total: 0, totalDurationSec: 0, totalCost: 0, todayCount: 0 },
        vapiConfigured: agentsData.vapiConfigured || false,
      });
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

  const fmtCost = (usd: number) => `$${usd.toFixed(2)}`;

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
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => setActiveView('settings')}>
              <SettingsIcon className="size-3.5" />
              Configure
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
          description="Buy or import numbers"
          onClick={() => setActiveView('aiPhoneNumbers')}
        />
        <QuickAction
          icon={<PhoneIncoming className="size-5" />}
          title="Call History"
          description="Listen & review transcripts"
          onClick={() => setActiveView('aiCallHistory')}
        />
        <QuickAction
          icon={<SettingsIcon className="size-5" />}
          title="Settings"
          description="Vapi API key & webhook"
          onClick={() => setActiveView('settings')}
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
                <p className="text-xs text-muted-foreground mt-0.5">Buy via Vapi or import Twilio</p>
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

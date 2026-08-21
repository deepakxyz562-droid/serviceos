'use client';

/**
 * AI Platform Section (Superadmin)
 * =================================
 *
 * Phase 9.8: The Superadmin control plane for the AI Receptionist platform.
 *
 * This section exposes the 6 backend APIs that were previously unwired:
 *   - /api/superadmin/ai-platform/providers        → Providers tab
 *   - /api/superadmin/ai-platform/kill-switch       → Kill Switch tab
 *   - /api/superadmin/ai-platform/economics         → Overview tab
 *   - /api/superadmin/ai-platform/calls             → Calls tab
 *   - /api/superadmin/ai-platform/reconcile         → Reconciliation tab
 *
 * Sub-tabs:
 *   1. Overview      — economics dashboard (calls/cost/revenue/margin today)
 *   2. Providers     — Vapi + Twilio API keys, webhook secrets, Test Connection
 *   3. Kill Switch   — global AI Receptionist on/off toggle
 *   4. Calls         — platform-wide AiCall list (all tenants)
 *   5. Reconciliation — phone number reconciliation (Twilio ↔ Vapi ↔ Fieseros)
 *   6. Health        — system health checks
 *
 * The tenant never sees this section. It's for platform operators only.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Cloud,
  Phone,
  PhoneCall,
  Zap,
  ShieldOff,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  Save,
  ExternalLink,
  ArrowRight,
  PhoneOff,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProviderConfig {
  id: string;
  provider: string;
  displayName: string;
  apiKeyMasked: string;
  capabilities: string[];
  status: string;
  configJson: string;
  lastValidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EconomicsData {
  callsToday: number;
  totalBillableSeconds: number;
  totalProviderCost: number;
  totalRevenue: number;
  grossMargin: number;
  activeAiTenants: number;
  activeCalls: number;
  activeReservations: number;
}

interface CallRecord {
  id: string;
  tenantId: string;
  vapiCallId: string | null;
  status: string;
  fromNumber: string | null;
  toNumber: string | null;
  customerPhone: string | null;
  durationSec: number;
  billableSeconds: number;
  costUsd: number;
  revenueUsd: number;
  outcomeType: string | null;
  summary: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  createdAt: string;
}

interface PhoneNumberRecord {
  id: string;
  number: string;
  displayName: string | null;
  providerSid: string | null;
  vapiNumberId: string | null;
  status: string;
  tenantId: string | null;
  monthlyCost: number;
}

// ─── Main component ────────────────────────────────────────────────────────

type SubTab = 'overview' | 'providers' | 'kill-switch' | 'calls' | 'reconciliation' | 'health';

export function AiPlatformSection() {
  const [tab, setTab] = useState<SubTab>('overview');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Cloud className="size-5 text-emerald-600" />
          AI Platform
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the AI Receptionist platform — providers, kill switch, economics, calls, and reconciliation.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5">
            <Key className="size-3.5" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="kill-switch" className="gap-1.5">
            <ShieldOff className="size-3.5" />
            Kill Switch
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5">
            <PhoneCall className="size-3.5" />
            Calls
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5">
            <Activity className="size-3.5" />
            Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewSubTab />
        </TabsContent>
        <TabsContent value="providers" className="mt-4">
          <ProvidersSubTab />
        </TabsContent>
        <TabsContent value="kill-switch" className="mt-4">
          <KillSwitchSubTab />
        </TabsContent>
        <TabsContent value="calls" className="mt-4">
          <CallsSubTab />
        </TabsContent>
        <TabsContent value="reconciliation" className="mt-4">
          <ReconciliationSubTab />
        </TabsContent>
        <TabsContent value="health" className="mt-4">
          <HealthSubTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── 1. Overview (Economics) ────────────────────────────────────────────────

function OverviewSubTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EconomicsData | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/superadmin/ai-platform/economics');
      if (res.ok) setData(await res.json());
    } catch {
      toast.error('Failed to load economics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading && !data) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Platform Economics</h3>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={PhoneCall} label="Calls Today" value={String(data.callsToday)} accent="emerald" />
        <StatCard icon={Clock} label="Billable Minutes" value={`${Math.floor(data.totalBillableSeconds / 60)}m`} accent="blue" />
        <StatCard icon={DollarSign} label="Provider Cost" value={`$${data.totalProviderCost.toFixed(2)}`} accent="amber" />
        <StatCard icon={TrendingUp} label="Revenue" value={`$${data.totalRevenue.toFixed(2)}`} accent="violet" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={TrendingUp} label="Gross Margin" value={`${data.grossMargin.toFixed(1)}%`} accent="emerald" />
        <StatCard icon={Users} label="Active AI Tenants" value={String(data.activeAiTenants)} accent="blue" />
        <StatCard icon={Activity} label="Active Calls Now" value={String(data.activeCalls)} accent="amber" />
      </div>
    </div>
  );
}

// ─── 2. Providers ───────────────────────────────────────────────────────────

function ProvidersSubTab() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/superadmin/ai-platform/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch {
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleValidate = async (provider: string) => {
    try {
      const res = await fetchApi(`/api/superadmin/ai-platform/providers/${provider}/validate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.valid) {
        toast.success(`${provider} connection validated`);
      } else {
        toast.error(`${provider} validation failed: ${data.error || 'Invalid'}`);
      }
      fetchProviders();
    } catch {
      toast.error('Validation request failed');
    }
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Provider Configuration</h3>
          <p className="text-sm text-muted-foreground">Vapi + Twilio API keys, webhook secrets, and validation</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProviders} disabled={loading} className="gap-1.5">
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Key className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No providers configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              editing={editing === p.id}
              onEdit={() => setEditing(editing === p.id ? null : p.id)}
              onValidate={() => handleValidate(p.provider)}
              showKey={showKey}
              onToggleShowKey={() => setShowKey(!showKey)}
              onSaved={fetchProviders}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  editing,
  onEdit,
  onValidate,
  showKey,
  onToggleShowKey,
  onSaved,
}: {
  provider: ProviderConfig;
  editing: boolean;
  onEdit: () => void;
  onValidate: () => void;
  showKey: boolean;
  onToggleShowKey: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(provider.displayName);
  const [apiKey, setApiKey] = useState('');
  const [configJson, setConfigJson] = useState(provider.configJson || '{}');
  const [saving, setSaving] = useState(false);

  const isActive = provider.status === 'ACTIVE';

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        provider: provider.provider,
        displayName,
        status: provider.status,
        configJson,
      };
      if (apiKey) body.apiKey = apiKey;

      const res = await fetchApi('/api/superadmin/ai-platform/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`${provider.provider} updated`);
        setApiKey('');
        onEdit();
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'flex items-center justify-center size-10 rounded-lg shrink-0',
              isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800',
            )}>
              {provider.provider === 'VAPI' ? <Cloud className={cn('size-5', isActive ? 'text-emerald-600' : 'text-slate-500')} /> :
               provider.provider === 'TWILIO' ? <Phone className={cn('size-5', isActive ? 'text-emerald-600' : 'text-slate-500')} /> :
               <Key className={cn('size-5', isActive ? 'text-emerald-600' : 'text-slate-500')} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{provider.displayName}</p>
                <Badge variant="secondary" className="font-mono text-xs">{provider.provider}</Badge>
                <Badge variant="secondary" className={cn(
                  isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600',
                )}>
                  {isActive ? '● Active' : provider.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                API Key: {provider.apiKeyMasked || '(not set)'}
              </p>
              {provider.lastValidatedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last validated: {formatDistanceToNow(new Date(provider.lastValidatedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="outline" onClick={onValidate} className="gap-1.5">
              <Zap className="size-3.5" />
              Test Connection
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </div>

        {editing && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${provider.id}`}>Display Name</Label>
              <Input id={`name-${provider.id}`} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`key-${provider.id}`}>API Key {provider.apiKeyMasked && '(leave empty to keep current)'}</Label>
              <div className="flex gap-2">
                <Input
                  id={`key-${provider.id}`}
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider.apiKeyMasked ? '••••••••••' : 'sk-...'}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={onToggleShowKey} type="button">
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`config-${provider.id}`}>Config JSON (e.g. Twilio accountSid, webhook secrets)</Label>
              <Input
                id={`config-${provider.id}`}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                placeholder='{"accountSid":"ACxxx","webhookSecret":"..."}'
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 3. Kill Switch ─────────────────────────────────────────────────────────

function KillSwitchSubTab() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState('');
  const [toggling, setToggling] = useState(false);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/superadmin/ai-platform/kill-switch');
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
      }
    } catch {
      toast.error('Failed to load kill switch state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetchApi('/api/superadmin/ai-platform/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled, reason: reason || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        toast.success(data.enabled ? 'AI Platform enabled' : 'AI Platform disabled — new calls rejected');
        setReason('');
      } else {
        toast.error('Failed to toggle kill switch');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Global Kill Switch</h3>
        <p className="text-sm text-muted-foreground">
          When disabled, ALL AI Receptionist calls are rejected at the admission layer.
          Existing in-progress calls complete normally. New calls go to fallback routing.
        </p>
      </div>

      <Card className={cn(
        'border-2',
        enabled ? 'border-emerald-200 dark:border-emerald-900' : 'border-red-200 dark:border-red-900',
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex items-center justify-center size-12 rounded-xl',
                enabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30',
              )}>
                {enabled ? (
                  <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldOff className="size-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="font-semibold">
                  {enabled ? 'AI Platform is ENABLED' : 'AI Platform is DISABLED'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {enabled
                    ? 'All AI Receptionist calls are being processed normally.'
                    : 'All new AI calls are rejected. Tenants fall back to voicemail/human routing.'}
                </p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={toggling}
              className="scale-125"
            />
          </div>
        </CardContent>
      </Card>

      {!enabled && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 text-xs">
              <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-400">
                The AI platform is currently disabled. All tenants are affected.
                Enable to resume normal AI call processing.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disable-reason">Reason (optional, for audit log)</Label>
              <Input
                id="disable-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Vapi outage, billing issue, security incident"
              />
            </div>
            <Button onClick={handleToggle} disabled={toggling} className="gap-2">
              {toggling ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Re-enable AI Platform
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── 4. Calls (platform-wide) ───────────────────────────────────────────────

function CallsSubTab() {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}&take=50` : '?take=50';
      const res = await fetchApi(`/api/superadmin/ai-platform/calls${params}`);
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
      }
    } catch {
      toast.error('Failed to load calls');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Platform-wide Calls</h3>
          <p className="text-sm text-muted-foreground">All AI calls across all tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ringing">Ringing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchCalls} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <PhoneCall className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No calls found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {calls.map((call) => (
            <PlatformCallRow key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformCallRow({ call }: { call: CallRecord }) {
  const outcomeColors: Record<string, string> = {
    booked: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    lead_created: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    transferred: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    info_only: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    missed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    spam: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const date = call.startedAt ? new Date(call.startedAt) : new Date(call.createdAt);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30">
      <div className="shrink-0">
        {call.status === 'failed' ? (
          <AlertCircle className="size-4 text-red-500" />
        ) : call.status === 'ended' ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <Loader2 className="size-4 text-blue-500 animate-spin" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium font-mono">{call.fromNumber || 'Unknown'}</p>
          <ArrowRight className="size-3 text-muted-foreground" />
          <p className="text-sm font-mono">{call.toNumber || '—'}</p>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {call.summary || call.status} · {format(date, 'MMM d, h:mm a')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {call.durationSec > 0 && (
          <span className="text-xs text-muted-foreground">{Math.floor(call.durationSec / 60)}m {call.durationSec % 60}s</span>
        )}
        <span className="text-xs text-muted-foreground">${call.costUsd.toFixed(3)}</span>
        {call.outcomeType && (
          <Badge variant="secondary" className={outcomeColors[call.outcomeType] || ''}>
            {call.outcomeType}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── 5. Reconciliation ───────────────────────────────────────────────────────

function ReconciliationSubTab() {
  const [loading, setLoading] = useState(true);
  const [phones, setPhones] = useState<PhoneNumberRecord[]>([]);
  const [repairing, setRepairing] = useState<string | null>(null);

  const fetchPhones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/superadmin/ai-platform/reconcile');
      if (res.ok) {
        const data = await res.json();
        setPhones(data.phoneNumbers || []);
      }
    } catch {
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhones(); }, [fetchPhones]);

  const handleRepair = async (phoneId: string, action: 'reimport_vapi' | 'create_db_record' | 'suspend') => {
    setRepairing(phoneId);
    try {
      const res = await fetchApi('/api/superadmin/ai-platform/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId: phoneId, action }),
      });
      if (res.ok) {
        toast.success(`Repair action '${action}' completed`);
        fetchPhones();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Repair failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRepairing(null);
    }
  };

  // Count health categories
  const healthy = phones.filter(p => p.status === 'active' && p.providerSid && p.vapiNumberId).length;
  const vapiMissing = phones.filter(p => p.status === 'active' && p.providerSid && !p.vapiNumberId).length;
  const twilioMissing = phones.filter(p => p.status === 'active' && !p.providerSid).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Phone Number Reconciliation</h3>
          <p className="text-sm text-muted-foreground">Verify Twilio ↔ Vapi ↔ Fieseros consistency</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPhones} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Healthy" value={String(healthy)} accent="emerald" />
        <StatCard icon={AlertTriangle} label="Vapi Missing" value={String(vapiMissing)} accent="amber" />
        <StatCard icon={AlertCircle} label="Twilio Missing" value={String(twilioMissing)} accent="red" />
        <StatCard icon={Phone} label="Total Numbers" value={String(phones.length)} accent="blue" />
      </div>

      {/* Phone list */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : phones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Phone className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No phone numbers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {phones.map((phone) => (
            <ReconcileRow
              key={phone.id}
              phone={phone}
              repairing={repairing === phone.id}
              onRepair={(action) => handleRepair(phone.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReconcileRow({
  phone,
  repairing,
  onRepair,
}: {
  phone: PhoneNumberRecord;
  repairing: boolean;
  onRepair: (action: 'reimport_vapi' | 'create_db_record' | 'suspend') => void;
}) {
  const hasTwilio = !!phone.providerSid;
  const hasVapi = !!phone.vapiNumberId;
  const isActive = phone.status === 'active';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className="shrink-0">
        {isActive && hasTwilio && hasVapi ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <AlertTriangle className="size-4 text-amber-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium font-mono">{phone.number}</p>
          <Badge variant="secondary" className="text-xs">{phone.status}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs">
          <span className={hasTwilio ? 'text-emerald-600' : 'text-red-500'}>
            Twilio: {hasTwilio ? '✓' : '✕'}
          </span>
          <span className={hasVapi ? 'text-emerald-600' : 'text-red-500'}>
            Vapi: {hasVapi ? '✓' : '✕'}
          </span>
          <span className="text-muted-foreground">
            Fieseros: ✓
          </span>
        </div>
      </div>
      <div className="shrink-0">
        {repairing ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : !isActive ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : !hasVapi ? (
          <Button size="sm" variant="outline" onClick={() => onRepair('reimport_vapi')} className="gap-1.5">
            <RotateCcw className="size-3" />
            Re-import Vapi
          </Button>
        ) : !hasTwilio ? (
          <Button size="sm" variant="outline" onClick={() => onRepair('suspend')} className="gap-1.5 text-amber-600">
            <Ban className="size-3" />
            Suspend
          </Button>
        ) : (
          <span className="text-xs text-emerald-600 font-medium">Healthy</span>
        )}
      </div>
    </div>
  );
}

// ─── 6. Health ───────────────────────────────────────────────────────────────

function HealthSubTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    killSwitch: { enabled: boolean } | null;
    providers: ProviderConfig[] | null;
    callsToday: number | null;
  }>({ killSwitch: null, providers: null, callsToday: null });

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const [ksRes, provRes] = await Promise.all([
        fetchApi('/api/superadmin/ai-platform/kill-switch'),
        fetchApi('/api/superadmin/ai-platform/providers'),
      ]);
      const ks = ksRes.ok ? await ksRes.json() : null;
      const prov = provRes.ok ? await provRes.json() : null;
      setData({
        killSwitch: ks,
        providers: prov?.providers || [],
        callsToday: null,
      });
    } catch {
      toast.error('Failed to load health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  const vapiConfig = data.providers?.find((p) => p.provider === 'VAPI');
  const twilioConfig = data.providers?.find((p) => p.provider === 'TWILIO');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">System Health</h3>
        <Button variant="outline" size="sm" onClick={fetchHealth} className="gap-1.5">
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        <HealthRow
          label="Kill Switch"
          status={data.killSwitch?.enabled ? 'healthy' : 'error'}
          detail={data.killSwitch?.enabled ? 'AI Platform enabled' : 'AI Platform DISABLED'}
        />
        <HealthRow
          label="Vapi Provider"
          status={vapiConfig?.status === 'ACTIVE' ? 'healthy' : 'error'}
          detail={vapiConfig ? `${vapiConfig.displayName} — ${vapiConfig.status}` : 'Not configured'}
        />
        <HealthRow
          label="Twilio Provider"
          status={twilioConfig?.status === 'ACTIVE' ? 'healthy' : 'error'}
          detail={twilioConfig ? `${twilioConfig.displayName} — ${twilioConfig.status}` : 'Not configured'}
        />
      </div>
    </div>
  );
}

function HealthRow({ label, status, detail }: { label: string; status: 'healthy' | 'error' | 'warning'; detail: string }) {
  const config = {
    healthy: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    error: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  };
  const c = config[status];
  const Icon = c.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className={cn('flex items-center justify-center size-8 rounded-lg shrink-0', c.bg)}>
        <Icon className={cn('size-4', c.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: 'emerald' | 'blue' | 'amber' | 'violet' | 'red';
}) {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    violet: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
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
      </CardContent>
    </Card>
  );
}

// ─── Auth-fetch wrapper ──────────────────────────────────────────────────────

async function fetchApi(url: string, options?: RequestInit): Promise<Response> {
  // The Superadmin pages use the same auth cookie as the rest of the app.
  // No special headers needed — the cookie is sent automatically.
  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
    },
  });
}

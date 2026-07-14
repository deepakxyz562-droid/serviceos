'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Abuse Detection — rate-limit violations, suspicious usage, and abusive
// workspaces. Stripe Fraud + Datadog anomaly-detection aesthetics.
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useSyncExternalStore } from 'react';
import {
  ShieldAlert,
  Gauge,
  Flag,
  Ban,
  Search,
  Zap,
  Bot,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

import {
  KpiCard,
  SectionHeader,
  DemoDataPill,
  getPlanBadgeClasses,
  timeAgo,
} from '@/components/views/superadmin/_shared';
import type { KpiColor } from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface AbuseKpi {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: number;
  color: KpiColor;
  sub: string;
}

const ABUSE_KPIS: AbuseKpi[] = [
  { label: 'Rate Limit Violations (24h)', value: '348', icon: Gauge, trend: 24, color: 'red', sub: 'across all APIs' },
  { label: 'Flagged Workspaces', value: '7', icon: Flag, trend: 2, color: 'amber', sub: 'under review' },
  { label: 'Auto-suspended', value: '2', icon: Ban, trend: 1, color: 'violet', sub: 'last 24h' },
];

type RiskLevel = 'high' | 'medium' | 'low';

interface FlaggedWorkspace {
  name: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  violations: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: 'flagged' | 'suspended' | 'under-review';
}

const FLAGGED_WORKSPACES: FlaggedWorkspace[] = [
  { name: 'ClearWell Cleaning', plan: 'starter', violations: 38, riskScore: 92, riskLevel: 'high', status: 'flagged' },
  { name: 'ShadySEO Co', plan: 'growth', violations: 27, riskScore: 78, riskLevel: 'high', status: 'under-review' },
  { name: 'BargainDeals 99', plan: 'starter', violations: 14, riskScore: 61, riskLevel: 'medium', status: 'flagged' },
  { name: 'TestCorp Sandbox', plan: 'pro', violations: 9, riskScore: 42, riskLevel: 'medium', status: 'under-review' },
  { name: 'PixelPushers Ltd', plan: 'enterprise', violations: 3, riskScore: 21, riskLevel: 'low', status: 'flagged' },
];

interface DetectionRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const INITIAL_RULES: DetectionRule[] = [
  {
    id: 'failed-logins',
    label: 'Auto-suspend on >100 failed logins/hr',
    description: 'Suspicious credential-stuffing protection.',
    enabled: true,
  },
  {
    id: 'api-quota',
    label: 'Flag workspace exceeding API quota by 200%',
    description: 'Detects runaway scripts and abuse.',
    enabled: true,
  },
  {
    id: 'invalid-2fa',
    label: 'Block IP after 5 invalid 2FA attempts',
    description: 'Brute-force protection for second factor.',
    enabled: true,
  },
  {
    id: 'message-volume',
    label: 'Alert on abnormal message volume (>10K/hr)',
    description: 'Catches spam campaigns and bulk abuse.',
    enabled: false,
  },
];

interface AutoAction {
  id: string;
  description: string;
  workspace: string;
  minsAgo: number;
  severity: 'red' | 'amber';
}

const AUTO_ACTIONS: AutoAction[] = [
  { id: '1', description: 'Auto-suspended ClearWell Cleaning (API abuse)', workspace: 'ClearWell Cleaning', minsAgo: 4, severity: 'red' },
  { id: '2', description: 'Blocked IP 185.234.x.x (brute force)', workspace: 'AquaFlow Plumbing', minsAgo: 11, severity: 'red' },
  { id: '3', description: 'Flagged ShadySEO Co (quota breach +200%)', workspace: 'ShadySEO Co', minsAgo: 23, severity: 'amber' },
  { id: '4', description: 'Throttled API for BargainDeals 99 (rate limit)', workspace: 'BargainDeals 99', minsAgo: 47, severity: 'amber' },
  { id: '5', description: 'Auto-suspended TestCorp Sandbox (failed logins)', workspace: 'TestCorp Sandbox', minsAgo: 73, severity: 'red' },
  { id: '6', description: 'Blocked IP 94.232.46.214 (webhook abuse)', workspace: 'VoltEdge Electric', minsAgo: 142, severity: 'amber' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoMinutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
}

function riskBadgeClasses(level: RiskLevel): string {
  switch (level) {
    case 'high':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'low':
    default:
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
  }
}

function riskProgressClass(level: RiskLevel): string {
  switch (level) {
    case 'high':
      return '[&_[data-slot=progress-indicator]]:bg-red-500';
    case 'medium':
      return '[&_[data-slot=progress-indicator]]:bg-amber-500';
    case 'low':
    default:
      return '[&_[data-slot=progress-indicator]]:bg-sky-500';
  }
}

function severityIcon(sev: AutoAction['severity']): LucideIcon {
  return sev === 'red' ? Ban : Flag;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AbuseDetectionSection() {
  const [rules, setRules] = useState<DetectionRule[]>(INITIAL_RULES);
  const mounted = useIsClient();

  const toggleRule = (id: string, next: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: next } : r)));
    const rule = rules.find((r) => r.id === id);
    toast.success(`Rule “${rule?.label ?? id}” ${next ? 'enabled' : 'disabled'}`);
  };

  const handleReview = (name: string) => {
    toast.success(`Opening review panel for ${name}`);
  };

  const handleSuspend = (name: string) => {
    toast.success(`Workspace “${name}” suspended`);
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Abuse Detection"
        description="Detect rate-limit violations, suspicious usage patterns, and abusive workspaces."
        icon={ShieldAlert}
        actions={<DemoDataPill />}
      />

      {/* ─── Row 1 — KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ABUSE_KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            trend={k.trend}
            color={k.color}
            sub={k.sub}
          />
        ))}
      </div>

      {/* ─── Row 2 — Flagged Workspaces table ────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Flagged Workspaces</CardTitle>
          <CardDescription>Workspaces currently flagged by detection rules.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead className="hidden sm:table-cell">Plan</TableHead>
                  <TableHead className="hidden md:table-cell">Violations</TableHead>
                  <TableHead className="min-w-[160px]">Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FLAGGED_WORKSPACES.map((w) => (
                  <TableRow key={w.name}>
                    <TableCell className="font-medium text-foreground">{w.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] capitalize', getPlanBadgeClasses(w.plan))}
                      >
                        {w.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">
                      {w.violations}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Progress
                          value={w.riskScore}
                          className={cn('h-1.5', riskProgressClass(w.riskLevel))}
                        />
                        <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                          {w.riskScore}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] capitalize', riskBadgeClasses(w.riskLevel))}
                        >
                          {w.riskLevel}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] capitalize',
                          w.status === 'suspended'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                            : w.status === 'flagged'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
                        )}
                      >
                        {w.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => handleReview(w.name)}
                        >
                          <Search className="size-3.5 mr-1" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => handleSuspend(w.name)}
                        >
                          <Ban className="size-3.5 mr-1" />
                          Suspend
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Row 3 — Detection Rules (50) + Recent Auto-Actions (50) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Rules */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Detection Rules</CardTitle>
                <CardDescription>Automated abuse-detection policies.</CardDescription>
              </div>
              <Zap className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{rule.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{rule.description}</p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(v) => toggleRule(rule.id, v)}
                  aria-label={rule.label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Auto-Actions */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Recent Auto-Actions</CardTitle>
                <CardDescription>Actions taken automatically by detection rules.</CardDescription>
              </div>
              <Activity className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="max-h-80 overflow-y-auto pr-1 space-y-2
                            [scrollbar-width:thin] [scrollbar-color:var(--muted-foreground)_transparent]
                            [&::-webkit-scrollbar]:w-1.5
                            [&::-webkit-scrollbar-thumb]:rounded-full
                            [&::-webkit-scrollbar-thumb]:bg-[var(--muted-foreground)]">
              {AUTO_ACTIONS.map((a) => {
                const Icon = severityIcon(a.severity);
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <span
                      className={cn(
                        'mt-1 size-2 rounded-full shrink-0',
                        a.severity === 'red' ? 'bg-red-500' : 'bg-amber-500',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            'size-3.5 shrink-0',
                            a.severity === 'red' ? 'text-red-500' : 'text-amber-500',
                          )}
                        />
                        <p className="text-sm text-foreground">{a.description}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Bot className="size-3 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground truncate">
                          {a.workspace}
                        </p>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {mounted ? timeAgo(isoMinutesAgo(a.minsAgo)) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

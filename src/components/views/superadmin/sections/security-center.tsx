'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Security Center — failed logins, IP blocking, sessions, API keys, webhook
// logs, GDPR/SOC2 compliance. Datadog + Stripe security dashboard aesthetics.
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Ban,
  Monitor,
  Key,
  Plus,
  Unlock,
  Webhook,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  FileCheck2,
  HeartPulse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  KpiCard,
  SectionHeader,
  DemoDataPill,
  getStatusBadgeClasses,
  timeAgo,
} from '@/components/views/superadmin/_shared';
import type { KpiColor } from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface SecurityKpi {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: number;
  color: KpiColor;
  sub: string;
}

const SECURITY_KPIS: SecurityKpi[] = [
  { label: 'Failed Logins (24h)', value: '142', icon: AlertTriangle, trend: 18, color: 'red', sub: 'vs yesterday' },
  { label: 'Blocked IPs', value: '23', icon: Ban, trend: 5, color: 'amber', sub: 'active rules' },
  { label: 'Active Sessions', value: '543', icon: Monitor, trend: 12, color: 'sky', sub: 'across all tenants' },
  { label: 'API Keys Issued', value: '87', icon: Key, trend: 3, color: 'emerald', sub: 'last 30 days' },
];

interface FailedLogin {
  email: string;
  ip: string;
  reason: string;
  minsAgo: number;
  status: 'blocked' | 'throttled' | 'allowed';
}

const FAILED_LOGINS: FailedLogin[] = [
  { email: 'admin@unknown.io', ip: '185.234.12.7', reason: 'Invalid password (×6)', minsAgo: 2, status: 'blocked' },
  { email: 'root@aquaflow.io', ip: '45.146.165.37', reason: 'Unknown device', minsAgo: 6, status: 'throttled' },
  { email: 'test@bloom.beauty', ip: '193.27.228.184', reason: 'Invalid 2FA code', minsAgo: 12, status: 'allowed' },
  { email: 'user@apexhvac.com', ip: '102.165.32.21', reason: 'Invalid password (×3)', minsAgo: 19, status: 'throttled' },
  { email: 'admin@xyz.shop', ip: '212.193.30.254', reason: 'Account does not exist', minsAgo: 27, status: 'allowed' },
  { email: 'ops@clearwell.co', ip: '94.232.46.214', reason: 'Invalid password (×9)', minsAgo: 41, status: 'blocked' },
];

interface BlockedIp {
  ip: string;
  reason: string;
  blockedMinsAgo: number;
}

const BLOCKED_IPS: BlockedIp[] = [
  { ip: '185.234.12.7', reason: 'Brute force', blockedMinsAgo: 8 },
  { ip: '94.232.46.214', reason: 'Brute force', blockedMinsAgo: 41 },
  { ip: '45.146.165.37', reason: 'Credential stuffing', blockedMinsAgo: 73 },
  { ip: '212.193.30.254', reason: 'Port scanning', blockedMinsAgo: 142 },
  { ip: '102.165.32.21', reason: 'Webhook abuse', blockedMinsAgo: 320 },
];

interface ApiKey {
  label: string;
  workspace: string;
  scopes: string;
  minsAgo: number;
  status: 'active' | 'expired' | 'revoked';
}

const API_KEYS: ApiKey[] = [
  { label: 'Production API', workspace: 'AquaFlow Plumbing', scopes: 'jobs, invoices, users', minsAgo: 4, status: 'active' },
  { label: 'Mobile App', workspace: 'Bloom Beauty', scopes: 'jobs, clients', minsAgo: 18, status: 'active' },
  { label: 'Zapier Bridge', workspace: 'Apex HVAC', scopes: 'jobs:read', minsAgo: 92, status: 'active' },
  { label: 'Legacy Sync', workspace: 'ClearWell Cleaning', scopes: 'clients, invoices', minsAgo: 1440, status: 'expired' },
  { label: 'Data Export', workspace: 'VoltEdge Electric', scopes: 'jobs:read, clients:read', minsAgo: 2880, status: 'revoked' },
];

interface WebhookLog {
  endpoint: string;
  status: number;
  minsAgo: number;
}

const WEBHOOK_LOGS: WebhookLog[] = [
  { endpoint: 'https://hooks.aquaflow.io/jobs/created', status: 200, minsAgo: 3 },
  { endpoint: 'https://api.bloom.beauty/webhooks/invoices', status: 200, minsAgo: 9 },
  { endpoint: 'https://crm.apexhvac.com/wh/jobs', status: 500, minsAgo: 17 },
  { endpoint: 'https://intake.clearwell.co/hooks/clients', status: 422, minsAgo: 24 },
  { endpoint: 'https://erp.voltedge.io/api/wh/payments', status: 200, minsAgo: 38 },
  { endpoint: 'https://notify.bloom.beauty/events', status: 503, minsAgo: 52 },
];

interface ComplianceItem {
  standard: string;
  note: string;
  status: 'compliant' | 'action' | 'not-started';
  icon: LucideIcon;
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { standard: 'GDPR', note: 'EU data protection regulation', status: 'compliant', icon: ShieldCheck },
  { standard: 'SOC 2 Type II', note: 'Audit: Nov 2024', status: 'compliant', icon: FileCheck2 },
  { standard: 'HIPAA', note: 'BAA required', status: 'action', icon: HeartPulse },
  { standard: 'ISO 27001', note: 'ISMS not initiated', status: 'not-started', icon: CircleDashed },
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

function webhookBadgeClasses(status: number): string {
  if (status >= 200 && status < 300) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (status >= 400 && status < 500) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
}

function complianceStatusMeta(status: ComplianceItem['status']): {
  label: string;
  badgeClass: string;
  icon: LucideIcon;
  iconClass: string;
} {
  switch (status) {
    case 'compliant':
      return {
        label: 'Compliant',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        icon: CheckCircle2,
        iconClass: 'text-emerald-500',
      };
    case 'action':
      return {
        label: 'Action needed',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: AlertCircle,
        iconClass: 'text-amber-500',
      };
    case 'not-started':
    default:
      return {
        label: 'Not started',
        badgeClass: 'bg-muted text-muted-foreground border-border',
        icon: CircleDashed,
        iconClass: 'text-muted-foreground',
      };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SecurityCenterSection() {
  const mounted = useIsClient();

  const handleUnblockIp = (ip: string) => {
    toast.success(`IP ${ip} unblocked`);
  };

  const handleAddBlock = () => {
    toast.success('Open the “Add IP block” dialog');
  };

  const handleRevokeKey = (label: string) => {
    toast.success(`API key “${label}” revoked`);
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Security Center"
        description="Failed logins, IP blocking, sessions, API keys, webhook logs, GDPR/SOC2 compliance."
        icon={ShieldCheck}
        actions={<DemoDataPill />}
      />

      {/* ─── Row 1 — KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SECURITY_KPIS.map((k) => (
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

      {/* ─── Row 2 — Failed logins (60) + Blocked IPs (40) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Failed Login Attempts */}
        <Card className="card-shadow lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Failed Login Attempts</CardTitle>
            <CardDescription>Last 24 hours across all workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                    <TableHead className="hidden lg:table-cell">Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FAILED_LOGINS.map((row) => (
                    <TableRow key={`${row.email}-${row.minsAgo}`}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {mounted ? timeAgo(isoMinutesAgo(row.minsAgo)) : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-foreground truncate max-w-[160px]">
                        {row.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {row.ip}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {row.reason}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] capitalize', getStatusBadgeClasses(row.status))}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Blocked IPs */}
        <Card className="card-shadow lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Blocked IPs</CardTitle>
                <CardDescription>Currently blocked by security rules.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddBlock}>
                <Plus className="size-3.5 mr-1" />
                Add Block
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-2">
            {BLOCKED_IPS.map((b) => (
              <div
                key={b.ip}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-foreground truncate">{b.ip}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {b.reason} · {mounted ? timeAgo(isoMinutesAgo(b.blockedMinsAgo)) : '—'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => handleUnblockIp(b.ip)}
                >
                  <Unlock className="size-3.5 mr-1" />
                  Unblock
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ─── Row 3 — API Keys (50) + Webhook Logs (50) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">API Keys</CardTitle>
            <CardDescription>Issued credentials across all workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="hidden md:table-cell">Workspace</TableHead>
                    <TableHead className="hidden lg:table-cell">Scopes</TableHead>
                    <TableHead className="hidden sm:table-cell">Last used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {API_KEYS.map((k) => (
                    <TableRow key={k.label}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Key className="size-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground text-sm">{k.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[120px]">
                        {k.workspace}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                        {k.scopes}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {mounted ? timeAgo(isoMinutesAgo(k.minsAgo)) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] capitalize', getStatusBadgeClasses(k.status))}
                          >
                            {k.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleRevokeKey(k.label)}
                          >
                            Revoke
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

        {/* Webhook Logs */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Webhook Logs</CardTitle>
                <CardDescription>Recent outbound webhook deliveries.</CardDescription>
              </div>
              <Webhook className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="max-h-72 overflow-y-auto pr-1 space-y-2
                            [scrollbar-width:thin] [scrollbar-color:var(--muted-foreground)_transparent]
                            [&::-webkit-scrollbar]:w-1.5
                            [&::-webkit-scrollbar-thumb]:rounded-full
                            [&::-webkit-scrollbar-thumb]:bg-[var(--muted-foreground)]">
              {WEBHOOK_LOGS.map((w, idx) => (
                <div
                  key={`${w.endpoint}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-foreground truncate">{w.endpoint}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {mounted ? timeAgo(isoMinutesAgo(w.minsAgo)) : '—'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-mono shrink-0', webhookBadgeClasses(w.status))}
                  >
                    {w.status} {w.status >= 200 && w.status < 300 ? 'OK' : w.status >= 500 ? 'ERR' : 'WARN'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Row 4 — Compliance Status ───────────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compliance Status</CardTitle>
          <CardDescription>Certifications and regulatory frameworks tracked by the platform.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMPLIANCE_ITEMS.map((item) => {
              const Icon = item.icon;
              const meta = complianceStatusMeta(item.status);
              const StatusIcon = meta.icon;
              return (
                <div
                  key={item.standard}
                  className="rounded-lg border border-border p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="size-4" />
                    </div>
                    <StatusIcon className={cn('size-5', meta.iconClass)} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.standard}</p>
                  <Badge variant="outline" className={cn('text-[10px] w-fit', meta.badgeClass)}>
                    {meta.label}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.note}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

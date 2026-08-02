'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Email Services — wrapper section around the existing ProvidersTab, scoped to
// the email channel (AWS SES, SendGrid, Mailgun, SMTP). Single named export
// `EmailServicesSection`, no props.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Mail, Send, CheckCircle2, AlertTriangle, ChevronRight, Settings2,
} from 'lucide-react';
import {
  SectionHeader, KpiCard, DemoDataPill, getStatusBadgeClasses, timeAgo,
} from '@/components/views/superadmin/_shared';
import { ProvidersTab } from '@/components/views/superadmin-providers-tab';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailProviderRow {
  id: string;
  name: string;
  config: string;
  sent24h: number;
  deliveryRate: number;
  status: 'active' | 'degraded' | 'failed';
}

interface EmailDeliveryStat {
  label: string;
  value: string;
}

interface EmailErrorEvent {
  id: string;
  provider: string;
  message: string;
  occurredAt: string;
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const EMAIL_KPIS = [
  { label: 'Sent (24h)', value: '12,847', trend: 14, color: 'emerald' as const, icon: Send },
  { label: 'Delivery Rate', value: '98.4%', trend: 0.2, color: 'sky' as const, icon: CheckCircle2 },
  { label: 'Bounce Rate', value: '1.2%', trend: -0.3, color: 'amber' as const, icon: AlertTriangle, sub: 'lower is better' },
];

const EMAIL_PROVIDERS: EmailProviderRow[] = [
  { id: 'ses', name: 'AWS SES', config: 'ses-smtp.us-east-1', sent24h: 8432, deliveryRate: 98.6, status: 'active' },
  { id: 'sendgrid', name: 'SendGrid', config: 'sendgrid.api', sent24h: 2841, deliveryRate: 97.9, status: 'active' },
  { id: 'mailgun', name: 'Mailgun', config: 'mailgun.eu', sent24h: 1234, deliveryRate: 99.1, status: 'active' },
  { id: 'smtp', name: 'SMTP (Custom)', config: 'smtp.custom.com', sent24h: 340, deliveryRate: 95.4, status: 'degraded' },
];

const EMAIL_DELIVERY_STATS: EmailDeliveryStat[] = [
  { label: 'Delivered', value: '12,641' },
  { label: 'Bounced', value: '154' },
  { label: 'Rejected', value: '23' },
  { label: 'Complained', value: '8' },
];

const EMAIL_ERRORS: EmailErrorEvent[] = [
  { id: 'e1', provider: 'SMTP (Custom)', message: 'Connection timed out to smtp.custom.com:587 — retrying via failover', occurredAt: new Date(Date.now() - 6 * 60 * 1000).toISOString() },
  { id: 'e2', provider: 'AWS SES', message: 'Throttling: Daily sending quota at 92% — consider requesting limit increase', occurredAt: new Date(Date.now() - 38 * 60 * 1000).toISOString() },
  { id: 'e3', provider: 'SendGrid', message: 'Bounce: recipient address does not exist (550 5.1.1 user unknown)', occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'e4', provider: 'Mailgun', message: 'Spam complaint registered by recipient — suppress future sends', occurredAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 'e5', provider: 'AWS SES', message: 'Rendering failure: template variable {{order_id}} missing in payload', occurredAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function EmailServicesSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Email Services"
        description="AWS SES, SendGrid, Mailgun, SMTP — provider connections, quotas, delivery, errors."
        icon={Mail}
        actions={<DemoDataPill />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EMAIL_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            trend={kpi.trend}
            color={kpi.color}
            sub={kpi.sub}
          />
        ))}
      </div>

      {/* Connected providers */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connected Providers</CardTitle>
          <CardDescription>
            Email gateways currently configured for transactional &amp; marketing sends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead className="text-right">Sent (24h)</TableHead>
                  <TableHead className="w-40">Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EMAIL_PROVIDERS.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.config}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.sent24h.toLocaleString('en-US')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.deliveryRate} className="h-1.5" />
                        <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                          {p.deliveryRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize', getStatusBadgeClasses(p.status))}>
                        {p.status === 'active' ? 'Active' : 'Degraded'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                        <Settings2 className="size-3.5" />
                        Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Usage & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Delivery Stats</CardTitle>
            <CardDescription>Aggregate email outcomes over the last 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {EMAIL_DELIVERY_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border bg-muted/30 p-4"
                >
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Errors</CardTitle>
            <CardDescription>Latest delivery failures and provider warnings.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-64 overflow-y-auto space-y-3 pr-1
                            [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]">
              {EMAIL_ERRORS.map((err) => (
                <li key={err.id} className="flex items-start gap-3">
                  <span className="mt-1.5 size-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{err.provider}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {timeAgo(err.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {err.message}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Full provider configuration (collapsible) */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary">
              <ChevronRight className="size-4 group-open:rotate-90 transition-transform" />
              Open full email provider configuration
            </summary>
            <div className="mt-4">
              <ProvidersTab />
            </div>
          </details>
        </CardContent>
      </Card>
    </section>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SMS Services — wrapper section around the existing ProvidersTab, scoped to
// the SMS channel (AWS SNS, Twilio, Vonage, Plivo). Single named export
// `SMSServicesSection`, no props.
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
  MessageSquare, Send, CheckCircle2, DollarSign, ChevronRight, Settings2,
} from 'lucide-react';
import {
  SectionHeader, KpiCard, DemoDataPill, getStatusBadgeClasses,
} from '@/components/views/superadmin/_shared';
import { ProvidersTab } from '@/components/views/superadmin-providers-tab';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmsProviderRow {
  id: string;
  name: string;
  fromNumber: string;
  sent24h: number;
  deliveryRate: number;
  status: 'active' | 'degraded' | 'failed';
}

interface SmsCountryStat {
  country: string;
  sent: number;
  deliveryRate: number;
}

interface SmsCostBreakdown {
  id: string;
  provider: string;
  cost: number;
  share: number; // 0-100
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const SMS_KPIS = [
  { label: 'Sent (24h)', value: '3,247', trend: 8, color: 'emerald' as const, icon: Send },
  { label: 'Delivery Rate', value: '96.8%', trend: 0.4, color: 'sky' as const, icon: CheckCircle2 },
  { label: 'Cost (24h)', value: '$84.20', trend: 12, color: 'amber' as const, icon: DollarSign },
];

const SMS_PROVIDERS: SmsProviderRow[] = [
  { id: 'sns', name: 'AWS SNS', fromNumber: '+1XXX-XXX-1234', sent24h: 2184, deliveryRate: 97.2, status: 'active' },
  { id: 'twilio', name: 'Twilio', fromNumber: '+1XXX-XXX-5678', sent24h: 834, deliveryRate: 96.4, status: 'active' },
  { id: 'vonage', name: 'Vonage', fromNumber: '+44-XXX-XXX-8723', sent24h: 184, deliveryRate: 98.1, status: 'active' },
  { id: 'plivo', name: 'Plivo', fromNumber: '+91-XXX-XXX-4521', sent24h: 45, deliveryRate: 94.2, status: 'degraded' },
];

const SMS_COUNTRY_STATS: SmsCountryStat[] = [
  { country: 'United States', sent: 1847, deliveryRate: 97.4 },
  { country: 'United Kingdom', sent: 542, deliveryRate: 96.9 },
  { country: 'India', sent: 423, deliveryRate: 95.8 },
  { country: 'Canada', sent: 218, deliveryRate: 97.1 },
  { country: 'Australia', sent: 124, deliveryRate: 96.2 },
];

const SMS_COST_BREAKDOWN: SmsCostBreakdown[] = [
  { id: 'sns', provider: 'AWS SNS', cost: 43.68, share: 51.9 },
  { id: 'twilio', provider: 'Twilio', cost: 25.02, share: 29.7 },
  { id: 'vonage', provider: 'Vonage', cost: 11.04, share: 13.1 },
  { id: 'plivo', provider: 'Plivo', cost: 4.46, share: 5.3 },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function SMSServicesSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="SMS Services"
        description="SNS, Twilio, Vonage, Plivo — provider connections, delivery, costs."
        icon={MessageSquare}
        actions={<DemoDataPill />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SMS_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            trend={kpi.trend}
            color={kpi.color}
          />
        ))}
      </div>

      {/* Connected providers */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connected Providers</CardTitle>
          <CardDescription>
            SMS gateways with their registered sender numbers and recent throughput.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>From Number</TableHead>
                  <TableHead className="text-right">Sent (24h)</TableHead>
                  <TableHead className="w-40">Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SMS_PROVIDERS.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.fromNumber}</TableCell>
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
            <CardTitle className="text-base">Delivery by Country</CardTitle>
            <CardDescription>Top sending destinations and delivery rates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="w-32">Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SMS_COUNTRY_STATS.map((c) => (
                    <TableRow key={c.country}>
                      <TableCell className="font-medium text-foreground">{c.country}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.sent.toLocaleString('en-US')}</TableCell>
                      <TableCell>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {c.deliveryRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
            <CardDescription>Spend contribution per provider (24h).</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {SMS_COST_BREAKDOWN.map((c) => (
                <li key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{c.provider}</span>
                    <span className="tabular-nums text-muted-foreground">
                      ${c.cost.toFixed(2)} · {c.share.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={c.share} className="h-1.5" />
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
              Open full SMS provider configuration
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

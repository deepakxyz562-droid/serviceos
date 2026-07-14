'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Push Notifications — wrapper section around the existing ProvidersTab,
// scoped to the push channel (Firebase Cloud Messaging, OneSignal).
// Single named export `PushNotificationsSection`, no props.
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
  Bell, Send, CheckCircle2, Users, ChevronRight, Settings2,
} from 'lucide-react';
import {
  SectionHeader, KpiCard, DemoDataPill, getStatusBadgeClasses, timeAgo,
} from '@/components/views/superadmin/_shared';
import { ProvidersTab } from '@/components/views/superadmin-providers-tab';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PushProviderRow {
  id: string;
  name: string;
  projectApp: string;
  sent24h: number;
  deliveryRate: number;
  subscribers: number;
  status: 'active' | 'degraded' | 'failed';
}

interface PushPlatformStat {
  label: string;
  value: string;
}

interface PushFailureEvent {
  id: string;
  provider: string;
  reason: string;
  occurredAt: string;
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const PUSH_KPIS = [
  { label: 'Sent (24h)', value: '14,847', trend: 24, color: 'emerald' as const, icon: Send },
  { label: 'Delivery Rate', value: '92.4%', trend: -1.2, color: 'amber' as const, icon: CheckCircle2, sub: 'currently degraded' },
  { label: 'Active Subscriptions', value: '24,381', trend: 412, color: 'sky' as const, icon: Users, sub: 'net new this week' },
];

const PUSH_PROVIDERS: PushProviderRow[] = [
  { id: 'fcm', name: 'Firebase Cloud Messaging', projectApp: 'serviceos-prod (fcm)', sent24h: 12184, deliveryRate: 93.1, subscribers: 18432, status: 'active' },
  { id: 'onesignal', name: 'OneSignal', projectApp: 'serviceos-app', sent24h: 2663, deliveryRate: 89.4, subscribers: 5949, status: 'degraded' },
];

const PUSH_PLATFORM_STATS: PushPlatformStat[] = [
  { label: 'Chrome', value: '14,238' },
  { label: 'Safari', value: '6,432' },
  { label: 'Firefox', value: '2,841' },
  { label: 'Edge', value: '871' },
];

const PUSH_FAILURES: PushFailureEvent[] = [
  { id: 'f1', provider: 'OneSignal', reason: 'Token expired — subscriber uninstalled the application', occurredAt: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: 'f2', provider: 'Firebase Cloud Messaging', reason: 'Permission revoked — user disabled notifications in browser settings', occurredAt: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
  { id: 'f3', provider: 'OneSignal', reason: 'Invalid registration token — device factory reset detected', occurredAt: new Date(Date.now() - 47 * 60 * 1000).toISOString() },
  { id: 'f4', provider: 'Firebase Cloud Messaging', reason: 'Message rate exceeded — quota limit hit for topic fan-out', occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'f5', provider: 'OneSignal', reason: 'Unsubscribed — recipient opted out via notification settings', occurredAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function PushNotificationsSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Push Notifications"
        description="Firebase, OneSignal — provider connections, delivery, subscriptions."
        icon={Bell}
        actions={<DemoDataPill />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PUSH_KPIS.map((kpi) => (
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
            Push notification gateways with active subscriber counts and delivery health.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Project / App</TableHead>
                  <TableHead className="text-right">Sent (24h)</TableHead>
                  <TableHead className="w-32">Delivery</TableHead>
                  <TableHead className="text-right">Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PUSH_PROVIDERS.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.projectApp}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.sent24h.toLocaleString('en-US')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.deliveryRate} className="h-1.5" />
                        <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                          {p.deliveryRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.subscribers.toLocaleString('en-US')}</TableCell>
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
            <CardTitle className="text-base">Platform Breakdown</CardTitle>
            <CardDescription>Active subscribers grouped by browser platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {PUSH_PLATFORM_STATS.map((stat) => (
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
            <CardTitle className="text-base">Recent Push Failures</CardTitle>
            <CardDescription>Latest delivery failures and unsubscribe events.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-64 overflow-y-auto space-y-3 pr-1
                            [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]">
              {PUSH_FAILURES.map((fail) => (
                <li key={fail.id} className="flex items-start gap-3">
                  <span className="mt-1.5 size-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{fail.provider}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {timeAgo(fail.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {fail.reason}
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
              Open full push notification provider configuration
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

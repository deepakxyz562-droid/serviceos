'use client';

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Providers — wrapper section around the existing ProvidersTab,
// scoped to the WhatsApp channel (Twilio, Meta Cloud API, 360Dialog).
// Single named export `WhatsAppProvidersSection`, no props.
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
  MessageCircle, Send, CheckCircle2, FileCheck, ChevronRight, Settings2,
} from 'lucide-react';
import {
  SectionHeader, KpiCard, DemoDataPill, getStatusBadgeClasses, timeAgo,
} from '@/components/views/superadmin/_shared';
import { ProvidersTab } from '@/components/views/superadmin-providers-tab';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WhatsAppProviderRow {
  id: string;
  name: string;
  phone: string;
  sent24h: number;
  deliveryRate: number;
  templates: number;
  status: 'active' | 'degraded' | 'failed';
}

interface WhatsAppTemplateStat {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
}

type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

interface WhatsAppConversation {
  id: string;
  workspace: string;
  customerPhone: string;
  preview: string;
  status: WhatsAppMessageStatus;
  occurredAt: string;
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const WHATSAPP_KPIS = [
  { label: 'Sent (24h)', value: '8,432', trend: 18, color: 'emerald' as const, icon: Send },
  { label: 'Delivery Rate', value: '97.2%', trend: 0.3, color: 'sky' as const, icon: CheckCircle2 },
  { label: 'Templates Approved', value: '47', trend: 3, color: 'violet' as const, icon: FileCheck },
];

const WHATSAPP_PROVIDERS: WhatsAppProviderRow[] = [
  { id: 'twilio-wa', name: 'Twilio WhatsApp', phone: '+1XXX-XXX-1234', sent24h: 4184, deliveryRate: 97.4, templates: 18, status: 'active' },
  { id: 'meta', name: 'Meta Cloud API', phone: '+1XXX-XXX-5678', sent24h: 3841, deliveryRate: 97.1, templates: 22, status: 'active' },
  { id: '360dialog', name: '360Dialog', phone: '+49-XXX-XXX-3429', sent24h: 407, deliveryRate: 96.8, templates: 7, status: 'active' },
];

const WHATSAPP_TEMPLATE_STATS: WhatsAppTemplateStat[] = [
  { label: 'Approved', value: '47', tone: 'good' },
  { label: 'Pending', value: '3', tone: 'warn' },
  { label: 'Rejected', value: '2', tone: 'bad' },
  { label: 'Quality Flagged', value: '1', tone: 'neutral' },
];

const WHATSAPP_CONVERSATIONS: WhatsAppConversation[] = [
  { id: 'c1', workspace: 'Acme Plumbing', customerPhone: '+1XXX-XXX-9921', preview: 'Hi! Your appointment is confirmed for Tuesday at 10:00 AM. Reply YES to confirm or call to reschedule.', status: 'read', occurredAt: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  { id: 'c2', workspace: 'Bright Smiles Dental', customerPhone: '+44-XXX-XXX-1182', preview: 'Your cleaning appointment is tomorrow at 2:30 PM. Please arrive 10 minutes early to complete check-in.', status: 'delivered', occurredAt: new Date(Date.now() - 22 * 60 * 1000).toISOString() },
  { id: 'c3', workspace: 'Coastal Realty', customerPhone: '+91-XXX-XXX-4471', preview: 'New listing match found! 3BR/2BA in your saved area, $450K. Tap to view photos and schedule a tour.', status: 'sent', occurredAt: new Date(Date.now() - 51 * 60 * 1000).toISOString() },
  { id: 'c4', workspace: 'FitZone Gym', customerPhone: '+1XXX-XXX-3382', preview: 'Your membership renews in 3 days. Reply RENEW to extend or STOP to cancel. Thank you for being a member!', status: 'failed', occurredAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: 'c5', workspace: 'Sunset Cafe', customerPhone: '+61-XXX-XXX-7740', preview: 'Your order #2841 is ready for pickup! Show this message at the counter. Thank you for your order.', status: 'read', occurredAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
];

const STATUS_BADGE_MAP: Record<WhatsAppMessageStatus, string> = {
  sent: 'bg-muted text-muted-foreground border-border',
  delivered: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  read: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const TEMPLATE_TONE_MAP: Record<WhatsAppTemplateStat['tone'], string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function WhatsAppProvidersSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="WhatsApp Providers"
        description="Twilio, Meta Cloud API, 360Dialog — provider connections, templates, delivery."
        icon={MessageCircle}
        actions={<DemoDataPill />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WHATSAPP_KPIS.map((kpi) => (
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
            WhatsApp Business API providers with template inventory and recent throughput.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Sent (24h)</TableHead>
                  <TableHead className="w-32">Delivery</TableHead>
                  <TableHead className="text-right">Templates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {WHATSAPP_PROVIDERS.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.phone}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.sent24h.toLocaleString('en-US')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.deliveryRate} className="h-1.5" />
                        <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                          {p.deliveryRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.templates}</TableCell>
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
            <CardTitle className="text-base">Template Status</CardTitle>
            <CardDescription>Message template review pipeline across providers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {WHATSAPP_TEMPLATE_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border bg-muted/30 p-4"
                >
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={cn('text-xl font-bold mt-1 tabular-nums', TEMPLATE_TONE_MAP[stat.tone])}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Conversations</CardTitle>
            <CardDescription>Latest outbound WhatsApp messages across workspaces.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-64 overflow-y-auto space-y-3 pr-1
                            [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]">
              {WHATSAPP_CONVERSATIONS.map((conv) => (
                <li key={conv.id} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{conv.workspace}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {timeAgo(conv.occurredAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {conv.customerPhone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {conv.preview}
                    </p>
                    <div className="mt-1.5">
                      <Badge
                        variant="outline"
                        className={cn('capitalize text-[10px]', STATUS_BADGE_MAP[conv.status])}
                      >
                        {conv.status}
                      </Badge>
                    </div>
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
              Open full WhatsApp provider configuration
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

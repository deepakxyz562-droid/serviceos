'use client';

// ─────────────────────────────────────────────────────────────────────────────
// System Health — real-time operational health (Vercel-style status page).
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Activity,
  CheckCircle2,
  Server,
  Database,
  Zap,
  HardDrive,
  Mail,
  MessageSquare,
  Bell,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import {
  HealthTile,
  SectionHeader,
  DemoDataPill,
  formatDate,
} from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface HealthItem {
  label: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  value: string;
  icon: LucideIcon;
}

const HEALTH_TILES: HealthItem[] = [
  { label: 'API', status: 'healthy', value: '12ms p95', icon: Server },
  { label: 'Database', status: 'healthy', value: '3ms', icon: Database },
  { label: 'Redis', status: 'healthy', value: '1ms', icon: Zap },
  { label: 'Storage', status: 'healthy', value: '78%', icon: HardDrive },
  { label: 'Email', status: 'healthy', value: '1.2K/hr', icon: Mail },
  { label: 'SMS', status: 'healthy', value: '834/hr', icon: MessageSquare },
  { label: 'Push', status: 'warning', value: 'Degraded', icon: Bell },
  { label: 'AI', status: 'healthy', value: 'Online', icon: Sparkles },
];

// 24 hourly points (sampled) with realistic latency variation.
const RESPONSE_DATA = [
  { hour: '00', api: 14, db: 3 }, { hour: '01', api: 12, db: 2 }, { hour: '02', api: 10, db: 2 },
  { hour: '03', api: 9, db: 1 },   { hour: '04', api: 11, db: 2 }, { hour: '05', api: 13, db: 3 },
  { hour: '06', api: 16, db: 3 },  { hour: '07', api: 19, db: 4 }, { hour: '08', api: 22, db: 5 },
  { hour: '09', api: 24, db: 5 },  { hour: '10', api: 21, db: 4 }, { hour: '11', api: 18, db: 4 },
  { hour: '12', api: 20, db: 5 },  { hour: '13', api: 17, db: 3 }, { hour: '14', api: 15, db: 3 },
  { hour: '15', api: 16, db: 4 },  { hour: '16', api: 19, db: 4 }, { hour: '17', api: 22, db: 5 },
  { hour: '18', api: 23, db: 6 },  { hour: '19', api: 20, db: 4 }, { hour: '20', api: 17, db: 3 },
  { hour: '21', api: 14, db: 3 },  { hour: '22', api: 11, db: 2 }, { hour: '23', api: 9, db: 2 },
];

interface Incident {
  date: string; // ISO
  severity: 'Critical' | 'Major' | 'Minor';
  title: string;
  durationMins: number;
}

const INCIDENTS: Incident[] = [
  { date: '2025-06-30T14:22:00Z', severity: 'Major', title: 'Elevated API latency in us-east-1', durationMins: 23 },
  { date: '2025-06-21T09:14:00Z', severity: 'Minor', title: 'Redis cache eviction spike', durationMins: 8 },
  { date: '2025-06-12T18:47:00Z', severity: 'Critical', title: 'Database connection pool exhaustion', durationMins: 47 },
  { date: '2025-05-29T03:08:00Z', severity: 'Minor', title: 'Webhook delivery delay (Supabase)', durationMins: 12 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityClasses(s: Incident['severity']): string {
  switch (s) {
    case 'Critical': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'Major': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'Minor': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
  }
}

function durationLabel(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '12px',
  color: 'var(--foreground)',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function SystemHealthSection() {
  const handleSubscribe = () => toast.success('Subscribed to status updates', { description: 'You will be notified of future incidents.' });

  return (
    <section className="space-y-6">
      <SectionHeader
        title="System Health"
        description="Real-time operational health — Vercel-style status page."
        icon={Activity}
        actions={<DemoDataPill />}
      />

      {/* ─── Row 1: Overall status banner ───────────────────────────────── */}
      <Card className="card-shadow bg-emerald-500/5 border-emerald-500/30">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground tracking-tight">All Systems Operational</p>
                <p className="text-xs text-muted-foreground mt-0.5">Last incident: 14 days ago · checking every 30s</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                99.99% uptime · 90d
              </Badge>
              <button
                onClick={handleSubscribe}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Subscribe →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Row 2: 8 HealthTiles ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {HEALTH_TILES.map((t) => (
          <HealthTile
            key={t.label}
            label={t.label}
            status={t.status}
            value={t.value}
            icon={t.icon}
          />
        ))}
      </div>

      {/* ─── Row 3: Response Time LineChart ─────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Response Time</CardTitle>
              <CardDescription>Last 24 hours · API &amp; database latency (ms)</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-sky-500" />
                <span className="text-muted-foreground">API</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Database</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RESPONSE_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false}
                  interval={3} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={36}
                  tickFormatter={(v: number) => `${v}ms`} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [`${value}ms`, name === 'api' ? 'API' : 'Database']} />
                <Line type="monotone" dataKey="api" name="api" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="db" name="db" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ─── Row 4: Incident History timeline ───────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Incident History</CardTitle>
          <CardDescription>Past 90 days · resolved incidents only</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {INCIDENTS.map((inc, i) => (
              <li key={i} className="relative pl-8">
                <span
                  className={cn(
                    'absolute left-0 top-1 size-6 rounded-full flex items-center justify-center border-2 border-background shrink-0',
                    inc.severity === 'Critical' && 'bg-red-500/15 text-red-600 dark:text-red-400',
                    inc.severity === 'Major' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                    inc.severity === 'Minor' && 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
                  )}
                >
                  <span className={cn(
                    'size-2 rounded-full',
                    inc.severity === 'Critical' && 'bg-red-500',
                    inc.severity === 'Major' && 'bg-amber-500',
                    inc.severity === 'Minor' && 'bg-sky-500',
                  )} />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('text-[10px] font-semibold', severityClasses(inc.severity))}>
                    {inc.severity}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{inc.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{formatDate(inc.date)}</span>
                  <span>·</span>
                  <span>Duration: <span className="font-medium text-foreground tabular-nums">{durationLabel(inc.durationMins)}</span></span>
                  <span>·</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Resolved
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Infrastructure — AWS, Supabase, Redis, CDN, queues, cron, workers, functions.
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useSyncExternalStore } from 'react';
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  GitCommit,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import {
  KpiCard,
  SectionHeader,
  DemoDataPill,
  timeAgo,
} from '@/components/views/superadmin/_shared';
import type { KpiColor } from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface InfraKpi { label: string; value: string; icon: LucideIcon; trend: number; color: KpiColor; sub: string }
const KPIS: InfraKpi[] = [
  { label: 'CPU Usage', value: '34%', icon: Cpu, trend: 2, color: 'sky', sub: '8 vCPU avg' },
  { label: 'Memory', value: '6.2GB/16GB', icon: MemoryStick, trend: 0.4, color: 'violet', sub: '39% utilized' },
  { label: 'Disk I/O', value: '12MB/s', icon: HardDrive, trend: -2, color: 'emerald', sub: 'SSD · 480GB' },
  { label: 'Network', value: '84Mbps', icon: Network, trend: 12, color: 'amber', sub: 'inbound + outbound' },
];

type ProviderStatus = 'Operational' | 'Degraded';
interface Provider {
  name: string;     // e.g. "AWS"
  service: string;  // e.g. "EC2"
  letter: string;   // avatar letter
  color: 'orange' | 'emerald' | 'red' | 'sky' | 'violet' | 'amber';
  status: ProviderStatus;
  stat1: string;
  stat2: string;
  utilization: number;
}

const PROVIDERS: Provider[] = [
  { name: 'AWS', service: 'EC2', letter: 'A', color: 'orange', status: 'Operational', stat1: '99.99% uptime', stat2: 'us-east-1', utilization: 34 },
  { name: 'Supabase', service: 'Postgres', letter: 'S', color: 'emerald', status: 'Operational', stat1: '99.95% uptime', stat2: '12 connections', utilization: 48 },
  { name: 'Redis', service: 'Cache', letter: 'R', color: 'red', status: 'Operational', stat1: '100% uptime', stat2: '4.2K ops/s', utilization: 62 },
  { name: 'Cloudflare', service: 'CDN', letter: 'C', color: 'sky', status: 'Operational', stat1: '99.99% uptime', stat2: '1.2M req/min', utilization: 28 },
  { name: 'Cron', service: 'Scheduler', letter: 'K', color: 'violet', status: 'Operational', stat1: '100% uptime', stat2: '14 jobs/min', utilization: 41 },
  { name: 'Workers', service: 'Queue', letter: 'W', color: 'amber', status: 'Degraded', stat1: '99.4% uptime', stat2: '8 active', utilization: 87 },
];

const PROVIDER_COLOR_MAP: Record<Provider['color'], string> = {
  orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-500/15 text-red-600 dark:text-red-400',
  sky: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

interface DeployEvent {
  minsAgo: number;
  commit: string;
  env: 'Production' | 'Staging';
  status: 'Success' | 'Rolled back';
  by: string;
}
const DEPLOYS: DeployEvent[] = [
  { minsAgo: 18, commit: 'a3f2c91', env: 'Production', status: 'Success', by: 'sarah.chen' },
  { minsAgo: 84, commit: '7b9e3d2', env: 'Production', status: 'Success', by: 'marcus.lee' },
  { minsAgo: 162, commit: '6c1f4a3', env: 'Staging', status: 'Success', by: 'priya.k' },
  { minsAgo: 240, commit: '5d8g2b4', env: 'Production', status: 'Rolled back', by: 'sam.taylor' },
  { minsAgo: 320, commit: '4e7h1c5', env: 'Staging', status: 'Success', by: 'jordan.m' },
];

// ─── Hydration-safe is-client hook ───────────────────────────────────────────

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InfrastructureSection() {
  const mounted = useIsClient();
  const [opened, setOpened] = useState<string | null>(null);

  const handleProviderClick = (name: string) => {
    setOpened(name);
    toast.info(`Opening ${name} details`, { description: 'Provider metrics dashboard (demo).' });
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Infrastructure"
        description="AWS, Supabase, Redis, CDN, queues, cron, workers, functions — status & metrics."
        icon={Server}
        actions={<DemoDataPill />}
      />

      {/* ─── Row 1: 4 KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
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

      {/* ─── Row 2: Infrastructure Providers grid ───────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Infrastructure Providers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map((p) => (
            <button
              key={`${p.name}-${p.service}`}
              onClick={() => handleProviderClick(`${p.name} / ${p.service}`)}
              className="text-left"
            >
              <Card className={cn('card-shadow card-hover h-full', opened === `${p.name} / ${p.service}` && 'ring-2 ring-primary/40')}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm', PROVIDER_COLOR_MAP[p.color])}>
                      {p.letter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.service}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold shrink-0',
                        p.status === 'Operational'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                      )}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Uptime</p>
                      <p className="text-xs font-medium text-foreground truncate">{p.stat1}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-[10px] text-muted-foreground">Load</p>
                      <p className="text-xs font-medium text-foreground truncate">{p.stat2}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Utilization</span>
                      <span className="tabular-nums">{p.utilization}%</span>
                    </div>
                    <Progress
                      value={p.utilization}
                      className={cn('h-1.5', p.utilization > 80 && '[&>div]:bg-amber-500')}
                    />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Row 3: Recent Deploys timeline ─────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Recent Deploys</CardTitle>
          <CardDescription>Last 24 hours · CI/CD pipeline activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {DEPLOYS.map((d, i) => {
              const isRollback = d.status === 'Rolled back';
              return (
                <li key={i} className="relative pl-10">
                  <span className={cn(
                    'absolute left-0 top-0.5 size-8 rounded-full flex items-center justify-center border-2 border-background shrink-0',
                    isRollback
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                  )}>
                    {isRollback ? <RotateCcw className="size-3.5" /> : <CheckCircle2 className="size-4" />}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground inline-flex items-center gap-1">
                      <GitCommit className="size-3 text-muted-foreground" />
                      {d.commit}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold',
                        d.env === 'Production'
                          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
                      )}
                    >
                      {d.env}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold',
                        isRollback
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                      )}
                    >
                      {d.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                      {mounted ? timeAgo(new Date(Date.now() - d.minsAgo * 60_000).toISOString()) : '—'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">by <span className="text-foreground font-medium">{d.by}</span></p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

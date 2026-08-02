'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Storage — platform-wide storage usage by provider, top workspace consumers,
// and breakdown by file type. Drives capacity planning and cost allocation.
// ─────────────────────────────────────────────────────────────────────────────

import {
  HardDrive, Database, DollarSign, Building2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import { SectionHeader, DemoDataPill, KpiCard } from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

interface ProviderRow {
  name: string;
  status: 'Active' | 'Degraded' | 'Maintenance';
  used: number;   // GB
  total: number;  // GB
  files: string;
  cost: string;
  color: 'emerald' | 'sky' | 'amber';
}

const PROVIDERS: ProviderRow[] = [
  { name: 'AWS S3', status: 'Active', used: 612, total: 1024, files: '1.84M', cost: '$214', color: 'emerald' },
  { name: 'Supabase Storage', status: 'Active', used: 184, total: 500, files: '642K', cost: '$58', color: 'sky' },
  { name: 'Local Volume', status: 'Maintenance', used: 51, total: 100, files: '128K', cost: '$12', color: 'amber' },
];

interface ConsumerRow {
  rank: number;
  workspace: string;
  gb: number;
  percent: number;
}

const CONSUMERS: ConsumerRow[] = [
  { rank: 1, workspace: 'Acme HVAC', gb: 78.4, percent: 9.3 },
  { rank: 2, workspace: 'Skyline Roofing', gb: 64.2, percent: 7.6 },
  { rank: 3, workspace: 'Bella Salon', gb: 41.8, percent: 4.9 },
  { rank: 4, workspace: 'Northwind Plumbing', gb: 38.1, percent: 4.5 },
  { rank: 5, workspace: 'GreenLeaf Dental', gb: 27.6, percent: 3.3 },
];

interface FileTypeRow {
  name: string;
  percent: number;
  gb: string;
  color: string;
  barClass: string;
}

const FILE_TYPES: FileTypeRow[] = [
  { name: 'Images', percent: 43, gb: '364 GB', color: 'text-emerald-600 dark:text-emerald-400', barClass: '[&>div]:bg-emerald-500' },
  { name: 'Videos', percent: 28, gb: '237 GB', color: 'text-sky-600 dark:text-sky-400', barClass: '[&>div]:bg-sky-500' },
  { name: 'Documents', percent: 18, gb: '152 GB', color: 'text-amber-600 dark:text-amber-400', barClass: '[&>div]:bg-amber-500' },
  { name: 'Audio', percent: 7, gb: '59 GB', color: 'text-violet-600 dark:text-violet-400', barClass: '[&>div]:bg-violet-500' },
  { name: 'Other', percent: 4, gb: '35 GB', color: 'text-rose-600 dark:text-rose-400', barClass: '[&>div]:bg-rose-500' },
];

const PROVIDER_STATUS: Record<ProviderRow['status'], string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Degraded: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Maintenance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function StorageSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Storage"
        description="Storage usage by provider and workspace."
        icon={HardDrive}
        actions={<DemoDataPill />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Storage" value="847 GB" icon={HardDrive} trend={3} color="sky" sub="+24 GB this month" />
        <KpiCard label="Active Provider" value="S3" icon={Database} color="emerald" />
        <KpiCard label="Storage Cost (mo)" value="$284" icon={DollarSign} trend={12} color="amber" />
        <KpiCard label="Avg per Workspace" value="3.4 GB" icon={Building2} trend={6} color="emerald" sub="+0.2 GB" />
      </div>

      {/* Providers + Consumers */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Providers (60%) */}
        <div className="lg:col-span-3 space-y-4">
          {PROVIDERS.map((p) => {
            const pct = Math.round((p.used / p.total) * 100);
            return (
              <Card key={p.name} className="card-shadow">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Database className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.files} files · {p.cost}/mo</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={PROVIDER_STATUS[p.status]}>{p.status}</Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{p.used} GB / {p.total} GB</span>
                      <span className="font-mono font-medium text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Consumers (40%) */}
        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Storage Consumers</CardTitle>
            <CardDescription>Highest-usage workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CONSUMERS.map((c) => (
              <div key={c.workspace} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-muted text-muted-foreground text-[11px] font-mono flex items-center justify-center shrink-0">{c.rank}</span>
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{c.workspace}</span>
                  <span className="text-sm font-bold text-foreground">{c.gb} GB</span>
                </div>
                <div className="flex items-center gap-2 pl-9">
                  <Progress value={c.percent * 4} className="h-1 flex-1" />
                  <span className="text-[11px] text-muted-foreground font-mono w-9 text-right">{c.percent}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Storage by file type */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Storage by File Type</CardTitle>
          <CardDescription>Aggregate breakdown across all providers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FILE_TYPES.map((f, idx) => (
            <div key={f.name}>
              {idx > 0 && <Separator className="mb-4" />}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground w-24 shrink-0">{f.name}</span>
                <Progress value={f.percent} className={cn('h-2 flex-1', f.barClass)} />
                <span className={cn('text-xs font-mono w-16 text-right', f.color)}>{f.percent}%</span>
                <span className="text-xs text-muted-foreground w-16 text-right">{f.gb}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

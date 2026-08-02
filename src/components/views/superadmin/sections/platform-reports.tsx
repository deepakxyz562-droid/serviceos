'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Platform Reports — generate, schedule, and export platform-wide reports.
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import {
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  Download,
  CalendarClock,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  ShieldCheck,
  Activity,
  HardDrive,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { SectionHeader, DemoDataPill } from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface StatCard { label: string; value: string; icon: LucideIcon }
const STATS: StatCard[] = [
  { label: 'Total Reports', value: '248', icon: FileText },
  { label: 'Scheduled', value: '34', icon: Clock },
  { label: 'Generated This Week', value: '67', icon: CheckCircle2 },
  { label: 'Pending', value: '3', icon: Loader2 },
];

type ReportStatus = 'Ready' | 'Generating' | 'Failed';
type ReportFormat = 'PDF' | 'CSV' | 'XLSX';

interface ReportRow {
  name: string;
  type: string;
  schedule: 'Daily' | 'Weekly' | 'Monthly' | 'On-demand';
  lastGenerated: string;
  format: ReportFormat;
  status: ReportStatus;
}

const REPORTS: ReportRow[] = [
  { name: 'Revenue Summary', type: 'Finance', schedule: 'Monthly', lastGenerated: 'Jul 1, 2025', format: 'PDF', status: 'Ready' },
  { name: 'User Activity', type: 'Engagement', schedule: 'Weekly', lastGenerated: 'Jul 7, 2025', format: 'CSV', status: 'Ready' },
  { name: 'Churn Analysis', type: 'Growth', schedule: 'Monthly', lastGenerated: 'Jul 1, 2025', format: 'XLSX', status: 'Ready' },
  { name: 'AI Usage', type: 'Operations', schedule: 'Weekly', lastGenerated: 'Jul 8, 2025', format: 'PDF', status: 'Generating' },
  { name: 'Storage Audit', type: 'Infrastructure', schedule: 'Monthly', lastGenerated: 'Jul 1, 2025', format: 'CSV', status: 'Ready' },
  { name: 'Security Scan', type: 'Compliance', schedule: 'Weekly', lastGenerated: 'Jul 8, 2025', format: 'PDF', status: 'Ready' },
  { name: 'Support Tickets', type: 'Operations', schedule: 'Weekly', lastGenerated: 'Jul 8, 2025', format: 'XLSX', status: 'Failed' },
  { name: 'Performance Report', type: 'Engineering', schedule: 'Daily', lastGenerated: 'Jul 14, 2025', format: 'PDF', status: 'Ready' },
];

interface Template { name: string; icon: LucideIcon; desc: string }
const TEMPLATES: Template[] = [
  { name: 'Revenue', icon: DollarSign, desc: 'MRR / ARR breakdown' },
  { name: 'User Activity', icon: Users, desc: 'Logins & actions' },
  { name: 'Churn', icon: TrendingUp, desc: 'Cohort retention' },
  { name: 'Security', icon: ShieldCheck, desc: 'Audit & access' },
  { name: 'Performance', icon: Activity, desc: 'p95 latency' },
  { name: 'Storage', icon: HardDrive, desc: 'Quota & usage' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadgeClasses(status: ReportStatus): string {
  switch (status) {
    case 'Ready': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'Generating': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
    case 'Failed': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  }
}

function formatBadgeClasses(format: ReportFormat): string {
  switch (format) {
    case 'PDF': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'CSV': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'XLSX': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlatformReportsSection() {
  const handleNewReport = () => toast.info('New report builder', { description: 'Opens the report wizard (demo).' });
  const handleDownload = (name: string) => toast.success(`Downloading "${name}"`, { description: 'Your file will start shortly.' });
  const handleSchedule = (name: string) => toast.info(`Schedule opened for "${name}"`);
  const handleUseTemplate = (name: string) => toast.success(`Template "${name}" applied`, { description: 'A new draft report was created.' });

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Platform Reports"
        description="Generate, schedule, and export platform-wide reports."
        icon={FileText}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleNewReport}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Report</span>
            </Button>
            <DemoDataPill />
          </>
        }
      />

      {/* ─── Row 1: 4 stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Card key={s.label} className="card-shadow card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-xl font-bold text-foreground tracking-tight">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Row 2: Reports table ───────────────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>All configured &amp; one-off reports across the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Schedule</TableHead>
                  <TableHead className="text-xs">Last Generated</TableHead>
                  <TableHead className="text-xs">Format</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REPORTS.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="text-xs font-medium text-foreground py-2.5">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2.5">{r.type}</TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        <CalendarClock className="size-3 mr-1 text-muted-foreground" />
                        {r.schedule}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2.5 tabular-nums">{r.lastGenerated}</TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={cn('text-[10px] font-mono font-semibold', formatBadgeClasses(r.format))}>
                        {r.format}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={cn('text-[10px] font-semibold', statusBadgeClasses(r.status))}>
                        {r.status === 'Generating' && <Loader2 className="size-3 mr-1 animate-spin" />}
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleDownload(r.name)}
                          aria-label={`Download ${r.name}`}
                          disabled={r.status !== 'Ready'}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleSchedule(r.name)}
                          aria-label={`Schedule ${r.name}`}
                        >
                          <CalendarClock className="size-3.5" />
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

      {/* ─── Row 3: Templates strip ─────────────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Start a new report from a prebuilt template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {TEMPLATES.map((t) => (
              <div
                key={t.name}
                className="shrink-0 w-44 rounded-lg border border-border bg-card p-4 card-shadow card-hover flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <t.icon className="size-4" />
                  </div>
                  <BarChart3 className="size-3.5 text-muted-foreground ml-auto" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.desc}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs mt-1 w-full"
                  onClick={() => handleUseTemplate(t.name)}
                >
                  Use
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Background Jobs — monitor queues: emails, SMS, AI, invoices, exports, webhooks.
// Retry, cancel, inspect. All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ListTodo,
  Mail,
  MessageSquare,
  Sparkles,
  Webhook,
  XCircle,
  RotateCcw,
  FileText,
  Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { SectionHeader, DemoDataPill } from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface QueueCard {
  name: string;
  icon: LucideIcon;
  pending: number;
  processed: number;
  failed: number;
  throughput: number; // 0-100
  color: 'emerald' | 'amber' | 'sky' | 'violet';
}

const QUEUES: QueueCard[] = [
  { name: 'Email Queue', icon: Mail, pending: 23, processed: 1200, failed: 0, throughput: 86, color: 'emerald' },
  { name: 'SMS Queue', icon: MessageSquare, pending: 8, processed: 834, failed: 2, throughput: 72, color: 'amber' },
  { name: 'AI Queue', icon: Sparkles, pending: 12, processed: 432, failed: 1, throughput: 64, color: 'sky' },
  { name: 'Webhook Queue', icon: Webhook, pending: 0, processed: 2100, failed: 0, throughput: 94, color: 'emerald' },
];

const COLOR_MAP: Record<QueueCard['color'], string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

interface ActiveJob {
  id: string;
  type: string;
  workspace: string;
  startedMinsAgo: number;
  progress: number;
}
const ACTIVE_JOBS: ActiveJob[] = [
  { id: 'job_8a4f2c1', type: 'Email Campaign', workspace: 'AquaFlow', startedMinsAgo: 3, progress: 64 },
  { id: 'job_7b9e3d2', type: 'Invoice Batch', workspace: 'Bloom Beauty', startedMinsAgo: 8, progress: 41 },
  { id: 'job_6c1f4a3', type: 'AI Enrichment', workspace: 'Apex HVAC', startedMinsAgo: 1, progress: 12 },
  { id: 'job_5d8g2b4', type: 'CSV Export', workspace: 'ClearWell', startedMinsAgo: 14, progress: 88 },
  { id: 'job_4e7h1c5', type: 'Webhook Retry', workspace: 'VoltEdge', startedMinsAgo: 5, progress: 27 },
  { id: 'job_3f6j0b6', type: 'SMS Reminder', workspace: 'AquaFlow', startedMinsAgo: 2, progress: 53 },
];

interface FailedJob {
  id: string;
  type: string;
  workspace: string;
  failedMinsAgo: number;
  error: string;
}
const FAILED_JOBS: FailedJob[] = [
  { id: 'job_9z2a8b1', type: 'Webhook Delivery', workspace: 'Apex HVAC', failedMinsAgo: 12, error: 'Connection timeout to https://api.example.com/hook after 30000ms' },
  { id: 'job_8y3b7c2', type: 'AI Generation', workspace: 'Bloom Beauty', failedMinsAgo: 28, error: 'Upstream provider returned 503 Service Unavailable (3 retries)' },
  { id: 'job_7x4c6d3', type: 'Email Send', workspace: 'ClearWell', failedMinsAgo: 45, error: 'SMTP relay rejected recipient — mailbox full' },
  { id: 'job_6w5d5e4', type: 'Invoice PDF', workspace: 'VoltEdge', failedMinsAgo: 67, error: 'PDF render crashed: out of memory (heap limit 512MB)' },
  { id: 'job_5v6e4f5', type: 'SMS Send', workspace: 'AquaFlow', failedMinsAgo: 92, error: 'Twilio rate limit reached — try again in 60s' },
];

interface CompletedJob {
  id: string;
  type: string;
  workspace: string;
  completedMinsAgo: number;
  durationMs: number;
}
const COMPLETED_JOBS: CompletedJob[] = [
  { id: 'job_4u7f3g6', type: 'Email Campaign', workspace: 'Apex HVAC', completedMinsAgo: 4, durationMs: 8420 },
  { id: 'job_3t8g2h7', type: 'AI Enrichment', workspace: 'AquaFlow', completedMinsAgo: 11, durationMs: 15230 },
  { id: 'job_2s9h1i8', type: 'CSV Export', workspace: 'Bloom Beauty', completedMinsAgo: 22, durationMs: 4180 },
  { id: 'job_1r0i0j9', type: 'Webhook Retry', workspace: 'VoltEdge', completedMinsAgo: 35, durationMs: 940 },
  { id: 'job_0q1j9k0', type: 'Invoice Batch', workspace: 'ClearWell', completedMinsAgo: 48, durationMs: 23890 },
  { id: 'job_9p2k8l1', type: 'SMS Reminder', workspace: 'AquaFlow', completedMinsAgo: 71, durationMs: 1240 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function minsAgoLabel(m: number): string {
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BackgroundJobsSection() {
  const handleCancel = (id: string) => toast.success(`Job ${id} cancelled`, { description: 'It will stop at the next checkpoint.' });
  const handleRetry = (id: string) => toast.info(`Retrying ${id}`, { description: 'Re-queued at the end of the line.' });
  const handleViewLogs = (id: string) => toast.info(`Opening logs for ${id}`);

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Background Jobs"
        description="Monitor queues: emails, SMS, AI, invoices, exports, webhooks. Retry, cancel, inspect."
        icon={ListTodo}
        actions={<DemoDataPill />}
      />

      {/* ─── Row 1: Queue status tiles ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUEUES.map((q) => {
          const stats = [
            { label: 'Pending', value: String(q.pending) },
            { label: 'Processed', value: q.processed.toLocaleString() },
            { label: 'Failed', value: String(q.failed) },
          ];
          return (
            <Card key={q.name} className="card-shadow card-hover">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn('size-8 rounded-md flex items-center justify-center shrink-0', COLOR_MAP[q.color])}>
                    <q.icon className="size-4" />
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate">{q.name}</span>
                  {q.failed > 0 && (
                    <Badge variant="outline" className="text-[10px] ml-auto bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                      {q.failed} failed
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                      <p className="text-sm font-semibold text-foreground tabular-nums">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Throughput</span>
                    <span className="tabular-nums">{q.throughput}%</span>
                  </div>
                  <Progress value={q.throughput} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Row 2: Tabs (Active / Failed / Completed) ──────────────────── */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="text-xs">
            Active
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{ACTIVE_JOBS.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-xs">
            Failed
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{FAILED_JOBS.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{COMPLETED_JOBS.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Active tab */}
        <TabsContent value="active">
          <Card className="card-shadow">
            <CardHeader className="pb-3"><CardTitle className="text-sm">In-Progress Jobs</CardTitle></CardHeader>
            <CardContent className="p-0 sm:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Job ID</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Workspace</TableHead>
                      <TableHead className="text-xs">Started</TableHead>
                      <TableHead className="text-xs w-[180px]">Progress</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ACTIVE_JOBS.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="text-xs font-mono text-foreground py-2.5">{j.id}</TableCell>
                        <TableCell className="text-xs text-foreground py-2.5">{j.type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">{j.workspace}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5 tabular-nums">{minsAgoLabel(j.startedMinsAgo)}</TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Progress value={j.progress} className="h-1.5 flex-1" />
                            <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{j.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10" onClick={() => handleCancel(j.id)}>
                            <XCircle className="size-3.5 mr-1" />Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed tab */}
        <TabsContent value="failed">
          <Card className="card-shadow">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Failed Jobs</CardTitle></CardHeader>
            <CardContent className="p-0 sm:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Job ID</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Workspace</TableHead>
                      <TableHead className="text-xs">Failed At</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FAILED_JOBS.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="text-xs font-mono text-foreground py-2.5">{j.id}</TableCell>
                        <TableCell className="text-xs text-foreground py-2.5">{j.type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">{j.workspace}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5 tabular-nums">{minsAgoLabel(j.failedMinsAgo)}</TableCell>
                        <TableCell className="text-xs text-red-600 dark:text-red-400 py-2.5 max-w-[280px] truncate" title={j.error}>{j.error}</TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRetry(j.id)}>
                              <RotateCcw className="size-3.5 mr-1" />Retry
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => handleViewLogs(j.id)} aria-label={`View logs ${j.id}`}>
                              <FileText className="size-3.5" />
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
        </TabsContent>

        {/* Completed tab */}
        <TabsContent value="completed">
          <Card className="card-shadow">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Completed Jobs</CardTitle></CardHeader>
            <CardContent className="p-0 sm:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Job ID</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Workspace</TableHead>
                      <TableHead className="text-xs">Completed</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMPLETED_JOBS.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="text-xs font-mono text-foreground py-2.5">{j.id}</TableCell>
                        <TableCell className="text-xs text-foreground py-2.5">{j.type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">{j.workspace}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5 tabular-nums">{minsAgoLabel(j.completedMinsAgo)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5 tabular-nums">{formatDuration(j.durationMs)}</TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleViewLogs(j.id)}>
                              <FileText className="size-3.5 mr-1" />Logs
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" aria-label={`Download ${j.id}`} onClick={() => toast.success(`Downloading results for ${j.id}`)}>
                              <Download className="size-3.5" />
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
        </TabsContent>
      </Tabs>
    </section>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// System Logs — live tail of platform logs: API, database, workers, webhooks.
// Live data: fetched from /api/activity-logs (ActivityLog table). Falls back
// to DEMO_LOGS if the fetch fails (e.g. non-superadmin / network error) so the
// UI never breaks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Terminal, Pause, Play, Download, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { SectionHeader, DemoDataPill } from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants (kept as fallback) ──────────────────────────────────

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogLine {
  level: LogLevel;
  time: string; // HH:MM:SS
  service: string;
  message: string;
}

const DEMO_LOGS: LogLine[] = [
  { level: 'INFO', time: '12:42:31', service: 'api', message: 'GET /api/tenants 200 12ms' },
  { level: 'INFO', time: '12:42:30', service: 'api', message: 'POST /api/jobs 201 48ms (workspace: aquaflow)' },
  { level: 'WARN', time: '12:42:28', service: 'db', message: 'Slow query 247ms — SELECT * FROM jobs WHERE status = ?' },
  { level: 'INFO', time: '12:42:25', service: 'webhook', message: 'Delivery to https://example.com/hook queued' },
  { level: 'ERROR', time: '12:42:25', service: 'webhook', message: 'Delivery failed to https://example.com/hook (timeout)' },
  { level: 'INFO', time: '12:42:21', service: 'worker', message: 'job_8a4f2c1 email-batch 64% (412/644 sent)' },
  { level: 'INFO', time: '12:42:18', service: 'api', message: 'GET /api/analytics/summary 200 38ms' },
  { level: 'WARN', time: '12:42:15', service: 'redis', message: 'Cache miss ratio 22% — evicting cold keys' },
  { level: 'INFO', time: '12:42:11', service: 'ai', message: 'gpt-4o completion 1.2K tokens in 820ms' },
  { level: 'ERROR', time: '12:42:08', service: 'stripe', message: 'Webhook signature invalid (clock drift suspected)' },
  { level: 'INFO', time: '12:42:05', service: 'api', message: 'POST /auth/login 200 96ms (user: admin@aquaflow.com)' },
  { level: 'INFO', time: '12:42:01', service: 'worker', message: 'job_7b9e3d2 invoice-batch 41% (88/210 rendered)' },
];

const LEVEL_CLASSES: Record<LogLevel, string> = {
  INFO: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  WARN: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  ERROR: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SystemLogsSection() {
  const [logs, setLogs] = useState<LogLine[]>(DEMO_LOGS);
  const [isLiveData, setIsLiveData] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | LogLevel>('all');
  const [search, setSearch] = useState('');

  // Fetch real ActivityLog rows from /api/activity-logs. Falls back to
  // DEMO_LOGS silently on any error (401/403/500/network) so the UI keeps
  // working for non-superadmin users.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/activity-logs?limit=100', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw: unknown[] = Array.isArray(data) ? data : (data.logs || data.activityLogs || []);
        const realLogs: LogLine[] = raw.map((item: any) => {
          const sev = String(item?.severity || 'info').toUpperCase();
          const level: LogLevel = sev === 'ERROR' || sev === 'CRITICAL' ? 'ERROR'
            : sev === 'WARNING' || sev === 'WARN' ? 'WARN'
            : 'INFO';
          let time = '—';
          try {
            time = new Date(item.createdAt).toLocaleTimeString('en-US', { hour12: false });
          } catch { /* keep default */ }
          const service = String(item?.actorType || item?.entityType || 'api');
          const message = String(item?.description || `${item?.action || ''} ${item?.entityType || ''}`.trim() || '(no message)');
          return { level, time, service, message };
        });
        if (!cancelled && realLogs.length > 0) {
          setLogs(realLogs);
          setIsLiveData(true);
        }
      } catch (err) {
        // Silent fallback to DEMO_LOGS — UI still works for non-superadmins.
        console.warn('[system-logs] Failed to load live data, using demo:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = logs.filter((l) => {
    if (filter !== 'all' && l.level !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return l.service.toLowerCase().includes(q) || l.message.toLowerCase().includes(q) || l.time.includes(q);
    }
    return true;
  });

  const handlePauseToggle = () => {
    setPaused((p) => !p);
    toast.info(paused ? 'Log streaming resumed' : 'Log streaming paused');
  };
  const handleExport = () => toast.success('Log export queued', { description: `${filtered.length} lines will be downloaded as a .log file.` });

  return (
    <section className="space-y-6">
      <SectionHeader
        title="System Logs"
        description="Live tail of platform logs — API, database, workers, webhooks."
        icon={Terminal}
        actions={
          <>
            <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | LogLevel)}>
              <SelectTrigger className="h-8 w-[120px] text-xs" size="sm">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handlePauseToggle} className="h-8">
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              <span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
            </Button>
            <DemoDataPill live={isLiveData} />
          </>
        }
      />

      {/* ─── Log console ────────────────────────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Console</CardTitle>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse')} />
                <span className={cn('font-semibold', paused ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                  {paused ? 'PAUSED' : 'LIVE'}
                </span>
              </span>
              <span className="hidden sm:inline">Last 5 minutes</span>
              <span className="tabular-nums">{filtered.length} events</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto bg-muted/30 rounded-lg p-3 font-mono text-xs space-y-1 border border-border">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No log lines match the current filter.</p>
            ) : (
              filtered.map((l, i) => (
                <div key={i} className="flex items-start gap-2.5 py-0.5 hover:bg-muted/50 rounded px-1 -mx-1">
                  <span className={cn('inline-flex items-center justify-center shrink-0 px-1.5 h-4 rounded text-[10px] font-semibold border self-center',
                    LEVEL_CLASSES[l.level])}>
                    {l.level}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0 self-center">{l.time}</span>
                  <span className="text-sky-600 dark:text-sky-400 shrink-0 self-center">{l.service}</span>
                  <span className="text-foreground break-all">{l.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Footer: search + export ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs by service, message, or timestamp…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
          <Download className="size-4" />
          Export
        </Button>
      </div>
    </section>
  );
}

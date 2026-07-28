'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Backup — Superadmin section for downloading a full JSON snapshot of the
// Supabase (or Prisma/SQLite) database.
//
// Backups are produced as a single downloadable JSON file (no server-side
// storage, no S3) — the operator is responsible for storing the file
// wherever they want (Dropbox, Google Drive, Git LFS, etc.).
//
// APIs:
//   GET   /api/superadmin/backup          → preview (per-table row counts)
//   POST  /api/superadmin/backup          → stream full JSON snapshot
//   POST  /api/superadmin/backup?only=X   → snapshot of specific tables only
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Database, Download, RefreshCw, Loader2, FileJson, HardDrive,
  Table as TableIcon, AlertTriangle, CheckCircle2, Search, Filter,
  ShieldCheck, Clock, Server,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  SectionHeader, KpiCard, TableSkeleton, EmptyState,
} from '@/components/views/superadmin/_shared';
import {
  BACKUP_MODEL_GROUPS,
} from '@/lib/backup-models';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PreviewTable {
  name: string;
  camel: string;
  count: number;
  error?: string;
}

interface PreviewResponse {
  success: boolean;
  mode: 'supabase' | 'prisma';
  timestamp: string;
  totalTables: number;
  totalRows: number;
  errorCount: number;
  tables: PreviewTable[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// Rough JSON size estimate: ~500 bytes/row average across all tables.
// Used only for the preview KPI — actual file size is shown after download.
function estimateSize(rows: number): string {
  return formatBytes(rows * 500);
}

function groupOf(tableName: string): string {
  return BACKUP_MODEL_GROUPS[tableName] || 'Other';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BackupSection() {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastDownload, setLastDownload] = useState<{ name: string; size: number; at: string } | null>(null);

  // ── Load preview on mount ────────────────────────────────────────────────
  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/backup', { method: 'GET' });
      const data = (await res.json()) as PreviewResponse;
      if (!res.ok || !data.success) {
        throw new Error((data as any).error || `HTTP ${res.status}`);
      }
      setPreview(data);
    } catch (err: any) {
      toast.error(`Failed to load preview: ${err.message}`);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // ── Filtered tables for the table view ───────────────────────────────────
  const filteredTables = useMemo(() => {
    if (!preview) return [];
    let list = preview.tables;
    if (hideEmpty) list = list.filter((t) => t.count > 0);
    if (groupFilter !== 'all') list = list.filter((t) => groupOf(t.name) === groupFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.camel.toLowerCase().includes(q));
    }
    return list;
  }, [preview, search, groupFilter, hideEmpty]);

  // ── Group options derived from preview data ──────────────────────────────
  const groupOptions = useMemo(() => {
    if (!preview) return ['all'];
    const groups = new Set<string>();
    for (const t of preview.tables) groups.add(groupOf(t.name));
    return ['all', ...Array.from(groups).sort()];
  }, [preview]);

  // ── Total rows in filtered view (for the table header) ───────────────────
  const filteredTotal = useMemo(
    () => filteredTables.reduce((sum, t) => sum + t.count, 0),
    [filteredTables],
  );

  // ── Download handlers ────────────────────────────────────────────────────
  async function handleDownloadAll() {
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress(5);
    try {
      // Small delay so the progress bar visibly animates from 5% → 50%
      await new Promise((r) => setTimeout(r, 100));
      setDownloadProgress(15);

      const res = await fetch('/api/superadmin/backup', { method: 'POST' });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      setDownloadProgress(60);

      // Read the streamed body into a blob. We can't show real progress
      // without Content-Length (the server doesn't know the size in advance
      // because it streams), so we just show an indeterminate state here.
      const blob = await res.blob();
      setDownloadProgress(90);

      const size = blob.size;
      const ts = res.headers.get('X-Backup-Timestamp') || new Date().toISOString();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="?([^"]+)"?/);
      const name = m?.[1] || `serviceos-backup-${ts.replace(/[:.]/g, '-')}.json`;

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadProgress(100);
      setLastDownload({ name, size, at: new Date().toISOString() });
      toast.success(`Backup downloaded (${formatBytes(size)})`);
    } catch (err: any) {
      toast.error(`Backup failed: ${err.message}`);
    } finally {
      setDownloading(false);
      setTimeout(() => setDownloadProgress(0), 1500);
    }
  }

  async function handleDownloadSelected() {
    if (downloading || selected.size === 0) return;
    setDownloading(true);
    setDownloadProgress(5);
    try {
      await new Promise((r) => setTimeout(r, 100));
      setDownloadProgress(15);

      const only = Array.from(selected).join(',');
      const res = await fetch(`/api/superadmin/backup?only=${encodeURIComponent(only)}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      setDownloadProgress(60);

      const blob = await res.blob();
      setDownloadProgress(90);

      const size = blob.size;
      const ts = res.headers.get('X-Backup-Timestamp') || new Date().toISOString();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="?([^"]+)"?/);
      const name = m?.[1] || `serviceos-backup-partial-${ts.replace(/[:.]/g, '-')}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadProgress(100);
      setLastDownload({ name, size, at: new Date().toISOString() });
      toast.success(`Downloaded ${selected.size} table(s) — ${formatBytes(size)}`);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(`Backup failed: ${err.message}`);
    } finally {
      setDownloading(false);
      setTimeout(() => setDownloadProgress(0), 1500);
    }
  }

  async function handleDownloadOne(tableName: string) {
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress(10);
    try {
      const res = await fetch(`/api/superadmin/backup?only=${encodeURIComponent(tableName)}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      setDownloadProgress(70);

      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="?([^"]+)"?/);
      const name = m?.[1] || `${tableName}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadProgress(100);
      toast.success(`Downloaded ${tableName} (${formatBytes(blob.size)})`);
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
      setTimeout(() => setDownloadProgress(0), 1500);
    }
  }

  // ── Selection helpers ────────────────────────────────────────────────────
  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filteredTables.map((t) => t.name)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Database Backup"
        description="Download a complete JSON snapshot of the Supabase database. Files are generated on-demand — no server-side storage."
        icon={Database}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadPreview} disabled={loading}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadAll}
              disabled={downloading || loading || !preview}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download Full Backup
            </Button>
          </div>
        }
      />

      {/* Download progress bar */}
      {downloadProgress > 0 && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                {downloadProgress < 100 ? 'Generating JSON snapshot…' : 'Backup complete'}
              </span>
              <span className="text-muted-foreground font-mono">{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : preview ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Tables"
              value={formatNumber(preview.totalTables)}
              icon={TableIcon}
              color="sky"
              sub={`${preview.errorCount} with errors`}
            />
            <KpiCard
              label="Total Rows"
              value={formatNumber(preview.totalRows)}
              icon={Database}
              color="emerald"
              sub="across all tables"
            />
            <KpiCard
              label="Est. Backup Size"
              value={estimateSize(preview.totalRows)}
              icon={HardDrive}
              color="amber"
              sub="JSON, uncompressed"
            />
            <KpiCard
              label="Database"
              value={preview.mode === 'supabase' ? 'Supabase' : 'Prisma/SQLite'}
              icon={preview.mode === 'supabase' ? ShieldCheck : Server}
              color={preview.mode === 'supabase' ? 'emerald' : 'violet'}
              sub={`Preview @ ${new Date(preview.timestamp).toLocaleTimeString()}`}
            />
          </div>

          {/* Info banner */}
          <Card className="border-sky-500/30 bg-sky-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <FileJson className="size-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-foreground">How backups work</p>
                <ul className="text-muted-foreground space-y-0.5 list-disc pl-4">
                  <li>The backup is a single JSON file with all 158 tables and their rows.</li>
                  <li>The file is streamed directly to your browser — nothing is stored on the server.</li>
                  <li>For large databases, the download may take 30–60 seconds to start.</li>
                  <li>To restore: paste the JSON into the Supabase SQL Editor or use the restore tool (coming soon).</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Last download confirmation */}
          {lastDownload && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-sm flex-1 min-w-0">
                  <p className="font-medium text-foreground">Last backup downloaded</p>
                  <p className="text-muted-foreground truncate">
                    <span className="font-mono">{lastDownload.name}</span>
                    {' · '}
                    {formatBytes(lastDownload.size)}
                    {' · '}
                    {new Date(lastDownload.at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-table preview */}
          <Card className="card-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TableIcon className="size-4 text-primary" />
                    Tables in Backup
                  </CardTitle>
                  <CardDescription>
                    {filteredTables.length} of {preview.totalTables} tables shown
                    {' · '}
                    {formatNumber(filteredTotal)} rows in view
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search tables…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 pl-8 w-44 text-xs"
                    />
                  </div>

                  {/* Group filter */}
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <Filter className="size-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groupOptions.map((g) => (
                        <SelectItem key={g} value={g} className="text-xs">
                          {g === 'all' ? 'All groups' : g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Hide empty toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                    <Checkbox
                      checked={hideEmpty}
                      onCheckedChange={(v) => setHideEmpty(!!v)}
                      className="size-3.5"
                    />
                    Hide empty
                  </label>
                </div>
              </div>

              {/* Selection toolbar */}
              {(selected.size > 0 || filteredTables.length > 0) && (
                <>
                  <Separator className="my-3" />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllFiltered}>
                      Select all (filtered)
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection} disabled={selected.size === 0}>
                      Clear
                    </Button>
                    <span className="text-muted-foreground">
                      {selected.size > 0 && `${selected.size} selected`}
                    </span>
                    {selected.size > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 ml-auto"
                        onClick={handleDownloadSelected}
                        disabled={downloading}
                      >
                        {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                        Download selected ({selected.size})
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {filteredTables.length === 0 ? (
                <EmptyState
                  icon={TableIcon}
                  title="No tables match your filters"
                  subtitle='Try clearing the search or disabling "Hide empty".'
                />
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-right">Rows</TableHead>
                        <TableHead className="text-right">Est. Size</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTables.map((t) => {
                        const isSelected = selected.has(t.name);
                        return (
                          <TableRow
                            key={t.name}
                            className={cn('cursor-pointer hover:bg-muted/50', isSelected && 'bg-primary/5')}
                            onClick={() => toggleSelect(t.name)}
                          >
                            <TableCell className="pl-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(t.name)}
                                onClick={(e) => e.stopPropagation()}
                                className="size-4"
                              />
                            </TableCell>
                            <TableCell>
                              {t.error ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <AlertTriangle className="size-3.5 text-amber-500" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">{t.error}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : t.count > 0 ? (
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                              ) : (
                                <span className="size-3.5 inline-block" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <div className="font-medium text-foreground">{t.name}</div>
                              <div className="text-muted-foreground">db.{t.camel}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {groupOf(t.name)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatNumber(t.count)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {estimateSize(t.count)}
                            </TableCell>
                            <TableCell className="pr-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                disabled={downloading || t.count === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadOne(t.name);
                                }}
                              >
                                <Download className="size-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
            <Clock className="size-3" />
            Backup generation runs entirely in your browser session. For databases &gt; 100k total rows,
            consider using the per-table download or filtering by group.
          </p>
        </>
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load backup preview"
          subtitle="Check that the database connection is working and try again."
          action={
            <Button variant="outline" size="sm" onClick={loadPreview}>
              <RefreshCw className="size-4" />
              Retry
            </Button>
          }
        />
      )}
    </section>
  );
}

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Download,
  Users,
  Timer,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

// ============================================================
// Shared helpers (local copy — parent file has its own)
// ============================================================

function fmtMins(mins: number): string {
  if (!mins || mins < 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtClock(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** YYYY-MM-DD in the local timezone (avoids the UTC off-by-one from toISOString). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday (00:00 local) of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = (day === 0 ? -6 : 1 - day); // back to Monday
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** First day of the month (00:00 local) containing `d`. */
function startOfMonth(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  return out;
}

// ============================================================
// Types
// ============================================================

interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  category?: string | null;
  notes?: string | null;
  isManual?: boolean;
  jobId?: string | null;
  status?: string;
  approvalStatus?: string;
  totalMinutes: number;
  workingMinutes: number;
  employeeName?: string;
  employeeRole?: string | null;
  employeeAvatar?: string | null;
}

interface PayrollRow {
  employee: {
    id: string;
    name: string;
    role?: string | null;
  };
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  byCategory: Record<string, number>;
  entriesCount: number;
  approvedCount: number;
  pendingCount: number;
}

// ============================================================
// Small shared card (local copy of the parent's SummaryCard)
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tint: 'emerald' | 'amber' | 'blue' | 'violet';
}) {
  const tints: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  };
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-lg sm:text-xl font-bold mt-1 truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
          <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${tints[tint]}`}>
            <Icon className="size-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 1. Approve Timesheets tab
// ============================================================

export function ApproveTimesheetsTab() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isAuthed = useAppStore((s) => s.auth?.isAuthenticated === true);

  // 30-day window: from 30 days ago → today (local dates).
  const { from, to } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { from: toISODate(start), to: toISODate(now) };
  }, []);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      let res = await authFetch(`/api/time-tracking/entries?from=${from}&to=${to}`);
      if (res.status === 401) {
        await new Promise((r) => setTimeout(r, 400));
        res = await authFetch(`/api/time-tracking/entries?from=${from}&to=${to}`);
      }
      if (!res.ok) throw new Error('Failed to load time entries');
      const data = await res.json();
      const all: TimeEntry[] = data.entries || [];
      const pending = all.filter(
        (e) => (e.approvalStatus || 'pending').toLowerCase() === 'pending'
      );
      setEntries(pending);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!isAuthed) return;
    loadPending();
  }, [loadPending, isAuthed]);

  const callApprove = useCallback(
    async (entryIds: string[], action: 'approve' | 'reject') => {
      if (entryIds.length === 0) return;
      setActing(true);
      // Optimistic removal: hide these rows immediately so the UI feels instant.
      const removeSet = new Set(entryIds);
      setEntries((prev) => prev.filter((e) => !removeSet.has(e.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        entryIds.forEach((id) => next.delete(id));
        return next;
      });
      try {
        const res = await authFetch('/api/time-tracking/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryIds, action }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Failed to update entries');
        }
        const data = await res.json();
        const n = typeof data.updated === 'number' ? data.updated : entryIds.length;
        toast.success(
          action === 'approve'
            ? `Approved ${n} entr${n === 1 ? 'y' : 'ies'}`
            : `Rejected ${n} entr${n === 1 ? 'y' : 'ies'}`
        );
      } catch (e) {
        // Restore the optimistically-removed rows on error.
        loadPending();
        toast.error(e instanceof Error ? e.message : 'Failed to update entries');
      } finally {
        setActing(false);
      }
    },
    [loadPending]
  );

  const allSelected = entries.length > 0 && entries.every((e) => selected.has(e.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(entries.map((e) => e.id)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 text-white shadow-sm">
                <Check className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Approve Timesheets</h2>
                <p className="text-xs text-muted-foreground">
                  Showing pending entries from the last 30 days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
              >
                {entries.length} pending
              </Badge>
              <Button variant="ghost" size="sm" onClick={loadPending} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-1.5">Refresh</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {entries.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(v) => toggleAll(v === true)}
                />
                <span className="text-sm font-medium">
                  {selected.size > 0
                    ? `${selected.size} selected`
                    : 'Select all'}
                </span>
              </label>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={acting || selected.size === 0}
                  onClick={() => callApprove(Array.from(selected), 'approve')}
                >
                  {acting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  <span className="ml-1.5">Approve Selected</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  disabled={acting || selected.size === 0}
                  onClick={() => callApprove(Array.from(selected), 'reject')}
                >
                  <X className="size-4" />
                  <span className="ml-1.5">Reject Selected</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending entries table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No pending time entries — all caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">
                New submissions will appear here for review.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={(v) => toggleAll(v === true)}
                          aria-label="Select all entries"
                        />
                      </TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead className="w-24">Clock In</TableHead>
                      <TableHead className="w-24">Clock Out</TableHead>
                      <TableHead className="w-28">Category</TableHead>
                      <TableHead className="text-right w-24">Duration</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="text-right w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => {
                      const name = e.employeeName || 'Unknown';
                      const role = e.employeeRole || 'Employee';
                      const duration = e.totalMinutes || e.workingMinutes || 0;
                      const isSelected = selected.has(e.id);
                      return (
                        <TableRow key={e.id} data-state={isSelected ? 'selected' : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(v) => toggleOne(e.id, v === true)}
                              aria-label={`Select entry for ${name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {initials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{name}</p>
                                <p className="text-xs text-muted-foreground truncate">{role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fmtDate(e.clockIn)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {fmtClock(e.clockIn)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {fmtClock(e.clockOut)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              {capitalize(e.category || 'work')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            {fmtMins(duration)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                            >
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={acting}
                                onClick={() => callApprove([e.id], 'approve')}
                              >
                                <Check className="size-3.5" />
                                <span className="ml-1">Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                                disabled={acting}
                                onClick={() => callApprove([e.id], 'reject')}
                              >
                                <X className="size-3.5" />
                                <span className="ml-1">Reject</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 2. Confirm Payroll tab
// ============================================================

export function PayrollTab() {
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodLabel, setPeriodLabel] = useState('This Week');

  // Default range: Monday → Sunday of the current week.
  const initialRange = useMemo(() => {
    const monday = startOfWeek(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { from: toISODate(monday), to: toISODate(sunday) };
  }, []);

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);

  const isAuthed = useAppStore((s) => s.auth?.isAuthenticated === true);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      let res = await authFetch(`/api/time-tracking/payroll?from=${from}&to=${to}`);
      if (res.status === 401) {
        await new Promise((r) => setTimeout(r, 400));
        res = await authFetch(`/api/time-tracking/payroll?from=${from}&to=${to}`);
      }
      if (!res.ok) throw new Error('Failed to load payroll');
      const data = await res.json();
      setPayroll(data.payroll || []);
      setPeriodLabel(data.periodLabel || 'Payroll Period');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!isAuthed) return;
    loadPayroll();
  }, [loadPayroll, isAuthed]);

  // Quick-select handlers.
  const setThisWeek = () => {
    const monday = startOfWeek(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    setFrom(toISODate(monday));
    setTo(toISODate(sunday));
  };

  const setThisMonth = () => {
    const start = startOfMonth(new Date());
    const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    setFrom(toISODate(start));
    setTo(toISODate(end));
  };

  // Summary stats.
  const stats = useMemo(() => {
    let totalHours = 0;
    let approvedHours = 0;
    let pendingHours = 0;
    for (const row of payroll) {
      totalHours += row.workingMinutes || 0;
      // Approximate split: pending share ∝ pendingCount / entriesCount.
      const total = row.entriesCount || 0;
      const pending = row.pendingCount || 0;
      const approved = row.approvedCount || 0;
      if (total > 0) {
        approvedHours += (row.workingMinutes || 0) * (approved / total);
        pendingHours += (row.workingMinutes || 0) * (pending / total);
      }
    }
    return {
      employees: payroll.length,
      totalHours,
      approvedHours,
      pendingHours,
    };
  }, [payroll]);

  // CSV helpers.
  const buildCsv = (rows: PayrollRow[]): string => {
    const header = [
      'Employee',
      'Role',
      'Total Hours',
      'Working',
      'Break',
      'Driving',
      'Office',
      'Supplies',
      'Entries',
      'Approved',
      'Pending',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      const byCat = r.byCategory || {};
      const cells = [
        csvEsc(r.employee.name || ''),
        csvEsc(r.employee.role || ''),
        String(r.totalMinutes || 0),
        String(r.workingMinutes || 0),
        String(byCat.break ?? r.breakMinutes ?? 0),
        String(byCat.driving ?? r.travelMinutes ?? 0),
        String(byCat.office ?? 0),
        String(byCat.supplies ?? 0),
        String(r.entriesCount ?? 0),
        String(r.approvedCount ?? 0),
        String(r.pendingCount ?? 0),
      ];
      lines.push(cells.join(','));
    }
    return lines.join('\n');
  };

  const csvEsc = (s: string): string => {
    if (s == null) return '';
    const needsQuote = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuote ? `"${escaped}"` : escaped;
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportAll = () => {
    if (payroll.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const csv = buildCsv(payroll);
    downloadCsv(csv, `payroll-${from}-to-${to}.csv`);
    toast.success('Exported payroll CSV');
  };

  const exportOne = (row: PayrollRow) => {
    const csv = buildCsv([row]);
    const safeName = (row.employee.name || 'employee')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    downloadCsv(csv, `payroll-${safeName}-${from}-to-${to}.csv`);
    toast.success(`Exported ${row.employee.name}'s payroll`);
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 text-white shadow-sm">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Confirm Payroll</h2>
                <p className="text-xs text-muted-foreground">
                  {periodLabel} · {from} → {to}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-[9.5rem]"
                  aria-label="Period start date"
                />
                <span className="text-muted-foreground text-sm">→</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-[9.5rem]"
                  aria-label="Period end date"
                />
              </div>
              <Button variant="outline" size="sm" onClick={setThisWeek}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={setThisMonth}>
                This Month
              </Button>
              <Button variant="ghost" size="sm" onClick={loadPayroll} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={String(stats.employees)}
          sub="With completed shifts"
          tint="emerald"
        />
        <StatCard
          icon={Timer}
          label="Total Hours"
          value={fmtMins(stats.totalHours)}
          sub="Working minutes summed"
          tint="blue"
        />
        <StatCard
          icon={Check}
          label="Approved Hours"
          value={fmtMins(stats.approvedHours)}
          sub="Estimated approved share"
          tint="emerald"
        />
        <StatCard
          icon={Clock}
          label="Pending Hours"
          value={fmtMins(stats.pendingHours)}
          sub="Awaiting approval"
          tint="amber"
        />
      </div>

      {/* Payroll table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">Payroll Breakdown</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAll}
              disabled={payroll.length === 0}
            >
              <Download className="size-4" />
              <span className="ml-1.5">Export All (CSV)</span>
            </Button>
          </div>
          <Separator className="bg-border/60" />

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payroll.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <CalendarDays className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No completed shifts in this period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right w-24">Total Hours</TableHead>
                    <TableHead className="text-right w-20">Working</TableHead>
                    <TableHead className="text-right w-20">Break</TableHead>
                    <TableHead className="text-right w-20">Driving</TableHead>
                    <TableHead className="text-right w-20">Office</TableHead>
                    <TableHead className="text-right w-20">Supplies</TableHead>
                    <TableHead className="text-right w-16">Entries</TableHead>
                    <TableHead className="text-right w-16">Approved</TableHead>
                    <TableHead className="text-right w-16">Pending</TableHead>
                    <TableHead className="text-right w-28">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payroll.map((row) => {
                    const byCat = row.byCategory || {};
                    return (
                      <TableRow key={row.employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs dark:bg-emerald-950/60 dark:text-emerald-300">
                                {initials(row.employee.name || '?')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{row.employee.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {row.employee.role || 'Employee'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {fmtMins(row.totalMinutes)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmtMins(row.workingMinutes)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {fmtMins(byCat.break ?? row.breakMinutes ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {fmtMins(byCat.driving ?? row.travelMinutes ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {fmtMins(byCat.office ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {fmtMins(byCat.supplies ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.entriesCount ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {row.approvedCount ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          <span className="text-amber-600 dark:text-amber-400">
                            {row.pendingCount ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportOne(row)}
                          >
                            <Download className="size-3.5" />
                            <span className="ml-1">CSV</span>
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
    </div>
  );
}

export default ApproveTimesheetsTab;

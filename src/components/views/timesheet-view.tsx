'use client';

import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Play,
  Pause,
  Square,
  Coffee,
  Timer,
  CalendarDays,
  TrendingUp,
  Users,
  LogIn,
  LogOut,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Loader2,
  Briefcase,
  MapPin,
  History,
  CircleDot,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Car,
  Building2,
  ShoppingBag,
  FileEdit,
  Download,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { ApproveTimesheetsTab, PayrollTab } from '@/components/views/timesheet-approve-payroll';

// ============================================================
// Types & helpers
// ============================================================

type ShiftStatus = 'active' | 'on_break' | 'completed';

interface BreakEntry {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  reason?: string;
}

interface Shift {
  id: string;
  employeeId: string;
  shiftDate: string;
  clockIn: string;
  clockOut: string | null;
  breaks: BreakEntry[];
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  status: ShiftStatus;
  notes?: string | null;
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
}

interface TeamRow {
  employee: {
    id: string;
    name: string;
    role: string;
    avatar?: string | null;
    status: string;
  };
  currentShift: { id: string; clockIn: string; status: ShiftStatus } | null;
  lastClockIn: string | null;
  today: { totalMinutes: number; workingMinutes: number; breakMinutes: number; shiftsCount: number; byCategory?: Record<string, number> };
  period: { totalMinutes: number; workingMinutes: number; breakMinutes: number; shiftsCount: number; byCategory?: Record<string, number>; byDay?: number[] };
  // Jobber-style: per-employee time entries for the Day view (populated when
  // view=day is requested from /api/time-tracking/team).
  entries?: TimeEntry[];
}

// ── Jobber-style time entry (mirrors EmployeeShift row) ────────────────────
interface TimeEntry {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeRole?: string;
  employeeAvatar?: string | null;
  clockIn: string;
  clockOut: string | null;
  category: string;          // 'work' | 'break' | 'driving' | 'office' | 'supplies' | custom
  notes?: string | null;
  isManual?: boolean;
  jobId?: string | null;
  status: ShiftStatus;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes?: number;
  travelMinutes?: number;
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  editHistory?: Array<{ at: string; by?: string; byName?: string; field: string; prev?: string; next?: string }>;
}

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

function fmtDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const SHIFT_STATUS_STYLES: Record<ShiftStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  on_break: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  completed: 'bg-muted text-muted-foreground',
};

// ── Jobber-style helpers (Issue 7) ─────────────────────────────────────────

/** Format minutes respecting the tenant's duration-format setting.
 *  'hours_minutes' → "8h 15m" (default). 'decimal' → "8.25 hrs". */
function fmtMinsStyled(mins: number, format: 'hours_minutes' | 'decimal' = 'hours_minutes'): string {
  if (!mins || mins < 0) return format === 'decimal' ? '0.00 hrs' : '0m';
  if (format === 'decimal') {
    return `${(mins / 60).toFixed(2)} hrs`;
  }
  return fmtMins(mins);
}

/** Convert a Date to a 'YYYY-MM-DD' string (local time, not UTC). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Shift a date by N days. Returns a new Date. */
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Get the start of the week containing `d` (Monday-based by default, but
 *  respects the tenant's payrollPeriodStartDay if passed). */
function startOfWeek(d: Date, startDay: number = 1): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay(); // 0=Sun..6=Sat
  let diff = (day - startDay + 7) % 7;
  r.setDate(r.getDate() - diff);
  return r;
}

/** Category metadata: icon + display label + tint. Used by both the Day and
 *  Week views to render consistent category badges. */
const CATEGORY_META: Record<string, { icon: typeof Clock; label: string; tint: string }> = {
  work:     { icon: Briefcase,    label: 'Work',     tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  break:    { icon: Coffee,       label: 'Break',    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  driving:  { icon: Car,          label: 'Driving',  tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  office:   { icon: Building2,    label: 'Office',   tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  supplies: { icon: ShoppingBag,  label: 'Supplies', tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? { icon: FileEdit, label: category.charAt(0).toUpperCase() + category.slice(1), tint: 'bg-muted text-muted-foreground' };
}

/** Format a date range for the period label (e.g. "Mon, Jan 15" or "Jan 15 – Jan 21"). */
function fmtPeriodLabel(view: 'day' | 'week', date: Date): string {
  try {
    if (view === 'day') {
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    const sStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const eStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${sStr} – ${eStr}`;
  } catch {
    return '';
  }
}

// ============================================================
// Main view (role-aware)
// ============================================================

export function TimesheetView() {
  const auth = useAppStore((s) => s.auth);
  const user = auth?.user;
  const isEmployee = user?.role === 'employee';
  // Owner-side tabs: Timesheets | Approve Timesheets | Confirm Payroll
  // (mirrors the Jobber top-level tabs). Employees only see their own
  // clock-in/out card + history.
  const [ownerTab, setOwnerTab] = useState('timesheets');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Clock className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Timesheet</h1>
            <p className="text-sm text-muted-foreground">
              {isEmployee
                ? 'Clock in, take breaks, and track your work hours.'
                : 'Track attendance and hours across your whole team.'}
            </p>
          </div>
        </div>
      </div>

      {isEmployee ? (
        <EmployeeTimesheet />
      ) : (
        <Tabs value={ownerTab} onValueChange={setOwnerTab} className="w-full">
          <TabsList>
            <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
            <TabsTrigger value="approve">Approve Timesheets</TabsTrigger>
            <TabsTrigger value="payroll">Confirm Payroll</TabsTrigger>
          </TabsList>
          <TabsContent value="timesheets" className="mt-6">
            <OwnerTimesheet />
          </TabsContent>
          <TabsContent value="approve" className="mt-6">
            <ApproveTimesheetsTab />
          </TabsContent>
          <TabsContent value="payroll" className="mt-6">
            <PayrollTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ============================================================
// Employee side — clock in/out + personal history
// ============================================================

function EmployeeTimesheet() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [history, setHistory] = useState<Shift[]>([]);
  const [summary, setSummary] = useState({
    totalMinutes: 0,
    workingMinutes: 0,
    breakMinutes: 0,
    shiftsCount: 0,
  });
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [tick, setTick] = useState(0); // forces re-render for live timer
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await authFetch('/api/time-tracking/shift');
      if (res.ok) {
        const data = await res.json();
        setShift(data.shift || null);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await authFetch(`/api/time-tracking/summary?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSummary({
          totalMinutes: data.totalMinutes || 0,
          workingMinutes: data.workingMinutes || 0,
          breakMinutes: data.breakMinutes || 0,
          shiftsCount: data.shiftsCount || 0,
        });
      }
    } catch {
      // ignore
    }
  }, [period]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch('/api/time-tracking/history?days=30');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.shifts || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchActive(), fetchSummary(), fetchHistory()]);
    setLoading(false);
  }, [fetchActive, fetchSummary, fetchHistory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live timer for active shift
  useEffect(() => {
    if (shift && shift.status !== 'completed') {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shift]);

  // tick is referenced so the linter doesn't drop it; it drives the live timer re-render
  void tick;

  const handleAction = async (action: 'clockin' | 'break' | 'resume' | 'clockout') => {
    setActing(true);
    try {
      let res: Response;
      if (action === 'clockin') {
        res = await authFetch('/api/time-tracking/shift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      } else {
        res = await authFetch('/api/time-tracking/shift', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Action failed');
      }
      const data = await res.json();
      setShift(data.shift || null);
      toast.success(
        action === 'clockin' ? 'Clocked in' :
        action === 'break' ? 'On break' :
        action === 'resume' ? 'Back to work' :
        'Clocked out'
      );
      // Refresh summary + history (totals change on actions).
      fetchSummary();
      fetchHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  // Live computed duration for the active shift
  const liveDuration = useMemo(() => {
    if (!shift || shift.status === 'completed') return 0;
    return Date.now() - new Date(shift.clockIn).getTime();
  }, [shift, tick]);

  const liveBreakDuration = useMemo(() => {
    if (!shift) return 0;
    const now = Date.now();
    let ms = 0;
    for (const b of shift.breaks) {
      if (!b.start) continue;
      const s = new Date(b.start).getTime();
      const e = b.end ? new Date(b.end).getTime() : now;
      if (e > s) ms += e - s;
    }
    return ms;
  }, [shift, tick]);

  const workingMs = liveDuration - liveBreakDuration;

  return (
    <div className="space-y-6">
      {/* Live clock card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1fr_1.2fr]">
            {/* Left: status + timer */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/30 dark:to-background">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CircleDot
                    className={`size-4 ${
                      shift?.status === 'active'
                        ? 'text-emerald-600 animate-pulse'
                        : shift?.status === 'on_break'
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {loading ? 'Loading…' : shift ? (shift.status === 'on_break' ? 'On Break' : 'Clocked In') : 'Not Clocked In'}
                  </span>
                </div>
                {shift && (
                  <Badge variant="outline" className={SHIFT_STATUS_STYLES[shift.status]}>
                    {shift.status === 'on_break' ? 'On Break' : shift.status === 'active' ? 'Active' : 'Completed'}
                  </Badge>
                )}
              </div>

              <div className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
                {shift && shift.status !== 'completed' ? fmtDuration(workingMs) : '00:00:00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Working time</p>

              {shift && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Clock In</p>
                    <p className="font-medium">{fmtClock(shift.clockIn)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Break time</p>
                    <p className="font-medium tabular-nums">{fmtDuration(liveBreakDuration)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: actions */}
            <div className="p-6 flex flex-col justify-center gap-3">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !shift ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => handleAction('clockin')}
                    disabled={acting}
                    className="bg-emerald-600 hover:bg-emerald-700 h-14 text-base"
                  >
                    {acting ? <Loader2 className="size-5 mr-2 animate-spin" /> : <LogIn className="size-5 mr-2" />}
                    Clock In
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    You are currently clocked out. Press Clock In to start your shift.
                  </p>
                </>
              ) : shift.status === 'active' ? (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleAction('break')}
                    disabled={acting}
                    className="h-12 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    {acting ? <Loader2 className="size-5 mr-2 animate-spin" /> : <Coffee className="size-5 mr-2" />}
                    Start Break
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleAction('clockout')}
                    disabled={acting}
                    className="bg-red-600 hover:bg-red-700 h-12"
                  >
                    {acting ? <Loader2 className="size-5 mr-2 animate-spin" /> : <LogOut className="size-5 mr-2" />}
                    Clock Out
                  </Button>
                </>
              ) : shift.status === 'on_break' ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => handleAction('resume')}
                    disabled={acting}
                    className="bg-emerald-600 hover:bg-emerald-700 h-12"
                  >
                    {acting ? <Loader2 className="size-5 mr-2 animate-spin" /> : <Play className="size-5 mr-2" />}
                    Resume Work
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleAction('clockout')}
                    disabled={acting}
                    className="h-12 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    {acting ? <Loader2 className="size-5 mr-2 animate-spin" /> : <LogOut className="size-5 mr-2" />}
                    Clock Out
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Your last shift ended at {fmtClock(shift.clockOut)}.
                  </p>
                  <Button onClick={() => handleAction('clockin')} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
                    {acting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <LogIn className="size-4 mr-2" />}
                    Clock In Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={Timer}
          label="Total Hours"
          value={fmtMins(summary.totalMinutes)}
          sub={`${summary.shiftsCount} ${summary.shiftsCount === 1 ? 'shift' : 'shifts'}`}
          tint="emerald"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Working"
          value={fmtMins(summary.workingMinutes)}
          sub="Excluding breaks"
          tint="blue"
        />
        <SummaryCard
          icon={Coffee}
          label="Break Time"
          value={fmtMins(summary.breakMinutes)}
          sub="Paid breaks"
          tint="amber"
        />
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period</p>
                <p className="text-lg font-bold mt-1 capitalize">{period}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Summary window</p>
              </div>
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as 'today' | 'week' | 'month')}>
              <SelectTrigger className="mt-3 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* History table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">My Shifts (Last 30 Days)</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <Separator className="bg-border/60" />
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <Clock className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No shifts recorded in the last 30 days.</p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-24">Clock In</TableHead>
                    <TableHead className="w-24">Clock Out</TableHead>
                    <TableHead className="w-28">Total</TableHead>
                    <TableHead className="w-28">Working</TableHead>
                    <TableHead className="w-24">Break</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-medium">{fmtDate(s.clockIn)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{fmtClock(s.clockIn)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{fmtClock(s.clockOut)}</TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{fmtMins(s.totalMinutes)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{fmtMins(s.workingMinutes)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{fmtMins(s.breakMinutes)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SHIFT_STATUS_STYLES[s.status]}>
                          {s.status === 'on_break' ? 'On Break' : s.status === 'active' ? 'Active' : 'Done'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Owner side — team table + drilldown
// ============================================================

// ============================================================
// Owner side — Jobber-style Team Timesheet (Day/Week views,
// manual entries, edit/delete, GPS waypoints, category breakdown)
// ============================================================

function OwnerTimesheet() {
  // Jobber-style: Day | Week toggle (replaces the old today/week/month dropdown)
  const [view, setView] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [search, setSearch] = useState('');
  // Team-member filter: 'all' or an employeeId (Jobber "Team" filter)
  const [teamFilter, setTeamFilter] = useState('all');
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [entryDialog, setEntryDialog] = useState<{ mode: 'add' | 'edit'; entry?: TimeEntry; employeeId?: string } | null>(null);
  // Tenant timesheet settings (duration format + categories) — fetched once.
  const [durationFormat, setDurationFormat] = useState<'hours_minutes' | 'decimal'>('hours_minutes');

  // Auth-ready flag: wait for the auth store to be hydrated before the first
  // fetch. Without this, the OwnerTimesheet mounts inside the Radix TabsContent
  // and immediately fires the team query — but on the very first mount after
  // login/navigation, the JWT token may not yet be in localStorage, causing
  // `getAuthUser()` to return null → 401 → "Failed to load team timesheet".
  const isAuthed = useAppStore((s) => s.auth?.isAuthenticated === true);
  const clearAuth = useAppStore((s) => s.clearAuth);

  // Fetch tenant timesheet settings (duration format) once authed.
  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/settings/timesheet?XTransformPort=3000');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data?.settings?.durationFormat) {
            setDurationFormat(data.settings.durationFormat);
          }
        }
      } catch {
        // silent — default 'hours_minutes' is fine
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthed]);

  // ─── Fetch team timesheet (React Query) ─────────────────────────────────
  // The queryKey depends on `view` and `selectedDate` so changing the day/week
  // navigation automatically refetches. `enabled: isAuthed` skips the fetch
  // until the auth store has hydrated — replaces the old "retry once on 401"
  // race-condition band-aid.
  const { data: teamData, isLoading: teamLoading, error: rqTeamError, refetch: loadTeam } = useQuery({
    queryKey: ['timesheet-team', { view, date: toISODate(selectedDate) }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('view', view);
      sp.set('date', toISODate(selectedDate));
      const res = await authFetch(`/api/time-tracking/team?${sp.toString()}`);
      if (!res.ok) {
        // Surface the real server error (e.g. Prisma schema mismatch on
        // Supabase: "column \"category\" of relation \"EmployeeShift\" does
        // not exist") so the user/developer can diagnose the root cause
        // instead of seeing a generic "Failed to load team timesheet".
        let serverMsg = '';
        try {
          const errBody = await res.json();
          serverMsg = errBody?.error || '';
        } catch { /* non-JSON body */ }
        throw new Error(serverMsg || `Failed to load team timesheet (HTTP ${res.status})`);
      }
      return res.json();
    },
    enabled: isAuthed,
    staleTime: 30_000,
  });

  // Derive team / totals / periodLabel from the query result.
  const team: TeamRow[] = teamData?.team ?? [];
  const totals = teamData?.totals ?? { employeesCount: 0, clockedInCount: 0, todayWorkingMinutes: 0, periodWorkingMinutes: 0 };
  const periodLabel = teamData?.periodLabel || fmtPeriodLabel(view, selectedDate);
  const loading = teamLoading;

  // Error handling: a persistent 401 (after `enabled: isAuthed` already
  // skipped the pre-hydration fetch) means the JWT is genuinely expired.
  // Clear stale auth so the user is forced to re-login instead of seeing
  // "Failed to load team timesheet" on every refresh. Other errors are
  // surfaced as toasts with the real server message.
  useEffect(() => {
    if (!rqTeamError) return;
    const msg = rqTeamError.message || 'Failed to load team timesheet';
    if (msg.includes('HTTP 401')) {
      try {
        localStorage.removeItem('fieseros_auth');
        localStorage.removeItem('fieseros_token');
      } catch { /* ignore */ }
      clearAuth();
      toast.error('Session expired', { description: 'Please log in again to view timesheets.' });
    } else {
      toast.error(msg);
    }
  }, [rqTeamError, clearAuth]);

  // Live refresh for active timers (updates the "working" column every second)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;

  // Date navigation: prev/next day (or week), and "Today" jump.
  const shiftDate = (delta: number) => {
    setSelectedDate((d) => view === 'day' ? addDays(d, delta) : addDays(d, delta * 7));
  };
  const jumpToday = () => setSelectedDate(new Date());

  const filtered = useMemo(() => {
    let result = team;
    if (teamFilter !== 'all') {
      result = result.filter((r) => r.employee.id === teamFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.employee.name.toLowerCase().includes(q) || r.employee.role?.toLowerCase().includes(q));
    }
    return result;
  }, [team, search, teamFilter]);

  // Callback after a manual entry is added/edited/deleted — refresh the team
  // list so the new entry shows up immediately.
  const onEntryChanged = useCallback(() => {
    loadTeam();
  }, [loadTeam]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={Users}
          label="Team Size"
          value={String(totals.employeesCount)}
          sub={`${totals.clockedInCount} clocked in now`}
          tint="emerald"
        />
        <SummaryCard
          icon={CircleDot}
          label="Clocked In"
          value={String(totals.clockedInCount)}
          sub="Live right now"
          tint="blue"
        />
        <SummaryCard
          icon={Timer}
          label="Today (working)"
          value={fmtMinsStyled(totals.todayWorkingMinutes, durationFormat)}
          sub="Whole team today"
          tint="emerald"
        />
        <SummaryCard
          icon={CalendarDays}
          label={periodLabel}
          value={fmtMinsStyled(totals.periodWorkingMinutes, durationFormat)}
          sub="Team working hours"
          tint="emerald"
        />
      </div>

      {/* Date navigation + view toggle + actions (Jobber-style toolbar) */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: date arrows + label + Today button */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => shiftDate(-1)} aria-label="Previous">
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-[140px] text-center">
                <p className="text-sm font-semibold">{fmtPeriodLabel(view, selectedDate)}</p>
                <p className="text-xs text-muted-foreground">{view === 'day' ? 'Day view' : 'Week view'}</p>
              </div>
              <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => shiftDate(1)} aria-label="Next">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={jumpToday} className="ml-1">
                <CalendarIcon className="size-4 mr-1.5" />
                Today
              </Button>
              {/* Native date picker — lets the owner jump to any date */}
              <Input
                type="date"
                value={toISODate(selectedDate)}
                onChange={(e) => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  if (!isNaN(d.getTime())) setSelectedDate(d);
                }}
                className="h-9 w-[150px] ml-1"
                aria-label="Pick a date"
              />
            </div>

            {/* Right: Day/Week toggle + team filter + Add entry + Refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Day | Week toggle */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                <button
                  onClick={() => setView('day')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    view === 'day' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    view === 'week' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Team filter */}
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="All team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team</SelectItem>
                  {team.map((r) => (
                    <SelectItem key={r.employee.id} value={r.employee.id}>
                      {r.employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button size="sm" onClick={() => setEntryDialog({ mode: 'add' })} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="size-4 mr-1.5" />
                Add entry
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { loadTeam(); }} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Search row (separate so it doesn't crowd the toolbar on mobile) */}
          <div className="mt-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="h-9 w-full sm:w-72"
            />
          </div>
        </CardContent>
      </Card>

      {/* Team table — expandable rows showing time entries (Day view)
          or per-category breakdown (Week view) */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <Users className="size-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">Team Timesheet</h3>
            <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
          </div>
          <Separator className="bg-border/60" />
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <Users className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {team.length === 0 ? 'No employees found.' : 'No employees match your filter.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[36rem] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    {view === 'day' ? (
                      <>
                        <TableHead className="w-24">Clock In</TableHead>
                        <TableHead className="w-24">Clock Out</TableHead>
                        <TableHead className="text-right w-24">Hours</TableHead>
                      </>
                    ) : (
                      <>
                        {/* Week view: per-day columns + total */}
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                          <TableHead key={d} className="text-right w-16 text-xs">{d}</TableHead>
                        ))}
                        <TableHead className="text-right w-24">Total</TableHead>
                      </>
                    )}
                    <TableHead className="w-10 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const isExpanded = expandedEmp === row.employee.id;
                    const entries = row.entries ?? [];
                    return (
                      <Fragment key={row.employee.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => setExpandedEmp(isExpanded ? null : row.employee.id)}
                        >
                          <TableCell className="p-2">
                            <ChevronRight className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                                  {initials(row.employee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{row.employee.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{row.employee.role || 'Employee'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.currentShift ? (
                              <Badge variant="outline" className={SHIFT_STATUS_STYLES[row.currentShift.status]}>
                                {row.currentShift.status === 'on_break' ? 'On Break' : 'Active'}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Clocked out</span>
                            )}
                          </TableCell>
                          {view === 'day' ? (
                            <>
                              <TableCell className="text-sm text-muted-foreground tabular-nums">
                                {row.currentShift ? fmtClock(row.currentShift.clockIn) : (row.lastClockIn ? fmtClock(row.lastClockIn) : '—')}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground tabular-nums">
                                {row.currentShift ? '—' : (entries[0]?.clockOut ? fmtClock(entries[0].clockOut) : '—')}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium tabular-nums">
                                {fmtMinsStyled(row.period.workingMinutes, durationFormat)}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              {(() => {
                                // Per-day breakdown from the API (Mon..Sun).
                                // Falls back to '—' for days with no tracked time.
                                const byDay = row.period.byDay;
                                return [0, 1, 2, 3, 4, 5, 6].map((i) => (
                                  <TableCell key={i} className="text-right text-xs text-muted-foreground tabular-nums">
                                    {byDay && byDay[i] > 0 ? fmtMins(byDay[i]) : '—'}
                                  </TableCell>
                                ));
                              })()}
                              <TableCell className="text-right text-sm font-bold tabular-nums">
                                {fmtMinsStyled(row.period.workingMinutes, durationFormat)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEntryDialog({ mode: 'add', employeeId: row.employee.id });
                              }}
                              title="Add entry for this employee"
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={view === 'day' ? 7 : 11} className="p-4">
                              <ExpandedEntryList
                                entries={entries}
                                row={row}
                                view={view}
                                durationFormat={durationFormat}
                                onEdit={(entry) => setEntryDialog({ mode: 'edit', entry, employeeId: row.employee.id })}
                                onAdd={() => setEntryDialog({ mode: 'add', employeeId: row.employee.id })}
                                onChanged={onEntryChanged}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit entry dialog */}
      {entryDialog && (
        <AddEditEntryDialog
          mode={entryDialog.mode}
          entry={entryDialog.entry}
          presetEmployeeId={entryDialog.employeeId}
          employees={team.map((r) => ({ id: r.employee.id, name: r.employee.name, role: r.employee.role }))}
          onClose={() => setEntryDialog(null)}
          onSaved={onEntryChanged}
        />
      )}
    </div>
  );
}

// ── Expanded row: list of time entries (Day view) or category breakdown ────

function ExpandedEntryList({
  entries,
  row,
  view,
  durationFormat,
  onEdit,
  onAdd,
  onChanged,
}: {
  entries: TimeEntry[];
  row: TeamRow;
  view: 'day' | 'week';
  durationFormat: 'hours_minutes' | 'decimal';
  onEdit: (entry: TimeEntry) => void;
  onAdd: () => void;
  onChanged: () => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (entryId: string) => {
    setDeleting(entryId);
    try {
      const res = await authFetch(`/api/time-tracking/entries/${entryId}?XTransformPort=3000`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Time entry deleted');
        onChanged();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to delete entry' }));
        toast.error(err.error || 'Failed to delete entry');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(null);
    }
  };

  if (view === 'week') {
    // Week view: show the category breakdown (aggregated across the week)
    const byCategory = row.period.byCategory ?? {};
    const categories = Object.keys(byCategory).filter((k) => byCategory[k] > 0);
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Category breakdown ({fmtPeriodLabel('week', new Date())})
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No tracked time this week.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;
              return (
                <Badge key={cat} variant="outline" className={meta.tint}>
                  <Icon className="size-3 mr-1" />
                  {meta.label}: {fmtMinsStyled(byCategory[cat], durationFormat)}
                </Badge>
              );
            })}
          </div>
        )}
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="size-4 mr-1.5" />
          Add entry
        </Button>
      </div>
    );
  }

  // Day view: list the individual time entries with GPS waypoints
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Time entries ({entries.length})
        </p>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="size-4 mr-1.5" />
          Add entry
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No time entries for this day.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const meta = getCategoryMeta(e.category);
            const Icon = meta.icon;
            const hasGps = (e.clockInLat != null && e.clockInLng != null) || (e.clockOutLat != null && e.clockOutLng != null);
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
              >
                <div className={`flex items-center justify-center size-8 rounded-md shrink-0 ${meta.tint}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{meta.label}</span>
                    {e.isManual && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">Manual</Badge>
                    )}
                    {e.approvalStatus === 'approved' && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="size-2.5 mr-0.5" />Approved
                      </Badge>
                    )}
                    {e.approvalStatus === 'rejected' && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 bg-red-50 text-red-700">
                        <XCircle className="size-2.5 mr-0.5" />Rejected
                      </Badge>
                    )}
                    {e.status === 'active' && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />Running
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {fmtClock(e.clockIn)} – {fmtClock(e.clockOut)} · {fmtMinsStyled(e.workingMinutes || e.totalMinutes, durationFormat)}
                  </p>
                  {e.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">"{e.notes}"</p>
                  )}
                  {/* GPS waypoints — show a map pin + coordinates if captured */}
                  {hasGps && (
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {e.clockInLat != null && e.clockInLng != null && (
                        <span className="inline-flex items-center gap-1" title={`Clock-in GPS: ${e.clockInLat.toFixed(5)}, ${e.clockInLng.toFixed(5)}`}>
                          <MapPin className="size-3 text-emerald-600" />
                          In: {e.clockInLat.toFixed(4)}, {e.clockInLng.toFixed(4)}
                        </span>
                      )}
                      {e.clockOutLat != null && e.clockOutLng != null && (
                        <span className="inline-flex items-center gap-1" title={`Clock-out GPS: ${e.clockOutLat.toFixed(5)}, ${e.clockOutLng.toFixed(5)}`}>
                          <MapPin className="size-3 text-red-600" />
                          Out: {e.clockOutLat.toFixed(4)}, {e.clockOutLng.toFixed(4)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onEdit(e)}
                    title="Edit entry"
                    disabled={e.status === 'active'}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => handleDelete(e.id)}
                    disabled={deleting === e.id || e.status === 'active'}
                    title={e.status === 'active' ? "Can't delete a running timer" : 'Delete entry'}
                  >
                    {deleting === e.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Add / Edit manual time entry dialog (Jobber "Add entry" flow) ──────────

function AddEditEntryDialog({
  mode,
  entry,
  presetEmployeeId,
  employees,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  entry?: TimeEntry;
  presetEmployeeId?: string;
  employees: Array<{ id: string; name: string; role?: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === 'edit';
  const [saving, setSaving] = useState(false);

  // Form state
  const [employeeId, setEmployeeId] = useState(entry?.employeeId || presetEmployeeId || employees[0]?.id || '');
  const [jobId, setJobId] = useState(entry?.jobId || '');
  const [category, setCategory] = useState(entry?.category || 'work');
  const [startDate, setStartDate] = useState(() => {
    if (entry?.clockIn) {
      return toISODate(new Date(entry.clockIn));
    }
    return toISODate(new Date());
  });
  const [startTime, setStartTime] = useState(() => {
    if (entry?.clockIn) {
      try {
        return new Date(entry.clockIn).toTimeString().slice(0, 5);
      } catch { return '09:00'; }
    }
    return '09:00';
  });
  const [endTime, setEndTime] = useState(() => {
    if (entry?.clockOut) {
      try {
        return new Date(entry.clockOut).toTimeString().slice(0, 5);
      } catch { return '17:00'; }
    }
    return '17:00';
  });
  const [notes, setNotes] = useState(entry?.notes || '');

  const handleSubmit = async () => {
    if (!employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!startDate || !startTime || !endTime) {
      toast.error('Date and times are required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        employeeId,
        jobId: jobId || null,
        category,
        startDate,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
      };
      const url = isEdit
        ? `/api/time-tracking/entries/${entry!.id}?XTransformPort=3000`
        : '/api/time-tracking/entries?XTransformPort=3000';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(isEdit ? 'Time entry updated' : 'Time entry added');
        onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({ error: `Failed to ${isEdit ? 'update' : 'add'} entry` }));
        toast.error(err.error || `Failed to ${isEdit ? 'update' : 'add'} entry`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // Category options — the 5 built-ins + a few common custom ones. In a
  // future iteration this list will come from the tenant's timesheet settings.
  const categoryOptions = [
    { value: 'work', label: 'Work' },
    { value: 'break', label: 'Break (unpaid)' },
    { value: 'driving', label: 'Driving' },
    { value: 'office', label: 'Office' },
    { value: 'supplies', label: 'Supplies' },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-emerald-600" />
            {isEdit ? 'Edit Time Entry' : 'Add Time Entry'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this time entry. Editing an approved entry will reset it to pending.'
              : 'Manually log time for a team member. The entry will be marked as pending for approval.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Employee */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-employee">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={isEdit}>
              <SelectTrigger id="entry-employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}{e.role ? ` — ${e.role}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="entry-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-job">Job ID (optional)</Label>
            <Input
              id="entry-job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Link to a specific job (leave empty for general time)"
            />
          </div>

          {/* Date + times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-date">Date</Label>
              <Input
                id="entry-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-start">Start</Label>
              <Input
                id="entry-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-end">End</Label>
              <Input
                id="entry-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-notes">Notes (optional)</Label>
            <Textarea
              id="entry-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was worked on?"
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
            {isEdit ? 'Save Changes' : 'Add Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Small building blocks
// ============================================================

function SummaryCard({
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
  tint: 'emerald' | 'amber' | 'blue';
}) {
  const tints: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
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

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold mt-0.5 truncate">{value}</p>
      <p className="text-xs text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

export default TimesheetView;

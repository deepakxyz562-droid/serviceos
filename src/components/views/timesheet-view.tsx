'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Loader2,
  Briefcase,
  MapPin,
  History,
  CircleDot,
  UserCog,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

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
  today: { totalMinutes: number; workingMinutes: number; breakMinutes: number; shiftsCount: number };
  period: { totalMinutes: number; workingMinutes: number; breakMinutes: number; shiftsCount: number };
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

// ============================================================
// Main view (role-aware)
// ============================================================

export function TimesheetView() {
  const auth = useAppStore((s) => s.auth);
  const user = auth?.user;
  const isEmployee = user?.role === 'employee';

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

      {isEmployee ? <EmployeeTimesheet /> : <OwnerTimesheet />}
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
            <ScrollArea className="max-h-[28rem]">
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
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Owner side — team table + drilldown
// ============================================================

function OwnerTimesheet() {
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [search, setSearch] = useState('');
  const [totals, setTotals] = useState({ employeesCount: 0, clockedInCount: 0, todayWorkingMinutes: 0, periodWorkingMinutes: 0 });
  const [periodLabel, setPeriodLabel] = useState('Today');
  const [drillEmployee, setDrillEmployee] = useState<TeamRow | null>(null);
  const [tick, setTick] = useState(0);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/time-tracking/team?period=${period}`);
      if (!res.ok) throw new Error('Failed to load team timesheet');
      const data = await res.json();
      setTeam(data.team || []);
      setTotals(data.totals || { employeesCount: 0, clockedInCount: 0, todayWorkingMinutes: 0, periodWorkingMinutes: 0 });
      setPeriodLabel(data.periodLabel || 'Today');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load team timesheet');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // Live refresh for active timers
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;

  const filtered = useMemo(() => {
    if (!search.trim()) return team;
    const q = search.toLowerCase();
    return team.filter((r) => r.employee.name.toLowerCase().includes(q) || r.employee.role?.toLowerCase().includes(q));
  }, [team, search]);

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
          value={fmtMins(totals.todayWorkingMinutes)}
          sub="Whole team today"
          tint="emerald"
        />
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{periodLabel}</p>
                <p className="text-lg font-bold mt-1">{fmtMins(totals.periodWorkingMinutes)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Team working hours</p>
              </div>
              <div className="flex items-center justify-center size-9 rounded-lg shrink-0 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <CalendarDays className="size-4.5" />
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

      {/* Team table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">Team Timesheet</h3>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee..."
                className="h-9 w-full sm:w-56"
              />
              <Button variant="ghost" size="sm" onClick={loadTeam} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
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
                {team.length === 0 ? 'No employees found.' : 'No employees match your search.'}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[32rem]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Employee</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-28">Clock In</TableHead>
                    <TableHead className="text-right w-28">Today</TableHead>
                    <TableHead className="text-right w-32">{periodLabel}</TableHead>
                    <TableHead className="w-10 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow
                      key={row.employee.id}
                      className="cursor-pointer"
                      onClick={() => setDrillEmployee(row)}
                    >
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
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {row.currentShift ? fmtClock(row.currentShift.clockIn) : (row.lastClockIn ? fmtClock(row.lastClockIn) : '—')}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {fmtMins(row.today.workingMinutes)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {fmtMins(row.period.workingMinutes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Drilldown dialog */}
      {drillEmployee && (
        <EmployeeDrilldown
          row={drillEmployee}
          onClose={() => setDrillEmployee(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Owner → employee drilldown (loads that employee's shifts)
// ============================================================

function EmployeeDrilldown({ row, onClose }: { row: TeamRow; onClose: () => void }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/employees/${row.employee.id}/shifts?days=30`);
        if (!res.ok) throw new Error('Failed to load shifts');
        const data = await res.json();
        if (cancelled) return;
        const today = data.today ? [data.today] : [];
        const recent = (data.recent || []).filter((s: Shift) => !data.today || s.id !== data.today.id);
        setShifts([...today, ...recent]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load shifts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.employee.id]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                {initials(row.employee.name)}
              </AvatarFallback>
            </Avatar>
            <span>{row.employee.name}</span>
            {row.currentShift && (
              <Badge variant="outline" className={SHIFT_STATUS_STYLES[row.currentShift.status]}>
                {row.currentShift.status === 'on_break' ? 'On Break' : 'Active'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {row.employee.role || 'Employee'} · Shift history (last 30 days)
          </DialogDescription>
        </DialogHeader>

        {/* Mini summary */}
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Today" value={fmtMins(row.today.workingMinutes)} sub={`${row.today.shiftsCount} shift(s)`} />
          <MiniStat label="This Week" value={fmtMins(row.period.workingMinutes)} sub={`${row.period.shiftsCount} shift(s)`} />
          <MiniStat
            label="Status"
            value={row.currentShift ? (row.currentShift.status === 'on_break' ? 'On Break' : 'Active') : 'Off'}
            sub={row.currentShift ? `Since ${fmtClock(row.currentShift.clockIn)}` : 'Not clocked in'}
          />
        </div>

        <Separator className="bg-border/60" />

        {/* Shift list */}
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No shifts recorded in the last 30 days.</p>
        ) : (
          <ScrollArea className="max-h-[22rem]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead className="w-24">In</TableHead>
                  <TableHead className="w-24">Out</TableHead>
                  <TableHead className="text-right w-24">Working</TableHead>
                  <TableHead className="text-right w-20">Break</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">{fmtDate(s.clockIn)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{fmtClock(s.clockIn)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{fmtClock(s.clockOut)}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{fmtMins(s.workingMinutes)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{fmtMins(s.breakMinutes)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SHIFT_STATUS_STYLES[s.status]}>
                        {s.status === 'on_break' ? 'Break' : s.status === 'active' ? 'Active' : 'Done'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
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

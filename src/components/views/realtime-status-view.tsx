'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, CheckCircle2, Clock, Circle, ShieldCheck, Send, MapPin,
  ArrowRight, Briefcase, Battery, BatteryCharging, BatteryLow,
  BatteryMedium, BatteryFull, Navigation, RefreshCw, Star, Filter,
  Settings2, ArrowUpRight, ArrowDownRight, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/client-auth';
import { useRealtime } from '@/hooks/use-realtime';

// ─── Shared StatCard ──────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, bg, trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color: string; bg: string; trend?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.startsWith('+') ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-500" />
                )}
                <span className={cn('text-[10px] font-medium', trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600')}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl', bg)}><Icon className={cn('size-5', color)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

type EmployeeStatus = 'Available' | 'Busy' | 'Offline' | 'On Leave' | 'In Transit';

interface EmployeeStatusEntry {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: EmployeeStatus;
  lastSeenAt: string | null;
  lastSeenLabel: string;
  currentJob: string | null;
  location: string;
  batteryLevel: number;
  rating: number;
  jobsToday: number;
  avatar?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const statusConfig: Record<EmployeeStatus, { color: string; bgColor: string; dotColor: string; borderColor: string; badgeClass: string }> = {
  'Available': { color: 'text-emerald-700', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500', borderColor: 'border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'Busy': { color: 'text-amber-700', bgColor: 'bg-amber-50', dotColor: 'bg-amber-500', borderColor: 'border-amber-200', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  'Offline': { color: 'text-slate-600', bgColor: 'bg-slate-50', dotColor: 'bg-slate-400', borderColor: 'border-slate-200', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  'On Leave': { color: 'text-blue-700', bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', borderColor: 'border-blue-200', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  'In Transit': { color: 'text-cyan-700', bgColor: 'bg-cyan-50', dotColor: 'bg-cyan-500', borderColor: 'border-cyan-200', badgeClass: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
};

function BatteryIndicator({ level }: { level: number }) {
  const IconComponent = level === 0 ? Battery : level <= 20 ? BatteryLow : level <= 50 ? BatteryMedium : level <= 80 ? BatteryCharging : BatteryFull;
  const color = level === 0 ? 'text-slate-300' : level <= 20 ? 'text-red-500' : level <= 50 ? 'text-amber-500' : 'text-emerald-500';
  return (
    <div className="flex items-center gap-1">
      <IconComponent className={cn('size-3.5', color)} />
      <span className={cn('text-[10px] font-medium', color)}>{level}%</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Map the Employee.status string (raw DB value) to the display status
 * used by the view. Handles legacy values gracefully.
 */
function mapDbStatusToDisplay(rawStatus: string | null | undefined): EmployeeStatus {
  if (!rawStatus) return 'Offline';
  const s = rawStatus.toLowerCase();
  if (s === 'available' || s === 'online') return 'Available';
  if (s === 'busy' || s === 'working' || s === 'in_progress') return 'Busy';
  if (s === 'traveling' || s === 'travel' || s === 'en_route' || s === 'in_transit') return 'In Transit';
  if (s === 'leave' || s === 'on_leave' || s === 'on leave') return 'On Leave';
  return 'Offline';
}

function timeAgo(dateStr: string | null | null): string {
  if (!dateStr) return '—';
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (!Number.isFinite(then)) return '—';
    const diffMs = now - then;
    if (diffMs < 0) return 'just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '—';
  }
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface ApiEmployee {
  id: string;
  name: string;
  role?: string | null;
  status?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  completedJobs?: number | null;
  lastSeenAt?: string | null;
  currentJobId?: string | null;
  avatar?: string | null;
  onLeaveUntil?: string | null;
  phone?: string | null;
}

function mapApiToEntry(emp: ApiEmployee): EmployeeStatusEntry {
  const display = mapDbStatusToDisplay(emp.status);
  return {
    id: emp.id,
    name: emp.name || 'Unknown',
    initials: getInitials(emp.name || ''),
    role: emp.role || 'Technician',
    status: display,
    lastSeenAt: emp.lastSeenAt ?? null,
    lastSeenLabel: timeAgo(emp.lastSeenAt ?? null),
    currentJob: emp.currentJobId ? `Job ${emp.currentJobId.slice(-6)}` : null,
    location: emp.location || (emp.latitude && emp.longitude ? `${emp.latitude.toFixed(3)}, ${emp.longitude.toFixed(3)}` : 'Unknown'),
    batteryLevel: 0, // Not tracked on Employee model — would need GPS pings
    rating: typeof emp.rating === 'number' ? Math.round(emp.rating * 10) / 10 : 0,
    jobsToday: typeof emp.completedJobs === 'number' ? emp.completedJobs : 0,
    avatar: emp.avatar ?? null,
    latitude: emp.latitude ?? null,
    longitude: emp.longitude ?? null,
  };
}

export function RealtimeStatusView() {
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'All'>('All');
  const [employees, setEmployees] = useState<EmployeeStatusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPollRef = useRef<number>(Date.now());

  // ── Fetch the employee list with current status from /api/employees ──
  const fetchEmployees = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await authFetch('/api/employees?XTransformPort=3000');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const list: ApiEmployee[] = Array.isArray(data) ? data : (data?.employees ?? []);
      const mapped = list.map(mapApiToEntry);
      setEmployees(mapped);
      setError(null);
      lastPollRef.current = Date.now();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load employees';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch + 30s polling fallback
  useEffect(() => {
    fetchEmployees();
    const interval = setInterval(() => fetchEmployees(true), 30000);
    return () => clearInterval(interval);
  }, [fetchEmployees]);

  // ── Subscribe to realtime status updates ──
  // The useRealtime hook connects to the socket.io mini-service on port
  // 3003 (via the Caddy gateway). When the EventBus emits an
  // `employee.status_changed` event, the bridge POSTs it to the socket
  // server, which fans it out to all subscribed clients in the same
  // tenant room. We use the callback to live-update the entry.
  const { connected: realtimeConnected } = useRealtime({
    enabled: true,
    onEmployeeStatus: (data: any) => {
      const payload = data?.data ?? data;
      const empId = payload?.employeeId ?? data?.employeeId;
      if (!empId) return;
      const newStatus = mapDbStatusToDisplay(payload?.status ?? payload?.toStatus ?? data?.status);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === empId
            ? {
                ...e,
                status: newStatus,
                lastSeenAt: new Date().toISOString(),
                lastSeenLabel: 'just now',
              }
            : e,
        ),
      );
    },
  });

  const filteredEmployees = statusFilter === 'All'
    ? employees
    : employees.filter(e => e.status === statusFilter);

  const statusCounts = {
    Available: employees.filter(e => e.status === 'Available').length,
    Busy: employees.filter(e => e.status === 'Busy').length,
    Offline: employees.filter(e => e.status === 'Offline').length,
    'On Leave': employees.filter(e => e.status === 'On Leave').length,
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Activity className="size-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Real-Time Employee Status</h1>
            <p className="text-sm text-muted-foreground">Live tracking and workforce management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'size-2 rounded-full animate-pulse',
              realtimeConnected ? 'bg-emerald-500' : 'bg-slate-300',
            )} />
            <span className="text-[10px] text-muted-foreground">
              {realtimeConnected ? 'Live' : 'Polling'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={() => fetchEmployees(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load employee data: {error}. Retrying every 30s.
          </CardContent>
        </Card>
      )}

      {/* Status Count Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Available" value={statusCounts.Available.toString()} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Busy" value={statusCounts.Busy.toString()} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Offline" value={statusCounts.Offline.toString()} icon={Circle} color="text-slate-500" bg="bg-slate-50" />
        <StatCard title="On Leave" value={statusCounts['On Leave'].toString()} icon={ShieldCheck} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="size-4 text-muted-foreground" />
        {(['All', 'Available', 'Busy', 'In Transit', 'On Leave', 'Offline'] as const).map(status => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            className={cn(
              'h-7 text-xs gap-1.5',
              statusFilter === status && 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
            onClick={() => setStatusFilter(status)}
          >
            {status !== 'All' && (
              <div className={cn('size-2 rounded-full', statusConfig[status].dotColor)} />
            )}
            {status}
            {status !== 'All' && (
              <span className="text-[9px] opacity-70">
                ({employees.filter(e => e.status === status).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No employees {statusFilter !== 'All' ? `with status "${statusFilter}"` : 'found'}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map(emp => {
            const config = statusConfig[emp.status];
            const isOnline = emp.status === 'Available' || emp.status === 'Busy' || emp.status === 'In Transit';
            return (
              <Card key={emp.id} className={cn('hover:shadow-md transition-all relative overflow-hidden', config.borderColor, 'border')}>
                {/* Status bar top */}
                <div className={cn('h-1', config.dotColor)} />
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="size-10">
                        {emp.avatar ? (
                          <AvatarImage src={emp.avatar} alt={emp.name} />
                        ) : null}
                        <AvatarFallback className={cn('text-xs font-semibold', config.bgColor, config.color)}>
                          {emp.initials}
                        </AvatarFallback>
                      </Avatar>
                      {/* Live presence dot */}
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <div className={cn('size-3.5 rounded-full border-2 border-white', config.dotColor)} />
                          <div className={cn('absolute inset-0 size-3.5 rounded-full animate-ping opacity-40', config.dotColor)} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold truncate">{emp.name}</p>
                        <Badge variant="outline" className={cn('text-[9px] shrink-0 px-1.5', config.badgeClass)}>
                          {emp.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{emp.role}</p>
                    </div>
                  </div>

                  {/* Job Assignment */}
                  {emp.currentJob && (
                    <div className="mt-3 p-2 rounded-md bg-muted/50 border">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="size-3 text-emerald-600" />
                        <span className="text-[10px] font-medium text-emerald-700 truncate">{emp.currentJob}</span>
                      </div>
                    </div>
                  )}

                  {/* Info Row */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{emp.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{emp.lastSeenLabel}</span>
                      </div>
                      {emp.batteryLevel > 0 && <BatteryIndicator level={emp.batteryLevel} />}
                    </div>
                  </div>

                  {/* Bottom Stats */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="size-3 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-medium">{emp.rating || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="size-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{emp.jobsToday} completed</span>
                    </div>
                    {emp.status === 'Available' && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        <Send className="size-2.5" />Assign
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Auto-Status Rules */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Settings2 className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Auto-Status Rules</CardTitle>
                <CardDescription className="text-xs">Automatic status transitions based on activity</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Settings2 className="size-3" />Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { rule: 'Job Assigned', from: 'Available', to: 'Busy', icon: Briefcase, active: true },
              { rule: 'Job Completed', from: 'Busy', to: 'Available', icon: CheckCircle2, active: true },
              { rule: 'No Activity (30 min)', from: 'Available', to: 'Offline', icon: Clock, active: true },
              { rule: 'GPS En Route Detected', from: 'Busy', to: 'In Transit', icon: Navigation, active: true },
              { rule: 'Arrival Detected', from: 'In Transit', to: 'Busy', icon: MapPin, active: false },
              { rule: 'Low Battery (&lt;10%)', from: 'Any', to: 'Offline', icon: BatteryLow, active: true },
            ].map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2.5">
                  <rule.icon className="size-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{rule.rule}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {rule.from} <ArrowRight className="inline size-2.5 mx-0.5" /> {rule.to}
                    </p>
                  </div>
                </div>
                <Badge className={cn('text-[9px]', rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                  {rule.active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

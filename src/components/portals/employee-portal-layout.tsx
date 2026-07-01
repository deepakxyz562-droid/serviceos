'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Clock,
  Inbox,
  UserCircle,
  Zap,
  LogOut,
  Menu,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Settings,
  CheckCircle2,
  AlertCircle,
  Timer,
  MapPin,
  Phone,
  Mail,
  Lock,
  Camera,
  Send,
  ArrowRight,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Star,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ──────────────────────────────────────────────────────────────────

type EmployeeSubView = 'home' | 'my-jobs' | 'schedule' | 'attendance' | 'inbox' | 'profile';

type JobStatus = 'assigned' | 'in_progress' | 'completed' | 'pending' | 'cancelled';
type JobPriority = 'high' | 'medium' | 'low';

interface EmployeeRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  role?: string;
  rating?: number;
  employeeId?: string;
}

interface JobCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  status: JobStatus;
  priority: JobPriority;
  type: string;
  address: string;
  assigneeId: string;
  customerId: string;
  quotedAmount: number;
  scheduledAt: string | null;
  createdAt: string;
  customer: JobCustomer | null;
}

interface EmployeeJobsResponse {
  employee: { id: string; name: string; status: string };
  jobs: Job[];
}

interface EmployeePortalLayoutProps {
  onLogout?: () => void;
}

interface MenuItem {
  id: EmployeeSubView;
  label: string;
  icon: React.ElementType;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const menuItems: MenuItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'my-jobs', label: 'My Jobs', icon: Briefcase },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

const pageTitleMap: Record<EmployeeSubView, string> = {
  home: 'Home',
  'my-jobs': 'My Jobs',
  schedule: 'Schedule',
  attendance: 'Attendance',
  inbox: 'Inbox',
  profile: 'Profile',
};

const STATUS_LABEL_MAP: Record<JobStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

// ─── Placeholder data removed — Attendance & Inbox now use real/empty states ──

// ─── Status color helper ────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case 'assigned':
      return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 hover:bg-violet-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 hover:bg-blue-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 hover:bg-amber-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 hover:bg-red-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    // Attendance statuses (kept for AttendanceView)
    case 'Present':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100">{status}</Badge>;
    case 'Today':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 hover:bg-blue-100">{status}</Badge>;
    case 'Absent':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 hover:bg-red-100">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPriorityDot(priority: string) {
  switch (priority) {
    case 'high':
      return <span className="size-2 rounded-full bg-red-500" />;
    case 'medium':
      return <span className="size-2 rounded-full bg-amber-500" />;
    case 'low':
      return <span className="size-2 rounded-full bg-emerald-500" />;
    default:
      return null;
  }
}

// ─── Utility: format date helpers ───────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  } catch {
    return false;
  }
}

function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return d >= startOfWeek && d < endOfWeek;
  } catch {
    return false;
  }
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Shared data hook ───────────────────────────────────────────────────────

function useEmployeeJobs(employeeId: string | null) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(!!employeeId);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!employeeId) return;
    try {
      const res = await fetch(`/api/employees/${employeeId}/jobs?XTransformPort=3000`);
      if (!res.ok) throw new Error(`Failed to fetch jobs (${res.status})`);
      const data: EmployeeJobsResponse = await res.json();
      setJobs(data.jobs ?? []);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}

function useEmployeeRecord(employeeId: string | null) {
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [loading, setLoading] = useState(!!employeeId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    const controller = new AbortController();

    async function fetchEmployee() {
      try {
        const res = await fetch('/api/employees?XTransformPort=3000', { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch employee (${res.status})`);
        const data = await res.json();
        // The API might return an array or a single object; handle both
        const list: EmployeeRecord[] = Array.isArray(data) ? data : data.employees ?? [data];
        const found = list.find((e: EmployeeRecord) => e.id === employeeId || e.employeeId === employeeId);
        if (!cancelled) {
          setEmployee(found ?? list[0] ?? null);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.message || 'Failed to load employee');
          setLoading(false);
        }
      }
    }

    fetchEmployee();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [employeeId]);

  return { employee, loading, error };
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <AlertCircle className="size-10 mx-auto mb-2 text-red-500" />
        <p className="text-sm text-muted-foreground mb-3">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-View: Home ─────────────────────────────────────────────────────────

function HomeView({ employeeId }: { employeeId: string }) {
  const { auth } = useAppStore();
  const { jobs, loading, error, refetch } = useEmployeeJobs(employeeId);
  const { employee } = useEmployeeRecord(employeeId);

  const employeeName = employee?.name || auth.user?.name || auth.user?.email || 'Employee';
  const firstName = employeeName.split(' ')[0] || 'Employee';

  // Compute stats from real data
  const activeJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const thisWeekJobs = jobs.filter((j) => isThisWeek(j.scheduledAt));
  const rating = employee?.rating ?? auth.user?.rating ?? 0;

  // Today's schedule from real data
  const todayJobs = jobs.filter((j) => isToday(j.scheduledAt));

  // Build notifications from recent job changes
  const notifications: { icon: React.ElementType; color: string; bg: string; text: string; time: string }[] = [];
  jobs.slice(0, 6).forEach((job) => {
    const created = new Date(job.createdAt);
    const timeAgo = getTimeAgo(created);
    if (job.status === 'assigned') {
      notifications.push({
        icon: Briefcase, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30',
        text: `New job assigned: ${job.title}`, time: timeAgo,
      });
    } else if (job.status === 'in_progress') {
      notifications.push({
        icon: Timer, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: `Job in progress: ${job.title}`, time: timeAgo,
      });
    } else if (job.status === 'completed') {
      notifications.push({
        icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: `Job completed: ${job.title}`, time: timeAgo,
      });
    } else if (job.status === 'pending') {
      notifications.push({
        icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: `Pending job: ${job.title}`, time: timeAgo,
      });
    }
  });

  const completedCount = completedJobs.length;
  const avgResolution = completedCount > 0 ? '—' : '—';

  if (error) {
    return <ErrorCard message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card className="border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{getGreeting()}, {firstName}! 👋</h2>
              <p className="mt-1 text-emerald-100">Here&apos;s your overview for today, {formatTodayDate()}.</p>
            </div>
            <div className="hidden sm:flex size-16 rounded-full bg-white/20 items-center justify-center backdrop-blur-sm">
              <Zap className="size-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Briefcase className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{activeJobs.length}</p>
              )}
              <p className="text-xs text-muted-foreground">Active Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Calendar className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{thisWeekJobs.length}</p>
              )}
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Star className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{rating > 0 ? rating.toFixed(1) : '—'}</p>
              )}
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
            <CardDescription>Your appointments and tasks for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <LoadingSkeleton lines={3} />
            ) : todayJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="size-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No jobs scheduled for today.</p>
              </div>
            ) : (
              todayJobs.map((job) => (
                <div key={job.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="text-xs font-mono text-muted-foreground min-w-[70px] pt-0.5">
                    {job.scheduledAt ? formatTime(job.scheduledAt) : 'TBD'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                    <Badge variant="outline" className="mt-1 text-[10px] h-5">{job.type || 'Job'}</Badge>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Notifications</CardTitle>
            <CardDescription>Latest updates and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <LoadingSkeleton lines={4} />
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="size-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet.</p>
              </div>
            ) : (
              notifications.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={cn('size-8 rounded-full flex items-center justify-center shrink-0', item.bg)}>
                    <item.icon className={cn('size-4', item.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance This Month</CardTitle>
          <CardDescription>Your key metrics for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="size-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{activeJobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Users className="size-5 text-blue-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{rating > 0 ? `${rating.toFixed(1)}/5` : '—'}</p>
              <p className="text-xs text-muted-foreground">Customer Rating</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Timer className="size-5 text-amber-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{avgResolution}</p>
              <p className="text-xs text-muted-foreground">Avg. Resolution</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="size-5 text-purple-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Jobs Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: My Jobs ──────────────────────────────────────────────────────

function MyJobsView({ employeeId }: { employeeId: string }) {
  const [filter, setFilter] = useState<string>('all');
  const { jobs, loading, error, refetch } = useEmployeeJobs(employeeId);

  const filteredJobs = filter === 'all'
    ? jobs
    : jobs.filter((j) => j.status === filter);

  const filterOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
  ];

  if (error) {
    return <ErrorCard message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Assigned Jobs</CardTitle>
              <CardDescription>View and manage your current job assignments</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filterOptions.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'text-xs h-8',
                    filter === f.value && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <LoadingSkeleton lines={4} />
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="size-10 mx-auto mb-2 opacity-50" />
                <p>No jobs found for this filter.</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0 mt-1">
                      {getPriorityDot(job.priority)}
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">{job.priority}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      {job.address && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{job.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {job.scheduledAt ? `${formatDate(job.scheduledAt)}, ${formatTime(job.scheduledAt)}` : 'Not scheduled'}
                        </span>
                      </div>
                      {job.customer && (
                        <div className="flex items-center gap-2 mt-1">
                          <UserCircle className="size-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{job.customer.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    {getStatusBadge(job.status)}
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      View <ArrowRight className="size-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            {loading ? (
              <div className="h-7 w-8 bg-muted rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-amber-600">{jobs.filter((j) => j.status === 'pending').length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {loading ? (
              <div className="h-7 w-8 bg-muted rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">
                {jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress').length}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {loading ? (
              <div className="h-7 w-8 bg-muted rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600">{jobs.filter((j) => j.status === 'completed').length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-View: Schedule ─────────────────────────────────────────────────────

function ScheduleView({ employeeId }: { employeeId: string }) {
  const { jobs, loading, error, refetch } = useEmployeeJobs(employeeId);

  // Build weekly schedule from real job data
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays: { date: Date; dayName: string; isToday: boolean; jobs: Job[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dayJobs = jobs.filter((j) => {
      if (!j.scheduledAt) return false;
      const jd = new Date(j.scheduledAt);
      return jd.getFullYear() === d.getFullYear() &&
        jd.getMonth() === d.getMonth() &&
        jd.getDate() === d.getDate();
    });
    weekDays.push({
      date: d,
      dayName: getDayName(d),
      isToday: d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(),
      jobs: dayJobs,
    });
  }

  // Upcoming highlights: future jobs sorted by date
  const upcomingJobs = jobs
    .filter((j) => j.scheduledAt && new Date(j.scheduledAt) >= now && j.status !== 'completed' && j.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 4);

  const weekEnd = new Date(startOfWeek);
  weekEnd.setDate(startOfWeek.getDate() + 6);
  const weekLabel = `${formatDate(startOfWeek.toISOString())} – ${formatDate(weekEnd.toISOString())}, ${weekEnd.getFullYear()}`;

  if (error) {
    return <ErrorCard message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Week overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Weekly Schedule</CardTitle>
              <CardDescription>{weekLabel}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton lines={7} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <div
                  key={day.dayName}
                  className={cn(
                    'rounded-lg border p-3 min-h-[120px] transition-colors',
                    day.isToday
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      'text-sm font-semibold',
                      day.isToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                    )}>
                      {day.dayName}
                    </span>
                    {day.isToday && (
                      <Badge className="bg-emerald-600 text-white text-[10px] h-5 border-0">Today</Badge>
                    )}
                  </div>
                  {day.jobs.length > 0 ? (
                    <div className="space-y-1.5">
                      {day.jobs.map((job) => (
                        <div key={job.id} className="text-xs p-1.5 rounded bg-muted/70 text-foreground">
                          <span className="font-mono text-muted-foreground">
                            {job.scheduledAt ? formatTime(job.scheduledAt) : 'TBD'}
                          </span>
                          <span className="block truncate">{job.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No tasks</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Highlights</CardTitle>
          <CardDescription>Important events and deadlines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <LoadingSkeleton lines={4} />
          ) : upcomingJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="size-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming jobs.</p>
            </div>
          ) : (
            upcomingJobs.map((job) => {
              const schedDate = new Date(job.scheduledAt!);
              const monthStr = schedDate.toLocaleDateString('en-US', { month: 'short' });
              const dayStr = schedDate.getDate().toString();
              const isUrgent = job.priority === 'high';
              return (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    'size-10 rounded-lg flex flex-col items-center justify-center shrink-0',
                    isUrgent ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'
                  )}>
                    <span className="text-[10px] font-bold text-muted-foreground">{monthStr}</span>
                    <span className="text-xs font-bold text-foreground">{dayStr}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(job.scheduledAt!)} • {job.type || 'Job'}
                    </p>
                  </div>
                  {isUrgent && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px] h-5">
                      Urgent
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: Attendance ───────────────────────────────────────────────────

function AttendanceView() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Array<{ date: string; checkIn: string; checkOut: string; hours: string }>>([]);

  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setCheckedIn(true);
    setCheckInTime(timeStr);
    setCheckOutTime(null);
  };

  const handleCheckOut = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setCheckedIn(false);
    setCheckOutTime(timeStr);
    if (checkInTime) {
      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      setSessionHistory(prev => [
        { date: dayName, checkIn: checkInTime, checkOut: timeStr, hours: calcHours(checkInTime, timeStr) },
        ...prev,
      ]);
    }
  };

  const calcHours = (inTime: string, outTime: string): string => {
    try {
      const [h1, m1] = inTime.split(':').map(Number);
      const [h2, m2] = outTime.split(':').map(Number);
      const diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diffMins <= 0) return '0h 0m';
      return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    } catch { return '—'; }
  };

  // Build this week's days
  const thisWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + mondayOffset + i);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d,
      isToday: d.toDateString() === new Date().toDateString(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
    };
  });

  return (
    <div className="space-y-6">
      {/* Check-in card */}
      <Card className={cn(
        'border-0 shadow-lg',
        checkedIn
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
          : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                {checkedIn ? 'You are checked in' : 'Ready to start your day?'}
              </h3>
              <p className="text-sm opacity-80 mt-1">
                {checkedIn
                  ? `Checked in at ${checkInTime} — Have a productive day!`
                  : 'Check in to mark your attendance for today.'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {!checkedIn ? (
                <Button
                  onClick={handleCheckIn}
                  className="bg-white text-slate-800 hover:bg-white/90 font-semibold"
                >
                  <Clock className="size-4 mr-2" />
                  Check In
                </Button>
              ) : (
                <Button
                  onClick={handleCheckOut}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Clock className="size-4 mr-2" />
                  Check Out
                </Button>
              )}
            </div>
          </div>
          {checkedIn && (
            <div className="mt-4 flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-green-300" />
              </span>
              <span className="text-sm text-emerald-100">Active session</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This week overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Week</CardTitle>
          <CardDescription>Your attendance for the current week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thisWeekDays.map((day) => {
                  const histEntry = sessionHistory.find(h => h.date.startsWith(day.name));
                  const isToday = day.isToday;
                  return (
                    <TableRow key={day.name}>
                      <TableCell className="font-medium">{day.name} {isToday ? '(Today)' : ''}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {isToday && checkInTime ? checkInTime : histEntry?.checkIn || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isToday && checkOutTime ? checkOutTime : histEntry?.checkOut || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isToday && checkInTime && (checkOutTime || checkedIn)
                          ? (checkOutTime ? calcHours(checkInTime, checkOutTime) : 'In progress')
                          : histEntry?.hours || '—'}
                      </TableCell>
                      <TableCell>
                        {isToday
                          ? (checkInTime ? getStatusBadge('Present') : getStatusBadge('Today'))
                          : day.isPast
                            ? (histEntry ? getStatusBadge('Present') : getStatusBadge('Absent'))
                            : getStatusBadge('Today')
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Session history */}
      {sessionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessionHistory.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{s.date}</span>
                  <span className="text-sm text-muted-foreground">{s.checkIn} → {s.checkOut}</span>
                  <Badge variant="outline" className="text-xs">{s.hours}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly summary from session history */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{sessionHistory.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{checkedIn ? 'Active' : '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Current Status</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{checkInTime || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Today&apos;s Check In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{checkOutTime || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Today&apos;s Check Out</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-View: Inbox ────────────────────────────────────────────────────────

function InboxView() {
  return (
    <div className="space-y-6">
      {/* Inbox header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Messages</h3>
        </div>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Mail className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No messages yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your team messages and notifications will appear here. Check back when your manager sends you a message.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: Profile ──────────────────────────────────────────────────────

function ProfileView({ employeeId }: { employeeId: string }) {
  const { auth } = useAppStore();
  const { employee } = useEmployeeRecord(employeeId);

  const employeeName = employee?.name || auth.user?.name || 'Employee';
  const employeeEmail = employee?.email || auth.user?.email || '';
  const employeePhone = employee?.phone || '';
  const employeeRole = employee?.role || 'Field Service Technician';
  const employeeStatus = employee?.status || 'active';
  const displayId = employee?.employeeId || employee?.id || employeeId;

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                <AvatarFallback className="text-2xl font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors">
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{employeeName}</h2>
              <p className="text-sm text-muted-foreground">{employeeRole}</p>
              <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start">
                <Badge className={cn(
                  'border-0',
                  employeeStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                )}>
                  {employeeStatus.charAt(0).toUpperCase() + employeeStatus.slice(1)}
                </Badge>
                <span className="text-xs text-muted-foreground">Employee ID: {displayId.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profile-name" className="text-xs">Full Name</Label>
              <Input id="profile-name" defaultValue={employeeName} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-email" className="text-xs">Email Address</Label>
              <Input id="profile-email" defaultValue={employeeEmail} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-phone" className="text-xs">Phone Number</Label>
              <Input id="profile-phone" defaultValue={employeePhone || ''} placeholder="Enter phone number" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-location" className="text-xs">Location</Label>
              <Input id="profile-location" defaultValue="" placeholder="Enter location" className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="current-password" className="text-xs">Current Password</Label>
              <Input id="current-password" type="password" placeholder="Enter current password" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-xs">New Password</Label>
              <Input id="new-password" type="password" placeholder="Enter new password" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-xs">Confirm New Password</Label>
              <Input id="confirm-password" type="password" placeholder="Confirm new password" className="mt-1 h-9 text-sm" />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Lock className="size-3.5" />
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Contact</CardTitle>
          <CardDescription>Emergency contact information on file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input defaultValue="" placeholder="Enter contact name" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Relationship</Label>
              <Input defaultValue="" placeholder="Enter relationship" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input defaultValue="" placeholder="Enter phone number" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Alternate Phone</Label>
              <Input defaultValue="" placeholder="Enter alternate phone" className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm">Update Contact</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sidebar Component ──────────────────────────────────────────────────────

function EmployeeSidebar({
  activeView,
  onViewChange,
  onLogout,
  employeeName,
  employeeRole,
}: {
  activeView: EmployeeSubView;
  onViewChange: (view: EmployeeSubView) => void;
  onLogout?: () => void;
  employeeName: string;
  employeeRole: string;
}) {
  return (
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Zap className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">ServiceOS</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{employeeName}</p>
            <p className="text-xs text-muted-foreground truncate">{employeeRole}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Menu items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-l-[3px] border-emerald-600 pl-[9px]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent pl-[9px]'
                )}
              >
                <item.icon className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="size-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EmployeePortalLayout({ onLogout }: EmployeePortalLayoutProps) {
  const [activeView, setActiveView] = useState<EmployeeSubView>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { auth } = useAppStore();

  const employeeId = auth.user?.employeeId ?? null;
  const { employee } = useEmployeeRecord(employeeId);

  const employeeName = employee?.name || auth.user?.name || 'Employee';
  const employeeRole = employee?.role || 'Field Service Technician';

  const handleViewChange = (view: EmployeeSubView) => {
    setActiveView(view);
    setMobileSidebarOpen(false);
  };

  // Render the active sub-view
  const renderSubView = () => {
    if (!employeeId) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-12 mx-auto mb-3 text-amber-500" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Employee ID Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your account is not linked to an employee record. Please log out and try again, or contact your administrator.
            </p>
            <Button onClick={onLogout} variant="outline" size="sm">
              <LogOut className="size-4 mr-2" />
              Re-login
            </Button>
          </CardContent>
        </Card>
      );
    }

    switch (activeView) {
      case 'home':
        return <HomeView employeeId={employeeId} />;
      case 'my-jobs':
        return <MyJobsView employeeId={employeeId} />;
      case 'schedule':
        return <ScheduleView employeeId={employeeId} />;
      case 'attendance':
        return <AttendanceView />;
      case 'inbox':
        return <InboxView />;
      case 'profile':
        return <ProfileView employeeId={employeeId} />;
      default:
        return <HomeView employeeId={employeeId} />;
    }
  };

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-64 shrink-0 border-r border-border bg-card">
          <EmployeeSidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            onLogout={onLogout}
            employeeName={employeeName}
            employeeRole={employeeRole}
          />
        </aside>
      )}

      {/* Mobile sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Employee portal navigation</SheetDescription>
            </SheetHeader>
            <EmployeeSidebar
              activeView={activeView}
              onViewChange={handleViewChange}
              onLogout={onLogout}
              employeeName={employeeName}
              employeeRole={employeeRole}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 -ml-1"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            )}
            <h1 className="text-base font-semibold text-foreground">
              {pageTitleMap[activeView]}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <ThemeToggleButton />

            {/* Notification bell */}
            <Button variant="ghost" size="icon" className="size-9 relative">
              <Bell className="size-[18px]" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
              <span className="sr-only">Notifications</span>
            </Button>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveView('profile')}>
                  <UserCircle className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView('inbox')}>
                  <Settings className="size-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="size-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-muted/30 p-4 lg:p-6">
          {renderSubView()}
        </main>
      </div>
    </div>
  );
}

// ─── Theme Toggle Button ────────────────────────────────────────────────────

function ThemeToggleButton() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={toggleDarkMode}
    >
      {darkMode ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}

// ─── Utility: time ago ──────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(date.toISOString());
}

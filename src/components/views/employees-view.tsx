'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import {
  Users, UserPlus, Shield, Clock, CheckCircle2, UserCheck,
  Search, Phone, MapPin, Star, Briefcase, Loader2,
  Trash2, Pencil, MoreVertical, UserX,
  Mail, Send, KeyRound, Power, Globe, Copy, ExternalLink, AlertCircle,
  ArrowLeft, Calendar, FileText, Wrench, MapPinned, Wallet, Activity as ActivityIcon,
  TrendingUp, TrendingDown, Route, IndianRupee, Timer, CalendarCheck, AlertTriangle,
  IdCard, FileStack, FileCheck, FileWarning, FileX, Package, QrCode, Wrench as WrenchIcon,
  Navigation, Clock3, Coffee, PlayCircle, StopCircle, Award, MessageSquare,
  ThumbsUp, ThumbsDown, Building2, ChevronRight, Sparkles, FileBadge,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authFetch } from '@/lib/client-auth';
import { useCompanyCurrency } from '@/hooks/use-company-currency';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  status: string;
  avatar: string | null;
  skills: string;
  location: string | null;
  rating: number;
  completedJobs: number;
  whatsappId: string | null;
  userId?: string | null;
  invitationStatus?: string;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  lastSeenAt?: string | null;
  lastLocationAt?: string | null;
  [key: string]: unknown;
}

type PeriodType = 'daily' | 'weekly' | 'monthly';

interface PerformanceMetrics {
  jobsCompleted: number;
  jobsAssigned: number;
  hoursWorked: number;
  travelDistanceKm: number;
  travelMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  avgCompletionMinutes: number;
  customerRating: number;
  revenueGenerated: number;
  lateArrivals: number;
  attendanceDays: number;
}

interface ChartBucket {
  date: string;
  label: string;
  jobsCompleted: number;
  revenue: number;
}

interface RecentJob {
  id: string;
  jobNumber: string | null;
  title: string;
  status: string;
  customerName: string | null;
  customerRating: number | null;
  createdAt: string;
  completedAt: string | null;
  durationMinutes: number | null;
}

interface PerformanceResponse {
  employee: { id: string; name: string; avatar: string | null; role: string };
  metrics: PerformanceMetrics;
  previousMetrics: PerformanceMetrics;
  period: PeriodType;
  startDate: string;
  endDate: string;
  chartBuckets: ChartBucket[];
  recentJobs: RecentJob[];
}

interface EmployeeJob {
  id: string;
  jobNumber: string | null;
  title: string;
  status: string;
  customerName: string | null;
  customer?: { id: string; name: string; phone: string; email: string | null; address: string | null } | null;
  scheduledAt: string | null;
  createdAt: string;
  completedAt: string | null;
  [key: string]: unknown;
}

interface ShiftBreak {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  reason?: string;
}

interface SerializedShift {
  id: string;
  employeeId: string;
  shiftDate: string;
  clockIn: string;
  clockOut: string | null;
  breaks: ShiftBreak[];
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  status: string;
  notes: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
}

interface ShiftsResponse {
  employee: { id: string; name: string; role: string; avatar: string | null };
  today: SerializedShift | null;
  todayTotals: {
    totalMinutes: number;
    workingMinutes: number;
    breakMinutes: number;
    breaks: ShiftBreak[];
  } | null;
  recent: SerializedShift[];
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  jobId: string | null;
  customerId: string | null;
  employeeId: string | null;
  source: string;
  status: string;
  npsScore: number | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface EmployeeDocument {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  accessLevel: string;
  employeeId: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface DocumentsResponse {
  documents: EmployeeDocument[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ActivityLogEntry {
  id: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  actorId: string | null;
  actorName: string | null;
  actorType: string | null;
  action: string;
  description: string;
  severity: string;
  metadataJson: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ActivityLogsResponse {
  logs: ActivityLogEntry[];
  total: number;
}

interface RoutePathPoint {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracy?: number | null;
}

interface RouteHistoryEntry {
  id: string;
  jobId: string | null;
  startedAt: string;
  endedAt: string | null;
  arrivedAt: string | null;
  status: string;
  distanceMeters: number;
  durationMinutes: number;
  etaMinutes: number | null;
  avgSpeedKmh: number;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  path: RoutePathPoint[];
}

interface RouteResponse {
  employeeId: string;
  date: string;
  jobId: string | null;
  routes: RouteHistoryEntry[];
  gpsPoints: { id: string; latitude: number; longitude: number; capturedAt: string; isMoving: boolean; }[];
  path: RoutePathPoint[];
  summary: {
    totalDistanceMeters: number;
    totalDistanceKm: number;
    totalDurationMinutes: number;
    routeCount: number;
    gpsPointCount: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getStatusColor(status: string): string {
  const normalized = status === 'busy' ? 'on_job' : status;
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    on_job: 'bg-amber-100 text-amber-700 border-amber-200',
    on_leave: 'bg-purple-100 text-purple-700 border-purple-200',
    offline: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[normalized] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getStatusDot(status: string): string {
  const normalized = status === 'busy' ? 'on_job' : status;
  const map: Record<string, string> = {
    available: 'fill-emerald-500 text-emerald-500',
    on_job: 'fill-amber-500 text-amber-500',
    on_leave: 'fill-purple-500 text-purple-500',
    offline: 'fill-slate-400 text-slate-400',
  };
  return map[normalized] || 'fill-gray-400 text-gray-400';
}

function apiUrl(path: string) {
  return `${path}?XTransformPort=3000`;
}

function getInvitationBadge(status?: string) {
  if (!status || status === 'none') return null;
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Invited', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    accepted: { label: 'Portal', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    disabled: { label: 'Disabled', className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800' },
  };
  const c = config[status];
  if (!c) return null;
  return (
    <Badge variant="outline" className={cn('text-[10px]', c.className)}>
      <span className="size-1.5 rounded-full bg-current mr-1" />
      {c.label}
    </Badge>
  );
}

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Driver' },
  { value: 'technician', label: 'Technician' },
  { value: 'manager', label: 'Manager' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'installer', label: 'Installer' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'on_job', label: 'On Job' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'offline', label: 'Offline' },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return '';
  }
}

function trendPct(curr: number, prev: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (prev === 0 && curr === 0) return { pct: 0, dir: 'flat' };
  if (prev === 0) return { pct: 100, dir: 'up' };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, dir: 'flat' };
  return { pct, dir: pct > 0 ? 'up' : 'down' };
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'size-4' : size === 'md' ? 'size-3.5' : 'size-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            cls,
            i <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted-foreground/40',
          )}
        />
      ))}
    </div>
  );
}

// ─── KPI Card (reused from employee-performance-view) ────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  bg: string;
  color: string;
  trend?: { pct: number; dir: 'up' | 'down' | 'flat' };
  lowerIsBetter?: boolean;
  extra?: React.ReactNode;
}

function KpiCard({ title, value, subtitle, icon: Icon, bg, color, trend, lowerIsBetter, extra }: KpiCardProps) {
  const showTrend = trend && trend.dir !== 'flat';
  const isGood = !showTrend ? null : lowerIsBetter ? trend.dir === 'down' : trend.dir === 'up';
  const trendColor = !showTrend ? '' : isGood ? 'text-emerald-600' : 'text-red-600';
  const TrendIcon = !showTrend ? null : trend.dir === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
            {showTrend && TrendIcon && (
              <div className="flex items-center gap-1 mt-1.5">
                <TrendIcon className={cn('size-3.5', trendColor)} />
                <span className={cn('text-[11px] font-semibold', trendColor)}>
                  {trend.dir === 'up' ? '+' : ''}{trend.pct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground">vs prev</span>
              </div>
            )}
            {extra}
          </div>
          <div className={cn('p-2 sm:p-2.5 rounded-xl shrink-0', bg)}>
            <Icon className={cn('size-4 sm:size-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
          <Icon className="size-7 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Status Badge helpers ────────────────────────────────────────────────────

function jobStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    assigned: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  return map[status] || 'bg-muted text-muted-foreground border-border';
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmployeesView() {
  const { currentWorkspaceId, auth } = useAppStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listTab, setListTab] = useState<'list' | 'teams'>('list');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Invitation/portal management state
  const [inviteResult, setInviteResult] = useState<{ url: string; email: string; message: string; mode: 'invite' | 'reset' } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('driver');
  const [formStatus, setFormStatus] = useState('available');
  const [formLocation, setFormLocation] = useState('');
  const [formWhatsappId, setFormWhatsappId] = useState('');
  const [formSkills, setFormSkills] = useState('');

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/employees'));
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load employees');
        toast.error('Failed to load employees');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ─── Invitation / Portal Management Handlers ────────────────────────────

  const handleSendInvite = async (emp: Employee) => {
    if (!emp.email) {
      toast.error('Employee has no email address. Add an email first.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await authFetch(apiUrl(`/api/employees/${emp.id}/invite`), {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');
      setInviteResult({
        url: data.activationUrl,
        email: data.email,
        message: data.message,
        mode: 'invite',
      });
      toast.success('Invitation link generated!');
      fetchEmployees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResetPassword = async (emp: Employee) => {
    if (!emp.email) {
      toast.error('Employee has no email address.');
      return;
    }
    if (!emp.userId) {
      toast.error('Employee has no user account. Send an invitation first.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await authFetch(apiUrl(`/api/employees/${emp.id}/reset-password`), {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setInviteResult({
        url: data.resetUrl,
        email: data.email,
        message: data.message,
        mode: 'reset',
      });
      toast.success('Password reset link generated!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSuspendToggle = async (emp: Employee) => {
    setActionLoading(true);
    try {
      const res = await authFetch(apiUrl(`/api/employees/${emp.id}/suspend`), {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      toast.success(data.message);
      fetchEmployees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  // ─── Computed ───────────────────────────────────────────────────────────

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const name = (e.name || '').toLowerCase();
      const role = (e.role || '').toLowerCase();
      const phone = (e.phone || '').toLowerCase();
      const skills = (e.skills || '').toLowerCase();
      return name.includes(q) || role.includes(q) || phone.includes(q) || skills.includes(q);
    });
  }, [employees, search]);

  const stats = useMemo(() => ({
    total: employees.length,
    available: employees.filter((e) => e.status === 'available').length,
    onJob: employees.filter((e) => e.status === 'on_job' || e.status === 'busy').length,
    onLeave: employees.filter((e) => e.status === 'on_leave').length,
  }), [employees]);

  // Teams: derive a simple grouping by role (no dedicated team model exists).
  const teams = useMemo(() => {
    const map = new Map<string, { role: string; count: number; available: number; members: Employee[] }>();
    for (const e of employees) {
      const key = e.role || 'other';
      const entry = map.get(key) ?? { role: key, count: 0, available: 0, members: [] };
      entry.count += 1;
      if (e.status === 'available') entry.available += 1;
      entry.members.push(e);
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [employees]);

  // ─── Form helpers ───────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormRole('driver');
    setFormStatus('available');
    setFormLocation('');
    setFormWhatsappId('');
    setFormSkills('');
  };

  const populateFormForEdit = (emp: Employee) => {
    setFormName(emp.name);
    setFormPhone(emp.phone);
    setFormEmail(emp.email || '');
    setFormRole(emp.role);
    setFormStatus(emp.status);
    setFormLocation(emp.location || '');
    setFormWhatsappId(emp.whatsappId || '');
    try {
      const skillsArr = JSON.parse(emp.skills || '[]');
      setFormSkills(Array.isArray(skillsArr) ? skillsArr.join(', ') : '');
    } catch {
      setFormSkills(emp.skills || '');
    }
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setSaving(true);
    try {
      const skills = formSkills.trim()
        ? formSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const res = await fetch(apiUrl('/api/employees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          role: formRole,
          status: formStatus,
          location: formLocation.trim() || undefined,
          whatsappId: formWhatsappId.trim() || undefined,
          skills,
          workspaceId: currentWorkspaceId || auth?.user?.workspaceId || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Employee added successfully');
        setShowAddDialog(false);
        resetForm();
        fetchEmployees();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add employee');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingEmployee || !formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setSaving(true);
    try {
      const skills = formSkills.trim()
        ? formSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const res = await fetch(apiUrl(`/api/employees?id=${editingEmployee.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          role: formRole,
          status: formStatus,
          location: formLocation.trim() || undefined,
          whatsappId: formWhatsappId.trim() || undefined,
          skills,
        }),
      });

      if (res.ok) {
        toast.success('Employee updated successfully');
        setShowEditDialog(false);
        setEditingEmployee(null);
        resetForm();
        fetchEmployees();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update employee');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/employees?id=${id}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Employee deleted');
        setShowDeleteDialog(null);
        if (selectedEmployee?.id === id) {
          setSelectedEmployee(null);
        }
        fetchEmployees();
      } else {
        toast.error('Failed to delete employee');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    populateFormForEdit(emp);
    setShowEditDialog(true);
  };

  // ─── Shared form content ───────────────────────────────────────────────

  const formContent = (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input placeholder="e.g., John Smith" value={formName} onChange={e => setFormName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Phone Number *</Label>
        <Input placeholder="e.g., +919876543210" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" placeholder="e.g., john@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
        <p className="text-xs text-muted-foreground">Required to send portal invitations</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={formRole} onValueChange={setFormRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formStatus} onValueChange={setFormStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input placeholder="e.g., Mumbai, Delhi" value={formLocation} onChange={e => setFormLocation(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>WhatsApp ID</Label>
        <Input placeholder="e.g., 919876543210" value={formWhatsappId} onChange={e => setFormWhatsappId(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Skills (comma separated)</Label>
        <Input placeholder="e.g., Plumbing, Electrical, Carpentry" value={formSkills} onChange={e => setFormSkills(e.target.value)} />
      </div>
    </div>
  );

  // ─── Render: Detail Mode ─────────────────────────────────────────────────

  if (selectedEmployee) {
    return (
      <>
        <EmployeeDetail
          employee={selectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          onEdit={() => openEditDialog(selectedEmployee)}
          onDelete={() => setShowDeleteDialog(selectedEmployee.id)}
          onInvite={() => handleSendInvite(selectedEmployee)}
          onResetPassword={() => handleResetPassword(selectedEmployee)}
          onSuspendToggle={() => handleSuspendToggle(selectedEmployee)}
          actionLoading={actionLoading || inviteLoading}
        />

        {/* Edit Employee Dialog */}
        <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingEmployee(null); } }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>Update employee information and settings.</DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingEmployee(null); }}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!formName.trim() || !formPhone.trim() || saving}>
                {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : <><Pencil className="size-4 mr-1.5" /> Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={!!showDeleteDialog} onOpenChange={(open) => { if (!open) setShowDeleteDialog(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Employee</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this employee? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
                <Trash2 className="size-4 mr-1.5" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invitation Link Dialog */}
        <Dialog open={!!inviteResult} onOpenChange={(open) => { if (!open) setInviteResult(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="size-5 text-teal-600" />
                {inviteResult?.mode === 'reset' ? 'Password Reset Link' : 'Invitation Link'}
              </DialogTitle>
              <DialogDescription>{inviteResult?.message}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3">
                <p className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-1">
                  {inviteResult?.mode === 'reset' ? 'Reset Link' : 'Activation Link'}
                </p>
                <p className="text-xs font-mono text-teal-900 dark:text-teal-100 break-all">
                  {inviteResult?.url}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => inviteResult && copyToClipboard(inviteResult.url)}>
                  <Copy className="size-3.5 mr-1.5" /> Copy Link
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => inviteResult && window.open(inviteResult.url, '_blank')}>
                  <ExternalLink className="size-3.5 mr-1.5" /> Open
                </Button>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  Share this link with {inviteResult?.email}. The link expires in {inviteResult?.mode === 'reset' ? '2 hours' : '7 days'}.
                  {inviteResult?.mode === 'invite' && ' They will set their own password on first login.'}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setInviteResult(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ─── Render: List Mode ───────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shrink-0 shadow-sm">
            <Users className="size-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">Employees</h1>
              <Badge variant="secondary" className="text-xs h-6">{stats.total}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your team and staff</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <UserPlus className="size-4 mr-1.5" /> Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onJob}</p>
                <p className="text-xs text-muted-foreground">On Job</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Shield className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onLeave}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, role, or skill..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={listTab} onValueChange={(v) => setListTab(v as 'list' | 'teams')}>
              <TabsList>
                <TabsTrigger value="list" className="text-xs">
                  <Users className="size-3.5 mr-1.5" /> List
                </TabsTrigger>
                <TabsTrigger value="teams" className="text-xs">
                  <Building2 className="size-3.5 mr-1.5" /> Teams
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Content per list tab */}
      {listTab === 'teams' ? (
        <TeamsTab teams={teams} loading={loading} onSelect={(emp) => setSelectedEmployee(emp)} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <Users className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">Failed to load employees</p>
          <p className="text-sm mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={fetchEmployees}>
            <Loader2 className="size-4 mr-1.5" /> Retry
          </Button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="size-14 mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {search ? 'No employees match your search' : 'No employees yet'}
            </p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term' : 'Add your first employee to get started'}
            </p>
            {!search && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <UserPlus className="size-4 mr-1.5" /> Add Employee
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((emp) => {
            let skills: string[] = [];
            try {
              const parsed = JSON.parse(emp.skills || '[]');
              if (Array.isArray(parsed)) skills = parsed;
            } catch { /* ignore */ }

            return (
              <Card
                key={emp.id}
                className="transition-all hover:shadow-md cursor-pointer group"
                onClick={() => setSelectedEmployee(emp)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-12 shrink-0">
                        {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                        <AvatarFallback className={cn(
                          'text-sm font-semibold',
                          emp.status === 'available'
                            ? 'bg-emerald-100 text-emerald-700'
                            : (emp.status === 'on_job' || emp.status === 'busy')
                            ? 'bg-amber-100 text-amber-700'
                            : emp.status === 'on_leave'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        )}>
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate group-hover:text-emerald-600 transition-colors">{emp.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{emp.role}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setSelectedEmployee(emp)}>
                          <ArrowLeft className="size-3 mr-2 rotate-180" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(emp)}>
                          <Pencil className="size-3 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(!emp.invitationStatus || emp.invitationStatus === 'none') && (
                          <DropdownMenuItem onClick={() => handleSendInvite(emp)} disabled={inviteLoading || actionLoading}>
                            <Send className="size-3 mr-2" /> Send Invitation
                          </DropdownMenuItem>
                        )}
                        {emp.invitationStatus === 'pending' && (
                          <DropdownMenuItem onClick={() => handleSendInvite(emp)} disabled={inviteLoading || actionLoading}>
                            <Send className="size-3 mr-2" /> Resend Invitation
                          </DropdownMenuItem>
                        )}
                        {emp.invitationStatus === 'accepted' && (
                          <DropdownMenuItem onClick={() => handleResetPassword(emp)} disabled={inviteLoading || actionLoading || !emp.userId}>
                            <KeyRound className="size-3 mr-2" /> Reset Password
                          </DropdownMenuItem>
                        )}
                        {emp.invitationStatus === 'pending' && (
                          <DropdownMenuItem onClick={() => handleResetPassword(emp)} disabled={inviteLoading || actionLoading || !emp.userId}>
                            <Mail className="size-3 mr-2" /> Reset Password
                          </DropdownMenuItem>
                        )}
                        {emp.invitationStatus === 'accepted' && (
                          <DropdownMenuItem onClick={() => handleSuspendToggle(emp)} disabled={inviteLoading || actionLoading} className="text-amber-600">
                            <Power className="size-3 mr-2" /> Suspend
                          </DropdownMenuItem>
                        )}
                        {emp.invitationStatus === 'suspended' && (
                          <DropdownMenuItem onClick={() => handleSuspendToggle(emp)} disabled={inviteLoading || actionLoading} className="text-emerald-600">
                            <Power className="size-3 mr-2" /> Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => setShowDeleteDialog(emp.id)}>
                          <Trash2 className="size-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status + Rating */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn(getStatusColor(emp.status), 'text-[10px]')}>
                        <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(emp.status))} />
                        {emp.status === 'busy' ? 'on job' : emp.status.replace('_', ' ')}
                      </Badge>
                      {getInvitationBadge(emp.invitationStatus)}
                    </div>
                    <StarRating rating={emp.rating} size="sm" />
                  </div>

                  {/* Footer Stats Row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="size-3 text-emerald-500" />
                      <span>{emp.completedJobs} Jobs</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3 text-emerald-500" />
                      <span>—</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="size-3 text-amber-500" />
                      <span>{emp.rating > 0 ? emp.rating.toFixed(1) : '—'}</span>
                    </div>
                  </div>

                  {/* Skills (if any) */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1.5">
                          {skill}
                        </Badge>
                      ))}
                      {skills.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          +{skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) setShowAddDialog(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Add a new team member to your organization.</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={!formName.trim() || !formPhone.trim() || saving}>
              {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Adding...</> : <><UserPlus className="size-4 mr-1.5" /> Add Employee</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingEmployee(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information and settings.</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingEmployee(null); }}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!formName.trim() || !formPhone.trim() || saving}>
              {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : <><Pencil className="size-4 mr-1.5" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => { if (!open) setShowDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
              <Trash2 className="size-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invitation Link Dialog */}
      <Dialog open={!!inviteResult} onOpenChange={(open) => { if (!open) setInviteResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="size-5 text-teal-600" />
              {inviteResult?.mode === 'reset' ? 'Password Reset Link' : 'Invitation Link'}
            </DialogTitle>
            <DialogDescription>{inviteResult?.message}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-1">
                {inviteResult?.mode === 'reset' ? 'Reset Link' : 'Activation Link'}
              </p>
              <p className="text-xs font-mono text-teal-900 dark:text-teal-100 break-all">
                {inviteResult?.url}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => inviteResult && copyToClipboard(inviteResult.url)}>
                <Copy className="size-3.5 mr-1.5" /> Copy Link
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => inviteResult && window.open(inviteResult.url, '_blank')}>
                <ExternalLink className="size-3.5 mr-1.5" /> Open
              </Button>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>
                Share this link with {inviteResult?.email}. The link expires in {inviteResult?.mode === 'reset' ? '2 hours' : '7 days'}.
                {inviteResult?.mode === 'invite' && ' They will set their own password on first login.'}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setInviteResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Teams Tab (List mode sub-tab) ───────────────────────────────────────────

function TeamsTab({
  teams,
  loading,
  onSelect,
}: {
  teams: { role: string; count: number; available: number; members: Employee[] }[];
  loading: boolean;
  onSelect: (emp: Employee) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No teams yet"
        description="Add employees and they'll be grouped by role automatically."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Card key={team.role} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Users className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold capitalize">{team.role}</CardTitle>
                  <CardDescription className="text-xs">{team.count} member{team.count === 1 ? '' : 's'} · {team.available} available</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {team.members.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => onSelect(emp)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
                >
                  <Avatar className="size-8 shrink-0">
                    {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                    <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(emp.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{emp.phone}</p>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Employee Detail (Detail mode) ───────────────────────────────────────────

function EmployeeDetail({
  employee,
  onBack,
  onEdit,
  onDelete,
  onInvite,
  onResetPassword,
  onSuspendToggle,
  actionLoading,
}: {
  employee: Employee;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInvite: () => void;
  onResetPassword: () => void;
  onSuspendToggle: () => void;
  actionLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Refresh employee data when active tab changes — used to invalidate queries.
  // The actual data is fetched per-tab via useQuery with the employee.id.

  let skills: string[] = [];
  try {
    const parsed = JSON.parse(employee.skills || '[]');
    if (Array.isArray(parsed)) skills = parsed;
  } catch { /* ignore */ }

  const tabTriggerClass = 'data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200 whitespace-nowrap';

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Header with Back button */}
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="size-4 mr-1" /> Back
          </Button>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <Avatar className="size-14 sm:size-16 shrink-0">
            {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
            <AvatarFallback className={cn(
              'text-lg font-bold',
              employee.status === 'available'
                ? 'bg-emerald-100 text-emerald-700'
                : (employee.status === 'on_job' || employee.status === 'busy')
                ? 'bg-amber-100 text-amber-700'
                : employee.status === 'on_leave'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-slate-100 text-slate-600'
            )}>
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{employee.name}</h1>
              <Badge variant="outline" className={cn(getStatusColor(employee.status), 'text-[10px]')}>
                <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(employee.status))} />
                {employee.status === 'busy' ? 'on job' : employee.status.replace('_', ' ')}
              </Badge>
              {getInvitationBadge(employee.invitationStatus)}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] capitalize">{employee.role}</Badge>
              {employee.rating > 0 && (
                <div className="flex items-center gap-1">
                  <StarRating rating={employee.rating} size="sm" />
                  <span className="text-xs font-semibold text-foreground">{employee.rating.toFixed(1)}</span>
                </div>
              )}
              {skills.length > 0 && (
                <span className="text-xs text-muted-foreground">· {skills.slice(0, 2).join(', ')}{skills.length > 2 ? '…' : ''}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-3.5 mr-1.5" /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={actionLoading}>
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(!employee.invitationStatus || employee.invitationStatus === 'none') && (
                <DropdownMenuItem onClick={onInvite} disabled={actionLoading}>
                  <Send className="size-3 mr-2" /> Send Invitation
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'pending' && (
                <DropdownMenuItem onClick={onInvite} disabled={actionLoading}>
                  <Send className="size-3 mr-2" /> Resend Invitation
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'accepted' && (
                <DropdownMenuItem onClick={onResetPassword} disabled={actionLoading || !employee.userId}>
                  <KeyRound className="size-3 mr-2" /> Reset Password
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'accepted' && (
                <DropdownMenuItem onClick={onSuspendToggle} disabled={actionLoading} className="text-amber-600">
                  <Power className="size-3 mr-2" /> Suspend
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'suspended' && (
                <DropdownMenuItem onClick={onSuspendToggle} disabled={actionLoading} className="text-emerald-600">
                  <Power className="size-3 mr-2" /> Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                <Trash2 className="size-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 11-Tab Switcher */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border -mx-1 px-1 overflow-x-auto">
          <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto justify-start w-max sm:w-full sm:justify-start">
            <TabsTrigger value="overview" className={tabTriggerClass}>
              <ActivityIcon className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="jobs" className={tabTriggerClass}>
              <Briefcase className="size-3.5" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="calendar" className={tabTriggerClass}>
              <Calendar className="size-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="time" className={tabTriggerClass}>
              <Clock className="size-3.5" /> Time Tracking
            </TabsTrigger>
            <TabsTrigger value="performance" className={tabTriggerClass}>
              <TrendingUp className="size-3.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="reviews" className={tabTriggerClass}>
              <Star className="size-3.5" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="documents" className={tabTriggerClass}>
              <FileStack className="size-3.5" /> Documents
            </TabsTrigger>
            <TabsTrigger value="equipment" className={tabTriggerClass}>
              <Wrench className="size-3.5" /> Equipment
            </TabsTrigger>
            <TabsTrigger value="location" className={tabTriggerClass}>
              <MapPinned className="size-3.5" /> Location
            </TabsTrigger>
            <TabsTrigger value="payroll" className={tabTriggerClass}>
              <Wallet className="size-3.5" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="activity" className={tabTriggerClass}>
              <ActivityIcon className="size-3.5" /> Activity
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab employee={employee} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-6">
          <JobsTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-6">
          <CalendarTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="time" className="mt-6">
          <TimeTrackingTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="performance" className="mt-6">
          <PerformanceTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <ReviewsTab employeeId={employee.id} defaultRating={employee.rating} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <DocumentsTab employeeId={employee.id} employeeName={employee.name} />
        </TabsContent>
        <TabsContent value="equipment" className="mt-6">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="location" className="mt-6">
          <LocationTab employee={employee} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6">
          <PayrollTab employeeName={employee.name} />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ActivityTab employee={employee} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ employee }: { employee: Employee }) {
  const { currency, format } = useCompanyCurrency();
  let skills: string[] = [];
  try {
    const parsed = JSON.parse(employee.skills || '[]');
    if (Array.isArray(parsed)) skills = parsed;
  } catch { /* ignore */ }

  // Quick stats — fetch performance metrics (weekly) for the overview.
  const { data: perfData, isLoading: perfLoading } = useQuery<PerformanceResponse>({
    queryKey: ['employee-performance-overview', employee.id],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employee.id}/performance?period=weekly`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const metrics = perfData?.metrics;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="size-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Jobs</span>
            </div>
            <p className="text-2xl font-bold">{employee.completedJobs}</p>
            <p className="text-[10px] text-muted-foreground">completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Completion</span>
            </div>
            <p className="text-2xl font-bold">
              {perfLoading ? '—' : metrics && metrics.jobsAssigned > 0
                ? `${Math.round((metrics.jobsCompleted / metrics.jobsAssigned) * 100)}%`
                : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {perfLoading ? '' : metrics ? `${metrics.jobsCompleted}/${metrics.jobsAssigned}` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-3.5 text-amber-500" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Rating</span>
            </div>
            <p className="text-2xl font-bold">{employee.rating > 0 ? employee.rating.toFixed(1) : '—'}</p>
            <p className="text-[10px] text-muted-foreground">avg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="size-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Month</span>
            </div>
            <p className="text-2xl font-bold">
              {perfLoading ? '—' : metrics ? format(metrics.revenueGenerated, currency) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="size-4 text-emerald-600" /> Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{employee.phone}</span>
            </div>
            {employee.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
            {employee.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{employee.location}</span>
              </div>
            )}
            {employee.whatsappId && (
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{employee.whatsappId}</span>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(employee.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Seen</p>
                <p className="font-medium">{employee.lastSeenAt ? timeAgo(employee.lastSeenAt) : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="size-4 text-emerald-600" /> Skills & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Skills</p>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed.</p>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium capitalize">{employee.role}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className={cn(getStatusColor(employee.status), 'text-[10px] mt-0.5')}>
                  {employee.status === 'busy' ? 'on job' : employee.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="text-sm font-medium">{employee.rating > 0 ? employee.rating.toFixed(1) : '—'} / 5</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-medium">{employee.completedJobs} jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Jobs Tab ────────────────────────────────────────────────────────────────

function JobsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery<{ employee: { id: string; name: string; status: string }; jobs: EmployeeJob[] }>({
    queryKey: ['employee-jobs', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/jobs`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const jobs = data?.jobs ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No jobs assigned"
        description="This employee has not been assigned any jobs yet."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Briefcase className="size-4 text-emerald-600" /> Assigned Jobs
        </CardTitle>
        <CardDescription className="text-xs">{jobs.length} job{jobs.length === 1 ? '' : 's'} total</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-32">Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate max-w-[200px]">{job.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {job.jobNumber ? `${job.jobNumber} · ` : ''}
                        {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                    {job.customer?.name || job.customerName || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px] capitalize', jobStatusBadgeClass(job.status))}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {job.scheduledAt ? formatDate(job.scheduledAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Calendar Tab ────────────────────────────────────────────────────────────

function CalendarTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery<{ employee: { id: string; name: string; status: string }; jobs: EmployeeJob[] }>({
    queryKey: ['employee-calendar', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/jobs`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const upcomingJobs = useMemo(() => {
    const all = data?.jobs ?? [];
    const now = Date.now();
    return all
      .filter((j) => {
        if (j.status === 'completed' || j.status === 'cancelled') return false;
        if (j.scheduledAt) return new Date(j.scheduledAt).getTime() >= now - 24 * 60 * 60 * 1000;
        return true;
      })
      .sort((a, b) => {
        const aT = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const bT = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return aT - bT;
      });
  }, [data]);

  // Group by day
  const byDay = useMemo(() => {
    const map = new Map<string, EmployeeJob[]>();
    for (const j of upcomingJobs) {
      const key = j.scheduledAt
        ? new Date(j.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : 'Unscheduled';
      const arr = map.get(key) ?? [];
      arr.push(j);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [upcomingJobs]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (byDay.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No upcoming jobs"
        description="This employee has no upcoming scheduled jobs. Assign a job to see it appear on the calendar."
      />
    );
  }

  return (
    <div className="space-y-4">
      {byDay.map(([day, jobs]) => (
        <Card key={day}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-emerald-600" /> {day}
            </CardTitle>
            <CardDescription className="text-xs">{jobs.length} job{jobs.length === 1 ? '' : 's'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                <div className="size-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                  <Clock3 className="size-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {job.customer?.name || job.customerName || 'No customer'}
                    {job.scheduledAt && ` · ${formatTime(job.scheduledAt)}`}
                  </p>
                </div>
                <Badge variant="outline" className={cn('text-[10px] capitalize', jobStatusBadgeClass(job.status))}>
                  {job.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Time Tracking Tab ───────────────────────────────────────────────────────

function TimeTrackingTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery<ShiftsResponse>({
    queryKey: ['employee-shifts', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/shifts?days=7`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = data?.today;
  const totals = data?.todayTotals;
  const recent = data?.recent ?? [];

  // Build today's timeline entries from clockIn, breaks, clockOut
  const timeline: { time: string; label: string; icon: React.ElementType; color: string }[] = [];
  if (today) {
    timeline.push({
      time: formatTime(today.clockIn),
      label: 'Check In',
      icon: PlayCircle,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    });
    if (totals && Array.isArray(totals.breaks)) {
      totals.breaks.forEach((b, idx) => {
        if (b.start) {
          timeline.push({
            time: formatTime(b.start),
            label: b.reason === 'lunch' ? 'Lunch Break' : `Break ${idx + 1}`,
            icon: Coffee,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
          });
        }
        if (b.end) {
          timeline.push({
            time: formatTime(b.end),
            label: 'Resume Work',
            icon: PlayCircle,
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
          });
        }
      });
    }
    if (today.clockOut) {
      timeline.push({
        time: formatTime(today.clockOut),
        label: 'Check Out',
        icon: StopCircle,
        color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's Shift */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4 text-emerald-600" /> Today&apos;s Shift
              </CardTitle>
              <CardDescription className="text-xs">
                {today ? new Date(today.clockIn).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'No shift today'}
              </CardDescription>
            </div>
            {today && (
              <Badge variant="outline" className={cn(
                'text-[10px]',
                today.status === 'active' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                today.status === 'on_break' && 'bg-amber-50 text-amber-700 border-amber-200',
                today.status === 'completed' && 'bg-slate-50 text-slate-700 border-slate-200',
              )}>
                {today.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!today ? (
            <div className="py-6 text-center">
              <Clock className="size-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No shift recorded today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Timeline */}
              <div className="space-y-3">
                {timeline.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0', entry.color)}>
                      <entry.icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-3 self-start">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Time</p>
                  <p className="text-xl font-bold mt-1">{totals ? formatMinutes(totals.totalMinutes) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Working</p>
                  <p className="text-xl font-bold mt-1 text-emerald-600">{totals ? formatMinutes(totals.workingMinutes) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Break</p>
                  <p className="text-xl font-bold mt-1 text-amber-600">{totals ? formatMinutes(totals.breakMinutes) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</p>
                  <p className="text-sm font-semibold mt-1 capitalize">{today.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Shifts (last 7 days) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarCheck className="size-4 text-emerald-600" /> Recent Shifts (Last 7 Days)
          </CardTitle>
          <CardDescription className="text-xs">{recent.length} shift{recent.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No recent shifts recorded.</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Working</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="text-sm">{formatDate(shift.shiftDate)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatTime(shift.clockIn)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{shift.clockOut ? formatTime(shift.clockOut) : '—'}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatMinutes(shift.totalMinutes)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-emerald-600">{formatMinutes(shift.workingMinutes)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{shift.status.replace('_', ' ')}</Badge>
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

// ─── Performance Tab ─────────────────────────────────────────────────────────

function PerformanceTab({ employeeId }: { employeeId: string }) {
  const { currency, format, formatCompact } = useCompanyCurrency();
  const [period, setPeriod] = useState<PeriodType>('weekly');

  const { data: perfData, isLoading } = useQuery<PerformanceResponse>({
    queryKey: ['employee-performance-tab', employeeId, period],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/performance?period=${period}`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const metrics = perfData?.metrics;
  const prevMetrics = perfData?.previousMetrics;
  const buckets = perfData?.chartBuckets ?? [];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'h-8 px-3.5 rounded-md text-xs font-semibold capitalize transition-colors',
                  period === p ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards (8) */}
      {isLoading || !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            title="Jobs Completed"
            value={formatNumber(metrics.jobsCompleted)}
            subtitle={`of ${formatNumber(metrics.jobsAssigned)} assigned`}
            icon={Briefcase}
            bg="bg-emerald-50"
            color="text-emerald-600"
            trend={prevMetrics ? trendPct(metrics.jobsCompleted, prevMetrics.jobsCompleted) : undefined}
          />
          <KpiCard
            title="Hours Worked"
            value={formatNumber(metrics.hoursWorked)}
            subtitle={`${formatMinutes(metrics.workingMinutes)} total`}
            icon={Clock}
            bg="bg-teal-50"
            color="text-teal-600"
            trend={prevMetrics ? trendPct(metrics.hoursWorked, prevMetrics.hoursWorked) : undefined}
          />
          <KpiCard
            title="Travel Distance"
            value={`${formatNumber(metrics.travelDistanceKm)} km`}
            subtitle={`${formatMinutes(metrics.travelMinutes)} travel time`}
            icon={Route}
            bg="bg-cyan-50"
            color="text-cyan-600"
            trend={prevMetrics ? trendPct(metrics.travelDistanceKm, prevMetrics.travelDistanceKm) : undefined}
          />
          <KpiCard
            title="Customer Rating"
            value={metrics.customerRating > 0 ? `${metrics.customerRating.toFixed(1)} / 5` : '—'}
            subtitle="avg job rating"
            icon={Star}
            bg="bg-amber-50"
            color="text-amber-600"
            trend={prevMetrics ? trendPct(metrics.customerRating, prevMetrics.customerRating) : undefined}
            extra={metrics.customerRating > 0 ? (
              <div className="mt-1.5"><StarRating rating={metrics.customerRating} size="sm" /></div>
            ) : undefined}
          />
          <KpiCard
            title="Revenue Generated"
            value={format(metrics.revenueGenerated, currency)}
            subtitle={metrics.revenueGenerated > 0 ? formatCompact(metrics.revenueGenerated, currency) : 'no invoices'}
            icon={IndianRupee}
            bg="bg-emerald-50"
            color="text-emerald-700"
            trend={prevMetrics ? trendPct(metrics.revenueGenerated, prevMetrics.revenueGenerated) : undefined}
          />
          <KpiCard
            title="Avg Completion"
            value={formatMinutes(metrics.avgCompletionMinutes)}
            subtitle="assigned → completed"
            icon={Timer}
            bg="bg-violet-50"
            color="text-violet-600"
            trend={prevMetrics ? trendPct(metrics.avgCompletionMinutes, prevMetrics.avgCompletionMinutes) : undefined}
            lowerIsBetter
          />
          <KpiCard
            title="Late Arrivals"
            value={formatNumber(metrics.lateArrivals)}
            subtitle={`of ${formatNumber(metrics.jobsCompleted)} completed`}
            icon={AlertCircle}
            bg="bg-red-50"
            color="text-red-600"
            trend={prevMetrics ? trendPct(metrics.lateArrivals, prevMetrics.lateArrivals) : undefined}
            lowerIsBetter
          />
          <KpiCard
            title="Attendance"
            value={`${formatNumber(metrics.attendanceDays)} day${metrics.attendanceDays === 1 ? '' : 's'}`}
            subtitle="shifts clocked in"
            icon={CalendarCheck}
            bg="bg-emerald-50"
            color="text-emerald-600"
            trend={prevMetrics ? trendPct(metrics.attendanceDays, prevMetrics.attendanceDays) : undefined}
          />
        </div>
      )}

      {/* Simple Jobs Over Time chart (bar with divs) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Jobs Completed Over Time</CardTitle>
          <CardDescription className="text-xs">
            {period === 'daily' ? 'Today' : period === 'weekly' ? 'Last 7 days' : 'Last 30 days (weekly)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : buckets.length === 0 || buckets.every((b) => b.jobsCompleted === 0) ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No jobs completed in this period.
            </div>
          ) : (
            <div className="h-[180px] flex items-end gap-2 px-2">
              {buckets.map((b, i) => {
                const max = Math.max(...buckets.map((x) => x.jobsCompleted), 1);
                const h = Math.max(4, (b.jobsCompleted / max) * 140);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <div className="text-[10px] font-semibold text-foreground">{b.jobsCompleted}</div>
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-md transition-all hover:from-emerald-600 hover:to-teal-500"
                      style={{ height: `${h}px` }}
                      title={`${b.label}: ${b.jobsCompleted} jobs`}
                    />
                    <div className="text-[10px] text-muted-foreground truncate w-full text-center">{b.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hours breakdown */}
      {metrics && (metrics.workingMinutes > 0 || metrics.breakMinutes > 0 || metrics.travelMinutes > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Hours Breakdown</CardTitle>
            <CardDescription className="text-xs">Working vs travel vs break</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Working</span>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatMinutes(metrics.workingMinutes)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-2 rounded-full bg-teal-500" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Travel</span>
                </div>
                <p className="text-lg font-bold text-teal-600">{formatMinutes(metrics.travelMinutes)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Break</span>
                </div>
                <p className="text-lg font-bold text-amber-600">{formatMinutes(metrics.breakMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

function ReviewsTab({ employeeId, defaultRating }: { employeeId: string; defaultRating: number }) {
  const { data, isLoading } = useQuery<ReviewsResponse>({
    queryKey: ['employee-reviews', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/reviews?employeeId=${employeeId}&limit=50`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const reviews = data?.reviews ?? [];
  const total = data?.pagination?.total ?? reviews.length;
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : defaultRating;
  const positive = reviews.filter((r) => r.rating >= 4).length;
  const satisfaction = reviews.length > 0 ? Math.round((positive / reviews.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Star className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ThumbsUp className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviews.filter((r) => r.comment).length}</p>
                <p className="text-xs text-muted-foreground">With Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{satisfaction}%</p>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Star className="size-4 text-amber-500" /> Customer Reviews
          </CardTitle>
          <CardDescription className="text-xs">Reviews left by customers for this employee</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center">
              <Star className="size-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">No reviews yet</p>
              <p className="text-xs text-muted-foreground mt-1">Customer reviews will appear here once submitted.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs font-semibold">{review.rating}.0</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-foreground leading-relaxed mb-2">&ldquo;{review.comment}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {review.source && review.source !== 'internal' && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{review.source}</Badge>
                    )}
                    {review.status !== 'published' && (
                      <Badge variant="outline" className="text-[10px] capitalize">{review.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Documents Tab ───────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { key: 'driving_license', label: 'Driving License', icon: IdCard },
  { key: 'pan', label: 'PAN Card', icon: FileBadge },
  { key: 'aadhaar', label: 'Aadhaar', icon: FileBadge },
  { key: 'employment_contract', label: 'Employment Contract', icon: FileText },
  { key: 'certificate', label: 'Certificates', icon: Award },
];

function DocumentsTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const { data, isLoading } = useQuery<DocumentsResponse>({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/documents?employeeId=${employeeId}&limit=50`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const documents = data?.documents ?? [];

  // For each standard doc type, find a matching uploaded document (by name/type/category fuzzy match).
  const findDoc = (key: string) => {
    return documents.find((d) => {
      const name = (d.name || '').toLowerCase();
      const type = (d.type || '').toLowerCase();
      const cat = (d.category || '').toLowerCase();
      return name.includes(key.replace('_', ' ')) || type.includes(key) || cat.includes(key)
        || (key === 'driving_license' && (name.includes('driving') || name.includes('license') || name.includes('dl')))
        || (key === 'pan' && name.includes('pan'))
        || (key === 'aadhaar' && name.includes('aadhaar'))
        || (key === 'employment_contract' && (name.includes('contract') || name.includes('employment')))
        || (key === 'certificate' && (name.includes('certificate') || name.includes('cert')));
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileStack className="size-4 text-emerald-600" /> Employee Documents
              </CardTitle>
              <CardDescription className="text-xs">Manage {employeeName}&apos;s documents and certifications</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{documents.length} uploaded</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map((dt) => {
          const doc = findDoc(dt.key);
          const Icon = dt.icon;
          const status = doc ? 'uploaded' : 'missing';
          return (
            <Card key={dt.key} className={cn('hover:shadow-md transition-shadow', !doc && 'border-dashed')}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'size-9 rounded-lg flex items-center justify-center',
                      doc ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted',
                    )}>
                      <Icon className={cn('size-4', doc ? 'text-emerald-600' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{dt.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {doc ? `Added ${formatDate(doc.createdAt)}` : 'Not uploaded'}
                      </p>
                    </div>
                  </div>
                  {doc ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      <FileCheck className="size-2.5 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      <FileWarning className="size-2.5 mr-1" /> Missing
                    </Badge>
                  )}
                </div>
                {doc ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground truncate">{doc.name}</p>
                    {doc.fileSize && (
                      <p className="text-[10px] text-muted-foreground">{(doc.fileSize / 1024).toFixed(1)} KB{doc.fileType ? ` · ${doc.fileType}` : ''}</p>
                    )}
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3 mr-1" /> View
                      </a>
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs" disabled>
                    <FileX className="size-3 mr-1" /> Upload
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Equipment Tab ───────────────────────────────────────────────────────────

function EquipmentTab() {
  // No equipment model/API exists yet → friendly placeholder + CTA.
  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="size-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-3">
            <WrenchIcon className="size-7 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold">Equipment Tracking Coming Soon</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Assign toolkits, vehicles, and devices to this employee. Track barcode, condition, maintenance, and warranty status.
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4" disabled>
            <Package className="size-4 mr-1.5" /> Assign Equipment
          </Button>
        </CardContent>
      </Card>

      {/* Placeholder example equipment card layout (UI only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50 pointer-events-none">
        {[
          { name: 'AC Toolkit', barcode: 'TKT-001', condition: 'Good', assigned: 'Jan 12, 2025', maintenance: 'Mar 1, 2025', warranty: 'Dec 31, 2025' },
          { name: 'Multi-meter', barcode: 'MMT-014', condition: 'Fair', assigned: 'Feb 5, 2025', maintenance: 'Feb 28, 2025', warranty: 'Jun 30, 2025' },
        ].map((eq) => (
          <Card key={eq.barcode}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <WrenchIcon className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{eq.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <QrCode className="size-2.5" /> {eq.barcode}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn(
                  'text-[10px]',
                  eq.condition === 'Good' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  eq.condition === 'Fair' && 'bg-amber-50 text-amber-700 border-amber-200',
                  eq.condition === 'Poor' && 'bg-red-50 text-red-700 border-red-200',
                )}>{eq.condition}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-2 border-t">
                <div><p>Assigned</p><p className="text-foreground font-medium">{eq.assigned}</p></div>
                <div><p>Maintenance</p><p className="text-foreground font-medium">{eq.maintenance}</p></div>
                <div><p>Warranty</p><p className="text-foreground font-medium">{eq.warranty}</p></div>
                <div><p>Status</p><p className="text-foreground font-medium">In Use</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Location Tab ────────────────────────────────────────────────────────────

function LocationTab({ employee }: { employee: Employee }) {
  const { data, isLoading } = useQuery<RouteResponse>({
    queryKey: ['employee-route', employee.id],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/gps/route/${employee.id}`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!(employee.latitude || employee.longitude),
  });

  const hasCoords = !!(employee.latitude && employee.longitude);
  const totalDistanceKm = data?.summary?.totalDistanceKm ?? 0;
  const totalDurationMin = data?.summary?.totalDurationMinutes ?? 0;
  const routes = data?.routes ?? [];

  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(employee.longitude! - 0.01)}%2C${(employee.latitude! - 0.01)}%2C${(employee.longitude! + 0.01)}%2C${(employee.latitude! + 0.01)}&layer=mapnik&marker=${employee.latitude}%2C${employee.longitude}`
    : null;

  return (
    <div className="space-y-4">
      {/* Map + Current Location */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPinned className="size-4 text-emerald-600" /> Live Location
            </CardTitle>
            <CardDescription className="text-xs">
              {employee.lastLocationAt ? `Last updated ${timeAgo(employee.lastLocationAt)}` : 'No location data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : mapSrc ? (
              <iframe
                title="Employee location map"
                src={mapSrc}
                className="w-full h-[300px] rounded-lg border border-border"
                loading="lazy"
              />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <MapPinned className="size-10 opacity-30 mb-2" />
                <p className="text-sm font-medium">No location data</p>
                <p className="text-xs">The employee hasn&apos;t shared their location yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Travel Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Navigation className="size-4 text-emerald-600" /> Today&apos;s Travel
            </CardTitle>
            <CardDescription className="text-xs">Distance & duration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Distance</p>
              <p className="text-2xl font-bold mt-1">{totalDistanceKm.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">km</span></p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Travel Time</p>
              <p className="text-2xl font-bold mt-1">{formatMinutes(totalDurationMin)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Routes Today</p>
              <p className="text-2xl font-bold mt-1">{data?.summary?.routeCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Route — visited jobs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Route className="size-4 text-emerald-600" /> Today&apos;s Route
          </CardTitle>
          <CardDescription className="text-xs">Visited jobs and stops</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No routes recorded today.
            </div>
          ) : (
            <div className="space-y-2">
              {routes.map((route, i) => (
                <div key={route.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="size-9 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-emerald-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {route.jobId ? `Job ${route.jobId.slice(-6)}` : 'Travel'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started {formatTime(route.startedAt)}
                      {route.endedAt ? ` · Ended ${formatTime(route.endedAt)}` : ''}
                      {route.arrivedAt && ` · Arrived ${formatTime(route.arrivedAt)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{(route.distanceMeters / 1000).toFixed(2)} km</p>
                    <p className="text-[10px] text-muted-foreground">{formatMinutes(route.durationMinutes)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Payroll Tab (Future) ────────────────────────────────────────────────────

function PayrollTab({ employeeName }: { employeeName: string }) {
  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="size-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-3">
            <Wallet className="size-7 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold">Payroll Module Coming Soon</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Manage {employeeName}&apos;s salary, pay slips, tax deductions, and bank details. The payroll module is currently under development.
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-amber-500" />
            <span>Track this space for updates</span>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder salary card (UI only) */}
      <Card className="opacity-50 pointer-events-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <IndianRupee className="size-4 text-emerald-600" /> Salary Information
          </CardTitle>
          <CardDescription className="text-xs">Basic payroll details (preview)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Basic Salary</p>
              <p className="text-lg font-bold">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pay Cycle</p>
              <p className="text-lg font-bold">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bank Account</p>
              <p className="text-lg font-bold">—</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Paid</p>
              <p className="text-lg font-bold">—</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Activity Tab ────────────────────────────────────────────────────────────

const activityConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  create: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  update: { icon: Pencil, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  assign: { icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
  complete: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  status_change: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  default: { icon: ActivityIcon, color: 'text-muted-foreground', bg: 'bg-muted' },
};

function ActivityTab({ employee }: { employee: Employee }) {
  // Query activity logs scoped to this employee. We try multiple filters:
  //   1. entityId = employee.id (employee-scoped events)
  //   2. actorId = employee.userId (events the employee performed)
  // We'll fetch up to 50 of each and merge client-side, sorted by createdAt desc.
  const { data, isLoading } = useQuery<ActivityLogsResponse>({
    queryKey: ['employee-activity', employee.id],
    queryFn: async () => {
      const [byEntity, byActor] = await Promise.all([
        authFetch(apiUrl(`/api/activity-logs?entityType=employee&entityId=${employee.id}&limit=50`)).then((r) => r.ok ? r.json() : { logs: [], total: 0 }),
        employee.userId
          ? authFetch(apiUrl(`/api/activity-logs?actorId=${employee.userId}&limit=50`)).then((r) => r.ok ? r.json() : { logs: [], total: 0 })
          : Promise.resolve({ logs: [], total: 0 }),
      ]);
      const merged: ActivityLogEntry[] = [...(byEntity.logs ?? []), ...(byActor.logs ?? [])];
      // Dedupe by id
      const seen = new Set<string>();
      const unique = merged.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { logs: unique.slice(0, 50), total: unique.length };
    },
  });

  const logs = data?.logs ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No recent activity"
        description="This employee's recent actions and events will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ActivityIcon className="size-4 text-emerald-600" /> Activity Timeline
        </CardTitle>
        <CardDescription className="text-xs">Recent events and actions by/for this employee</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative max-h-[600px] overflow-y-auto pr-2">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-3">
            {logs.map((log) => {
              const cfg = activityConfig[log.action] || activityConfig.default;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-3 relative">
                  <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background', cfg.bg)}>
                    <Icon className={cn('size-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {log.entityName || log.description || log.action}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[9px] capitalize">{log.action.replace('_', ' ')}</Badge>
                      {log.entityType && <span>· {log.entityType}</span>}
                      {log.actorName && <span>· by {log.actorName}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EmployeesView;

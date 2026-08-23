'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import {
  Users, UserPlus, Shield, Clock, CheckCircle2, UserCheck, UserCog,
  Search, Phone, MapPin, Star, Briefcase, Loader2,
  Trash2, Pencil, MoreVertical, UserX,
  Mail, Send, KeyRound, Power, Globe, Copy, ExternalLink, AlertCircle,
  ArrowLeft, Calendar, FileText, Wrench, MapPinned, Wallet, Activity as ActivityIcon,
  TrendingUp, TrendingDown, Route, IndianRupee, Timer, CalendarCheck, AlertTriangle,
  IdCard, FileStack, FileCheck, FileWarning, FileX, Package, QrCode,
  Navigation, Clock3, Coffee, PlayCircle, StopCircle, Award, MessageSquare,
  ThumbsUp, ThumbsDown, Building2, ChevronRight, Sparkles, FileBadge,
  LayoutGrid, List, ChevronDown, MoreHorizontal,
  Upload, Plus, User, RotateCcw, PackagePlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { usePermissions } from '@/hooks/use-permissions';
import { SECONDARY_EMPLOYEE_TABS, type EmployeeDetailTab } from '@/lib/auth/permissions';
import { TimesheetView } from '@/components/views/timesheet-view';

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
  // Geocoded customer-address coordinates (nullable on the Job model).
  // Used by LocationTab ETA computation (haversine distance from the
  // employee's current GPS to the job site). Populated async by
  // geocodeAddress() on job creation; may be null for un-geocoded jobs.
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
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
  authorName?: string | null;
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

// ─── Calendar / Payroll / Documents supporting types ────────────────────────

interface BookingItem {
  id: string;
  title: string;
  status: string;
  source: string | null;
  customerName: string | null;
  customerPhone: string | null;
  address: string | null;
  scheduledAt: string | null;
  scheduledEndTime: string | null;
  duration: number | null;
  employee?: { id: string; name: string; phone: string; avatar: string | null } | null;
  [key: string]: unknown;
}

interface BookingsResponse {
  bookings: BookingItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface PayrollEntry {
  employee: { id: string; name: string; role: string };
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  byCategory: Record<string, number>;
  entriesCount: number;
  approvedCount: number;
  pendingCount: number;
}

interface PayrollResponse {
  payroll: PayrollEntry[];
  periodLabel: string;
}

interface PayrollError {
  error: string;
}

// Discriminated union of calendar items (jobs + shifts + bookings) for the
// unified date-grouped agenda view in CalendarTab.
type CalendarItem =
  | { kind: 'job'; id: string; title: string; subtitle: string; scheduledAt: string | null; status: string }
  | { kind: 'shift'; id: string; title: string; subtitle: string; scheduledAt: string; status: string }
  | { kind: 'booking'; id: string; title: string; subtitle: string; scheduledAt: string | null; status: string };


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
  // Use '&' when the path already has a '?' (e.g. '/api/employees?id=123'),
  // otherwise '?'. The old code always used '?', producing URLs like
  // '/api/employees?id=abc?XTransformPort=3000' (double '?'), which Next.js
  // parsed as `id="abc?XTransformPort=3000"` → Prisma "Record not found"
  // → 500 "Failed to update employee". This mirrors `addTransformPort()` in
  // src/lib/api.ts so all callsites stay consistent.
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}XTransformPort=3000`;
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

/**
 * Haversine straight-line distance between two lat/lng points, in km.
 * Used by LocationTab ETA computation (no routing API call — the spec
 * explicitly says geocoding/routing is NOT required; a rough urban
 * average speed of 40 km/h is used to estimate travel time).
 */
function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Rough urban travel-time estimate. 40 km/h is a typical mixed-traffic
 * urban average (per Phase 2 spec for LocationTab ETA). Returns minutes.
 */
function estimateTravelMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 40) * 60));
}

/**
 * Date-bucket a calendar item into "Today" / "Tomorrow" / "This Week" /
 * "Upcoming" / "Past" / "Unscheduled" based on its scheduledAt timestamp.
 *
 * - Today: same calendar day as now.
 * - Tomorrow: the calendar day immediately after today.
 * - This Week: within the next 7 days (excluding today + tomorrow, which
 *   already have their own buckets).
 * - Upcoming: anything later than This Week.
 * - Past: anything earlier than today (kept for completeness — CalendarTab
 *   filters past items out, but this guards against bad data).
 * - Unscheduled: no scheduledAt (caller decides how to bucket).
 */
type CalendarBucket = 'Today' | 'Tomorrow' | 'This Week' | 'Upcoming' | 'Past' | 'Unscheduled';

function dateBucketKey(iso: string | null | undefined): CalendarBucket {
  if (!iso) return 'Unscheduled';
  const now = new Date();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';

  // Calendar-day boundaries in local time.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const twoDaysFromToday = new Date(startOfTomorrow);
  twoDaysFromToday.setDate(twoDaysFromToday.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (date < startOfToday) return 'Past';
  if (date < startOfTomorrow) return 'Today';
  if (date < twoDaysFromToday) return 'Tomorrow';
  if (date < startOfNextWeek) return 'This Week';
  return 'Upcoming';
}

/**
 * Format a YYYY-MM-DD date string for use in PayrollTab query params.
 * Returns local-timezone YYYY-MM-DD (no UTC drift).
 */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'working' | 'offline'>('all');
  const [listTab, setListTab] = useState<'list' | 'teams'>('list');
  const [tab, setTab] = useState<'employees' | 'timesheet'>('employees');
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
      // Use authFetch so the Bearer token is sent. Plain fetch() relied on
      // the session cookie alone, which fails on cross-origin/cookieless
      // contexts (e.g. Vercel preview deploys, Safari ITP).
      const res = await authFetch(apiUrl('/api/employees'));
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
    let result = employees;

    if (statusFilter === 'available') {
      result = result.filter((e) => e.status === 'available');
    } else if (statusFilter === 'working') {
      result = result.filter((e) => e.status === 'on_job' || e.status === 'busy' || e.status === 'en_route');
    } else if (statusFilter === 'offline') {
      result = result.filter((e) => e.status === 'on_leave' || e.status === 'offline');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => {
        const name = (e.name || '').toLowerCase();
        const role = (e.role || '').toLowerCase();
        const phone = (e.phone || '').toLowerCase();
        const skills = (e.skills || '').toLowerCase();
        return name.includes(q) || role.includes(q) || phone.includes(q) || skills.includes(q);
      });
    }

    return result;
  }, [employees, search, statusFilter]);

  const stats = useMemo(() => ({
    total: employees.length,
    available: employees.filter((e) => e.status === 'available').length,
    working: employees.filter((e) => e.status === 'on_job' || e.status === 'busy' || e.status === 'en_route').length,
    offline: employees.filter((e) => e.status === 'on_leave' || e.status === 'offline').length,
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

      const res = await authFetch(apiUrl('/api/employees'), {
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

      const res = await authFetch(apiUrl(`/api/employees?id=${editingEmployee.id}`), {
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
      const res = await authFetch(apiUrl(`/api/employees?id=${id}`), {
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
      {/* Top-level Tabs: Employees | Timesheet */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-11">
          <TabsTrigger value="employees" className="text-sm min-h-[44px]">
            <UserCog className="size-4 mr-1.5" /> Employees
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="text-sm min-h-[44px]">
            <Clock className="size-4 mr-1.5" /> Timesheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6 mt-6">
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

      {/* Stats Cards with click-to-filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'all' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'available' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('available')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">🟢 Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'working' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('working')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.working}</p>
                <p className="text-xs text-muted-foreground">🚗 Working / On Job</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'offline' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('offline')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Shield className="size-4 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.offline}</p>
                <p className="text-xs text-muted-foreground">⚪ Offline / On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Status Chips + View Switcher */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, role, phone, or skill..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <Tabs value={listTab} onValueChange={(v) => setListTab(v as 'list' | 'teams')}>
                <TabsList className="h-9">
                  <TabsTrigger value="list" className="text-xs h-7">
                    <Users className="size-3.5 mr-1.5" /> Staff
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="text-xs h-7">
                    <Building2 className="size-3.5 mr-1.5" /> Teams
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* View Switcher Toggle: Cards vs Table */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    viewLayout === 'grid' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="size-3.5" /> Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    viewLayout === 'table' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Table View"
                >
                  <List className="size-3.5" /> Table
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            {[
              { id: 'all', label: 'All Staff', count: stats.total },
              { id: 'available', label: '🟢 Available', count: stats.available },
              { id: 'working', label: '🚗 Working / En Route', count: stats.working },
              { id: 'offline', label: '⚪ Offline / On Leave', count: stats.offline },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id as typeof statusFilter)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border',
                  statusFilter === chip.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-background text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                )}
              >
                <span>{chip.label}</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  statusFilter === chip.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}>
                  {chip.count}
                </span>
              </button>
            ))}
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
              {search || statusFilter !== 'all' ? 'No employees match your search filter' : 'No employees yet'}
            </p>
            <p className="text-sm mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your search query or status filter' : 'Add your first employee to get started'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <UserPlus className="size-4 mr-1.5" /> Add Employee
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewLayout === 'grid' ? (
        /* ─── Grid Cards View ────────────────────────────────────────────── */
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
                className="group relative p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                onClick={() => setSelectedEmployee(emp)}
              >
                <div className="space-y-3">
                  {/* Header: Avatar + Live Dot + Name + Role + Dropdown */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="size-11 border-2 border-emerald-100 dark:border-emerald-950">
                          {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                          <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                            {getInitials(emp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 size-3 rounded-full border-2 border-background',
                            getStatusDot(emp.status)
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                          {emp.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                            {emp.role}
                          </Badge>
                          {getInvitationBadge(emp.invitationStatus)}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-slate-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setSelectedEmployee(emp)}>
                          <ArrowLeft className="size-3.5 mr-2 rotate-180" /> Profile 360°
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(emp)}>
                          <Pencil className="size-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(!emp.invitationStatus || emp.invitationStatus === 'none') && (
                          <DropdownMenuItem onClick={() => handleSendInvite(emp)} disabled={inviteLoading || actionLoading}>
                            <Send className="size-3.5 mr-2" /> Send Invitation
                          </DropdownMenuItem>
                        )}
                        {emp.invitationStatus === 'pending' && (
                          <DropdownMenuItem onClick={() => handleSendInvite(emp)} disabled={inviteLoading || actionLoading}>
                            <Send className="size-3.5 mr-2" /> Resend Invitation
                          </DropdownMenuItem>
                        )}
                        {emp.invitationStatus === 'accepted' && (
                          <DropdownMenuItem onClick={() => handleResetPassword(emp)} disabled={inviteLoading || actionLoading || !emp.userId}>
                            <KeyRound className="size-3.5 mr-2" /> Reset Password
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => setShowDeleteDialog(emp.id)}>
                          <Trash2 className="size-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Phone + One-tap Call & WhatsApp */}
                  <div className="flex items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="truncate">{emp.phone || 'No phone'}</span>
                    {emp.phone && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`tel:${emp.phone}`}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="Call employee"
                        >
                          <Phone className="size-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="WhatsApp employee"
                        >
                          <MessageSquare className="size-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Location & Rating */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{emp.location || 'Location unmapped'}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="size-3 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.rating > 0 ? emp.rating.toFixed(1) : '—'}</span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Bar: Completed Jobs + Profile 360° CTA */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Briefcase className="size-3.5 text-emerald-600" />
                    <span>{emp.completedJobs || 0} jobs done</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-7 text-xs px-2.5 shadow-xs"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    Profile 360°
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ─── Table View ───────────────────────────────────────────────── */
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold">Employee</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Phone</TableHead>
                  <TableHead className="font-bold">Role & Rating</TableHead>
                  <TableHead className="hidden md:table-cell font-bold">Location</TableHead>
                  <TableHead className="text-right font-bold w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="size-8 border border-emerald-100 dark:border-emerald-950">
                            {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                            <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-background',
                              getStatusDot(emp.status)
                            )}
                          />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{emp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={cn(getStatusColor(emp.status), 'text-[10px]')}>
                        {emp.status === 'busy' ? 'on job' : emp.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <span>{emp.phone || '—'}</span>
                        {emp.phone && (
                          <div className="flex items-center gap-0.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`tel:${emp.phone}`}
                              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Call"
                            >
                              <Phone className="size-3" />
                            </a>
                            <a
                              href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageSquare className="size-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-slate-700 font-medium">{emp.role}</span>
                        <span className="text-slate-400">·</span>
                        <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                          <Star className="size-3 fill-amber-500" /> {emp.rating > 0 ? emp.rating.toFixed(1) : '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 truncate max-w-[160px] hidden md:table-cell">
                      {emp.location || '—'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-semibold"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        Profile 360°
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
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
        </TabsContent>

        <TabsContent value="timesheet" className="mt-6">
          <TimesheetView />
        </TabsContent>
      </Tabs>
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
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Refresh employee data when active tab changes — used to invalidate queries.
  // The actual data is fetched per-tab via useQuery with the employee.id.

  let skills: string[] = [];
  try {
    const parsed = JSON.parse(employee.skills || '[]');
    if (Array.isArray(parsed)) skills = parsed;
  } catch { /* ignore */ }

  // Per-tab role gating. The user's hard requirement: hiding a tab in React
  // is NOT sufficient — the underlying APIs (/api/reviews, /api/documents,
  // /api/time-tracking/payroll, /api/employees/[id]) MUST also enforce the
  // same allow-list server-side. Those gates are added in Phase 1.4.
  const perms = usePermissions();
  const visibleSecondaryTabs = SECONDARY_EMPLOYEE_TABS.filter((t) =>
    perms.canAccessEmployeeTab(t as EmployeeDetailTab)
  );
  // The active tab is one of: a primary tab, or one of the user's visible
  // secondary tabs. If the user lacks access to the active tab (e.g. they
  // switched accounts in another tab), fall back to Overview.
  const isSecondaryActive = (SECONDARY_EMPLOYEE_TABS as string[]).includes(activeTab);
  const secondaryActiveLabel = (() => {
    if (!isSecondaryActive) return null;
    if (!visibleSecondaryTabs.includes(activeTab as EmployeeDetailTab)) return null;
    const map: Record<string, string> = {
      reviews: 'Reviews',
      documents: 'Documents',
      payroll: 'Payroll',
    };
    return map[activeTab] ?? null;
  })();
  // If the active tab is a secondary tab the user can't access (e.g. they
  // were granted Payroll then lost the role), reset to Overview. This is a
  // safety net — the dropdown won't show the option, but a stale URL hash
  // or devtools `setActiveTab('payroll')` could otherwise reveal content.
  // Note: we intentionally do NOT auto-strip during render (would loop);
  // the TabsContent gate below already prevents the content from rendering.

  const tabTriggerClass = 'data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200 whitespace-nowrap';
  const moreTriggerClass = 'data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200 whitespace-nowrap';

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Header with Back button and Quick Actions */}
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-4 bg-card p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 h-9 font-semibold text-slate-700 dark:text-slate-200">
            <ArrowLeft className="size-4 mr-1.5" /> Back
          </Button>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <div className="relative shrink-0">
            <Avatar className="size-14 sm:size-16 border-2 border-emerald-100 dark:border-emerald-950 shadow-xs">
              {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
              <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background',
                getStatusDot(employee.status)
              )}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">{employee.name}</h1>
              <Badge variant="outline" className={cn(getStatusColor(employee.status), 'text-[10px] font-semibold')}>
                <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(employee.status))} />
                {employee.status === 'busy' ? 'on job' : employee.status.replace('_', ' ')}
              </Badge>
              {getInvitationBadge(employee.invitationStatus)}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
              <Badge variant="secondary" className="text-[10px] capitalize font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{employee.role}</Badge>
              {employee.rating > 0 && (
                <div className="flex items-center gap-1">
                  <StarRating rating={employee.rating} size="sm" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{employee.rating.toFixed(1)}</span>
                </div>
              )}
              {employee.phone && (
                <span className="font-medium text-slate-600 dark:text-slate-400">· {employee.phone}</span>
              )}
              {skills.length > 0 && (
                <span className="text-slate-400">· {skills.slice(0, 2).join(', ')}{skills.length > 2 ? '…' : ''}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          {employee.phone && (
            <div className="flex items-center gap-1 mr-1">
              <a
                href={`tel:${employee.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-slate-200/80 dark:border-slate-700"
                title="Call Employee"
              >
                <Phone className="size-3.5 text-emerald-600" /> Call
              </a>
              <a
                href={`https://wa.me/${employee.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
                title="WhatsApp Employee"
              >
                <MessageSquare className="size-3.5" /> WhatsApp
              </a>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={onEdit} className="h-9 font-semibold">
            <Pencil className="size-3.5 mr-1.5" /> Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={actionLoading}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(!employee.invitationStatus || employee.invitationStatus === 'none') && (
                <DropdownMenuItem onClick={onInvite} disabled={actionLoading}>
                  <Send className="size-3.5 mr-2" /> Send Invitation
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'pending' && (
                <DropdownMenuItem onClick={onInvite} disabled={actionLoading}>
                  <Send className="size-3.5 mr-2" /> Resend Invitation
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'accepted' && (
                <DropdownMenuItem onClick={onResetPassword} disabled={actionLoading || !employee.userId}>
                  <KeyRound className="size-3.5 mr-2" /> Reset Password
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'accepted' && (
                <DropdownMenuItem onClick={onSuspendToggle} disabled={actionLoading} className="text-amber-600">
                  <Power className="size-3.5 mr-2" /> Suspend
                </DropdownMenuItem>
              )}
              {employee.invitationStatus === 'suspended' && (
                <DropdownMenuItem onClick={onSuspendToggle} disabled={actionLoading} className="text-emerald-600">
                  <Power className="size-3.5 mr-2" /> Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 font-semibold" onClick={onDelete}>
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 8-Tab Switcher + More ▾ dropdown (Reviews/Documents/Payroll)
       *
       * Per the approved spec: primary tabs are operational data visible to
       * every authenticated tenant member. Secondary tabs (Reviews/Documents/
       * Payroll) are gated by role via usePermissions() — the underlying APIs
       * enforce the same allow-list server-side.
       *
       * When a secondary tab is active, the More button shows a small dot
       * indicator (More • ▾) so the user doesn't lose context.
       */}
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
              <Clock className="size-3.5" /> Time
            </TabsTrigger>
            <TabsTrigger value="performance" className={tabTriggerClass}>
              <TrendingUp className="size-3.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="equipment" className={tabTriggerClass}>
              <Wrench className="size-3.5" /> Equipment
            </TabsTrigger>
            <TabsTrigger value="location" className={tabTriggerClass}>
              <MapPinned className="size-3.5" /> Location
            </TabsTrigger>
            <TabsTrigger value="activity" className={tabTriggerClass}>
              <ActivityIcon className="size-3.5" /> Activity
            </TabsTrigger>

            {visibleSecondaryTabs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      moreTriggerClass,
                      'inline-flex items-center justify-center gap-1.5 font-medium',
                      isSecondaryActive && 'bg-accent text-emerald-600'
                    )}
                    aria-label="More tabs"
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal className="size-3.5" />
                    <span>More</span>
                    {secondaryActiveLabel && (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <span className="size-1 rounded-full bg-emerald-500 inline-block" aria-hidden />
                        <span className="hidden sm:inline">{secondaryActiveLabel}</span>
                        <ChevronDown className="size-3" />
                      </span>
                    )}
                    {!secondaryActiveLabel && <ChevronDown className="size-3" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {visibleSecondaryTabs.includes('reviews' as EmployeeDetailTab) && (
                    <DropdownMenuItem onClick={() => setActiveTab('reviews')}>
                      <Star className="size-3.5 mr-2" /> Reviews
                    </DropdownMenuItem>
                  )}
                  {visibleSecondaryTabs.includes('documents' as EmployeeDetailTab) && (
                    <DropdownMenuItem onClick={() => setActiveTab('documents')}>
                      <FileStack className="size-3.5 mr-2" /> Documents
                    </DropdownMenuItem>
                  )}
                  {visibleSecondaryTabs.includes('payroll' as EmployeeDetailTab) && (
                    <DropdownMenuItem onClick={() => setActiveTab('payroll')}>
                      <Wallet className="size-3.5 mr-2" /> Payroll
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
          {perms.canAccessEmployeeTab('reviews') ? (
            <ReviewsTab employeeId={employee.id} defaultRating={employee.rating} />
          ) : (
            <ForbiddenNotice tab="Reviews" />
          )}
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          {perms.canAccessEmployeeTab('documents') ? (
            <DocumentsTab employeeId={employee.id} employeeName={employee.name} />
          ) : (
            <ForbiddenNotice tab="Documents" />
          )}
        </TabsContent>
        <TabsContent value="equipment" className="mt-6">
          <EquipmentTab employeeId={employee.id} employeeName={employee.name} />
        </TabsContent>
        <TabsContent value="location" className="mt-6">
          <LocationTab employee={employee} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6">
          {perms.canAccessEmployeeTab('payroll') ? (
            <PayrollTab employeeName={employee.name} employeeId={employee.id} />
          ) : (
            <ForbiddenNotice tab="Payroll" />
          )}
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
  // Phase 2: merge 3 data sources into a unified date-grouped agenda.
  //   - /api/employees/[id]/jobs   → Briefcase icon, source-of-truth for
  //                                  what the employee is assigned to.
  //   - /api/employees/[id]/shifts → Clock icon, the employee's clocked-in
  //                                  shifts (today + recent).
  //   - /api/bookings?employeeId=X → Calendar icon, customer-made bookings
  //                                  (verified the endpoint supports the
  //                                  employeeId filter — see worklog).
  // Each source fetches independently; the three results are merged and
  // bucketed by date (Today / Tomorrow / This Week / Upcoming).
  const jobsQuery = useQuery<{ employee: { id: string; name: string; status: string }; jobs: EmployeeJob[] }>({
    queryKey: ['employee-calendar-jobs', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/jobs`));
      if (!res.ok) throw new Error('Failed to load jobs');
      return res.json();
    },
  });

  const shiftsQuery = useQuery<ShiftsResponse>({
    queryKey: ['employee-calendar-shifts', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/shifts?days=30`));
      if (!res.ok) throw new Error('Failed to load shifts');
      return res.json();
    },
  });

  const bookingsQuery = useQuery<BookingsResponse>({
    queryKey: ['employee-calendar-bookings', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/bookings?employeeId=${employeeId}&limit=50`));
      if (!res.ok) throw new Error('Failed to load bookings');
      return res.json();
    },
  });

  const isLoading = jobsQuery.isLoading || shiftsQuery.isLoading || bookingsQuery.isLoading;

  // Merge into CalendarItem[], filter out past items, sort by scheduledAt asc.
  const items = useMemo<CalendarItem[]>(() => {
    const out: CalendarItem[] = [];

    for (const job of jobsQuery.data?.jobs ?? []) {
      if (job.status === 'completed' || job.status === 'cancelled') continue;
      const customerName = job.customer?.name || job.customerName || 'No customer';
      const timeStr = job.scheduledAt ? ` · ${formatTime(job.scheduledAt)}` : '';
      out.push({
        kind: 'job',
        id: job.id,
        title: job.title,
        subtitle: `${customerName}${timeStr}`,
        scheduledAt: job.scheduledAt,
        status: job.status,
      });
    }

    for (const shift of shiftsQuery.data?.recent ?? []) {
      // Only surface future or in-progress shifts on the agenda.
      if (shift.status === 'completed' && shift.clockOut) {
        const age = Date.now() - new Date(shift.clockOut).getTime();
        if (age > 24 * 60 * 60 * 1000) continue; // older than 1 day
      }
      const dateStr = shift.clockIn ? formatTime(shift.clockIn) : '';
      out.push({
        kind: 'shift',
        id: shift.id,
        title: shift.clockOut ? 'Shift (completed)' : 'Active shift',
        subtitle: `${formatMinutes(shift.totalMinutes)}${dateStr ? ` · ${dateStr}` : ''}`,
        scheduledAt: shift.clockIn,
        status: shift.status,
      });
    }

    for (const booking of bookingsQuery.data?.bookings ?? []) {
      if (booking.status === 'cancelled' || booking.status === 'completed') continue;
      const customerName = booking.customerName || 'No customer';
      const timeStr = booking.scheduledAt ? ` · ${formatTime(booking.scheduledAt)}` : '';
      out.push({
        kind: 'booking',
        id: booking.id,
        title: booking.title,
        subtitle: `${customerName}${timeStr}`,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
      });
    }

    // Sort: scheduled (asc by time) first, unscheduled last.
    out.sort((a, b) => {
      const aT = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bT = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aT - bT;
    });
    return out;
  }, [jobsQuery.data, shiftsQuery.data, bookingsQuery.data]);

  // Bucket by Today / Tomorrow / This Week / Upcoming / Unscheduled.
  // Past items are filtered out.
  const buckets = useMemo<{ key: CalendarBucket; label: string; items: CalendarItem[] }[]>(() => {
    const order: CalendarBucket[] = ['Today', 'Tomorrow', 'This Week', 'Upcoming', 'Unscheduled'];
    const map = new Map<CalendarBucket, CalendarItem[]>();
    for (const item of items) {
      const key = dateBucketKey(item.scheduledAt);
      if (key === 'Past') continue;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ key: k, label: k, items: map.get(k)! }));
  }, [items]);

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

  if (buckets.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No scheduled items"
        description="This employee has no upcoming jobs, shifts, or bookings. Assign a job or schedule a shift to see it appear on the calendar."
      />
    );
  }

  return (
    <div className="space-y-4">
      {buckets.map(({ key, label, items: bucketItems }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-emerald-600" /> {label}
            </CardTitle>
            <CardDescription className="text-xs">
              {bucketItems.length} item{bucketItems.length === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bucketItems.map((item) => (
              <CalendarItemRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CalendarItemRow({ item }: { item: CalendarItem }) {
  const Icon = item.kind === 'job' ? Briefcase : item.kind === 'shift' ? Clock : Calendar;
  const iconColor =
    item.kind === 'job'
      ? 'text-emerald-600'
      : item.kind === 'shift'
      ? 'text-blue-600'
      : 'text-purple-600';
  const iconBg =
    item.kind === 'job'
      ? 'bg-emerald-50 dark:bg-emerald-950/30'
      : item.kind === 'shift'
      ? 'bg-blue-50 dark:bg-blue-950/30'
      : 'bg-purple-50 dark:bg-purple-950/30';
  const kindLabel =
    item.kind === 'job' ? 'Job' : item.kind === 'shift' ? 'Shift' : 'Booking';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
      <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('size-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-[9px] uppercase tracking-wide">{kindLabel}</Badge>
        <Badge variant="outline" className={cn('text-[10px] capitalize', jobStatusBadgeClass(item.status))}>
          {item.status.replace('_', ' ')}
        </Badge>
      </div>
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
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                    {(review.authorName || review.customerId) && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <User className="size-3" />
                        <span className="font-medium">{review.authorName || 'Anonymous'}</span>
                      </span>
                    )}
                    {review.source && review.source !== 'internal' && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{review.source}</Badge>
                    )}
                    <Badge variant="outline" className={cn('text-[10px] capitalize', jobStatusBadgeClass(review.status))}>
                      {review.status}
                    </Badge>
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

const DOCUMENT_ACCESS_LEVELS = [
  { value: 'admin', label: 'Admin only' },
  { value: 'manager', label: 'Managers' },
  { value: 'employee', label: 'Employee' },
  { value: 'customer', label: 'Customer' },
];

function DocumentsTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<DocumentsResponse>({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/documents?employeeId=${employeeId}&limit=50`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const documents = data?.documents ?? [];
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPresetType, setUploadPresetType] = useState<string | null>(null);

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

  const openUpload = (presetType?: string) => {
    setUploadPresetType(presetType ?? null);
    setUploadOpen(true);
  };

  const handleUploadSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['employee-documents', employeeId] });
    setUploadOpen(false);
    setUploadPresetType(null);
  }, [queryClient, employeeId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileStack className="size-4 text-emerald-600" /> Employee Documents
              </CardTitle>
              <CardDescription className="text-xs">Manage {employeeName}&apos;s documents and certifications</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{documents.length} uploaded</Badge>
              <Button size="sm" className="h-8" onClick={() => openUpload()}>
                <Plus className="size-3.5 mr-1" /> Upload
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map((dt) => {
          const doc = findDoc(dt.key);
          const Icon = dt.icon;
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => openUpload(dt.key)}
                  >
                    <Upload className="size-3 mr-1" /> Upload
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

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        presetType={uploadPresetType}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

/**
 * Upload Document Dialog (Phase 2).
 *
 * Records document metadata only — no actual file upload to S3/storage.
 * The user pastes a file URL (e.g. a Google Drive link, an S3 URL, etc.)
 * and we POST { name, description, type, accessLevel, fileUrl, employeeId }
 * to /api/documents, which already enforces the Documents-tab role gate
 * (owner/admin/manager) server-side.
 */
function UploadDocumentDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  presetType,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  presetType: string | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('general');
  const [accessLevel, setAccessLevel] = useState('admin');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // When the dialog opens with a preset type (e.g. user clicked "Upload" on
  // the "Driving License" card), seed both the type field and the name field
  // with a friendly default. The dialog resets state on close, so re-opening
  // with a different preset always starts fresh.
  useEffect(() => {
    if (open && presetType) {
      setType(presetType);
      const presetLabel = DOCUMENT_TYPES.find((t) => t.key === presetType)?.label;
      if (presetLabel) setName(presetLabel);
    }
    if (!open) {
      // Reset on close so the dialog doesn't carry stale state across opens.
      setName('');
      setDescription('');
      setType('general');
      setAccessLevel('admin');
      setFileUrl('');
    }
  }, [open, presetType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fileUrl.trim()) {
      toast.error('Name and file URL are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl('/api/documents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type: type || 'general',
          accessLevel: accessLevel || 'admin',
          fileUrl: fileUrl.trim(),
          employeeId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Upload failed (HTTP ${res.status})`);
      }
      toast.success(`Document uploaded for ${employeeName}`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4 text-emerald-600" /> Upload Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Record a document for {employeeName}. Paste a publicly-accessible file URL — no actual file upload is performed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name" className="text-xs font-medium">Name *</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Driving License"
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-desc" className="text-xs font-medium">Description</Label>
            <Textarea
              id="doc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes (expiry, version, etc.)"
              rows={2}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-type" className="text-xs font-medium">Type</Label>
              <Select value={type} onValueChange={setType} disabled={submitting}>
                <SelectTrigger id="doc-type" className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.key} value={dt.key}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-access" className="text-xs font-medium">Access Level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel} disabled={submitting}>
                <SelectTrigger id="doc-access" className="h-9">
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_ACCESS_LEVELS.map((al) => (
                    <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-url" className="text-xs font-medium">File URL *</Label>
            <Input
              id="doc-url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              type="url"
              required
              disabled={submitting}
            />
            <p className="text-[10px] text-muted-foreground">Direct link to the document. Must be accessible to viewers.</p>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Upload className="size-3.5 mr-1" /> Save Document
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Forbidden Notice (defense-in-depth UI gate) ────────────────────────────
//
// Rendered by TabsContent for Reviews/Documents/Payroll when the user lacks
// the role to view that tab. This is NOT the security boundary — the
// underlying API endpoint enforces the same allow-list server-side. This UI
// gate exists so devtools `setActiveTab('payroll')` cannot reveal content
// even if the dropdown trigger itself is hidden.
function ForbiddenNotice({ tab }: { tab: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <div className="size-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
          <Shield className="size-7 text-amber-600" />
        </div>
        <h3 className="text-base font-semibold">{tab} access restricted</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Your role doesn&apos;t include permission to view this employee&apos;s {tab.toLowerCase()} information.
          Contact an administrator if you believe this is an error.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Equipment Tab ───────────────────────────────────────────────────────────

/**
 * Equipment tab — Phase 3c.
 *
 * Wires the EquipmentTab to the Phase 3a/3b endpoints:
 *   • GET  /api/employees/[id]/equipment   → assigned assets + assignment history
 *   • GET  /api/inventory/assets?status=available&search=…  → available pool
 *   • POST /api/inventory/assets/[id]/assign  → assign an asset to this employee
 *   • POST /api/inventory/assets/[id]/return  → close the current assignment
 *
 * The Equipment tab is operational data, visible to every authenticated tenant
 * member (per the RBAC table in lib/auth/permissions.ts). However the assign /
 * return write actions are role-gated to owner/admin/manager/dispatcher/office —
 * both client-side (via usePermissions().hasRole) and server-side (each write
 * endpoint re-checks via hasRole(authUser, ASSET_WRITE_ROLES)). Hiding the
 * buttons here is just UX; the real gate is the API.
 */

// Roles allowed to assign / return assets. Mirrors the ASSET_WRITE_ROLES list
// in src/app/api/inventory/assets/route.ts (and the assign/return routes).
const EQUIPMENT_WRITE_ROLES = ['owner', 'admin', 'manager', 'dispatcher', 'office'];

interface EquipmentInventoryItem {
  id: string;
  name: string;
  sku: string | null;
}

/** Minimal asset shape returned by /api/inventory/assets (and by the
 *  `assigned` array of /api/employees/[id]/equipment). */
interface InventoryAsset {
  id: string;
  name: string;
  serialNumber: string | null;
  assetTag: string | null;
  description: string | null;
  status: string;
  condition: string;
  notes: string | null;
  assignedEmployeeId: string | null;
  assignedAt: string | null;
  assignmentStatus: string | null;
  inventoryItem: EquipmentInventoryItem | null;
  [key: string]: unknown;
}

/** Subset of InventoryAsset attached to each history row by the equipment endpoint. */
interface InventoryAssetSummary {
  id: string;
  name: string;
  serialNumber: string | null;
  assetTag: string | null;
  inventoryItemId: string | null;
}

interface InventoryAssetAssignment {
  id: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  returnedAt: string | null;
  assignmentStatus: string;
  notes: string | null;
  asset: InventoryAssetSummary | null;
  [key: string]: unknown;
}

interface EquipmentResponse {
  employee: { id: string; name: string; role: string };
  assigned: InventoryAsset[];
  history: InventoryAssetAssignment[];
}

interface AvailableAssetsResponse {
  assets: InventoryAsset[];
  total: number;
  page: number;
  limit: number;
}

/** Color-coded badge classes for the asset's current operational status. */
function assetStatusBadgeClass(status: string): string {
  switch (status) {
    case 'available':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'assigned':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400';
    case 'in_maintenance':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400';
    case 'retired':
      return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400';
    case 'lost':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400';
    case 'damaged':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/** Color-coded badge classes for the asset's physical condition. */
function assetConditionBadgeClass(condition: string): string {
  switch (condition) {
    case 'new':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'good':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400';
    case 'fair':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400';
    case 'poor':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400';
    case 'broken':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/** Color-coded badge classes for an assignment's lifecycle status. */
function assignmentStatusBadgeClass(status: string): string {
  switch (status) {
    case 'assigned':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'returned':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400';
    case 'lost':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400';
    case 'damaged':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function EquipmentTab({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const perms = usePermissions();
  const queryClient = useQueryClient();
  // Gate the assign/return action buttons. The underlying endpoints re-check
  // this server-side — hiding here is just UX, not a security boundary.
  const canManage = perms.hasRole(EQUIPMENT_WRITE_ROLES);

  const [assignOpen, setAssignOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<InventoryAsset | null>(null);

  const queryKey = useMemo(() => ['employee-equipment', employeeId] as const, [employeeId]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<EquipmentResponse>({
    queryKey,
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/equipment`));
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Failed to load equipment (HTTP ${res.status})`);
      }
      return res.json();
    },
  });

  const assigned = data?.assigned ?? [];
  const history = data?.history ?? [];

  // Invalidate the equipment query on assign/return success — this forces the
  // assigned list + history table to refresh from the server so the user sees
  // the new state immediately.
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="size-4 text-emerald-600" /> Equipment
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {assigned.length} assigned
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Assets currently held by {employeeName} and recent assignment history.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RotateCcw className={cn('size-3.5 mr-1', isFetching && 'animate-spin')} />
                Refresh
              </Button>
              {canManage && (
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAssignOpen(true)}
                >
                  <PackagePlus className="size-3.5 mr-1" /> Assign Equipment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Currently Assigned */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="size-4 text-emerald-600" /> Currently Assigned
          </CardTitle>
          <CardDescription className="text-xs">
            Assets this employee is responsible for right now.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Failed to load equipment
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(error as Error).message}
                  </p>
                </div>
              </div>
            </div>
          ) : assigned.length === 0 ? (
            <div className="p-8 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Package className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">No equipment assigned to this employee yet.</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {canManage
                  ? `${employeeName} does not currently hold any assets. Assign equipment to track custody.`
                  : `${employeeName} does not currently hold any assets.`}
              </p>
              {canManage && (
                <Button
                  size="sm"
                  className="mt-3 h-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAssignOpen(true)}
                >
                  <PackagePlus className="size-3.5 mr-1" /> Assign Equipment
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Asset</TableHead>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Condition</TableHead>
                    <TableHead className="text-xs">Assigned</TableHead>
                    {canManage && <TableHead className="text-xs text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{asset.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <QrCode className="size-2.5" />
                          {asset.serialNumber || asset.assetTag || 'No serial / tag'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {asset.inventoryItem ? (
                          <Badge variant="outline" className="text-[10px] bg-muted/40">
                            {asset.inventoryItem.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            assetStatusBadgeClass(asset.status),
                          )}
                        >
                          {asset.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            assetConditionBadgeClass(asset.condition),
                          )}
                        >
                          {asset.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {asset.assignedAt ? formatDate(asset.assignedAt) : '—'}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-xs text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => setReturnTarget(asset)}
                          >
                            <RotateCcw className="size-3 mr-1" /> Return
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment History — hidden entirely when empty (per spec). */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-emerald-600" /> Assignment History
              <Badge variant="secondary" className="text-[10px] ml-1">
                {history.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Last {history.length} assignment record{history.length === 1 ? '' : 's'} (active + returned).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Asset</TableHead>
                    <TableHead className="text-xs">Assigned</TableHead>
                    <TableHead className="text-xs">Returned</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {h.asset?.name ?? (
                            <span className="text-muted-foreground">Unknown asset</span>
                          )}
                        </div>
                        {h.asset && (h.asset.serialNumber || h.asset.assetTag) && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <QrCode className="size-2.5" />
                            {h.asset.serialNumber || h.asset.assetTag}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(h.assignedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {h.returnedAt ? (
                          formatDate(h.returnedAt)
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                          >
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            assignmentStatusBadgeClass(h.assignmentStatus),
                          )}
                        >
                          {h.assignmentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <AssignEquipmentDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        onSuccess={invalidate}
      />

      {/* Return Dialog */}
      <ReturnAssetDialog
        open={returnTarget !== null}
        onOpenChange={(o) => {
          if (!o) setReturnTarget(null);
        }}
        asset={returnTarget}
        employeeName={employeeName}
        onSuccess={invalidate}
      />
    </div>
  );
}

/**
 * Assign Equipment dialog.
 *
 * Fetches the pool of available assets (status='available', assignedEmployeeId=null)
 * from /api/inventory/assets with a 300ms-debounced search input. The user picks
 * one asset (radio-style click-to-select), optionally enters notes, and submits
 * — which POSTs to /api/inventory/assets/[id]/assign with { employeeId, notes }.
 *
 * On success: closes the dialog, invalidates the employee-equipment query so the
 * assigned list refreshes, and shows a success toast. The dialog itself
 * re-fetches the available pool every time it opens (because the query key
 * includes the debounced search, which resets to '' on open).
 */
function AssignEquipmentDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset dialog state whenever it closes so the next open starts fresh
  // (no stale search query / selected asset / notes carried across sessions).
  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      setSelectedAssetId(null);
      setNotes('');
    }
  }, [open]);

  // Debounce search input by 300ms before triggering a refetch.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch available assets. Disabled when the dialog is closed so we don't
  // fire a request on initial page load (the Equipment tab may be visible but
  // the user hasn't opened the assign dialog yet).
  const { data, isLoading: loadingAssets } = useQuery<AvailableAssetsResponse>({
    queryKey: ['inventory-assets-available', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'available', limit: '50' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await authFetch(apiUrl(`/api/inventory/assets?${params.toString()}`));
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Failed to load assets (HTTP ${res.status})`);
      }
      return res.json();
    },
    enabled: open,
  });

  const assets = data?.assets ?? [];

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      toast.error('Select an asset to assign');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl(`/api/inventory/assets/${selectedAssetId}/assign`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Assign failed (HTTP ${res.status})`);
      }
      toast.success(`Asset assigned to ${employeeName}`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assign failed');
    } finally {
      setSubmitting(false);
    }
  };

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickAssetName, setQuickAssetName] = useState('');
  const [quickSerial, setQuickSerial] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const handleQuickCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAssetName.trim()) {
      toast.error('Asset name is required');
      return;
    }
    setQuickSubmitting(true);
    try {
      // 1. Create asset
      const createRes = await authFetch(apiUrl('/api/inventory/assets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAssetName.trim(),
          serialNumber: quickSerial.trim() || undefined,
          status: 'available',
          condition: 'good',
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create asset');
      }
      const { asset } = await createRes.json();

      // 2. Assign asset to employee
      const assignRes = await authFetch(apiUrl(`/api/inventory/assets/${asset.id}/assign`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, notes: notes.trim() || undefined }),
      });
      if (!assignRes.ok) {
        const body = await assignRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to assign asset');
      }

      toast.success(`Asset "${quickAssetName}" created and assigned to ${employeeName}`);
      onSuccess();
      setShowQuickCreate(false);
      setQuickAssetName('');
      setQuickSerial('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Quick assign failed');
    } finally {
      setQuickSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-4 text-emerald-600" /> Assign Equipment to {employeeName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select an available asset or create a new trackable asset to assign to this employee.
          </DialogDescription>
        </DialogHeader>

        {showQuickCreate ? (
          <form onSubmit={handleQuickCreateAndAssign} className="space-y-4 py-2">
            <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Quick Create & Assign Equipment
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                This will instantly register a new equipment asset and assign custody to {employeeName}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-asset-name" className="text-xs font-medium">
                Equipment / Asset Name *
              </Label>
              <Input
                id="quick-asset-name"
                value={quickAssetName}
                onChange={(e) => setQuickAssetName(e.target.value)}
                placeholder="e.g. HVAC Vacuum Pump #3, Fluke Multimeter"
                className="h-9"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-asset-serial" className="text-xs font-medium">
                Serial Number or Tag (Optional)
              </Label>
              <Input
                id="quick-asset-serial"
                value={quickSerial}
                onChange={(e) => setQuickSerial(e.target.value)}
                placeholder="e.g. SN-883921"
                className="h-9"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickCreate(false)}
                disabled={quickSubmitting}
              >
                Back to Available Assets
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={quickSubmitting || !quickAssetName.trim()}
              >
                {quickSubmitting ? 'Assigning…' : 'Create & Assign'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAssign} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="asset-search" className="text-xs font-medium">
                Search available assets
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 px-2"
                onClick={() => {
                  setQuickAssetName(search);
                  setShowQuickCreate(true);
                }}
              >
                <Plus className="size-3 mr-1" /> Quick Create Asset
              </Button>
            </div>
            <div className="relative">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                id="asset-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, serial number, or asset tag…"
                className="pl-8 h-9"
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="border rounded-md max-h-72 overflow-y-auto">
              {loadingAssets ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div className="p-6 text-center space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    No available assets{debouncedSearch ? ` matching “${debouncedSearch}”.` : '.'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Create a trackable equipment asset to assign to {employeeName}.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => {
                      setQuickAssetName(search);
                      setShowQuickCreate(true);
                    }}
                  >
                    <PackagePlus className="size-3.5" /> Quick Create & Assign Asset
                  </Button>
                </div>
              ) : (
              assets.map((asset) => {
                const selected = selectedAssetId === asset.id;
                return (
                  <button
                    type="button"
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={cn(
                      'w-full text-left p-3 border-b last:border-b-0 hover:bg-accent transition-colors flex items-start gap-2',
                      selected && 'bg-emerald-50/60 dark:bg-emerald-950/20',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0',
                        selected ? 'border-emerald-600 bg-emerald-600' : 'border-border',
                      )}
                    >
                      {selected && <CheckCircle2 className="size-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate">{asset.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                        {asset.serialNumber && (
                          <span className="flex items-center gap-1">
                            <QrCode className="size-2.5" /> {asset.serialNumber}
                          </span>
                        )}
                        {asset.assetTag && (
                          <span className="flex items-center gap-1">
                            <Package className="size-2.5" /> {asset.assetTag}
                          </span>
                        )}
                        {!asset.serialNumber && !asset.assetTag && <span>No serial / tag</span>}
                      </div>
                      {asset.inventoryItem && (
                        <Badge variant="outline" className="mt-1 text-[10px] bg-muted/40">
                          {asset.inventoryItem.name}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] capitalize', assetConditionBadgeClass(asset.condition))}
                    >
                      {asset.condition}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-notes" className="text-xs font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. kit issued for Project X, condition verified at handover"
              rows={2}
              disabled={submitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedAssetId}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" /> Assigning…
                </>
              ) : (
                <>
                  <PackagePlus className="size-3.5 mr-1" /> Assign
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Return Asset dialog.
 *
 * Opens with a single asset (the row the user clicked "Return" on). The user
 * chooses a return status (returned / lost / damaged, default 'returned') and
 * optionally enters notes for the audit trail. Submits via POST
 * /api/inventory/assets/[id]/return with { status, notes }.
 *
 * On success: closes the dialog, invalidates the equipment query, shows a
 * success toast.
 */
function ReturnAssetDialog({
  open,
  onOpenChange,
  asset,
  employeeName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: InventoryAsset | null;
  employeeName: string;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<'returned' | 'lost' | 'damaged'>('returned');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset on close so the next return action starts with the default status.
  useEffect(() => {
    if (!open) {
      setStatus('returned');
      setNotes('');
    }
  }, [open]);

  if (!asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl(`/api/inventory/assets/${asset.id}/return`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Return failed (HTTP ${res.status})`);
      }
      toast.success(`Asset returned from ${employeeName}`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Return failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-4 text-emerald-600" /> Return Asset — {asset.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mark this asset as returned, lost, or damaged. The employee&apos;s assignment will be closed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div className="text-xs font-medium text-foreground">{asset.name}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
              {asset.serialNumber && (
                <span className="flex items-center gap-1">
                  <QrCode className="size-2.5" /> {asset.serialNumber}
                </span>
              )}
              {asset.assetTag && (
                <span className="flex items-center gap-1">
                  <Package className="size-2.5" /> {asset.assetTag}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User className="size-2.5" /> {employeeName}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="return-status" className="text-xs font-medium">
              Return status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as 'returned' | 'lost' | 'damaged')}
              disabled={submitting}
            >
              <SelectTrigger id="return-status" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="returned">Returned (asset back in pool)</SelectItem>
                <SelectItem value="lost">Lost (asset unrecoverable)</SelectItem>
                <SelectItem value="damaged">Damaged (needs repair / write-off)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="return-notes" className="text-xs font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="return-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                status === 'returned'
                  ? 'e.g. handover condition verified'
                  : 'e.g. explain loss / damage for the audit trail'
              }
              rows={3}
              disabled={submitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" /> Confirming…
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5 mr-1" /> Confirm Return
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  // Fetch the employee's jobs so we can identify the current active job
  // (status 'assigned' or 'in_progress') and compute ETA from the
  // employee's GPS coordinates to the job's geocoded destination lat/lng.
  const jobsQuery = useQuery<{ employee: { id: string; name: string; status: string }; jobs: EmployeeJob[] }>({
    queryKey: ['employee-location-jobs', employee.id],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employee.id}/jobs`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const hasCoords = !!(employee.latitude && employee.longitude);
  const totalDistanceKm = data?.summary?.totalDistanceKm ?? 0;
  const totalDurationMin = data?.summary?.totalDurationMinutes ?? 0;
  const routes = data?.routes ?? [];

  // Identify the employee's current active job: the first one in
  // 'assigned' or 'in_progress' status. Sorted by scheduledAt desc on the
  // server, so the most-recent assignment wins.
  const currentJob = useMemo(() => {
    const all = jobsQuery.data?.jobs ?? [];
    return all.find((j) => j.status === 'assigned' || j.status === 'in_progress') ?? null;
  }, [jobsQuery.data]);

  // Compute straight-line haversine distance + estimated travel time
  // (40 km/h urban average — per Phase 2 spec for LocationTab ETA).
  // Both the employee's current GPS and the job's geocoded destination
  // must be present to compute; otherwise we show the appropriate empty state.
  const eta = useMemo(() => {
    if (!employee.latitude || !employee.longitude) return null;
    if (!currentJob) return null;
    const jobLat = currentJob.latitude;
    const jobLng = currentJob.longitude;
    if (typeof jobLat !== 'number' || typeof jobLng !== 'number' || !jobLat || !jobLng) return null;
    const distKm = haversineDistanceKm(employee.latitude, employee.longitude, jobLat, jobLng);
    const travelMin = estimateTravelMinutes(distKm);
    return { distKm, travelMin, jobTitle: currentJob.title, customerName: currentJob.customer?.name || currentJob.customerName || null };
  }, [employee.latitude, employee.longitude, currentJob]);

  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(employee.longitude! - 0.01)}%2C${(employee.latitude! - 0.01)}%2C${(employee.longitude! + 0.01)}%2C${(employee.latitude! + 0.01)}&layer=mapnik&marker=${employee.latitude}%2C${employee.longitude}`
    : null;

  return (
    <div className="space-y-4">
      {/* ETA Card — straight-line distance + rough travel time */}
      <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Navigation className="size-4 text-emerald-600" /> ETA to Current Job
          </CardTitle>
          <CardDescription className="text-xs">
            Straight-line distance · 40 km/h urban estimate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !hasCoords ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <AlertCircle className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">No GPS data</p>
                <p className="text-xs text-muted-foreground">
                  The employee hasn&apos;t shared their current location.
                </p>
              </div>
            </div>
          ) : !currentJob ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Briefcase className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">No active job</p>
                <p className="text-xs text-muted-foreground">
                  No job is currently assigned or in progress.
                </p>
              </div>
            </div>
          ) : !eta ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <MapPin className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Job site coordinates unavailable</p>
                <p className="text-xs text-muted-foreground">
                  {currentJob.title} ({currentJob.customer?.name || currentJob.customerName || 'no customer'})
                  &nbsp;has no geocoded lat/lng — cannot compute ETA.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{eta.distKm.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground font-medium">km away</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-baseline gap-1.5">
                <Clock className="size-3.5 text-emerald-600 self-center" />
                <span className="text-lg font-semibold">~{eta.travelMin} min</span>
                <span className="text-xs text-muted-foreground font-medium">ETA</span>
              </div>
              <div className="ml-auto text-right min-w-0">
                <p className="text-xs font-medium truncate">{eta.jobTitle}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {eta.customerName ? `${eta.customerName}` : 'No customer'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

// ─── Payroll Tab ─────────────────────────────────────────────────────────────

type PayrollPeriod = '7d' | '14d' | 'current_month' | 'last_month';

const PAYROLL_PERIOD_OPTIONS: { value: PayrollPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: 'current_month', label: 'Current month' },
  { value: 'last_month', label: 'Last month' },
];

/**
 * Compute the { from, to } YYYY-MM-DD pair for a given payroll period preset.
 * - 7d / 14d: from = today - N days, to = today.
 * - current_month: from = 1st of current month, to = today.
 * - last_month: from = 1st of last month, to = last day of last month.
 */
function payrollPeriodRange(period: PayrollPeriod): { from: string; to: string } {
  const now = new Date();
  const to = toYMD(now);
  if (period === '7d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6); // 7 days inclusive of today
    return { from: toYMD(from), to };
  }
  if (period === '14d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 13);
    return { from: toYMD(from), to };
  }
  if (period === 'current_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toYMD(from), to };
  }
  // last_month
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toYMD(from), to: toYMD(lastDayOfLastMonth) };
}

function PayrollTab({ employeeName, employeeId }: { employeeName: string; employeeId: string }) {
  const perms = usePermissions();
  const [period, setPeriod] = useState<PayrollPeriod>('current_month');
  const range = useMemo(() => payrollPeriodRange(period), [period]);

  const { data, isLoading, error } = useQuery<PayrollResponse>({
    queryKey: ['employee-payroll', employeeId, range.from, range.to],
    queryFn: async () => {
      const res = await authFetch(
        apiUrl(`/api/time-tracking/payroll?from=${range.from}&to=${range.to}`),
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        const err = new Error(body.error || `Failed to load payroll (HTTP ${res.status})`);
        // Attach the HTTP status so the renderer can distinguish 403 (permission)
        // from a generic 500.
        (err as Error & { status?: number }).status = res.status;
        throw err;
      }
      return res.json();
    },
    // Don't auto-refetch on window focus — payroll data is slow to settle and
    // a refetch while the user is mid-read is jarring.
    refetchOnWindowFocus: false,
    // Only fetch when the user has the payroll permission. Defense-in-depth:
    // the parent TabsContent already gates the tab, but if the user lands here
    // via stale state we want to avoid a useless 403 round-trip.
    enabled: perms.canAccessEmployeeTab('payroll'),
  });

  // Defense-in-depth: the parent TabsContent for `payroll` already wraps this
  // component in `perms.canAccessEmployeeTab('payroll') ? <PayrollTab/> :
  // <ForbiddenNotice/>`. The check here catches the case where the user lands
  // on the tab via stale URL hash or devtools `setActiveTab('payroll')`.
  if (!perms.canAccessEmployeeTab('payroll')) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="size-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
            <Shield className="size-7 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold">You don&apos;t have permission to view payroll</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Payroll data is restricted to owners, admins, and accountants.
            Contact an administrator if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Handle the 403 specifically — show the permission message rather than
  // a generic error toast / blank state. The endpoint returns 403 for users
  // below the payroll tier (manager/dispatcher/employee/viewer/etc), which
  // shouldn't happen here because of the gate above, but this guards against
  // race conditions (user's role revoked between page-load and fetch).
  const httpStatus = (error as Error & { status?: number } | null)?.status;
  if (error && httpStatus === 403) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="size-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
            <Shield className="size-7 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold">You don&apos;t have permission to view payroll</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Your role doesn&apos;t include permission to view payroll information.
          </p>
        </CardContent>
      </Card>
    );
  }

  const payroll = data?.payroll ?? [];
  // Filter to the selected employee (the endpoint returns ALL tenant employees
  // with shifts in the range; we want only this employee's row). If no row
  // exists for this employee, show an empty-state with the period selector.
  const employeeRow = payroll.find((p) => p.employee.id === employeeId);
  const allRows = payroll; // also show the full team for context (sorted desc by working minutes, server-side)

  return (
    <div className="space-y-4">
      {/* Period Selector + Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="size-4 text-emerald-600" /> Payroll Summary
              </CardTitle>
              <CardDescription className="text-xs">
                {employeeName} · {range.from} → {range.to}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="payroll-period" className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as PayrollPeriod)}>
                <SelectTrigger id="payroll-period" className="h-8 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYROLL_PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Failed to load payroll</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error.message}. Try a different period or contact an administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !employeeRow ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Clock className="size-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">No payroll entries in this period</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {employeeName} has no completed shifts between {range.from} and {range.to}.
              Try a wider period or assign work to see entries appear.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selected Employee Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IndianRupee className="size-4 text-emerald-600" /> {employeeName}&apos;s Summary
              </CardTitle>
              <CardDescription className="text-xs">Hours worked in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <PayrollStat
                  label="Total time"
                  value={formatMinutes(employeeRow.totalMinutes)}
                  hint={`${employeeRow.entriesCount} entr${employeeRow.entriesCount === 1 ? 'y' : 'ies'}`}
                />
                <PayrollStat
                  label="Working"
                  value={formatMinutes(employeeRow.workingMinutes)}
                  hint="On-the-clock time"
                />
                <PayrollStat
                  label="Break"
                  value={formatMinutes(employeeRow.breakMinutes)}
                  hint="Breaks taken"
                />
                <PayrollStat
                  label="Travel"
                  value={formatMinutes(employeeRow.travelMinutes)}
                  hint="Driving/transit"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <PayrollStat
                  label="Approved entries"
                  value={String(employeeRow.approvedCount)}
                  hint={`${employeeRow.entriesCount} total`}
                />
                <PayrollStat
                  label="Pending entries"
                  value={String(employeeRow.pendingCount)}
                  hint="Awaiting approval"
                />
              </div>
            </CardContent>
          </Card>

          {/* Full Team Payroll Table (context) */}
          {allRows.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock3 className="size-4 text-emerald-600" /> Team Payroll
                </CardTitle>
                <CardDescription className="text-xs">
                  All employees with shifts in this period (for context)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-right">Working</TableHead>
                        <TableHead className="text-xs text-right">Break</TableHead>
                        <TableHead className="text-xs text-right">Travel</TableHead>
                        <TableHead className="text-xs text-right">Entries</TableHead>
                        <TableHead className="text-xs text-right">Approved</TableHead>
                        <TableHead className="text-xs text-right">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRows.map((row) => (
                        <TableRow
                          key={row.employee.id}
                          className={cn(row.employee.id === employeeId && 'bg-emerald-50/50 dark:bg-emerald-950/20')}
                        >
                          <TableCell className="text-xs font-medium">
                            {row.employee.name}
                            {row.employee.id === employeeId && (
                              <Badge variant="secondary" className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-700">Selected</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.totalMinutes)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.workingMinutes)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.breakMinutes)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatMinutes(row.travelMinutes)}</TableCell>
                          <TableCell className="text-xs text-right">{row.entriesCount}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-600 font-medium">{row.approvedCount}</TableCell>
                          <TableCell className="text-xs text-right text-amber-600 font-medium">{row.pendingCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PayrollStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
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

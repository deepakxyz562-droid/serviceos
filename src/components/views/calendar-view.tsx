'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Plus, MapPin, User,
  Briefcase, LayoutGrid, List, X, ArrowRight, Eye,
  MoreHorizontal, Users, CheckCircle2, Sparkles, CalendarClock, Ban,
  CalendarDays, Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─── Types ──────────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'booking' | 'job';
  status: string;
  scheduledAt: string | null;
  scheduledEndTime?: string | null;
  customerName?: string;
  employeeName?: string;
  address?: string;
  duration?: number;
  priority?: string;
  jobType?: string;
  description?: string;
  employee?: { id: string; name: string; avatar?: string };
}

interface Booking {
  id: string;
  title: string;
  description?: string;
  status: string;
  source: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  employeeId?: string;
  employee?: { id: string; name: string; avatar?: string };
  serviceId?: string;
  address?: string;
  scheduledAt?: string;
  scheduledEndTime?: string;
  duration: number;
  notes?: string;
  createdAt: string;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  scheduledAt?: string;
  customerName?: string;
  assigneeId?: string;
  assigneeName?: string;
  notes?: string;
  createdAt: string;
}

interface BookingFormData {
  title: string;
  customerName: string;
  employee: string;
  scheduledAt: string;
  scheduledEndTime: string;
  duration: number;
  address: string;
  source: string;
  notes: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  pending:        { label: 'Pending',    dot: 'bg-amber-500',    bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200' },
  confirmed:      { label: 'Confirmed',  dot: 'bg-sky-500',      bg: 'bg-sky-50',      text: 'text-sky-700',      border: 'border-sky-200' },
  assigned:       { label: 'Assigned',   dot: 'bg-teal-500',     bg: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200' },
  in_progress:    { label: 'In Progress',dot: 'bg-emerald-500',  bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  completed:      { label: 'Completed',  dot: 'bg-green-500',    bg: 'bg-green-50',    text: 'text-green-700',    border: 'border-green-200' },
  cancelled:      { label: 'Cancelled',  dot: 'bg-red-500',      bg: 'bg-red-50',      text: 'text-red-700',      border: 'border-red-200' },
  no_show:        { label: 'No Show',    dot: 'bg-gray-500',     bg: 'bg-gray-50',     text: 'text-gray-700',     border: 'border-gray-200' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

const EMPTY_FORM = (): BookingFormData => ({
  title: '', customerName: '', employee: '', scheduledAt: '', scheduledEndTime: '',
  duration: 60, address: '', source: 'manual', notes: '',
});

// ─── Date Helpers ───────────────────────────────────────────────────────────

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDay || i >= firstDay + daysInMonth) {
      days.push(null);
    } else {
      days.push(i - firstDay + 1);
    }
  }
  return days;
}

function getWeekDays(date: Date): Date[] {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateKeyFromDate(d: Date): string {
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function formatCompactTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function formatTimeRange(start?: string | null, end?: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return '';
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CalendarView() {
  // Navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Data state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  // UI state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [form, setForm] = useState<BookingFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  // Filter state
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'booking' | 'job'>('all');

  // Booking action state (event-card dropdown actions)
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // Derived
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      // Calculate date range for the visible calendar
      let dateFrom: string;
      let dateTo: string;

      if (viewMode === 'month') {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        // Expand range to capture events in visible cells (prev/next month overflow)
        const startOffset = firstDay.getDay();
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startOffset);
        const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + totalCells - 1);

        dateFrom = startDate.toISOString().split('T')[0];
        dateTo = endDate.toISOString().split('T')[0];
      } else if (viewMode === 'week') {
        const weekDays = getWeekDays(currentDate);
        dateFrom = weekDays[0].toISOString().split('T')[0];
        dateTo = weekDays[6].toISOString().split('T')[0];
      } else if (viewMode === 'day') {
        const d = new Date(currentYear, currentMonth, currentDate.getDate());
        dateFrom = d.toISOString().split('T')[0];
        dateTo = dateFrom;
      } else {
        // agenda — fetch a 90-day window starting today
        const today = new Date();
        const future = new Date(today);
        future.setDate(future.getDate() + 90);
        dateFrom = today.toISOString().split('T')[0];
        dateTo = future.toISOString().split('T')[0];
      }

      const [bookingsRes, jobsRes] = await Promise.all([
        authFetch(`/api/bookings?limit=200&dateFrom=${dateFrom}&dateTo=${dateTo}`),
        authFetch(`/api/jobs?limit=200`),
      ]);

      const calendarEvents: CalendarEvent[] = [];

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        const bookings: Booking[] = data.bookings || data || [];
        for (const b of bookings) {
          if (b.scheduledAt) {
            calendarEvents.push({
              id: `booking-${b.id}`,
              title: b.title,
              type: 'booking',
              status: b.status,
              scheduledAt: b.scheduledAt,
              scheduledEndTime: b.scheduledEndTime,
              customerName: b.customerName,
              employeeName: b.employee?.name,
              address: b.address,
              duration: b.duration,
              description: b.description,
              employee: b.employee,
            });
          }
        }
      }

      if (jobsRes.ok) {
        const jobs: Job[] = await jobsRes.json();
        for (const j of jobs) {
          if (j.scheduledAt) {
            calendarEvents.push({
              id: `job-${j.id}`,
              title: j.title,
              type: 'job',
              status: j.status,
              scheduledAt: j.scheduledAt,
              customerName: j.customerName,
              employeeName: j.assigneeName,
              address: j.address,
              priority: j.priority,
              jobType: j.type,
              description: j.description,
            });
          }
        }
      }

      setEvents(calendarEvents);
    } catch {
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, currentDate, viewMode]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await authFetch('/api/employees?limit=100');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || data || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ─── Filtered Events ───────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (typeFilter !== 'all' && evt.type !== typeFilter) return false;
      if (employeeFilter !== 'all') {
        const emp = employees.find((e) => e.id === employeeFilter);
        const matchesName = emp ? evt.employeeName === emp.name : false;
        const matchesId = evt.employee?.id === employeeFilter;
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [events, typeFilter, employeeFilter, employees]);

  // ─── Events Map ─────────────────────────────────────────────────────────

  const eventsMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of filteredEvents) {
      if (!evt.scheduledAt) continue;
      const d = new Date(evt.scheduledAt);
      const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    }
    // Sort events within each day by scheduledAt
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        if (!a.scheduledAt || !b.scheduledAt) return 0;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
    }
    return map;
  }, [filteredEvents]);

  // ─── Navigation ─────────────────────────────────────────────────────────

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      } else if (viewMode === 'week') {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      } else if (viewMode === 'day') {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        return d;
      }
      // agenda: no time navigation
      return prev;
    });
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      } else if (viewMode === 'week') {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      } else if (viewMode === 'day') {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        return d;
      }
      // agenda: no time navigation
      return prev;
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // ─── Create Booking ─────────────────────────────────────────────────────

  const handleCreateBooking = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, unknown> = {
        title: form.title,
        customerName: form.customerName || undefined,
        employeeId: form.employee || undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        scheduledEndTime: form.scheduledEndTime ? new Date(form.scheduledEndTime).toISOString() : undefined,
        duration: form.duration,
        address: form.address || undefined,
        source: form.source || 'manual',
        notes: form.notes || undefined,
      };

      const res = await authFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create booking');
      }

      toast.success('Booking created successfully');
      setShowCreateDialog(false);
      setForm(EMPTY_FORM());
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  }, [form, fetchEvents]);

  /**
   * Open the create-booking dialog pre-filled with a specific date (and optional hour).
   * Used by month-view empty cells, day-view empty time slots, and the detail-panel
   * "Add Event" button.
   */
  const openCreateForDateTime = useCallback((dateKeyStr: string, hour: number = 8) => {
    const [y, m, d] = dateKeyStr.split('-').map(Number);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
    setForm({ ...EMPTY_FORM(), scheduledAt: dateStr });
    setShowCreateDialog(true);
  }, []);

  // ─── Booking Action Handlers (event-card dropdown) ──────────────────────

  /**
   * Extract the raw booking UUID from a calendar event id.
   * Booking events use `booking-${b.id}` (see fetchEvents). Job events use
   * `job-${j.id}` and have no booking actions.
   */
  function extractBookingId(evt: CalendarEvent): string | null {
    if (evt.type !== 'booking') return null;
    return evt.id.replace('booking-', '');
  }

  const handleEventAssign = useCallback(async (evt: CalendarEvent, employeeId: string) => {
    const bookingId = extractBookingId(evt);
    if (!bookingId) return;
    setActionInProgress(true);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign employee');
      }
      toast.success(employeeId ? 'Employee assigned' : 'Employee unassigned');
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign employee');
    } finally {
      setActionInProgress(false);
    }
  }, [fetchEvents]);

  const handleEventAutoAssign = useCallback(async (evt: CalendarEvent) => {
    const bookingId = extractBookingId(evt);
    if (!bookingId) return;
    setActionInProgress(true);
    try {
      const res = await authFetch('/api/bookings/auto-assign', {
        method: 'POST',
        body: JSON.stringify({ bookingId, strategy: 'workload' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Auto-assign failed — no available employees');
      }
      toast.success(
        data?.employee?.name
          ? `Auto-assigned to ${data.employee.name}`
          : 'Booking auto-assigned'
      );
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Auto-assign failed');
    } finally {
      setActionInProgress(false);
    }
  }, [fetchEvents]);

  const handleEventCreateJob = useCallback(async (evt: CalendarEvent) => {
    const bookingId = extractBookingId(evt);
    if (!bookingId) return;
    setActionInProgress(true);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/create-job`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 409 = job already exists for this booking
        if (res.status === 409) {
          toast.error(data?.error || 'Job already exists for this booking');
        } else {
          throw new Error(data?.error || 'Failed to create job');
        }
      } else {
        toast.success(data?.message || 'Job created from booking');
        fetchEvents();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setActionInProgress(false);
    }
  }, [fetchEvents]);

  const handleEventMarkCompleted = useCallback(async (evt: CalendarEvent) => {
    const bookingId = extractBookingId(evt);
    if (!bookingId) return;
    setActionInProgress(true);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to mark completed');
      }
      toast.success('Booking marked as completed');
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark completed');
    } finally {
      setActionInProgress(false);
    }
  }, [fetchEvents]);

  const handleEventCancel = useCallback(async (evt: CalendarEvent) => {
    const bookingId = extractBookingId(evt);
    if (!bookingId) return;
    setActionInProgress(true);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to cancel booking');
      }
      toast.success('Booking cancelled');
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setActionInProgress(false);
    }
  }, [fetchEvents]);

  const openRescheduleDialog = useCallback((evt: CalendarEvent) => {
    if (evt.type !== 'booking') return;
    // Pre-fill with current scheduledAt (in datetime-local format)
    let initial = '';
    if (evt.scheduledAt) {
      try {
        initial = new Date(evt.scheduledAt).toISOString().slice(0, 16);
      } catch {
        initial = '';
      }
    }
    setRescheduleAt(initial);
    setRescheduleEvent(evt);
  }, []);

  const handleRescheduleSubmit = useCallback(async () => {
    if (!rescheduleEvent || !rescheduleAt) {
      toast.error('Please pick a new date and time');
      return;
    }
    const bookingId = extractBookingId(rescheduleEvent);
    if (!bookingId) return;
    setActionInProgress(true);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ scheduledAt: new Date(rescheduleAt).toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to reschedule');
      }
      toast.success('Booking rescheduled');
      setRescheduleEvent(null);
      setRescheduleAt('');
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reschedule');
    } finally {
      setActionInProgress(false);
    }
  }, [rescheduleEvent, rescheduleAt, fetchEvents]);

  /**
   * Render the action dropdown menu for a single booking event card.
   * Returns null for job events (no booking actions apply).
   */
  const renderEventActions = (evt: CalendarEvent) => {
    if (evt.type !== 'booking') return null;
    const isAssigned = !!evt.employee?.id;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0 shrink-0 hover:bg-background/80"
            aria-label="Booking actions"
            disabled={actionInProgress}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Assign / Change Employee with sub-menu of employees */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Users className="size-4 mr-2" />
              {isAssigned ? 'Change Employee' : 'Assign Employee'}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[280px] overflow-y-auto">
              {employees.length === 0 ? (
                <DropdownMenuItem disabled>No employees available</DropdownMenuItem>
              ) : (
                employees.map((emp) => (
                  <DropdownMenuItem
                    key={emp.id}
                    onClick={() => handleEventAssign(evt, emp.id)}
                  >
                    <User className="size-3.5 mr-2 text-muted-foreground" />
                    {emp.name}
                  </DropdownMenuItem>
                ))
              )}
              {isAssigned && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleEventAssign(evt, '')}
                  >
                    <Ban className="size-3.5 mr-2" /> Unassign
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={() => handleEventAutoAssign(evt)}>
            <Sparkles className="size-4 mr-2" /> Auto Assign
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleEventCreateJob(evt)}>
            <Briefcase className="size-4 mr-2" /> Create Job
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleEventMarkCompleted(evt)}
            disabled={evt.status === 'completed'}
          >
            <CheckCircle2 className="size-4 mr-2" /> Mark Completed
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => openRescheduleDialog(evt)}>
            <CalendarClock className="size-4 mr-2" /> Reschedule
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => handleEventCancel(evt)}
            disabled={evt.status === 'cancelled'}
          >
            <Ban className="size-4 mr-2" /> Cancel Booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // ─── Selected Date Events ───────────────────────────────────────────────

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsMap[selectedDate] || [];
  }, [selectedDate, eventsMap]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [selectedDate]);

  // ─── Month View ─────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden border border-border/50">
      {/* Day headers */}
      {DAYS_OF_WEEK.map((day, i) => (
        <div
          key={day}
          className={`bg-muted/50 px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground ${
            i === 0 || i === 6 ? 'text-muted-foreground/70' : ''
          }`}
        >
          <span className="hidden sm:inline">{day}</span>
          <span className="sm:hidden">{day.charAt(0)}</span>
        </div>
      ))}

      {/* Calendar cells */}
      {calendarDays.map((day, i) => {
        if (day === null) {
          return <div key={`empty-${i}`} className="bg-background min-h-[80px] sm:min-h-[110px] p-1.5" />;
        }

        const key = dateKey(currentYear, currentMonth, day);
        const dayEvents = eventsMap[key] || [];
        const today = isToday(currentYear, currentMonth, day);
        const isSelected = selectedDate === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (dayEvents.length === 0) {
                openCreateForDateTime(key, 8);
              } else {
                setSelectedDate(key);
                setShowDetailPanel(true);
              }
            }}
            className={`bg-background min-h-[80px] sm:min-h-[110px] p-1.5 text-left transition-colors hover:bg-muted/40 relative group ${
              isSelected ? 'ring-2 ring-emerald-500 ring-inset z-10' : ''
            } ${today ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
          >
            <div className="flex items-start justify-between mb-0.5">
              <span
                className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-medium transition-colors ${
                  today
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-foreground/80 group-hover:text-foreground'
                }`}
              >
                {day}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {dayEvents.length}
                </span>
              )}
            </div>

            {/* Event chips */}
            <div className="space-y-0.5 overflow-hidden">
              {dayEvents.slice(0, 3).map((evt) => {
                const cfg = getStatusConfig(evt.status);
                const isJob = evt.type === 'job';
                const leftBorder = isJob ? 'border-l-emerald-500' : 'border-l-sky-500';
                return (
                  <TooltipProvider key={evt.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium truncate cursor-default border-l-2 ${leftBorder} ${cfg.bg} ${cfg.text} ${cfg.border} border`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(key);
                            setShowDetailPanel(true);
                          }}
                        >
                          {evt.scheduledAt && (
                            <span className="shrink-0 opacity-80">
                              {formatCompactTime(evt.scheduledAt)}
                            </span>
                          )}
                          <span className="truncate">{evt.title}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">{evt.title}</p>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            {isJob ? <Briefcase className="size-3" /> : <Calendar className="size-3" />}
                            <span className="capitalize">{isJob ? 'Job' : 'Booking'}</span>
                            <span>·</span>
                            <span>{cfg.label}</span>
                          </div>
                          {evt.scheduledAt && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="size-3" />
                              <span>{formatTimeRange(evt.scheduledAt, evt.scheduledEndTime)}</span>
                            </div>
                          )}
                          {evt.customerName && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <User className="size-3" />
                              <span>{evt.customerName}</span>
                            </div>
                          )}
                          {evt.employeeName && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="size-3" />
                              <span>{evt.employeeName}</span>
                            </div>
                          )}
                          {evt.address && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="size-3" />
                              <span className="truncate">{evt.address}</span>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              {dayEvents.length > 3 && (
                <div
                  className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium px-1 cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(key);
                    setCurrentDate(new Date(currentYear, currentMonth, day));
                    setViewMode('day');
                  }}
                >
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  // ─── Week View ──────────────────────────────────────────────────────────

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const renderWeekView = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
            <div className="p-2" />
            {weekDays.map((day, i) => {
              const key = dateKey(day.getFullYear(), day.getMonth(), day.getDate());
              const today = isToday(day.getFullYear(), day.getMonth(), day.getDate());
              const dayEvents = eventsMap[key] || [];
              const isSelected = selectedDate === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(key);
                    setShowDetailPanel(true);
                  }}
                  className={`p-2 text-center border-l border-border/50 transition-colors hover:bg-muted/40 ${
                    isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">
                    {DAYS_OF_WEEK[i]}
                  </div>
                  <div
                    className={`inline-flex items-center justify-center size-8 rounded-full text-sm font-semibold mt-0.5 ${
                      today ? 'bg-emerald-600 text-white' : 'text-foreground'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      {dayEvents.slice(0, 4).map((evt) => {
                        const cfg = getStatusConfig(evt.status);
                        return (
                          <span key={evt.id} className={`size-1.5 rounded-full ${cfg.dot}`} />
                        );
                      })}
                      {dayEvents.length > 4 && (
                        <span className="text-[9px] text-muted-foreground ml-0.5">+{dayEvents.length - 4}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Time grid */}
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-[60px_repeat(7,1fr)]">
              {hours.map((hour) => (
                <div key={hour} className="contents">
                  {/* Time label */}
                  <div className="h-14 border-b border-border/30 flex items-start justify-end pr-2 pt-1">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatHourLabel(hour)}
                    </span>
                  </div>
                  {/* Day cells */}
                  {weekDays.map((day) => {
                    const key = dateKey(day.getFullYear(), day.getMonth(), day.getDate());
                    const dayEvents = eventsMap[key] || [];
                    const hourEvents = dayEvents.filter((evt) => {
                      if (!evt.scheduledAt) return false;
                      const d = new Date(evt.scheduledAt);
                      return d.getHours() === hour;
                    });

                    return (
                      <div
                        key={`${key}-${hour}`}
                        className="h-14 border-b border-l border-border/30 p-0.5 relative hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedDate(key);
                          setShowDetailPanel(true);
                        }}
                      >
                        {hourEvents.map((evt) => {
                          const cfg = getStatusConfig(evt.status);
                          const isJob = evt.type === 'job';
                          return (
                            <div
                              key={evt.id}
                              className={`absolute inset-x-0.5 top-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium truncate ${cfg.bg} ${cfg.text} border ${cfg.border} z-10`}
                            >
                              <span className="truncate">{evt.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // ─── Day View ───────────────────────────────────────────────────────────

  const renderDayView = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
    const key = dateKeyFromDate(currentDate);
    const dayEvents = eventsMap[key] || [];
    const now = new Date();
    const isDayToday =
      now.getFullYear() === currentYear &&
      now.getMonth() === currentMonth &&
      now.getDate() === currentDate.getDate();
    const nowHour = now.getHours();
    const nowMinutes = now.getMinutes();
    const showNowIndicator = isDayToday && nowHour >= 6 && nowHour <= 21;
    const nowTop = (nowHour - 6) * 60 + nowMinutes;

    return (
      <div className="rounded-lg border border-border/50 overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/30">
          <div>
            <div className="text-sm font-semibold">
              {DAYS_OF_WEEK_FULL[currentDate.getDay()]}, {MONTHS[currentMonth].slice(0, 3)} {currentDate.getDate()}, {currentYear}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
            </div>
          </div>
          {isDayToday && (
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
              Today
            </Badge>
          )}
        </div>

        {/* Time grid */}
        <ScrollArea className="h-[600px]">
          <div className="relative">
            {/* Hour grid background */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex border-b border-border/30"
                style={{ height: '60px' }}
              >
                {/* Time label */}
                <div className="w-16 shrink-0 flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {formatHourLabel(hour)}
                  </span>
                </div>
                {/* Slot — click opens create dialog with this date+hour */}
                <div
                  className="flex-1 border-l border-border/30 hover:bg-muted/20 transition-colors cursor-pointer relative"
                  onClick={() => openCreateForDateTime(key, hour)}
                />
              </div>
            ))}

            {/* Now indicator */}
            {showNowIndicator && (
              <div
                className="absolute left-16 right-0 z-20 pointer-events-none"
                style={{ top: `${nowTop}px` }}
              >
                <div className="flex items-center">
                  <div className="size-2 rounded-full bg-red-500 -ml-1" />
                  <div className="h-px bg-red-500 flex-1" />
                  <span className="text-[9px] text-red-600 font-semibold pr-1">
                    {formatCompactTime(now.toISOString())}
                  </span>
                </div>
              </div>
            )}

            {/* Events overlay (absolute positioned across the whole day) */}
            <div className="absolute top-0 left-16 right-0 pointer-events-none">
              {dayEvents
                .filter((evt) => evt.scheduledAt)
                .map((evt) => {
                  const cfg = getStatusConfig(evt.status);
                  const isJob = evt.type === 'job';
                  const leftBorder = isJob ? 'border-l-emerald-500' : 'border-l-sky-500';
                  const start = new Date(evt.scheduledAt as string);
                  const startHour = start.getHours();
                  const startMinutes = start.getMinutes();
                  // Skip events outside the visible 6 AM – 9 PM window
                  if (startHour < 6 || startHour > 21) return null;
                  const top = (startHour - 6) * 60 + startMinutes;

                  // Calculate height from end time or duration
                  let height = 50; // default ~50 min
                  if (evt.scheduledEndTime) {
                    const end = new Date(evt.scheduledEndTime);
                    const diffMin = (end.getTime() - start.getTime()) / 60000;
                    if (diffMin > 0) height = Math.max(20, Math.min((diffMin / 60) * 60 - 4, 16 * 60 - top - 4));
                  } else if (evt.duration) {
                    height = Math.max(20, Math.min((evt.duration / 60) * 60 - 4, 16 * 60 - top - 4));
                  }

                  return (
                    <div
                      key={evt.id}
                      className={`absolute left-1 right-1 rounded border-l-2 ${leftBorder} ${cfg.bg} ${cfg.text} ${cfg.border} border px-2 py-1 text-[11px] cursor-pointer hover:shadow-md transition-shadow pointer-events-auto z-10 overflow-hidden`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(key);
                        setShowDetailPanel(true);
                      }}
                    >
                      <div className="font-semibold truncate flex items-center gap-1">
                        {isJob ? <Briefcase className="size-3 shrink-0" /> : <Calendar className="size-3 shrink-0" />}
                        <span className="truncate">{evt.title}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {formatTimeRange(evt.scheduledAt, evt.scheduledEndTime)}
                      </div>
                      {height > 50 && evt.customerName && (
                        <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <User className="size-2.5 shrink-0" />
                          <span className="truncate">{evt.customerName}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ─── Agenda View ────────────────────────────────────────────────────────

  const renderAgendaView = () => {
    // Filter events from today onward, sort ascending, limit to next 30
    const todayStart = startOfDay(new Date());
    const upcoming = filteredEvents
      .filter((evt) => evt.scheduledAt && new Date(evt.scheduledAt) >= todayStart)
      .sort((a, b) => {
        if (!a.scheduledAt || !b.scheduledAt) return 0;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      })
      .slice(0, 30);

    if (upcoming.length === 0) {
      return (
        <div className="rounded-lg border border-border/50 p-12 text-center bg-background">
          <CalendarDays className="size-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No upcoming events</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Events you create or assign will appear here.
          </p>
          <Button
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            size="sm"
            onClick={() => {
              setForm(EMPTY_FORM());
              setShowCreateDialog(true);
            }}
          >
            <Plus className="size-3.5 mr-1" /> New Booking
          </Button>
        </div>
      );
    }

    // Group by date
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const evt of upcoming) {
      const d = new Date(evt.scheduledAt as string);
      const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(evt);
    }
    const sortedKeys = Object.keys(grouped).sort();

    return (
      <ScrollArea className="h-[640px] rounded-lg border border-border/50 bg-background">
        <div className="divide-y divide-border/50">
          {sortedKeys.map((dateKeyStr) => {
            const [y, m, d] = dateKeyStr.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const isAgendaToday = (() => {
              const n = new Date();
              return n.getFullYear() === y && n.getMonth() === m - 1 && n.getDate() === d;
            })();
            const evts = grouped[dateKeyStr];
            return (
              <div key={dateKeyStr}>
                {/* Sticky date header */}
                <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-4 py-2 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {DAYS_OF_WEEK[date.getDay()]}, {MONTHS[date.getMonth()].slice(0, 3)} {date.getDate()}
                    </span>
                    {isAgendaToday && (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px] h-5">
                        Today
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {evts.length} event{evts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Event rows */}
                <div className="bg-background">
                  {evts.map((evt) => {
                    const cfg = getStatusConfig(evt.status);
                    const isJob = evt.type === 'job';
                    const dotColor = isJob ? 'bg-emerald-500' : 'bg-sky-500';
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dateKeyStr);
                          setShowDetailPanel(true);
                        }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left border-b border-border/30 last:border-0"
                      >
                        {/* Time */}
                        <div className="w-20 shrink-0 text-xs text-muted-foreground pt-0.5">
                          {evt.scheduledAt ? formatCompactTime(evt.scheduledAt) : '—'}
                          {evt.scheduledEndTime && (
                            <div className="text-[10px] text-muted-foreground/70">
                              {formatCompactTime(evt.scheduledEndTime)}
                            </div>
                          )}
                        </div>
                        {/* Type dot */}
                        <div className="pt-1.5">
                          <span className={`block size-2.5 rounded-full ${dotColor}`} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{evt.title}</p>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 capitalize">
                              {isJob ? <Briefcase className="size-3" /> : <Calendar className="size-3" />}
                              {isJob ? 'Job' : 'Booking'}
                            </span>
                            {evt.customerName && (
                              <span className="flex items-center gap-1">
                                <User className="size-3" />
                                {evt.customerName}
                              </span>
                            )}
                            {evt.employeeName && (
                              <span className="flex items-center gap-1">
                                <Users className="size-3" />
                                {evt.employeeName}
                              </span>
                            )}
                            {evt.address && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">{evt.address}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  // ─── Mini-Month Sidebar (desktop) ────────────────────────────────────────

  const renderMiniMonthSidebar = () => {
    const miniDays = getCalendarDays(currentYear, currentMonth);
    const todayKey = dateKeyFromDate(new Date());
    const selectedKey = selectedDate || (viewMode === 'day' ? dateKeyFromDate(currentDate) : null);

    // Stats — reflect the currently-filtered set (eventsMap is derived from filteredEvents)
    const todayEvents = (eventsMap[todayKey] || []).length;
    const wDays = getWeekDays(new Date());
    const weekKeys = wDays.map((d) => dateKeyFromDate(d));
    const weekEventCount = weekKeys.reduce((sum, k) => sum + (eventsMap[k]?.length || 0), 0);
    const totalVisible = filteredEvents.length;

    return (
      <div className="space-y-4">
        {/* Mini calendar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {MONTHS[currentMonth].slice(0, 3)} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                  {d.charAt(0)}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {miniDays.map((day, i) => {
                if (day === null) {
                  return <div key={`mini-empty-${i}`} />;
                }
                const k = dateKey(currentYear, currentMonth, day);
                const isMiniToday = k === todayKey;
                const isMiniSelected = k === selectedKey;
                const hasEvents = (eventsMap[k] || []).length > 0;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setCurrentDate(new Date(currentYear, currentMonth, day));
                      setViewMode('day');
                    }}
                    className={`relative aspect-square flex items-center justify-center text-[11px] rounded transition-colors ${
                      isMiniSelected
                        ? 'bg-emerald-600 text-white font-semibold'
                        : isMiniToday
                        ? 'bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'hover:bg-muted text-foreground/80'
                    }`}
                  >
                    {day}
                    {hasEvents && !isMiniSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Legend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-1 h-4 rounded bg-sky-500" />
              <span>Booking</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-1 h-4 rounded bg-emerald-500" />
              <span>Job</span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {Object.entries(STATUS_CONFIG).slice(0, 6).map(([k, cfg]) => (
                <div key={k} className="flex items-center gap-1.5 text-[11px]">
                  <span className={`size-2 rounded-full ${cfg.dot}`} />
                  <span className="truncate">{cfg.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              At a glance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Today</span>
              <span className="font-semibold">{todayEvents} event{todayEvents !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">This week</span>
              <span className="font-semibold">{weekEventCount} event{weekEventCount !== 1 ? 's' : ''}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total visible</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{totalVisible}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Event Detail Panel ─────────────────────────────────────────────────

  const renderEventDetail = () => {
    if (!showDetailPanel || !selectedDate) return null;

    return (
      <div className="lg:w-80 shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{selectedDateLabel}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  setShowDetailPanel(false);
                  setSelectedDate(null);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No events scheduled</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => {
                    if (selectedDate) openCreateForDateTime(selectedDate, 9);
                  }}
                >
                  <Plus className="size-3.5 mr-1" /> Add Event
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2.5">
                  {selectedDateEvents.map((evt) => {
                    const cfg = getStatusConfig(evt.status);
                    const isJob = evt.type === 'job';

                    return (
                      <div
                        key={evt.id}
                        className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3 transition-colors hover:shadow-sm`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`shrink-0 size-8 rounded-md flex items-center justify-center ${
                            isJob ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                          }`}>
                            {isJob ? (
                              <Briefcase className="size-4 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-sm font-semibold text-foreground truncate">{evt.title}</p>
                              {/* 3-dot action menu — bookings only */}
                              {!isJob && renderEventActions(evt)}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                <span className={`size-1.5 rounded-full ${cfg.dot} mr-1`} />
                                {cfg.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {isJob ? 'Job' : 'Booking'}
                              </span>
                              {evt.employeeName && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  · {evt.employeeName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1 ml-[42px]">
                          {evt.scheduledAt && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="size-3 shrink-0" />
                              <span>
                                {formatTime(evt.scheduledAt)}
                                {evt.scheduledEndTime ? ` – ${formatTime(evt.scheduledEndTime)}` : ''}
                              </span>
                              {evt.duration && (
                                <span className="text-muted-foreground/70">({evt.duration}min)</span>
                              )}
                            </div>
                          )}
                          {evt.customerName && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="size-3 shrink-0" />
                              <span>{evt.customerName}</span>
                            </div>
                          )}
                          {evt.address && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{evt.address}</span>
                            </div>
                          )}
                          {isJob && evt.priority && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ArrowRight className="size-3 shrink-0" />
                              <span className="capitalize">Priority: {evt.priority}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Create Booking Dialog ──────────────────────────────────────────────

  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Plus className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            New Booking
          </DialogTitle>
          <DialogDescription>
            Schedule a new booking or appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Home Cleaning"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Customer Name */}
          <div className="grid gap-2">
            <Label htmlFor="customerName" className="text-sm font-medium">Customer Name</Label>
            <Input
              id="customerName"
              placeholder="Customer name"
              value={form.customerName}
              onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
            />
          </div>

          {/* Employee */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Assign Employee</Label>
            <Select
              value={form.employee}
              onValueChange={(val) => setForm((prev) => ({ ...prev, employee: val }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="scheduledAt" className="text-sm font-medium">Start Date & Time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scheduledEndTime" className="text-sm font-medium">End Date & Time</Label>
              <Input
                id="scheduledEndTime"
                type="datetime-local"
                value={form.scheduledEndTime}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduledEndTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid gap-2">
            <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</Label>
            <Select
              value={String(form.duration)}
              onValueChange={(val) => setForm((prev) => ({ ...prev, duration: parseInt(val) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="grid gap-2">
            <Label htmlFor="address" className="text-sm font-medium">Address</Label>
            <Input
              id="address"
              placeholder="Service location"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>

          {/* Source */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Source</Label>
            <Select
              value={form.source}
              onValueChange={(val) => setForm((prev) => ({ ...prev, source: val }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateDialog(false);
              setForm(EMPTY_FORM());
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateBooking}
            disabled={saving || !form.title.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />Creating...</>
            ) : (
              <><Plus className="size-4 mr-1.5" />Create Booking</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── Main Render ────────────────────────────────────────────────────────

  const headerLabel = (() => {
    if (viewMode === 'month') {
      return `${MONTHS[currentMonth]} ${currentYear}`;
    }
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
    }
    if (viewMode === 'day') {
      return `${DAYS_OF_WEEK_FULL[currentDate.getDay()]}, ${MONTHS[currentMonth]} ${currentDate.getDate()}, ${currentYear}`;
    }
    return 'Agenda';
  })();

  const viewToggleItems: { mode: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { mode: 'month', label: 'Month', icon: LayoutGrid },
    { mode: 'week', label: 'Week', icon: List },
    { mode: 'day', label: 'Day', icon: Calendar },
    { mode: 'agenda', label: 'Agenda', icon: CalendarDays },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3">
        <div className="flex flex-col gap-3">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
                <Calendar className="size-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Calendar</h2>
                <p className="text-sm text-muted-foreground">Schedule and manage appointments</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setForm(EMPTY_FORM());
                setShowCreateDialog(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="size-4 mr-1.5" /> New Booking
            </Button>
          </div>

          {/* Navigation + view toggle row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevious}
                className="size-8"
                disabled={viewMode === 'agenda'}
                aria-label="Previous"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="text-base font-semibold px-3 h-8">
                    {headerLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="grid grid-cols-4 gap-1 p-3">
                    {MONTHS.map((m, i) => (
                      <Button
                        key={m}
                        variant={i === currentMonth && (viewMode === 'month' || viewMode === 'day') ? 'default' : 'ghost'}
                        size="sm"
                        className={`text-xs ${i === currentMonth && (viewMode === 'month' || viewMode === 'day') ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        onClick={() => {
                          setCurrentDate(new Date(currentYear, i, 1));
                        }}
                      >
                        {m.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-1 p-3">
                    {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((yr) => (
                      <Button
                        key={yr}
                        variant={yr === currentYear ? 'default' : 'ghost'}
                        size="sm"
                        className={`text-xs ${yr === currentYear ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        onClick={() => {
                          setCurrentDate(new Date(yr, currentMonth, 1));
                        }}
                      >
                        {yr}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
                className="size-8"
                disabled={viewMode === 'agenda'}
                aria-label="Next"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs ml-1">
                Today
              </Button>
            </div>

            {/* View Mode Segmented Control */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
              {viewToggleItems.map(({ mode, label, icon: Icon }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs h-7 ${viewMode === mode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  onClick={() => setViewMode(mode)}
                >
                  <Icon className="size-3.5 mr-1" /> {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Filters row — type + employee chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
              <Filter className="size-3.5" />
              <span className="hidden sm:inline">Filters:</span>
            </div>
            {/* Type filter chips */}
            <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5">
              {(['all', 'booking', 'job'] as const).map((t) => (
                <Button
                  key={t}
                  variant={typeFilter === t ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-[11px] h-6 px-2 ${typeFilter === t ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'all' ? 'All' : t === 'booking' ? 'Bookings' : 'Jobs'}
                </Button>
              ))}
            </div>
            <Separator orientation="vertical" className="h-5" />
            {/* Employee filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setEmployeeFilter('all')}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                  employeeFilter === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                }`}
              >
                <Users className="size-3" />
                All Employees
              </button>
              {employees.map((emp) => {
                const active = employeeFilter === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setEmployeeFilter(emp.id)}
                    className={`inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <Avatar className="size-5">
                      <AvatarFallback className={`text-[9px] ${active ? 'bg-emerald-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {getInitials(emp.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[100px] truncate">{emp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      {loading ? (
        <div className="flex gap-4">
          <div className="hidden lg:block w-64 shrink-0 space-y-4">
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }, (_, i) => (
                    <Skeleton key={i} className="aspect-square rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden">
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="min-h-[100px] bg-background p-2">
                  <Skeleton className="size-5 rounded-full mb-2" />
                  <Skeleton className="h-3 w-3/4 mb-1.5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Mini-month sidebar — desktop only */}
          <aside className="hidden lg:block w-64 shrink-0">
            {renderMiniMonthSidebar()}
          </aside>

          {/* Calendar + detail panel */}
          <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
              {viewMode === 'agenda' && renderAgendaView()}
            </div>

            {/* Detail panel — desktop only, hidden for agenda view */}
            {viewMode !== 'agenda' && (
              <div className="hidden lg:block">
                {renderEventDetail()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile: Event Detail Dialog */}
      {showDetailPanel && selectedDate && (
        <div className="lg:hidden">
          <Dialog open={showDetailPanel} onOpenChange={(open) => {
            if (!open) {
              setShowDetailPanel(false);
              setSelectedDate(null);
            }
          }}>
            <DialogContent className="max-w-[95vw] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-sm">{selectedDateLabel}</DialogTitle>
              </DialogHeader>
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No events scheduled</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => {
                      setShowDetailPanel(false);
                      if (selectedDate) openCreateForDateTime(selectedDate, 9);
                    }}
                  >
                    <Plus className="size-3.5 mr-1" /> Add Event
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-2.5">
                    {selectedDateEvents.map((evt) => {
                      const cfg = getStatusConfig(evt.status);
                      const isJob = evt.type === 'job';
                      return (
                        <div
                          key={evt.id}
                          className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`shrink-0 size-8 rounded-md flex items-center justify-center ${
                              isJob ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                            }`}>
                              {isJob ? (
                                <Briefcase className="size-4 text-orange-600 dark:text-orange-400" />
                              ) : (
                                <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-sm font-semibold text-foreground truncate">{evt.title}</p>
                                {/* 3-dot action menu — bookings only */}
                                {!isJob && renderEventActions(evt)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  <span className={`size-1.5 rounded-full ${cfg.dot} mr-1`} />
                                  {cfg.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {isJob ? 'Job' : 'Booking'}
                                </span>
                                {evt.employeeName && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    · {evt.employeeName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1 ml-[42px]">
                            {evt.scheduledAt && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="size-3 shrink-0" />
                                <span>
                                  {formatTime(evt.scheduledAt)}
                                  {evt.scheduledEndTime ? ` – ${formatTime(evt.scheduledEndTime)}` : ''}
                                </span>
                              </div>
                            )}
                            {evt.customerName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <User className="size-3 shrink-0" />
                                <span>{evt.customerName}</span>
                              </div>
                            )}
                            {evt.address && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">{evt.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Create Booking Dialog */}
      {renderCreateDialog()}

      {/* ─── Reschedule Booking Dialog ──────────────────────────────────────── */}
      <Dialog
        open={!!rescheduleEvent}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleEvent(null);
            setRescheduleAt('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-emerald-600" />
              Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              {rescheduleEvent
                ? `Pick a new date and time for "${rescheduleEvent.title}".`
                : 'Pick a new date and time for this booking.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reschedule-at">New Scheduled Date &amp; Time</Label>
            <Input
              id="reschedule-at"
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleEvent(null);
                setRescheduleAt('');
              }}
              disabled={actionInProgress}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleRescheduleSubmit}
              disabled={actionInProgress || !rescheduleAt}
            >
              {actionInProgress ? 'Rescheduling...' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

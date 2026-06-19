'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Plus, MapPin, User,
  Briefcase, LayoutGrid, List, X, ArrowRight, Eye,
  MoreHorizontal, Users, CheckCircle2, Sparkles, CalendarClock, Ban,
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

type ViewMode = 'month' | 'week';

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

function formatTimeRange(start?: string | null, end?: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return '';
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
      } else {
        const weekDays = getWeekDays(currentDate);
        dateFrom = weekDays[0].toISOString().split('T')[0];
        dateTo = weekDays[6].toISOString().split('T')[0];
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

  // ─── Events Map ─────────────────────────────────────────────────────────

  const eventsMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of events) {
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
  }, [events]);

  // ─── Navigation ─────────────────────────────────────────────────────────

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      } else {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      }
    });
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      } else {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      }
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
              setSelectedDate(key);
              setShowDetailPanel(true);
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
                return (
                  <TooltipProvider key={evt.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium truncate cursor-default ${
                            isJob ? cfg.bg : cfg.bg
                          } ${isJob ? cfg.text : cfg.text} ${
                            isJob ? cfg.border : cfg.border
                          } border`}
                        >
                          <span className={`shrink-0 size-1.5 rounded-full ${cfg.dot}`} />
                          <span className="truncate">{evt.title}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px]">
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
                              <span>
                                {formatTime(evt.scheduledAt)}
                                {evt.scheduledEndTime ? ` – ${formatTime(evt.scheduledEndTime)}` : ''}
                              </span>
                            </div>
                          )}
                          {evt.customerName && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <User className="size-3" />
                              <span>{evt.customerName}</span>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-muted-foreground font-medium px-1">
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
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
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
                    setShowCreateDialog(true);
                    if (selectedDate) {
                      const [y, m, d] = selectedDate.split('-').map(Number);
                      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T09:00`;
                      setForm((prev) => ({ ...prev, scheduledAt: dateStr }));
                    }
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

  const headerLabel = viewMode === 'month'
    ? `${MONTHS[currentMonth]} ${currentYear}`
    : (() => {
        const start = weekDays[0];
        const end = weekDays[6];
        if (start.getMonth() === end.getMonth()) {
          return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
        }
        return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
      })();

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
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
          <Plus className="size-4 mr-1.5" /> New Event
        </Button>
      </div>

      {/* Navigation & View Toggle */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            {/* Month/Week Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious} className="size-8">
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
                        variant={i === currentMonth && viewMode === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        className={`text-xs ${i === currentMonth && viewMode === 'month' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
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
              <Button variant="outline" size="icon" onClick={goToNext} className="size-8">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs ml-1">
                Today
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs h-7 ${viewMode === 'month' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                onClick={() => setViewMode('month')}
              >
                <LayoutGrid className="size-3.5 mr-1" /> Month
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs h-7 ${viewMode === 'week' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                onClick={() => setViewMode('week')}
              >
                <List className="size-3.5 mr-1" /> Week
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" /> Pending
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> In Progress
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-green-500" /> Completed
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500" /> Cancelled
            </div>
            <Separator orientation="vertical" className="h-3.5" />
            <div className="flex items-center gap-1.5">
              <Briefcase className="size-3 text-orange-500" /> Job
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3 text-emerald-500" /> Booking
            </div>
          </div>

          {/* Loading skeleton */}
          {loading ? (
            <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden">
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="min-h-[100px] bg-background p-2">
                  <Skeleton className="size-5 rounded-full mb-2" />
                  <Skeleton className="h-3 w-3/4 mb-1.5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Calendar Grid */}
              <div className="flex-1 min-w-0">
                {viewMode === 'month' ? renderMonthView() : renderWeekView()}
              </div>

              {/* Detail Panel (desktop: side panel, mobile: hidden unless active) */}
              <div className="hidden lg:block">
                {renderEventDetail()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile: Event Detail Popover/Sheet */}
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
                      setShowCreateDialog(true);
                      if (selectedDate) {
                        const [y, m, d] = selectedDate.split('-').map(Number);
                        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T09:00`;
                        setForm((prev) => ({ ...prev, scheduledAt: dateStr }));
                      }
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

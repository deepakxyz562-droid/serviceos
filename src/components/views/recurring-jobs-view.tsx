'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Repeat,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreHorizontal,
  Play,
  Pause,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch, apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface Employee {
  id: string;
  name: string;
  role?: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
}

interface LastJob {
  id: string;
  jobNumber: string | null;
  title: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

interface Schedule {
  id: string;
  tenantId: string;
  customerId: string | null;
  templateJobId: string | null;
  title: string;
  description: string | null;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  weekOfMonth: number | null;
  timeOfDay: string | null;
  durationMins: number;
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  lastRunAt: string | null;
  lastJobId: string | null;
  executionCount: number;
  assigneeIdsJson: string;
  serviceId: string | null;
  branchId: string | null;
  visitInstructions: string | null;
  checklistIdsJson: string;
  lineItemsJson: string;
  active: boolean;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer | null;
  lastJob?: LastJob | null;
}

interface ScheduleForm {
  title: string;
  customerId: string;
  description: string;
  frequency: string;
  dayOfWeek: string;
  dayOfMonth: string;
  weekOfMonth: string;
  timeOfDay: string;
  durationMins: string;
  assigneeIds: string[];
  serviceId: string;
  visitInstructions: string;
  startDate: string;
  endDate: string;
  useWeekOfMonth: boolean;
  lineItems: Array<{ description: string; quantity: string; rate: string }>;
}

const EMPTY_FORM: ScheduleForm = {
  title: '',
  customerId: '',
  description: '',
  frequency: 'weekly',
  dayOfWeek: '1', // Monday
  dayOfMonth: '1',
  weekOfMonth: '1',
  timeOfDay: '09:00',
  durationMins: '60',
  assigneeIds: [],
  serviceId: '',
  visitInstructions: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  useWeekOfMonth: false,
  lineItems: [],
};

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly (every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const WEEKDAYS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const WEEK_OF_MONTH = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: '5', label: 'Fifth (when exists)' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFrequencyLabel(s: Schedule): string {
  const freq = s.frequency || 'weekly';
  const time = s.timeOfDay ? ` @ ${s.timeOfDay}` : '';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ordinal = (n: number) =>
    n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

  if (freq === 'weekly' || freq === 'biweekly') {
    const day = s.dayOfWeek != null ? dayNames[s.dayOfWeek] : '—';
    return `${freq === 'biweekly' ? 'Biweekly' : 'Weekly'} on ${day}${time}`;
  }
  const step =
    freq === 'quarterly' ? 'Quarterly' : freq === 'annually' ? 'Annually' : 'Monthly';
  if (s.weekOfMonth && s.dayOfWeek != null) {
    return `${step} — ${ordinal(s.weekOfMonth)} ${dayNames[s.dayOfWeek]}${time}`;
  }
  if (s.dayOfMonth) return `${step} on day ${s.dayOfMonth}${time}`;
  return `${step}${time}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function parseArray<T = string>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function statusBadge(active: boolean, pausedAt: string | null) {
  if (active) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        Active
      </Badge>
    );
  }
  if (pausedAt) {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        Paused
      </Badge>
    );
  }
  return <Badge variant="secondary">Inactive</Badge>;
}

function jobStatusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    completed:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <Badge className={map[status] || map.pending}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecurringJobsView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailJobs, setDetailJobs] = useState<LastJob[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ schedules: Schedule[] }>('/api/recurring-jobs');
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Failed to fetch recurring jobs:', err);
      toast.error('Failed to load recurring job schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [custRes, empRes, svcRes] = await Promise.all([
        authFetch('/api/customers?limit=200'),
        authFetch('/api/employees?limit=200'),
        authFetch('/api/services?limit=200'),
      ]);
      if (custRes.ok) {
        const d = await custRes.json();
        setCustomers(d.customers || d || []);
      }
      if (empRes.ok) {
        const d = await empRes.json();
        setEmployees(d.employees || d || []);
      }
      if (svcRes.ok) {
        const d = await svcRes.json();
        setServices(d.services || d || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    fetchSupportingData();
  }, [fetchSupportingData]);

  // ─── KPIs ──────────────────────────────────────────────────────────────

  const activeCount = useMemo(
    () => schedules.filter((s) => s.active).length,
    [schedules],
  );
  const pausedCount = useMemo(
    () => schedules.filter((s) => !s.active && s.pausedAt).length,
    [schedules],
  );
  const generatedThisMonth = useMemo(() => {
    const now = new Date();
    return schedules.filter((s) => {
      if (!s.lastRunAt) return false;
      const d = new Date(s.lastRunAt);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [schedules]);
  const nextRunSoonest = useMemo(() => {
    const upcoming = schedules
      .filter((s) => s.active && s.nextRunAt)
      .map((s) => new Date(s.nextRunAt))
      .sort((a, b) => a.getTime() - b.getTime());
    return upcoming[0] ?? null;
  }, [schedules]);

  // ─── Filtering ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return schedules
      .filter((s) => {
        if (filter === 'active' && !s.active) return false;
        if (filter === 'paused' && (s.active || !s.pausedAt)) return false;
        return true;
      })
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.customer?.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Active first, then by nextRunAt asc.
        if (a.active !== b.active) return a.active ? -1 : 1;
        return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
      });
  }, [schedules, filter, search]);

  // ─── Dialog handlers ───────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Schedule) => {
    const assigneeIds = parseArray<string>(s.assigneeIdsJson);
    let lineItems: Array<{ description: string; quantity: string; rate: string }> = [];
    try {
      const parsed = JSON.parse(s.lineItemsJson || '[]');
      if (Array.isArray(parsed)) {
        lineItems = parsed.map((li: Record<string, unknown>) => ({
          description: String(li?.description ?? ''),
          quantity: String(li?.quantity ?? '1'),
          rate: String(li?.rate ?? '0'),
        }));
      }
    } catch {
      /* ignore */
    }
    setForm({
      title: s.title,
      customerId: s.customerId || '',
      description: s.description || '',
      frequency: s.frequency,
      dayOfWeek: s.dayOfWeek != null ? String(s.dayOfWeek) : '1',
      dayOfMonth: s.dayOfMonth != null ? String(s.dayOfMonth) : '1',
      weekOfMonth: s.weekOfMonth != null ? String(s.weekOfMonth) : '1',
      timeOfDay: s.timeOfDay || '09:00',
      durationMins: String(s.durationMins),
      assigneeIds,
      serviceId: s.serviceId || '',
      visitInstructions: s.visitInstructions || '',
      startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : '',
      useWeekOfMonth: Boolean(s.weekOfMonth),
      lineItems,
    });
    setEditingId(s.id);
    setDialogOpen(true);
  };

  const openDetail = async (s: Schedule) => {
    setDetailSchedule(s);
    setDetailOpen(true);
    setDetailJobs([]);
    setDetailLoading(true);
    try {
      const data = await apiGet<{ schedule: Schedule; recentJobs: LastJob[] }>(
        `/api/recurring-jobs/${s.id}`,
      );
      setDetailSchedule(data.schedule);
      setDetailJobs(data.recentJobs || []);
    } catch (err) {
      console.error('Failed to load schedule detail:', err);
      toast.error('Failed to load schedule detail');
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Actions ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.customerId) {
      toast.error('Customer is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        customerId: form.customerId || null,
        description: form.description.trim() || null,
        frequency: form.frequency,
        dayOfWeek: ['weekly', 'biweekly'].includes(form.frequency)
          ? Number(form.dayOfWeek)
          : form.useWeekOfMonth
            ? Number(form.dayOfWeek)
            : null,
        dayOfMonth: ['monthly', 'quarterly', 'annually'].includes(form.frequency)
          ? form.useWeekOfMonth
            ? null
            : Number(form.dayOfMonth)
          : null,
        weekOfMonth: form.useWeekOfMonth ? Number(form.weekOfMonth) : null,
        timeOfDay: form.timeOfDay || null,
        durationMins: Number(form.durationMins) || 60,
        assigneeIds: form.assigneeIds,
        serviceId: form.serviceId || null,
        visitInstructions: form.visitInstructions.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        lineItemsJson: JSON.stringify(
          form.lineItems.filter((li) => li.description.trim()),
        ),
      };

      if (editingId) {
        await apiPut(`/api/recurring-jobs/${editingId}`, payload);
        toast.success('Schedule updated');
      } else {
        await apiPost('/api/recurring-jobs', payload);
        toast.success('Schedule created');
      }
      setDialogOpen(false);
      setEditingId(null);
      await fetchSchedules();
    } catch (err) {
      console.error('Save failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message)
            : 'Failed to save schedule';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async (s: Schedule) => {
    try {
      await apiPost(`/api/recurring-jobs/${s.id}/pause`);
      toast.success('Schedule paused');
      await fetchSchedules();
    } catch (err) {
      console.error('Pause failed:', err);
      toast.error('Failed to pause schedule');
    }
  };

  const handleResume = async (s: Schedule) => {
    try {
      await apiPost(`/api/recurring-jobs/${s.id}/resume`);
      toast.success('Schedule resumed');
      await fetchSchedules();
    } catch (err) {
      console.error('Resume failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message)
            : 'Failed to resume schedule';
      toast.error(message);
    }
  };

  const handleGenerateNow = async (s: Schedule) => {
    try {
      await apiPost(`/api/recurring-jobs/${s.id}/generate-now`);
      toast.success('Job generated');
      await fetchSchedules();
    } catch (err) {
      console.error('Generate now failed:', err);
      toast.error('Failed to generate job now');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiDelete(`/api/recurring-jobs/${deleteId}`);
      toast.success('Schedule deleted');
      setDeleteId(null);
      await fetchSchedules();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete schedule');
    }
  };

  // ─── Form helpers ──────────────────────────────────────────────────────

  const toggleAssignee = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter((a) => a !== id)
        : [...f.assigneeIds, id],
    }));
  };

  const addLineItem = () => {
    setForm((f) => ({
      ...f,
      lineItems: [...f.lineItems, { description: '', quantity: '1', rate: '0' }],
    }));
  };

  const removeLineItem = (idx: number) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.filter((_, i) => i !== idx),
    }));
  };

  const updateLineItem = (
    idx: number,
    field: 'description' | 'quantity' | 'rate',
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li, i) =>
        i === idx ? { ...li, [field]: value } : li,
      ),
    }));
  };

  // ─── Render: Form ──────────────────────────────────────────────────────

  const renderForm = () => {
    const isWeeklyLike = ['weekly', 'biweekly'].includes(form.frequency);
    const isMonthlyLike = ['monthly', 'quarterly', 'annually'].includes(
      form.frequency,
    );

    return (
      <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid gap-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="e.g. Monthly HVAC inspection"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select
              value={form.customerId}
              onValueChange={(v) => setForm({ ...form, customerId: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service">Service (optional)</Label>
            <Select
              value={form.serviceId}
              onValueChange={(v) =>
                setForm({ ...form, serviceId: v === '__none__' ? '' : v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={2}
            placeholder="Optional notes about this schedule"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={form.frequency}
              onValueChange={(v) => setForm({ ...form, frequency: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="durationMins">Duration (minutes)</Label>
            <Input
              id="durationMins"
              type="number"
              min="1"
              value={form.durationMins}
              onChange={(e) =>
                setForm({ ...form, durationMins: e.target.value })
              }
            />
          </div>
        </div>

        {/* Schedule pattern */}
        {isWeeklyLike && (
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dayOfWeek">Day of week</Label>
              <Select
                value={form.dayOfWeek}
                onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeOfDay">Time of day</Label>
              <Input
                id="timeOfDay"
                type="time"
                value={form.timeOfDay}
                onChange={(e) =>
                  setForm({ ...form, timeOfDay: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {isMonthlyLike && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.useWeekOfMonth}
                onCheckedChange={(checked) =>
                  setForm({ ...form, useWeekOfMonth: Boolean(checked) })
                }
              />
              Use &quot;Nth weekday of month&quot; pattern (e.g. 2nd Tuesday)
            </label>

            {form.useWeekOfMonth ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="weekOfMonth">Week</Label>
                  <Select
                    value={form.weekOfMonth}
                    onValueChange={(v) =>
                      setForm({ ...form, weekOfMonth: v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_OF_MONTH.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dayOfWeekMonth">Weekday</Label>
                  <Select
                    value={form.dayOfWeek}
                    onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeOfDayM">Time of day</Label>
                  <Input
                    id="timeOfDayM"
                    type="time"
                    value={form.timeOfDay}
                    onChange={(e) =>
                      setForm({ ...form, timeOfDay: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dayOfMonth">Day of month (1-31)</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={form.dayOfMonth}
                    onChange={(e) =>
                      setForm({ ...form, dayOfMonth: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Months without this day roll to the last day.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeOfDayD">Time of day</Label>
                  <Input
                    id="timeOfDayD"
                    type="time"
                    value={form.timeOfDay}
                    onChange={(e) =>
                      setForm({ ...form, timeOfDay: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">End date (optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>

        {/* Assignees */}
        <div className="grid gap-2">
          <Label>Assignees</Label>
          <div className="border rounded-md p-3 max-h-40 overflow-y-auto grid gap-2">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees found.</p>
            ) : (
              employees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={form.assigneeIds.includes(emp.id)}
                    onCheckedChange={() => toggleAssignee(emp.id)}
                  />
                  <span>{emp.name}</span>
                  {emp.role && (
                    <span className="text-xs text-muted-foreground">
                      ({emp.role})
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            First selected assignee becomes the job&apos;s primary assignee.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="visitInstructions">Visit instructions</Label>
          <Textarea
            id="visitInstructions"
            rows={3}
            placeholder="Notes shown to the assigned employee on-site"
            value={form.visitInstructions}
            onChange={(e) =>
              setForm({ ...form, visitInstructions: e.target.value })
            }
          />
        </div>

        {/* Line items */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Line items (optional, for auto-quoting)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
            >
              <Plus className="size-3.5 mr-1" /> Add item
            </Button>
          </div>
          {form.lineItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No line items. The generated job will be created without an
              auto-quote.
            </p>
          ) : (
            <div className="grid gap-2">
              {form.lineItems.map((li, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-6"
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) =>
                      updateLineItem(idx, 'description', e.target.value)
                    }
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={li.quantity}
                    onChange={(e) =>
                      updateLineItem(idx, 'quantity', e.target.value)
                    }
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    placeholder="Rate"
                    value={li.rate}
                    onChange={(e) =>
                      updateLineItem(idx, 'rate', e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => removeLineItem(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render: Loading / Empty ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Repeat className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Recurring Jobs</h2>
            <p className="text-sm text-muted-foreground">
              Schedule repeating jobs, contract visits, and maintenance rounds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={openCreate}
          >
            <Plus className="size-4 mr-1.5" /> New Schedule
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Repeat className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Schedules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Pause className="size-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pausedCount}</p>
              <p className="text-xs text-muted-foreground">Paused Schedules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle2 className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{generatedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Generated This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <CalendarIcon className="size-4 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {nextRunSoonest ? formatShortDate(nextRunSoonest.toISOString()) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Next Run (soonest)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, customer, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Repeat className="size-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">No recurring job schedules</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Create a schedule to auto-generate jobs on a recurring basis —
                weekly, monthly, or any custom cadence. Each run creates a new
                Job with a linked JobVisit and updates the schedule.
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={openCreate}
              >
                <Plus className="size-4 mr-1.5" /> New Schedule
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Frequency</th>
                    <th className="px-4 py-3 font-medium">Next Run</th>
                    <th className="px-4 py-3 font-medium">Last Run</th>
                    <th className="px-4 py-3 font-medium text-center">Runs</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <button
                          className="font-medium text-left hover:underline"
                          onClick={() => openDetail(s)}
                        >
                          {s.title}
                        </button>
                        {s.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {s.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.customer ? (
                          <span>{s.customer.name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Repeat className="size-3 text-muted-foreground" />
                          <span>{formatFrequencyLabel(s)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.active ? (
                          <span className="text-xs">
                            {formatShortDate(s.nextRunAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {formatShortDate(s.lastRunAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{s.executionCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(s.active, s.pausedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(s)}>
                              <ChevronRight className="size-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Pencil className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {s.active ? (
                              <DropdownMenuItem onClick={() => handlePause(s)}>
                                <Pause className="size-4 mr-2" /> Pause
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleResume(s)}>
                                <Play className="size-4 mr-2" /> Resume
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleGenerateNow(s)}
                            >
                              <Play className="size-4 mr-2" /> Generate Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(s.id)}
                            >
                              <Trash2 className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Schedule' : 'New Recurring Job Schedule'}
            </DialogTitle>
            <DialogDescription>
              Configure a recurring schedule. The cron runner will auto-generate
              jobs on each occurrence.
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detailSchedule?.title || 'Schedule detail'}
            </DialogTitle>
            <DialogDescription>
              {detailSchedule
                ? `${formatFrequencyLabel(detailSchedule)} • ${detailSchedule.durationMins} min`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {detailSchedule && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Schedule meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {detailSchedule.customer?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {statusBadge(detailSchedule.active, detailSchedule.pausedAt)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p className="font-medium">
                    {formatShortDate(detailSchedule.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End date</p>
                  <p className="font-medium">
                    {detailSchedule.endDate
                      ? formatShortDate(detailSchedule.endDate)
                      : 'Open-ended'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next run</p>
                  <p className="font-medium">
                    {detailSchedule.active
                      ? formatDate(detailSchedule.nextRunAt)
                      : '— (paused)'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last run</p>
                  <p className="font-medium">
                    {formatDate(detailSchedule.lastRunAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Executions</p>
                  <p className="font-medium">{detailSchedule.executionCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="size-3" />
                    {detailSchedule.durationMins} min
                  </p>
                </div>
              </div>

              {detailSchedule.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{detailSchedule.description}</p>
                </div>
              )}

              {detailSchedule.visitInstructions && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Visit instructions
                  </p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {detailSchedule.visitInstructions}
                  </p>
                </div>
              )}

              {/* Assignees */}
              <div>
                <p className="text-xs text-muted-foreground">Assignees</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {parseArray<string>(detailSchedule.assigneeIdsJson).length ===
                  0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    parseArray<string>(detailSchedule.assigneeIdsJson).map(
                      (id) => {
                        const emp = employees.find((e) => e.id === id);
                        return (
                          <Badge key={id} variant="secondary">
                            {emp?.name || id}
                          </Badge>
                        );
                      },
                    )
                  )}
                </div>
              </div>

              {/* Recent jobs */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Recent generated jobs (last 10)
                </p>
                {detailLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : detailJobs.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 p-4 border rounded-md">
                    <AlertCircle className="size-4" />
                    No jobs generated yet.
                  </div>
                ) : (
                  <div className="border rounded-md divide-y">
                    {detailJobs.map((j) => (
                      <div
                        key={j.id}
                        className="flex items-center justify-between p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {j.jobNumber ? `#${j.jobNumber} ` : ''}
                            {j.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(j.scheduledAt || j.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {jobStatusBadge(j.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Open the job in a new tab via the app URL.
                              window.open(`/jobs?id=${j.id}`, '_blank');
                            }}
                          >
                            Open
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the schedule. Previously generated
              jobs will remain in the system for audit. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

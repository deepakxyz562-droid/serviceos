'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Filter,
  X,
  Briefcase,
  User,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  ArrowRight,
  LayoutGrid,
  List,
  RefreshCw,
  Zap,
  XCircle,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmployeeInfo {
  id: string;
  name: string;
  phone: string;
  avatar: string | null;
}

interface Booking {
  id: string;
  title: string;
  description: string | null;
  status: string;
  source: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  employeeId: string | null;
  serviceId: string | null;
  branchId: string | null;
  address: string | null;
  scheduledAt: string | null;
  scheduledEndTime: string | null;
  duration: number;
  notes: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  rescheduledFrom: string | null;
  metadataJson: string;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeInfo | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BookingsResponse {
  bookings: Booking[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgClass: string; textClass: string }
> = {
  pending: {
    label: 'Pending',
    color: 'yellow',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-400',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    color: 'purple',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-400',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
  no_show: {
    label: 'No Show',
    color: 'orange',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-400',
  },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'website', label: 'Website' },
  { value: 'form', label: 'Form' },
  { value: 'api', label: 'API' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatScheduleDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatScheduleTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ---------------------------------------------------------------------------
// Form default
// ---------------------------------------------------------------------------

interface BookingFormData {
  title: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  scheduledAt: string;
  duration: string;
  description: string;
  notes: string;
  status: string;
  source: string;
  employeeId: string;
  serviceId: string;
  assignmentType: 'unassigned' | 'assign_now' | 'auto_assign';
}

const EMPTY_FORM: BookingFormData = {
  title: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  address: '',
  scheduledAt: '',
  duration: '60',
  description: '',
  notes: '',
  status: 'pending',
  source: 'manual',
  employeeId: '',
  serviceId: '',
  assignmentType: 'unassigned',
};

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  duration: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingView() {
  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<BookingFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<
    { id: string; name: string; role: string; status: string }[]
  >([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  useEffect(() => {
    apiGet<{ id: string; name: string; role: string; status: string }[]>(
      '/api/employees'
    )
      .then((data) => {
        // /api/employees may return either a bare array or { employees: [...] }
        if (Array.isArray(data)) setEmployees(data);
        else if (data && Array.isArray((data as unknown as { employees: unknown[] }).employees)) {
          setEmployees(
            (data as unknown as { employees: { id: string; name: string; role: string; status: string }[] }).employees
          );
        } else setEmployees([]);
      })
      .catch(() => setEmployees([]));
  }, []);

  // Fetch active services from the Service Catalog so the user can pick
  // a service and have title / duration auto-filled from the catalog.
  useEffect(() => {
    apiGet<{ services: ServiceOption[] } | ServiceOption[]>('/api/services?active=true&limit=200')
      .then((data) => {
        if (Array.isArray(data)) setServices(data);
        else if (data && Array.isArray((data as { services: ServiceOption[] }).services))
          setServices((data as { services: ServiceOption[] }).services);
        else setServices([]);
      })
      .catch(() => setServices([]));
  }, []);

  // When a service is selected, auto-fill title (if empty) and duration
  // from the catalog. Keeps any user-entered title intact if they edited it.
  function handleServiceSelect(selectedId: string) {
    // The "_none" option clears the selection.
    const normalized = selectedId === '_none' ? '' : selectedId;
    updateForm('serviceId', normalized);
    if (!normalized) return;
    const svc = services.find((s) => s.id === normalized);
    if (!svc) return;
    setFormData((prev) => ({
      ...prev,
      serviceId: normalized,
      // Only auto-fill title if it is empty or matches a previously-selected
      // service name (so we don't clobber a user's custom title).
      title:
        !prev.title.trim() || services.some((s) => s.name === prev.title)
          ? svc.name
          : prev.title,
      duration: String(svc.duration || prev.duration || 60),
    }));
  }

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== 'all')
        params.set('status', statusFilter);
      params.set('page', '1');
      params.set('limit', '50');
      params.set('sortBy', 'scheduledAt');
      params.set('sortOrder', 'asc');

      const qs = params.toString();
      const url = `/api/bookings${qs ? `?${qs}` : ''}`;
      const data = await apiGet<BookingsResponse>(url);
      setBookings(data.bookings);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Stats computed from current bookings
  const todayCount = bookings.filter((b) => isToday(b.scheduledAt)).length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter(
    (b) => b.status === 'confirmed'
  ).length;
  const completedCount = bookings.filter(
    (b) => b.status === 'completed'
  ).length;

  // Handlers
  function handleCreate() {
    setFormData(EMPTY_FORM);
    setShowCreateDialog(true);
  }

  function handleEdit(booking: Booking) {
    setSelectedBooking(booking);
    setFormData({
      title: booking.title,
      customerName: booking.customerName || '',
      customerPhone: booking.customerPhone || '',
      customerEmail: booking.customerEmail || '',
      address: booking.address || '',
      scheduledAt: booking.scheduledAt
        ? new Date(booking.scheduledAt).toISOString().slice(0, 16)
        : '',
      duration: String(booking.duration),
      description: booking.description || '',
      notes: booking.notes || '',
      status: booking.status,
      source: booking.source,
      employeeId: booking.employeeId || '',
      serviceId: booking.serviceId || '',
      assignmentType: booking.employeeId ? 'assign_now' : 'unassigned',
    });
    setShowEditDialog(true);
  }

  function handleView(booking: Booking) {
    setSelectedBooking(booking);
    setShowViewDialog(true);
  }

  function handleDelete(booking: Booking) {
    setSelectedBooking(booking);
    setShowDeleteDialog(true);
  }

  async function handleStatusChange(booking: Booking, newStatus: string) {
    try {
      await apiPut(`/api/bookings/${booking.id}`, { status: newStatus });
      fetchBookings();
    } catch {
      setError('Failed to update status');
    }
  }

  async function submitCreate() {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      const created = await apiPost<{ id: string }>('/api/bookings', {
        title: formData.title.trim(),
        customerName: formData.customerName.trim() || null,
        customerPhone: formData.customerPhone.trim() || null,
        customerEmail: formData.customerEmail.trim() || null,
        address: formData.address.trim() || null,
        scheduledAt: formData.scheduledAt || null,
        duration: parseInt(formData.duration) || 60,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        source: formData.source,
        serviceId: formData.serviceId || null,
        employeeId:
          formData.assignmentType === 'assign_now' && formData.employeeId
            ? formData.employeeId
            : null,
      });
      // If user picked Auto Assign, fire a follow-up auto-assign call.
      if (formData.assignmentType === 'auto_assign' && created?.id) {
        try {
          const result = await apiPost<{ employee?: { name?: string } }>(
            '/api/bookings/auto-assign',
            { bookingId: created.id, strategy: 'workload' }
          );
          if (result?.employee?.name) {
            toast.success(`Auto-assigned to ${result.employee.name}`);
          } else {
            toast.success('Booking created and auto-assigned');
          }
        } catch {
          toast.error('Booking created, but auto-assign failed — no available employees');
        }
      } else {
        toast.success('Booking created');
      }
      setShowCreateDialog(false);
      fetchBookings();
    } catch {
      setError('Failed to create booking');
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreateAndAssign() {
    // Same as submitCreate but forces assignmentType='assign_now' and requires employeeId
    if (!formData.title.trim()) return;
    if (!formData.employeeId) {
      setError('Please select an employee to assign');
      toast.error('Please select an employee to assign');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/api/bookings', {
        title: formData.title.trim(),
        customerName: formData.customerName.trim() || null,
        customerPhone: formData.customerPhone.trim() || null,
        customerEmail: formData.customerEmail.trim() || null,
        address: formData.address.trim() || null,
        scheduledAt: formData.scheduledAt || null,
        duration: parseInt(formData.duration) || 60,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        source: formData.source,
        serviceId: formData.serviceId || null,
        employeeId: formData.employeeId,
      });
      toast.success('Booking created and employee assigned');
      setShowCreateDialog(false);
      fetchBookings();
    } catch {
      setError('Failed to create booking');
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreateAndJob() {
    // Creates booking, then creates a job from it
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      const booking = await apiPost<{ id: string }>('/api/bookings', {
        title: formData.title.trim(),
        customerName: formData.customerName.trim() || null,
        customerPhone: formData.customerPhone.trim() || null,
        customerEmail: formData.customerEmail.trim() || null,
        address: formData.address.trim() || null,
        scheduledAt: formData.scheduledAt || null,
        duration: parseInt(formData.duration) || 60,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        source: formData.source,
        serviceId: formData.serviceId || null,
        employeeId:
          formData.assignmentType === 'assign_now' && formData.employeeId
            ? formData.employeeId
            : null,
      });
      // Now create a job from this booking
      if (booking?.id) {
        try {
          await apiPost(`/api/bookings/${booking.id}/create-job`, {});
          toast.success('Booking created and Job generated');
        } catch (err) {
          console.error('Failed to create job from booking:', err);
          toast.success('Booking created — could not auto-create job');
          // Don't fail the whole flow — booking was created successfully
        }
      } else {
        toast.success('Booking created');
      }
      setShowCreateDialog(false);
      fetchBookings();
    } catch {
      setError('Failed to create booking');
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAutoAssign(bookingId: string) {
    setSubmitting(true);
    try {
      const result = await apiPost<{ employee?: { name?: string } }>(
        '/api/bookings/auto-assign',
        { bookingId, strategy: 'workload' }
      );
      if (result?.employee?.name) {
        toast.success(`Auto-assigned to ${result.employee.name}`);
      } else {
        toast.success('Booking auto-assigned');
      }
      fetchBookings();
    } catch {
      setError('Auto-assign failed — no available employees');
      toast.error('Auto-assign failed — no available employees');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignEmployee(bookingId: string, employeeId: string) {
    setSubmitting(true);
    try {
      await apiPost(`/api/bookings/${bookingId}/assign`, { employeeId });
      toast.success('Employee assigned');
      fetchBookings();
    } catch {
      setError('Failed to assign employee');
      toast.error('Failed to assign employee');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateJobFromBooking(bookingId: string) {
    setSubmitting(true);
    try {
      // Note: apiPost resolves the JSON body regardless of HTTP status
      // (fetch only rejects on network errors). So we inspect the body
      // for an `error` field to detect e.g. 409 conflict.
      const result = await apiPost<{
        message?: string;
        job?: { id: string };
        error?: string;
      }>(`/api/bookings/${bookingId}/create-job`, {});
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result?.message || 'Job created from booking');
        fetchBookings();
      }
    } catch {
      setError('Failed to create job from booking');
      toast.error('Failed to create job from booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit() {
    if (!selectedBooking || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      await apiPut(`/api/bookings/${selectedBooking.id}`, {
        title: formData.title.trim(),
        customerName: formData.customerName.trim() || null,
        customerPhone: formData.customerPhone.trim() || null,
        customerEmail: formData.customerEmail.trim() || null,
        address: formData.address.trim() || null,
        scheduledAt: formData.scheduledAt || null,
        duration: parseInt(formData.duration) || 60,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
        serviceId: formData.serviceId || null,
        employeeId: formData.employeeId || null,
      });
      toast.success('Booking updated');
      setShowEditDialog(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch {
      setError('Failed to update booking');
      toast.error('Failed to update booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEditAndCreateJob() {
    if (!selectedBooking || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      await apiPut(`/api/bookings/${selectedBooking.id}`, {
        title: formData.title.trim(),
        customerName: formData.customerName.trim() || null,
        customerPhone: formData.customerPhone.trim() || null,
        customerEmail: formData.customerEmail.trim() || null,
        address: formData.address.trim() || null,
        scheduledAt: formData.scheduledAt || null,
        duration: parseInt(formData.duration) || 60,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
        serviceId: formData.serviceId || null,
        employeeId: formData.employeeId || null,
      });
      // Then create a job from this booking
      try {
        const result = await apiPost<{ message?: string; error?: string }>(
          `/api/bookings/${selectedBooking.id}/create-job`,
          {}
        );
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success(result?.message || 'Booking saved and Job generated');
        }
      } catch {
        toast.error('Booking saved — could not auto-create job');
      }
      setShowEditDialog(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch {
      setError('Failed to update booking');
      toast.error('Failed to update booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      await apiDelete(`/api/bookings/${selectedBooking.id}`);
      setShowDeleteDialog(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch {
      setError('Failed to delete booking');
    } finally {
      setSubmitting(false);
    }
  }

  function updateForm(field: keyof BookingFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Status transition options for a given booking
  function getTransitionOptions(status: string) {
    const transitions: Record<string, { to: string; label: string }[]> = {
      pending: [
        { to: 'confirmed', label: 'Confirm' },
        { to: 'cancelled', label: 'Cancel' },
      ],
      confirmed: [
        { to: 'in_progress', label: 'Start' },
        { to: 'cancelled', label: 'Cancel' },
      ],
      in_progress: [
        { to: 'completed', label: 'Complete' },
        { to: 'cancelled', label: 'Cancel' },
      ],
      completed: [],
      cancelled: [],
      no_show: [],
    };
    return transitions[status] || [];
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <CalendarCheck className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Booking</h2>
            <p className="text-sm text-muted-foreground">
              Manage service bookings and appointments
            </p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={handleCreate}
        >
          <Plus className="size-4 mr-1.5" /> New Booking
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-400">
              {error}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2"
              onClick={() => setError(null)}
            >
              <X className="size-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interactive Status Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Bookings', count: pagination.total || bookings.length, color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', activeColor: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900', icon: CalendarCheck },
          { key: 'pending', label: 'Pending', count: bookings.filter(b => b.status === 'pending').length, color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900/50', activeColor: 'bg-yellow-600 text-white border-yellow-600', icon: Clock },
          { key: 'confirmed', label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50', activeColor: 'bg-blue-600 text-white border-blue-600', icon: CheckCircle2 },
          { key: 'in_progress', label: 'In Progress', count: bookings.filter(b => b.status === 'in_progress').length, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50', activeColor: 'bg-purple-600 text-white border-purple-600', icon: Zap },
          { key: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50', activeColor: 'bg-emerald-600 text-white border-emerald-600', icon: CheckCircle2 },
          { key: 'cancelled', label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length, color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50', activeColor: 'bg-red-600 text-white border-red-600', icon: XCircle },
        ].map((chip) => {
          const Icon = chip.icon;
          const isActive = statusFilter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(isActive ? 'all' : chip.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all min-h-[36px] shadow-2xs cursor-pointer',
                isActive ? chip.activeColor : chip.color
              )}
            >
              <Icon className="size-3.5" />
              <span>{chip.label}</span>
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-background/80 text-foreground">
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar + Layout Switcher */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings by title, customer, phone..."
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button variant="outline" size="sm" className="h-10 text-xs" onClick={() => fetchBookings()}>
            <RefreshCw className="size-3.5 mr-1" /> Refresh
          </Button>

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

      {/* Bookings Content */}
      {loading ? (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </Card>
      ) : bookings.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CalendarCheck className="size-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">No bookings found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Try adjusting your search filters or create a new booking request.
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
                onClick={handleCreate}
              >
                <Plus className="size-4 mr-1.5" /> New Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewLayout === 'grid' ? (
        /* ─── Grid Cards View ────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => {
            const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            const transitions = getTransitionOptions(booking.status);
            const isClosed = ['completed', 'cancelled', 'no_show'].includes(booking.status);

            return (
              <Card
                key={booking.id}
                className="group relative p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                onClick={() => handleView(booking)}
              >
                <div className="space-y-3">
                  {/* Header: Source Tag + Status Badge */}
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <Badge variant="secondary" className="text-[10px] h-5 px-2 capitalize bg-slate-100 dark:bg-slate-800 font-medium">
                      {booking.source || 'manual'}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider', statusCfg.bgClass, statusCfg.textClass)}>
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Title & Customer Name */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
                      {booking.title}
                    </h4>
                    {booking.customerName && (
                      <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="size-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{booking.customerName}</span>
                        </div>
                        {booking.customerPhone && (
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`tel:${booking.customerPhone}`}
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                              title="Call customer"
                            >
                              <Phone className="size-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                              title="WhatsApp customer"
                            >
                              <MessageSquare className="size-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Schedule Window & Address */}
                  <div className="space-y-1.5 pt-1">
                    {booking.scheduledAt && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300 w-fit">
                        <Calendar className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>{formatScheduleDate(booking.scheduledAt)} · {formatScheduleTime(booking.scheduledAt)}</span>
                      </div>
                    )}

                    {booking.address && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        <MapPin className="size-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span className="truncate">{booking.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Assignee & Action Buttons Row */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  {booking.employee?.name ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Avatar className="size-6 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {booking.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{booking.employee.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 font-medium">
                      Unassigned
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    {!isClosed && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 text-xs shadow-xs"
                        onClick={() => handleCreateJobFromBooking(booking.id)}
                      >
                        <ArrowRight className="size-3.5 mr-1" /> Convert to Job
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(booking)}>
                          <Eye className="size-3.5 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(booking)}>
                          <Pencil className="size-3.5 mr-2" /> Edit Booking
                        </DropdownMenuItem>
                        {!isClosed && (
                          <DropdownMenuItem onClick={() => handleCreateJobFromBooking(booking.id)}>
                            <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                          </DropdownMenuItem>
                        )}
                        {transitions.map((t) => (
                          <DropdownMenuItem key={t.to} onClick={() => handleStatusChange(booking, t.to)}>
                            <CheckCircle2 className="size-3.5 mr-2" /> Mark as {t.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(booking)}>
                          <Trash2 className="size-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ─── Table View ───────────────────────────────────────────────── */
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="max-h-[650px] overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold">Title</TableHead>
                  <TableHead className="font-bold">Customer</TableHead>
                  <TableHead className="font-bold">Scheduled</TableHead>
                  <TableHead className="font-bold">Duration</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Employee</TableHead>
                  <TableHead className="font-bold">Source</TableHead>
                  <TableHead className="text-right font-bold w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                  const transitions = getTransitionOptions(booking.status);
                  const isClosed = ['completed', 'cancelled', 'no_show'].includes(booking.status);

                  return (
                    <TableRow key={booking.id} className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors" onClick={() => handleView(booking)}>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                        {booking.title}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {booking.customerName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{booking.customerName}</p>
                              <p className="text-[10px] text-slate-400 truncate">{booking.customerPhone || 'No phone'}</p>
                            </div>
                            {booking.customerPhone && (
                              <div className="flex items-center gap-0.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:${booking.customerPhone}`}
                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="Call customer"
                                >
                                  <Phone className="size-3" />
                                </a>
                                <a
                                  href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="WhatsApp customer"
                                >
                                  <MessageSquare className="size-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {booking.scheduledAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] whitespace-nowrap">
                            <Calendar className="size-3" /> {formatScheduleDate(booking.scheduledAt)} · {formatScheduleTime(booking.scheduledAt)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {formatDuration(booking.duration)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider', statusCfg.bgClass, statusCfg.textClass)}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {booking.employee?.name ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-5 shrink-0">
                              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                {booking.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{booking.employee.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize font-medium">
                          {booking.source || 'manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {!isClosed && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              onClick={() => handleCreateJobFromBooking(booking.id)}
                            >
                              Convert
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(booking)}>
                                <Eye className="size-3.5 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(booking)}>
                                <Pencil className="size-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              {transitions.map((t) => (
                                <DropdownMenuItem key={t.to} onClick={() => handleStatusChange(booking, t.to)}>
                                  <CheckCircle2 className="size-3.5 mr-2" /> Mark as {t.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(booking)}>
                                <Trash2 className="size-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination info */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {bookings.length} of {pagination.total} bookings
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <span className="flex items-center px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* CREATE DIALOG */}
      {/* ================================================================== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
            <DialogDescription>
              Create a new service booking or appointment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Service Catalog dropdown — auto-fills title + duration */}
            <div className="grid gap-2">
              <Label htmlFor="create-serviceId">
                Service{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (from catalog — optional)
                </span>
              </Label>
              <Select
                value={formData.serviceId || '_none'}
                onValueChange={handleServiceSelect}
              >
                <SelectTrigger id="create-serviceId">
                  <SelectValue
                    placeholder={
                      services.length === 0
                        ? 'No services in catalog'
                        : 'Select a service to auto-fill details'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No service —</SelectItem>
                  {services.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name}
                      <span className="text-xs text-muted-foreground ml-1">
                        · {svc.category} · {svc.duration}m ·
                        ${svc.basePrice.toFixed(2)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.serviceId &&
                services.find((s) => s.id === formData.serviceId) && (
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from catalog:{' '}
                    <span className="font-medium text-foreground">
                      {
                        services.find((s) => s.id === formData.serviceId)
                          ?.name
                      }
                    </span>{' '}
                    ·{' '}
                    {
                      services.find((s) => s.id === formData.serviceId)
                        ?.duration
                    }{' '}
                    min · $
                    {services
                      .find((s) => s.id === formData.serviceId)
                      ?.basePrice.toFixed(2)}
                  </p>
                )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-title"
                placeholder="e.g. Deep Cleaning Service"
                value={formData.title}
                onChange={(e) => updateForm('title', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-customerName">Customer Name</Label>
                <Input
                  id="create-customerName"
                  placeholder="John Doe"
                  value={formData.customerName}
                  onChange={(e) => updateForm('customerName', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-customerPhone">Phone</Label>
                <Input
                  id="create-customerPhone"
                  placeholder="+1 234 567 890"
                  value={formData.customerPhone}
                  onChange={(e) => updateForm('customerPhone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-customerEmail">Email</Label>
              <Input
                id="create-customerEmail"
                type="email"
                placeholder="john@example.com"
                value={formData.customerEmail}
                onChange={(e) => updateForm('customerEmail', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-address">Address</Label>
              <Input
                id="create-address"
                placeholder="123 Main St, City"
                value={formData.address}
                onChange={(e) => updateForm('address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-scheduledAt">Scheduled At</Label>
                <Input
                  id="create-scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => updateForm('scheduledAt', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-duration">Duration (min)</Label>
                <Input
                  id="create-duration"
                  type="number"
                  min="5"
                  value={formData.duration}
                  onChange={(e) => updateForm('duration', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => updateForm('source', v)}
              >
                <SelectTrigger id="create-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Type */}
            <div className="grid gap-2">
              <Label>Assignment Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'unassigned', label: 'Unassigned' },
                    { value: 'assign_now', label: 'Assign Now' },
                    { value: 'auto_assign', label: 'Auto Assign' },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={
                      formData.assignmentType === opt.value ? 'default' : 'outline'
                    }
                    size="sm"
                    className={
                      formData.assignmentType === opt.value
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : ''
                    }
                    onClick={() =>
                      updateForm('assignmentType', opt.value)
                    }
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Assigned Employee — only shown when assignmentType === 'assign_now' */}
            {formData.assignmentType === 'assign_now' && (
              <div className="grid gap-2">
                <Label htmlFor="create-employeeId">Assigned Employee</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(v) => updateForm('employeeId', v)}
                >
                  <SelectTrigger id="create-employeeId">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No employees available
                      </SelectItem>
                    ) : (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            · {emp.role || '—'} · {emp.status || '—'}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Auto-assign strategy hint */}
            {formData.assignmentType === 'auto_assign' && (
              <div className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded p-2">
                After the booking is created, the system will auto-assign the
                best available employee based on workload, rating, and
                availability.
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="Describe the booking..."
                value={formData.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                placeholder="Internal notes..."
                value={formData.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={submitCreate}
              disabled={submitting || !formData.title.trim()}
            >
              Save Booking
            </Button>
            <Button
              variant="outline"
              onClick={submitCreateAndAssign}
              disabled={
                submitting ||
                !formData.title.trim() ||
                (formData.assignmentType === 'assign_now' && !formData.employeeId)
              }
              title="Save and assign the selected employee"
            >
              Save &amp; Assign
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={submitCreateAndJob}
              disabled={submitting || !formData.title.trim()}
            >
              {submitting ? 'Creating...' : 'Save & Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* EDIT DIALOG */}
      {/* ================================================================== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Update booking details and status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Service Catalog dropdown — auto-fills title + duration */}
            <div className="grid gap-2">
              <Label htmlFor="edit-serviceId">
                Service{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (from catalog — optional)
                </span>
              </Label>
              <Select
                value={formData.serviceId || '_none'}
                onValueChange={handleServiceSelect}
              >
                <SelectTrigger id="edit-serviceId">
                  <SelectValue
                    placeholder={
                      services.length === 0
                        ? 'No services in catalog'
                        : 'Select a service to auto-fill details'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No service —</SelectItem>
                  {services.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name}
                      <span className="text-xs text-muted-foreground ml-1">
                        · {svc.category} · {svc.duration}m ·
                        ${svc.basePrice.toFixed(2)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => updateForm('title', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-customerName">Customer Name</Label>
                <Input
                  id="edit-customerName"
                  value={formData.customerName}
                  onChange={(e) => updateForm('customerName', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-customerPhone">Phone</Label>
                <Input
                  id="edit-customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => updateForm('customerPhone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-customerEmail">Email</Label>
              <Input
                id="edit-customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => updateForm('customerEmail', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => updateForm('address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-scheduledAt">Scheduled At</Label>
                <Input
                  id="edit-scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => updateForm('scheduledAt', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-duration">Duration (min)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min="5"
                  value={formData.duration}
                  onChange={(e) => updateForm('duration', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => updateForm('status', v)}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Type (Edit) */}
            <div className="grid gap-2">
              <Label>Assignment Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'unassigned', label: 'Unassigned' },
                    { value: 'assign_now', label: 'Assign Now' },
                    { value: 'auto_assign', label: 'Auto Assign' },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={
                      formData.assignmentType === opt.value ? 'default' : 'outline'
                    }
                    size="sm"
                    className={
                      formData.assignmentType === opt.value
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : ''
                    }
                    onClick={() =>
                      updateForm('assignmentType', opt.value)
                    }
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Assigned Employee — only shown when assignmentType === 'assign_now' */}
            {formData.assignmentType === 'assign_now' && (
              <div className="grid gap-2">
                <Label htmlFor="edit-employeeId">Assigned Employee</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(v) => updateForm('employeeId', v)}
                >
                  <SelectTrigger id="edit-employeeId">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No employees available
                      </SelectItem>
                    ) : (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            · {emp.role || '—'} · {emp.status || '—'}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Auto-assign strategy hint */}
            {formData.assignmentType === 'auto_assign' && (
              <div className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded p-2">
                When you click <strong>Save Changes</strong>, the system will
                auto-assign the best available employee based on workload,
                rating, and availability.
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (formData.assignmentType === 'auto_assign' && selectedBooking) {
                  // Save first, then auto-assign
                  await submitEdit();
                  if (selectedBooking) {
                    await handleAutoAssign(selectedBooking.id);
                  }
                } else {
                  submitEdit();
                }
              }}
              disabled={submitting || !formData.title.trim()}
            >
              Save Changes
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={submitEditAndCreateJob}
              disabled={submitting || !formData.title.trim()}
            >
              {submitting ? 'Saving...' : 'Save & Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* VIEW DIALOG */}
      {/* ================================================================== */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Full details for this booking.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="grid gap-3 py-2 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-base">
                    {selectedBooking.title}
                  </h4>
                  {selectedBooking.description && (
                    <p className="text-muted-foreground mt-1">
                      {selectedBooking.description}
                    </p>
                  )}
                </div>
                {(() => {
                  const sc =
                    STATUS_CONFIG[selectedBooking.status] ||
                    STATUS_CONFIG.pending;
                  return (
                    <Badge
                      variant="secondary"
                      className={`${sc.bgClass} ${sc.textClass} border-0`}
                    >
                      {sc.label}
                    </Badge>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Customer
                  </span>
                  <p className="font-medium">
                    {selectedBooking.customerName || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Phone
                  </span>
                  <p className="font-medium">
                    {selectedBooking.customerPhone || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Email
                  </span>
                  <p className="font-medium">
                    {selectedBooking.customerEmail || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Address
                  </span>
                  <p className="font-medium">
                    {selectedBooking.address || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Scheduled
                  </span>
                  <p className="font-medium">
                    {formatScheduleDate(selectedBooking.scheduledAt)}{' '}
                    {formatScheduleTime(selectedBooking.scheduledAt)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Duration
                  </span>
                  <p className="font-medium">
                    {formatDuration(selectedBooking.duration)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Employee
                  </span>
                  <p className="font-medium">
                    {selectedBooking.employee?.name || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Source
                  </span>
                  <p className="font-medium capitalize">
                    {selectedBooking.source}
                  </p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="mt-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Notes
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowViewDialog(false);
                    handleEdit(selectedBooking);
                  }}
                >
                  <Pencil className="size-3.5 mr-1.5" /> Edit
                </Button>

                {/* Assign / Change Employee dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={submitting}>
                      <Users className="size-3.5 mr-1.5" />
                      {selectedBooking.employeeId ? 'Change Employee' : 'Assign Employee'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto w-64">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Select an employee
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {employees.length === 0 ? (
                      <DropdownMenuItem disabled>No employees available</DropdownMenuItem>
                    ) : (
                      employees.map((emp) => (
                        <DropdownMenuItem
                          key={emp.id}
                          onClick={() => {
                            handleAssignEmployee(selectedBooking.id, emp.id);
                            setShowViewDialog(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span>{emp.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {emp.role || '—'} · {emp.status || '—'}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                    {selectedBooking.employeeId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            handleAssignEmployee(selectedBooking.id, '');
                            setShowViewDialog(false);
                          }}
                        >
                          Unassign
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleAutoAssign(selectedBooking.id);
                    setShowViewDialog(false);
                  }}
                  disabled={submitting}
                >
                  <Users className="size-3.5 mr-1.5" /> Auto Assign
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleCreateJobFromBooking(selectedBooking.id);
                    setShowViewDialog(false);
                  }}
                  disabled={submitting}
                >
                  <Briefcase className="size-3.5 mr-1.5" /> Create Job
                </Button>

                {getTransitionOptions(selectedBooking.status).map((t) => (
                  <Button
                    key={t.to}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setShowViewDialog(false);
                      handleStatusChange(selectedBooking, t.to);
                    }}
                  >
                    <CheckCircle2 className="size-3.5 mr-1.5" /> {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* DELETE CONFIRMATION */}
      {/* ================================================================== */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{selectedBooking?.title}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

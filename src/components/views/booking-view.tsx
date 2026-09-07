'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  AlertCircle,
  Plus,
  Search,
  X,
  LayoutGrid,
  List,
  RefreshCw,
  Archive as ArchiveIcon,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiGet, apiPost, apiPut, apiDelete, authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBookings } from '@/hooks/use-crm-data';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';

import {
  EMPTY_FORM,
} from '@/features/booking/types';
import type {
  Booking,
  BookingFormData,
  Pagination,
  EmployeeOption,
  ServiceOption,
} from '@/features/booking/types';
import {
  CreateBookingDialog,
  EditBookingDialog,
} from '@/features/booking/components/booking-form-dialog';
import { BookingViewDialog } from '@/features/booking/components/booking-view-dialog';
import { BookingDeleteDialog } from '@/features/booking/components/booking-delete-dialog';
import {
  buildBookingColumns,
} from '@/features/booking/components/booking-columns';
import { BookingCard } from '@/features/booking/components/booking-card';
import { BookingStatusChips } from '@/features/booking/components/booking-status-chips';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingView() {
  // State
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
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
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // ── PAGINATION-ARCHIVE-1: Active vs Archived tab ────────────────────────
  // The "Archived" tab fetches bookings with `archived=true` (soft-deleted
  // only). When the user switches tabs, the useBookings query re-runs with
  // the new filter via the `archived` query param.
  const [archiveTab, setArchiveTab] = useState<'active' | 'archived'>('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset page when tab/search/filter/pageSize changes (mirrors leads-view pattern).
  useEffect(() => {
    setPage(1);
  }, [archiveTab, statusFilter, searchQuery, pageSize]);

  // Main list data — React Query replaces the manual fetchBookings
  // useCallback + useEffect. RQ keys the query by `{ status, search, archived,
  // page, limit }`, so rapid filter changes no longer race (the latest filter
  // wins; stale responses are discarded).
  const {
    data: bookingsData,
    isLoading: loading,
    error: rqError,
    refetch: fetchBookings,
  } = useBookings({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
    page,
    limit: pageSize,
    archived: archiveTab === 'archived' ? 'true' : 'false',
  });
  const bookings = bookingsData?.bookings ?? [];
  // Sync the local pagination state with the API response (so the
  // pagination controls render the right page/total).
  useEffect(() => {
    if (bookingsData?.pagination) {
      setPagination({
        page: bookingsData.pagination.page ?? page,
        limit: bookingsData.pagination.limit ?? pageSize,
        total: bookingsData.pagination.total ?? 0,
        totalPages: bookingsData.pagination.totalPages ?? 0,
      });
    }
  }, [bookingsData?.pagination, page, pageSize]);
  // `error` mirrors the original string-error banner; derived from RQ's
  // Error object. Mutations no longer call setError(...) — they all use
  // toast.error for user-visible feedback, same as before.
  const error = rqError?.message ?? null;

  // ── Archive / Restore handlers (PAGINATION-ARCHIVE-1) ──────────────────
  const queryClient = useQueryClient();
  const [archiveActionLoadingId, setArchiveActionLoadingId] = useState<string | null>(null);

  const handleArchiveBooking = useCallback(async (bookingId: string) => {
    setArchiveActionLoadingId(bookingId);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/archive`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to archive booking');
        return;
      }
      toast.success('Booking archived');
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
    } catch {
      toast.error('Network error archiving booking');
    } finally {
      setArchiveActionLoadingId(null);
    }
  }, [queryClient]);

  const handleRestoreBooking = useCallback(async (bookingId: string) => {
    setArchiveActionLoadingId(bookingId);
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/restore`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to restore booking');
        return;
      }
      toast.success('Booking restored');
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
    } catch {
      toast.error('Network error restoring booking');
    } finally {
      setArchiveActionLoadingId(null);
    }
  }, [queryClient]);

  useEffect(() => {
    apiGet<{ id: string; name: string; role: string; status: string }[]>(
      '/api/employees'
    )
      .then((data) => {
        // /api/employees may return either a bare array or { employees: [...] }
        if (Array.isArray(data)) setEmployees(data);
        else if (data && Array.isArray((data as unknown as { employees: unknown[] }).employees)) {
          setEmployees(
            (data as unknown as { employees: EmployeeOption[] }).employees
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

  // Fetch bookings — migrated to React Query (`useBookings` above). The
  // RQ query is keyed by `{ status, search }` and refetches automatically
  // when those filters change, so the manual `useEffect(() => fetchBookings())`
  // is no longer needed.

  // Stats previously computed here (todayCount, pendingCount, etc.) are
  // now derived inline inside the BookingStatusChips component, which owns
  // the chip count badges.

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
      toast.error('Failed to update status');
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
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreateAndAssign() {
    // Same as submitCreate but forces assignmentType='assign_now' and requires employeeId
    if (!formData.title.trim()) return;
    if (!formData.employeeId) {
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
      toast.error('Failed to delete booking');
    } finally {
      setSubmitting(false);
    }
  }

  // DataTable columns are built from the action handlers so the column
  // renderers stay pure (no context lookups).
  const bookingColumns = buildBookingColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onStatusChange: handleStatusChange,
    onCreateJobFromBooking: handleCreateJobFromBooking,
    // PAGINATION-ARCHIVE-1: pass archive handlers + current mode so the
    // columns render the right actions (Restore-only in archive mode).
    onArchive: handleArchiveBooking,
    onRestore: handleRestoreBooking,
    archiveMode: archiveTab === 'archived',
    archiveActionLoadingId,
  });

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
              onClick={() => fetchBookings()}
            >
              <X className="size-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── PAGINATION-ARCHIVE-1: Active vs Archived top-level tabs ────────── */}
      <Tabs
        value={archiveTab}
        onValueChange={(v) => setArchiveTab(v as 'active' | 'archived')}
        className="w-full"
      >
        <TabsList className="h-10">
          <TabsTrigger value="active" className="text-xs px-4 gap-1.5">
            <CalendarCheck className="size-3.5" /> Active
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-xs px-4 gap-1.5">
            <ArchiveIcon className="size-3.5" /> Archived
          </TabsTrigger>
        </TabsList>

        {/* Active tab content (existing list — same as before archive feature) */}
        <TabsContent value="active" className="mt-4 space-y-4 outline-none">
          {/* Interactive Status Filter Chips */}
          <BookingStatusChips
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
            pagination={pagination}
            bookings={bookings}
          />

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  handlers={{
                    onView: handleView,
                    onEdit: handleEdit,
                    onDelete: handleDelete,
                    onStatusChange: handleStatusChange,
                    onCreateJobFromBooking: handleCreateJobFromBooking,
                    onArchive: handleArchiveBooking,
                    archiveMode: false,
                    archiveActionLoadingId,
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="max-h-[650px] overflow-auto">
                <DataTable
                  columns={bookingColumns}
                  data={bookings}
                  rowKey={(b) => b.id}
                  onRowClick={(b) => handleView(b)}
                  className="border-0 rounded-none"
                />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3 p-3 border-t border-slate-100 dark:border-slate-800 bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  {pagination.total === 0
                    ? 'No bookings'
                    : `Showing ${Math.min((page - 1) * pageSize + 1, pagination.total)}–${Math.min(page * pageSize, pagination.total)} of ${pagination.total} bookings`}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Rows:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: 10, label: '10 / page' },
                          { value: 20, label: '20 / page' },
                          { value: 50, label: '50 / page' },
                          { value: 100, label: '100 / page' },
                        ].map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="h-8 text-xs bg-background"
                    >
                      <ChevronLeft className="size-3.5 mr-1" /> Previous
                    </Button>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Page {pagination.page || 1} of {pagination.totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= (pagination.totalPages || 1)}
                      onClick={() => setPage(page + 1)}
                      className="h-8 text-xs bg-background"
                    >
                      Next <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Grid Layout Pagination */}
          {viewLayout === 'grid' && (
            <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm text-muted-foreground">
                {pagination.total === 0
                  ? 'No bookings'
                  : `Showing ${Math.min((page - 1) * pageSize + 1, pagination.total)}–${Math.min(page * pageSize, pagination.total)} of ${pagination.total} bookings`}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Rows:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: 10, label: '10 / page' },
                        { value: 20, label: '20 / page' },
                        { value: 50, label: '50 / page' },
                        { value: 100, label: '100 / page' },
                      ].map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 text-xs"
                  >
                    <ChevronLeft className="size-3.5 mr-1" /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Page {pagination.page || 1} of {pagination.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (pagination.totalPages || 1)}
                    onClick={() => setPage(page + 1)}
                    className="h-8 text-xs"
                  >
                    Next <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Archived tab content ──────────────────────────────────────── */}
        <TabsContent value="archived" className="mt-4 space-y-4 outline-none">
          <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10">
            <CardContent className="p-4 flex items-start gap-3">
              <ArchiveIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-300">Archived Bookings</p>
                <p className="text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                  Soft-deleted bookings are kept here for audit. Restore a booking to move it back to the Active list.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Search + Refresh */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search archived bookings..."
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
            <Button variant="outline" size="sm" className="h-10 text-xs" onClick={() => fetchBookings()}>
              <RefreshCw className="size-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {/* Archived bookings content (always table for archive mode) */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-center gap-4">
                  <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <ArchiveIcon className="size-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold">No archived bookings</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Archived bookings will appear here for audit.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="max-h-[650px] overflow-auto">
                <DataTable
                  columns={bookingColumns}
                  data={bookings}
                  rowKey={(b) => b.id}
                  onRowClick={(b) => handleView(b)}
                  className="border-0 rounded-none"
                />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3 p-3 border-t border-slate-100 dark:border-slate-800 bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  {pagination.total === 0
                    ? 'No archived bookings'
                    : `Showing ${Math.min((page - 1) * pageSize + 1, pagination.total)}–${Math.min(page * pageSize, pagination.total)} of ${pagination.total} archived bookings`}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Rows:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: 10, label: '10 / page' },
                          { value: 20, label: '20 / page' },
                          { value: 50, label: '50 / page' },
                          { value: 100, label: '100 / page' },
                        ].map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="h-8 text-xs bg-background"
                    >
                      <ChevronLeft className="size-3.5 mr-1" /> Previous
                    </Button>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Page {pagination.page || 1} of {pagination.totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= (pagination.totalPages || 1)}
                      onClick={() => setPage(page + 1)}
                      className="h-8 text-xs bg-background"
                    >
                      Next <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE DIALOG */}
      <CreateBookingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        form={formData}
        onFormChange={setFormData}
        services={services}
        employees={employees}
        saving={submitting}
        onSave={submitCreate}
        onSaveAndAssign={submitCreateAndAssign}
        onSaveAndCreateJob={submitCreateAndJob}
      />

      {/* EDIT DIALOG */}
      <EditBookingDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        form={formData}
        onFormChange={setFormData}
        services={services}
        employees={employees}
        saving={submitting}
        onSave={submitEdit}
        onSaveAndCreateJob={submitEditAndCreateJob}
        onAutoAssign={() =>
          selectedBooking ? handleAutoAssign(selectedBooking.id) : undefined
        }
      />

      {/* VIEW DIALOG */}
      <BookingViewDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        booking={selectedBooking}
        employees={employees}
        submitting={submitting}
        onEdit={handleEdit}
        onAssignEmployee={handleAssignEmployee}
        onAutoAssign={handleAutoAssign}
        onCreateJobFromBooking={handleCreateJobFromBooking}
        onStatusChange={handleStatusChange}
      />

      {/* DELETE CONFIRMATION */}
      <BookingDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        booking={selectedBooking}
        submitting={submitting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

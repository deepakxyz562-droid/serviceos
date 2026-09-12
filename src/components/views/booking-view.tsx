'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Calendar,
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
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { useAppStore } from '@/store/app-store';
import { lineItemsSubtotal, type LineItem } from '@/features/line-items';

import {
  EMPTY_FORM,
} from '@/features/booking/types';
import type {
  Booking,
  BookingFormData,
  Pagination,
  EmployeeOption,
  ServiceOption,
  CustomerOption,
  BookingDateFilter,
} from '@/features/booking/types';
import { BookingFormPage } from '@/features/booking/components/booking-form-page';
import { BookingDetailPage } from '@/features/booking/components/booking-detail-page';
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
  const { symbol } = useCompanyCurrency();
  const pendingCreate = useAppStore((s) => s.pendingCreate);
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);

  // State
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<BookingDateFilter>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<BookingFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

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
  }, [archiveTab, statusFilter, dateFilter, searchQuery, pageSize]);

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
    dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
    sortBy: 'scheduledAt',
    sortOrder: 'asc',
    page,
    limit: pageSize,
    archived: archiveTab === 'archived' ? 'true' : 'false',
  });
  const rawBookings = bookingsData?.bookings ?? [];
  const bookings = useMemo<Booking[]>(() => {
    return [...rawBookings].sort((a, b) => {
      if (!a.scheduledAt && !b.scheduledAt) {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  }, [rawBookings]);
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

  // Fetch customers for CustomerPicker
  useEffect(() => {
    apiGet<{ customers: CustomerOption[] } | CustomerOption[]>('/api/customers?limit=200')
      .then((data) => {
        if (Array.isArray(data)) setCustomers(data);
        else if (data && Array.isArray((data as { customers: CustomerOption[] }).customers))
          setCustomers((data as { customers: CustomerOption[] }).customers);
        else setCustomers([]);
      })
      .catch(() => setCustomers([]));
  }, []);

  // Cross-view create hook (+ Create -> booking)
  useEffect(() => {
    if (pendingCreate === 'booking') {
      handleCreate();
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  // Handlers
  function handleCreate() {
    setEditingBooking(null);
    setSelectedBooking(null);
    setFormData(EMPTY_FORM);
    setIsCreatingBooking(true);
  }

  function handleEdit(booking: Booking) {
    let initialLineItems: LineItem[] = [];
    try {
      const meta = JSON.parse(booking.metadataJson || '{}');
      if (Array.isArray(meta.lineItems)) initialLineItems = meta.lineItems;
    } catch {}

    setEditingBooking(booking);
    setSelectedBooking(booking);
    setFormData({
      title: booking.title,
      customerId: booking.customerId || '',
      customerName: booking.customerName || '',
      customerPhone: booking.customerPhone || '',
      customerEmail: booking.customerEmail || '',
      address: booking.address || '',
      scheduledAt: booking.scheduledAt
        ? new Date(booking.scheduledAt).toISOString().slice(0, 16)
        : '',
      duration: String(booking.duration || 60),
      description: booking.description || '',
      notes: booking.notes || '',
      status: booking.status,
      source: booking.source,
      employeeId: booking.employeeId || '',
      serviceId: booking.serviceId || '',
      assignmentType: booking.employeeId ? 'assign_now' : 'unassigned',
      lineItems: initialLineItems,
    });
    setIsCreatingBooking(false);
  }

  function handleView(booking: Booking) {
    setSelectedBooking(booking);
  }

  function handleDelete(booking: Booking) {
    setSelectedBooking(booking);
    setShowDeleteDialog(true);
  }

  async function handleStatusChange(booking: Booking, newStatus: string) {
    try {
      await apiPut(`/api/bookings/${booking.id}`, { status: newStatus });
      if (selectedBooking && selectedBooking.id === booking.id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
      fetchBookings();
    } catch {
      toast.error('Failed to update status');
    }
  }

  async function submitCreate() {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      const metadataObj = {
        lineItems: formData.lineItems || [],
        subtotal: lineItemsSubtotal(formData.lineItems || []),
      };

      const created = await apiPost<{ id: string }>('/api/bookings', {
        title: formData.title.trim(),
        customerId: formData.customerId || null,
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
        metadataJson: JSON.stringify(metadataObj),
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

      setIsCreatingBooking(false);
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
      fetchBookings();
    } catch {
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreateAndAssign() {
    if (!formData.title.trim()) return;
    if (!formData.employeeId) {
      toast.error('Please select an employee to assign');
      return;
    }
    setSubmitting(true);
    try {
      const metadataObj = {
        lineItems: formData.lineItems || [],
        subtotal: lineItemsSubtotal(formData.lineItems || []),
      };

      await apiPost('/api/bookings', {
        title: formData.title.trim(),
        customerId: formData.customerId || null,
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
        metadataJson: JSON.stringify(metadataObj),
      });
      toast.success('Booking created and employee assigned');
      setIsCreatingBooking(false);
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
      fetchBookings();
    } catch {
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreateAndJob() {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      const metadataObj = {
        lineItems: formData.lineItems || [],
        subtotal: lineItemsSubtotal(formData.lineItems || []),
      };

      const booking = await apiPost<{ id: string }>('/api/bookings', {
        title: formData.title.trim(),
        customerId: formData.customerId || null,
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
        metadataJson: JSON.stringify(metadataObj),
      });

      // Now create a job from this booking
      if (booking?.id) {
        try {
          await apiPost(`/api/bookings/${booking.id}/create-job`, {});
          toast.success('Booking created and Job generated');
        } catch (err) {
          console.error('Failed to create job from booking:', err);
          toast.success('Booking created — could not auto-create job');
        }
      } else {
        toast.success('Booking created');
      }
      setIsCreatingBooking(false);
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
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
      const result = await apiPost<{ employee?: { id?: string; name?: string } }>(
        '/api/bookings/auto-assign',
        { bookingId, strategy: 'workload' }
      );
      if (result?.employee?.name) {
        toast.success(`Auto-assigned to ${result.employee.name}`);
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({
            ...selectedBooking,
            employeeId: result.employee.id || null,
            employee: {
              id: result.employee.id || '',
              name: result.employee.name,
              phone: '',
              avatar: null,
            },
          });
        }
      } else {
        toast.success('Booking auto-assigned');
      }
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
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
      if (selectedBooking && selectedBooking.id === bookingId) {
        const emp = employees.find((e) => e.id === employeeId);
        setSelectedBooking({
          ...selectedBooking,
          employeeId,
          employee: emp ? { id: emp.id, name: emp.name, phone: '', avatar: null } : null,
        });
      }
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
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
      const result = await apiPost<{
        message?: string;
        job?: { id: string };
        error?: string;
      }>(`/api/bookings/${bookingId}/create-job`, {});
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result?.message || 'Job created from booking');
        await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
        fetchBookings();
      }
    } catch {
      toast.error('Failed to create job from booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit() {
    const bookingToEdit = editingBooking || selectedBooking;
    if (!bookingToEdit || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      let existingMeta = {};
      try {
        existingMeta = JSON.parse(bookingToEdit.metadataJson || '{}');
      } catch {}
      const metadataObj = {
        ...existingMeta,
        lineItems: formData.lineItems || [],
        subtotal: lineItemsSubtotal(formData.lineItems || []),
      };

      await apiPut(`/api/bookings/${bookingToEdit.id}`, {
        title: formData.title.trim(),
        customerId: formData.customerId || null,
        customerName: formData.customerName.trim() || null,
        customerPhone: formData.customerPhone.trim() || null,
        customerEmail: formData.customerEmail.trim() || null,
        address: formData.address.trim() || null,
        scheduledAt: formData.scheduledAt || null,
        duration: parseInt(formData.duration) || 60,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
        source: formData.source,
        serviceId: formData.serviceId || null,
        employeeId:
          formData.assignmentType === 'assign_now' && formData.employeeId
            ? formData.employeeId
            : null,
        metadataJson: JSON.stringify(metadataObj),
      });

      if (formData.assignmentType === 'auto_assign' && !bookingToEdit.employeeId) {
        try {
          const result = await apiPost<{ employee?: { name?: string } }>(
            '/api/bookings/auto-assign',
            { bookingId: bookingToEdit.id, strategy: 'workload' }
          );
          if (result?.employee?.name) {
            toast.success(`Auto-assigned to ${result.employee.name}`);
          }
        } catch {}
      }

      toast.success('Booking updated');
      setEditingBooking(null);
      setSelectedBooking(null);
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
      fetchBookings();
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEditAndCreateJob() {
    const bookingToEdit = editingBooking || selectedBooking;
    if (!bookingToEdit || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      let existingMeta = {};
      try {
        existingMeta = JSON.parse(bookingToEdit.metadataJson || '{}');
      } catch {}
      const metadataObj = {
        ...existingMeta,
        lineItems: formData.lineItems || [],
        subtotal: lineItemsSubtotal(formData.lineItems || []),
      };

      await apiPut(`/api/bookings/${bookingToEdit.id}`, {
        title: formData.title.trim(),
        customerId: formData.customerId || null,
        customerName: formData.customerName.trim() || null,
        customerPhone: formData.customerPhone.trim() || null,
        customerEmail: formData.customerEmail.trim() || null,
        address: formData.address.trim() || null,
        scheduledAt: formData.scheduledAt || null,
        duration: parseInt(formData.duration) || 60,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
        source: formData.source,
        serviceId: formData.serviceId || null,
        employeeId:
          formData.assignmentType === 'assign_now' && formData.employeeId
            ? formData.employeeId
            : null,
        metadataJson: JSON.stringify(metadataObj),
      });

      try {
        const result = await apiPost<{ message?: string; error?: string }>(
          `/api/bookings/${bookingToEdit.id}/create-job`,
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
      setEditingBooking(null);
      setSelectedBooking(null);
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
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
      await queryClient.invalidateQueries({ queryKey: qk.bookings.all });
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

  // Full-page Create / Edit Booking view (Jobber-style 2-column layout)
  if (isCreatingBooking || editingBooking !== null) {
    return (
      <BookingFormPage
        editingBooking={editingBooking}
        formData={formData}
        setFormData={setFormData}
        onSave={editingBooking ? submitEdit : submitCreate}
        onSaveAndAssign={submitCreateAndAssign}
        onSaveAndCreateJob={editingBooking ? submitEditAndCreateJob : submitCreateAndJob}
        onCancel={() => {
          setIsCreatingBooking(false);
          setEditingBooking(null);
        }}
        saving={submitting}
        customers={customers}
        onPickCustomer={(c) => {
          // Handled inside BookingFormPage
        }}
        onCustomerCreated={(c) => {
          setCustomers((prev) => [c, ...prev]);
        }}
        services={services}
        symbol={symbol}
        employees={employees}
      />
    );
  }

  // Full-page Booking Detail view (Jobber-style 2-column layout)
  if (selectedBooking !== null && !isCreatingBooking && editingBooking === null) {
    return (
      <BookingDetailPage
        booking={selectedBooking}
        onBack={() => setSelectedBooking(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onAssignEmployee={handleAssignEmployee}
        onAutoAssign={handleAutoAssign}
        onCreateJob={handleCreateJobFromBooking}
        employees={employees}
        submitting={submitting}
        symbol={symbol}
      />
    );
  }

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
            <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
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

              {/* Date Filter Dropdown */}
              <Select
                value={dateFilter}
                onValueChange={(val) => setDateFilter(val as BookingDateFilter)}
              >
                <SelectTrigger className="w-full sm:w-[170px] h-10 text-xs bg-background shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Date Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent align="end" className="w-[190px]">
                  <SelectItem value="all" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span>All Dates</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="today" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Today</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tomorrow" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                      <span>Tomorrow</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="this_week" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-indigo-500 shrink-0" />
                      <span>This Week</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="next_week" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                      <span>Next Week</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                      <span>Overdue / Past</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unscheduled" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-slate-400 shrink-0" />
                      <span>Unscheduled</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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

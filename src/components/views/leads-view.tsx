'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Target, Plus, Search, RefreshCw, Phone, Mail, MapPin,
  MoreHorizontal, Pencil, Trash2, Eye,
  ArrowRight, Clock,
  BarChart3,
  List, ArrowUpDown, ChevronUp, ChevronDown,
  CheckCircle2, X,
  Briefcase,
  Loader2, ImagePlus,
  LayoutGrid, MessageSquare, UserCheck, XCircle,
  Archive as ArchiveIcon, RotateCcw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
  useChangeLeadStatus,
  useAddLeadNote,
} from '@/hooks/use-crm-data';

// Phase 4: lead types + helpers + sub-components extracted to src/features/leads/
import type { Lead, LeadFormData, CustomerOption } from '@/features/leads/types';
import {
  KANBAN_STATUSES,
  STATUS_CONFIG,
  SOURCE_CONFIG,
  PRIORITY_CONFIG,
  EMPTY_FORM,
  formatDateShort,
  formatDateMedium,
  mapToKanbanStatus,
  parseImages,
  parseNotes,
} from '@/features/leads/utils/lead-helpers';
import {
  renderStatusBadge,
  renderSourceBadge,
} from '@/features/leads/components/lead-shared';
import { LeadFormPage } from '@/features/leads/components/lead-form-page';
import { LeadDetailPage } from '@/features/leads/components/lead-detail-page';
import { LeadDetailDialog } from '@/features/leads/components/lead-detail-dialog';
import { LeadAnalyticsView } from '@/features/leads/components/lead-analytics-view';
import { LeadGridView } from '@/features/leads/components/lead-grid-view';
import { LeadConvertDialog, LeadDeleteDialog } from '@/features/leads/components/lead-dialogs';

// Line-items feature (types, utils, components extracted to src/features/line-items/)
import type { LineItem, CatalogService } from '@/features/line-items';
import { SERVICE_TYPES, getServiceTypeLabel } from '@/features/line-items';
import {
  emptyLineItem,
  lineItemTotal,
  lineItemsSubtotal,
  parseLineItems,
  ImageUploader,
  CreateServiceDialog,
  CreateCustomerDialog,
  CustomerPicker,
  LineItemRow,
  LineItemsSection,
} from '@/features/line-items';

// ============================================================
// Re-exports (backward compatibility)
// ============================================================

export type { LineItem, CatalogService } from '@/features/line-items';
export {
  newLineItemId,
  emptyLineItem,
  lineItemTotal,
  lineItemCost,
  lineItemsSubtotal,
  lineItemsTotalCost,
  parseLineItems,
  SERVICE_TYPES,
  getServiceTypeLabel,
  ImageUploader,
  CreateServiceDialog,
  CreateCustomerDialog,
  CustomerPicker,
  LineItemRow,
  LineItemsSection,
} from '@/features/line-items';

export function LeadsView() {
  const { currency, formatCompact, format: formatCurrency, symbol } = useCompanyCurrency();

  // Global store — used to hand off a lead's data to the Jobs view when the
  // user clicks "Convert" so the New Job form opens pre-filled.
  const setPendingJobPrefill = useAppStore((s) => s.setPendingJobPrefill);
  const setGlobalView = useAppStore((s) => s.setActiveView);
  // Cross-view "New X" create signal — when the sidebar's "+ Create" dropdown
  // or the dashboard's "Add Lead" quick action sets pendingCreate to 'lead',
  // we open the New Lead form and clear the signal so a refresh doesn't
  // re-open it.
  const pendingCreate = useAppStore((s) => s.pendingCreate);
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);

  // Data state — main list fetch is backed by React Query (useLeads).
  // The manual `useState + useEffect + fetch` pattern was replaced to
  // eliminate race conditions when filters change rapidly (RQ discards
  // stale responses automatically). The hook returns `{ leads, pagination }`,
  // and we derive `leads` / `totalLeads` / `totalPages` from the cached data.
  // `fetchLeads` is RQ's `refetch`, used at all post-mutation call sites.

  // View state — Leads page is list (table) view only. The inline drag-and-drop
  // Kanban was removed in favour of the dedicated Deal-based SalesPipelineView
  // (sidebar → CRM → Pipeline). activeTab (List | Analytics) below still allows
  // switching between the table and the analytics dashboard.

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  // Debounce the search input so typing "john" doesn't fire 4 HTTP requests
  // (j, jo, joh, john). `searchQuery` stays reactive for the input field;
  // fetchLeads + the page-reset effect depend on `debouncedSearchQuery`.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  // pageSize is stateful so the PaginationBar's rows-per-page selector can
  // change it (and reset back to page 1 on change). Defaults to 10 — the
  // canonical page size used across invoices-view / jobs-view / etc.
  const [pageSize, setPageSize] = useState(10);

  // Sort state (table view)
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialog / page state — initialize to 'form' if a cross-view "New Lead" signal is pending
  const [formMode, setFormMode] = useState<'list' | 'form' | 'detail'>(pendingCreate === 'lead' ? 'form' : 'list');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  // Loading flags for delete + per-lead status change so only the clicked
  // button shows a spinner instead of disabling the whole view.
  const [deletingLeadLoading, setDeletingLeadLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  // Service catalog — fetched so the lead form can link a lead to a
  // specific catalog service (which then flows through to the job on convert).
  const [services, setServices] = useState<
    { id: string; name: string; category: string; basePrice: number; duration: number }[]
  >([]);
  useEffect(() => {
    authFetch('/api/services?active=true&limit=200')
      .then((r) => (r.ok ? r.json() : { services: [] }))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.services ?? [];
        setServices(list);
      })
      .catch(() => setServices([]));
  }, []);

  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string; email?: string | null; address?: string | null; properties?: any[] }[]>([]);
  const [defaultCustomers, setDefaultCustomers] = useState<{ id: string; name: string; phone: string; email?: string | null; address?: string | null; properties?: any[] }[]>([]);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDefaultCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/customers?limit=20');
      if (res.ok) {
        const data = await res.json();
        const list = data.customers ?? (Array.isArray(data) ? data : []);
        setDefaultCustomers(list);
        setCustomers(list);
      }
    } catch {
      setDefaultCustomers([]);
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    fetchDefaultCustomers();
  }, [fetchDefaultCustomers]);

  const searchCustomers = useCallback((q: string) => {
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);
    if (q.trim().length < 2) {
      setCustomers(defaultCustomers);
      return;
    }
    customerSearchTimer.current = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/customers?search=${encodeURIComponent(q.trim())}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers ?? (Array.isArray(data) ? data : []));
        }
      } catch {
        setCustomers([]);
      }
    }, 300);
  }, [defaultCustomers]);

  // Server-side customer search triggered when customerQuery changes
  useEffect(() => {
    searchCustomers(customerQuery);
  }, [customerQuery, searchCustomers]);

  // Customer picker (Select a client) UI state.
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [createCustomerPrefill, setCreateCustomerPrefill] = useState<{ name: string; phone?: string; email?: string }>({ name: '' });

  // Add a freshly-created customer to the local list AND select it as the
  // lead's customerId, and auto-fill the contact info from it.
  const addCustomerToList = useCallback((c: { id: string; name: string; phone: string; email?: string | null; address?: string | null; properties?: any[] }) => {
    setDefaultCustomers((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
    setCustomers((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
    setLeadForm((prev) => ({
      ...prev,
      customerId: c.id,
      name: c.name || prev.name,
      phone: c.phone || prev.phone,
      email: c.email || prev.email,
      address: c.address || prev.address,
    }));
  }, []);

  const handlePickCustomer = useCallback((c: { id: string; name: string; phone: string; email?: string | null; address?: string | null }) => {
    setLeadForm((prev) => ({
      ...prev,
      customerId: c.id,
      // Auto-fill contact info from the customer record (only overwrite empty
      // fields so the user doesn't lose manual edits to non-empty fields).
      name: prev.name || c.name,
      phone: prev.phone || c.phone,
      email: prev.email || c.email || '',
      address: prev.address || c.address || '',
    }));
  }, []);

  const openCreateCustomerDialog = useCallback((nameQuery: string) => {
    setCreateCustomerPrefill({
      name: nameQuery || leadForm.name,
      phone: leadForm.phone,
      email: leadForm.email,
    });
    setShowCreateCustomerDialog(true);
  }, [leadForm.name, leadForm.phone, leadForm.email]);

  const addServiceToCatalog = useCallback((svc: CatalogService) => {
    setServices((prev) =>
      prev.some((s) => s.id === svc.id) ? prev : [{ ...svc, duration: (svc as { duration?: number }).duration ?? 60 }, ...prev]
    );
  }, []);

  // Notes
  const [newNote, setNewNote] = useState('');

  // ============================================================
  // Tab state — List | Pipeline | Analytics
  // ============================================================

  // Top-level tab switcher for the Leads page. The "Leads" tab contains both
  // the table view and the drag-and-drop Kanban board (toggle at the top of
  // the tab). The Analytics tab shows derived stats from the lead list.
  const [activeTab, setActiveTab] = useState<'list' | 'archived' | 'analytics'>('list');

  // Larger lead set fetched on-demand for the Analytics tab so the
  // breakdowns reflect the whole tenant (not just the current page of 10).
  const [analyticsLeads, setAnalyticsLeads] = useState<Lead[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    let cancelled = false;
    setAnalyticsLoading(true);
    authFetch('/api/leads?limit=1000')
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((data) => {
        if (cancelled) return;
        setAnalyticsLeads(Array.isArray(data?.leads) ? data.leads : []);
      })
      .catch(() => {
        if (cancelled) return;
        setAnalyticsLeads([]);
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // ============================================================
  // Fetch leads (React Query)
  // ============================================================
  //
  // The main list fetch is now backed by the `useLeads` React Query hook.
  // RQ keys the query by `{ status, source, search, page, limit }`, so when
  // the user rapidly changes filters the in-flight request for the old
  // params is discarded and only the latest result is committed — fixing
  // the race where stale data could overwrite fresh data.
  //
  // `fetchLeads` is RQ's `refetch`, used at every post-mutation call site
  // (after create / update / delete / convert / status-change / note-add).
  // Soft-deleted leads (deletedAt != null) are still filtered client-side
  // for parity with the previous implementation.
  const { data: leadsData, isLoading: loading, error: rqError, refetch: fetchLeads } = useLeads({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    search: debouncedSearchQuery || undefined,
    page,
    limit: pageSize,
    // PAGINATION-ARCHIVE-1: when the user is on the Archived tab, request
    // only soft-deleted leads. On all other tabs we explicitly request
    // active-only leads (the default — but explicit is safer here so
    // tab switches always re-fetch with the right filter).
    archived: activeTab === 'archived' ? 'true' : 'false',
  });
  const error = rqError?.message ?? null;
  const leads = useMemo<Lead[]>(
    // When on the Archived tab, the API returns soft-deleted leads (deletedAt
    // != null) — DON'T filter them out. On other tabs the API already filters
    // them server-side; the local filter is a defensive double-filter.
    () => activeTab === 'archived'
      ? (leadsData?.leads ?? [])
      : (leadsData?.leads ?? []).filter((l: Lead) => !l.deletedAt),
    [leadsData, activeTab],
  );
  const totalLeads = leadsData?.pagination?.total ?? 0;
  const totalPages = leadsData?.pagination?.totalPages ?? 1;

  // ── Archive / Restore handlers (PAGINATION-ARCHIVE-1) ──────────────────
  // Both call the dedicated /api/leads/[id]/archive|restore endpoints and
  // invalidate the React Query cache via the same pattern as the other
  // mutations. After archive/restore, both the Active list AND the Archived
  // list need to refresh (the lead moves between them).
  const queryClient = useQueryClient();
  const [archiveActionLoadingId, setArchiveActionLoadingId] = useState<string | null>(null);

  const handleArchiveLead = useCallback(async (leadId: string) => {
    setArchiveActionLoadingId(leadId);
    try {
      const res = await authFetch(`/api/leads/${leadId}/archive`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to archive lead');
        return;
      }
      toast.success('Lead archived');
      // Invalidate both active + archived lead lists + dashboard.
      await queryClient.invalidateQueries({ queryKey: qk.leads.all });
      await queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
    } catch {
      toast.error('Network error archiving lead');
    } finally {
      setArchiveActionLoadingId(null);
    }
  }, [queryClient]);

  const handleRestoreLead = useCallback(async (leadId: string) => {
    setArchiveActionLoadingId(leadId);
    try {
      const res = await authFetch(`/api/leads/${leadId}/restore`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to restore lead');
        return;
      }
      toast.success('Lead restored');
      await queryClient.invalidateQueries({ queryKey: qk.leads.all });
      await queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
    } catch {
      toast.error('Network error restoring lead');
    } finally {
      setArchiveActionLoadingId(null);
    }
  }, [queryClient]);

  // ── Mutations (dependency-aware, auto-invalidate via getLeadInvalidations) ──
  // create/update/delete/status → leads.all + dashboard.all (+ detail)
  // convert → leads.all + dashboard.all + customers.all + jobs.all +
  //           jobs.calendar.all() + dispatch.all + customer/job details
  // note → leads.detail(id) ONLY (NO dashboard — notesJson not consumed by dashboard)
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();
  const changeLeadStatus = useChangeLeadStatus();
  const addLeadNote = useAddLeadNote();

  // Reset page when filters change (uses debounced search so a single
  // "stop typing" event resets page once, not once per keystroke)
  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, debouncedSearchQuery]);

  // ============================================================
  // Sorted leads (table view)
  // ============================================================

  const sortedLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'phone': valA = a.phone; valB = b.phone; break;
        case 'email': valA = (a.email || '').toLowerCase(); valB = (b.email || '').toLowerCase(); break;
        case 'source': valA = a.source; valB = b.source; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'value': valA = a.value; valB = b.value; break;
        case 'serviceType': valA = a.serviceType || ''; valB = b.serviceType || ''; break;
        case 'createdAt': valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
        default: valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leads, sortField, sortDirection]);

  // ============================================================
  // Analytics (Analytics tab) — derived from analyticsLeads
  // ============================================================

  const analyticsStats = useMemo(() => {
    // Prefer the larger analytics fetch; fall back to the current page if it
    // hasn't loaded yet so the cards aren't empty on first paint.
    const data = analyticsLeads.length > 0 ? analyticsLeads : leads;
    const total = analyticsLeads.length > 0 ? analyticsLeads.length : totalLeads;

    const byStatus = KANBAN_STATUSES.map((status) => {
      const inStatus = data.filter((l) => mapToKanbanStatus(l.status) === status);
      return {
        status,
        label: STATUS_CONFIG[status].label,
        color: STATUS_CONFIG[status].dotColor,
        count: inStatus.length,
        value: inStatus.reduce((sum, l) => sum + (l.value || 0), 0),
      };
    });

    const bySource = Object.entries(SOURCE_CONFIG)
      .map(([key, cfg]) => ({
        source: key,
        label: cfg.label,
        count: data.filter((l) => l.source === key).length,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    const wonCount = data.filter((l) => l.status === 'won').length;
    const lostCount = data.filter((l) => l.status === 'lost').length;
    const closedCount = wonCount + lostCount;
    const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;
    const pipelineValue = data
      .filter((l) => !['won', 'lost'].includes(l.status))
      .reduce((sum, l) => sum + (l.value || 0), 0);
    const wonValue = data
      .filter((l) => l.status === 'won')
      .reduce((sum, l) => sum + (l.value || 0), 0);
    const avgValue = data.length > 0 ? data.reduce((s, l) => s + (l.value || 0), 0) / data.length : 0;

    return {
      total,
      byStatus,
      bySource,
      wonCount,
      lostCount,
      closedCount,
      conversionRate,
      pipelineValue,
      wonValue,
      avgValue,
    };
  }, [analyticsLeads, leads, totalLeads]);

  // ============================================================
  // CRUD handlers
  // ============================================================

  const handleSaveLead = async () => {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    const isEditing = !!editingLead;
    setSaving(true);
    try {
      const url = isEditing ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = isEditing ? 'PUT' : 'POST';

      const computedValue = leadForm.lineItems.length > 0
        ? lineItemsSubtotal(leadForm.lineItems)
        : (parseFloat(leadForm.value) || 0);

      // Notes typed in the form are appended to the notesJson activity timeline
      // (create: seed the first note; edit: append to existing notes).
      let notesJsonToSend: string | undefined;
      if (leadForm.notes.trim()) {
        const existing = isEditing && editingLead ? parseNotes(editingLead.notesJson) : [];
        notesJsonToSend = JSON.stringify([
          ...existing,
          { text: leadForm.notes.trim(), createdAt: new Date().toISOString() },
        ]);
      }

      const body: Record<string, unknown> = {
        title: leadForm.title.trim() || null,
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim() || null,
        source: leadForm.source,
        status: isEditing && editingLead ? editingLead.status : 'new',
        priority: leadForm.priority,
        value: computedValue,
        description: leadForm.serviceDetails.trim() || null,
        address: leadForm.address.trim() || null,
        serviceType: leadForm.serviceType || null,
        serviceId: leadForm.serviceId || null,
        lineItemsJson: JSON.stringify(leadForm.lineItems),
        imagesJson: JSON.stringify(leadForm.images),
        assessmentImagesJson: JSON.stringify(leadForm.assessmentImages),
        customerId: leadForm.customerId || null,
      };
      if (notesJsonToSend !== undefined) {
        body.notesJson = notesJsonToSend;
      }

      // useCreateLead/useUpdateLead auto-invalidate qk.leads.all + qk.dashboard.all
      // (+ qk.leads.detail(id) for update). NO fetchLeads() needed.
      if (isEditing && editingLead) {
        await updateLead.mutateAsync({ id: editingLead.id, ...body } as any);
      } else {
        await createLead.mutateAsync(body as any);
      }

      toast.success(`Lead ${isEditing ? 'updated' : 'created'} successfully`);
      setFormMode('list');
      setEditingLead(null);
      setLeadForm({ ...EMPTY_FORM });
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : `Failed to ${isEditing ? 'update' : 'create'} lead`;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deletingLead) return;
    setDeletingLeadLoading(true);
    try {
      // Soft-delete: sets deletedAt = now(). Lead is hidden from active list
      // but kept in Lead History for audit/permanent-delete.
      // useDeleteLead auto-includes JSON.stringify + Content-Type.
      // Auto-invalidates qk.leads.all + qk.dashboard.all + qk.leads.detail(id).
      await deleteLead.mutateAsync({ id: deletingLead.id, softDelete: true });
      toast.success('Lead moved to History');
      setShowDeleteDialog(false);
      setDeletingLead(null);
      if (showDetailDialog && selectedLead?.id === deletingLead.id) {
        setShowDetailDialog(false);
        setSelectedLead(null);
      }
      if (formMode === 'detail' && selectedLead?.id === deletingLead.id) {
        setFormMode('list');
        setSelectedLead(null);
      }
      // No fetchLeads() needed — useDeleteLead auto-invalidates.
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete lead');
    } finally {
      setDeletingLeadLoading(false);
    }
  };

  const handleConvertToJob = async () => {
    if (!convertingLead) return;
    setConverting(true);
    try {
      // useConvertLead auto-invalidates: leads.all + dashboard.all +
      // customers.all + jobs.all + jobs.calendar.all() + dispatch.all +
      // customer/job details (from response). NO fetchLeads() needed.
      await convertLead.mutateAsync({ leadId: convertingLead.id });
      toast.success(`"${convertingLead.name}" converted to job successfully!`);
      setShowConvertDialog(false);
      setConvertingLead(null);
      if (showDetailDialog) {
        setShowDetailDialog(false);
        setSelectedLead(null);
      }
      if (formMode === 'detail') {
        setFormMode('list');
        setSelectedLead(null);
      }
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setStatusLoadingId(leadId);
    try {
      // useChangeLeadStatus auto-invalidates qk.leads.all + qk.dashboard.all +
      // qk.leads.detail(id). NO fetchLeads() needed.
      await changeLeadStatus.mutateAsync({ id: leadId, status: newStatus });
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
      throw err;
    } finally {
      setStatusLoadingId(null);
    }
  };

  // ============================================================
  // Drag-and-drop (Kanban board) — REMOVED
  // ============================================================
  // The inline Lead-status Kanban (DndContext + SortableContext + Droppable
  // columns) lived here. It was removed because the Deal-based
  // SalesPipelineView (sidebar → CRM → Pipeline) is now the single source
  // of truth for the sales pipeline. The Leads page is list (table) view
  // only — `handleStatusChange` is still used by the Lead detail dialog's
  // status picker to move a single Lead across stages.

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      title: lead.title || '',
      name: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      source: lead.source,
      serviceType: lead.serviceType || '',
      serviceId: lead.serviceId || '',
      address: lead.address || '',
      priority: lead.priority,
      value: lead.value ? String(lead.value) : '',
      serviceDetails: lead.description || '',
      notes: '',
      images: parseImages(lead.imagesJson),
      assessmentImages: parseImages(lead.assessmentImagesJson),
      customerId: lead.customerId || '',
      lineItems: parseLineItems(lead.lineItemsJson),
    });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
    setFormMode('form');
  };

  const openAddLead = () => {
    setEditingLead(null);
    setLeadForm({ ...EMPTY_FORM });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
    setFormMode('form');
  };

  // Reset the form fields + clear the cross-view "New Lead" signal.
  // The formMode initial state above already opens the form; this just ensures clean fields.
  useEffect(() => {
    if (pendingCreate === 'lead') {
      openAddLead();
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  const closeLeadForm = () => {
    setFormMode('list');
    setEditingLead(null);
    setLeadForm({ ...EMPTY_FORM });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
  };

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);
  };

  // Full-page Lead Detail (Jobber-style) — opened by clicking a kanban
  // card, table row, or "View" dropdown item. Replaces the legacy dialog
  // as the primary entry point while the dialog code below stays for
  // backward-compat (e.g. callers from outside the list view).
  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setFormMode('detail');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const closeLeadDetail = () => {
    setFormMode('list');
    setSelectedLead(null);
  };

  // ── Convert lead → open the New Job form pre-filled ────────────────
  // Instead of immediately calling /api/leads/convert (which creates a job
  // behind the scenes), we hand the lead's data to the Jobs view via the
  // global store and switch to it. The New Job form opens pre-filled so the
  // user can review/edit before saving. When the job is saved, the Jobs view
  // marks the lead as 'won' + links the new jobId (so lead tracking is kept).
  const openConvertDialog = (lead: Lead) => {
    setPendingJobPrefill({
      leadId: lead.id,
      title: lead.title || (lead.serviceType ? `${getServiceTypeLabel(lead.serviceType)} — ${lead.name}` : `Job for ${lead.name}`),
      customerId: lead.customerId || undefined,
      customerName: lead.name,
      customerPhone: lead.phone,
      customerEmail: lead.email,
      customerAddress: lead.address,
      serviceType: lead.serviceType,
      serviceId: lead.serviceId,
      priority: lead.priority,
      address: lead.address,
      value: lead.value,
      description: lead.description,
      lineItemsJson: lead.lineItemsJson,
      source: lead.source,
    });
    // Close the lead detail dialog/page if it's open so it doesn't sit on top.
    if (showDetailDialog) {
      setShowDetailDialog(false);
    }
    if (formMode === 'detail') {
      setFormMode('list');
      setSelectedLead(null);
    }
    setGlobalView('jobs');
  };

  const openDeleteDialog = (lead: Lead) => {
    setDeletingLead(lead);
    setShowDeleteDialog(true);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    try {
      const existingNotes = (() => {
        try { return JSON.parse(selectedLead.notesJson || '[]'); } catch { return []; }
      })();
      const updatedNotes = [...existingNotes, { text: newNote.trim(), createdAt: new Date().toISOString() }];
      // useAddLeadNote uses mutation='note' → invalidates qk.leads.detail(id) ONLY.
      // NO qk.leads.all, NO qk.dashboard.all (notesJson not consumed by dashboard/list).
      await addLeadNote.mutateAsync({
        id: selectedLead.id,
        notesJson: JSON.stringify(updatedNotes),
      });
      toast.success('Note added');
      setNewNote('');
      setSelectedLead({ ...selectedLead, notesJson: JSON.stringify(updatedNotes) });
      // No fetchLeads() needed — notes don't affect the list (list doesn't show notes)
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to add note');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ============================================================
  // Render helpers
  // ============================================================

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="size-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="size-3 ml-1" /> :
      <ChevronDown className="size-3 ml-1" />;
  };

  // renderSourceBadge + renderStatusBadge — extracted to
  // src/features/leads/components/lead-shared.tsx (Phase 4).

  // ============================================================
  // DataTable columns — List/Table view (P2-13)
  // ============================================================
  // The table tab is rendered via the shared <DataTable> component.
  // Each column mirrors the cell markup that previously lived inline in
  // `renderTableView`. Responsive hiding is preserved by setting the
  // `hidden <breakpoint>:table-cell` utility on BOTH `className` (cell)
  // and `headerClassName` (header) — DataTable's `hideOnMobile` only
  // toggles at the `sm` breakpoint, so we use explicit classes for the
  // `md`/`lg`-hidden columns.
  const leadColumns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      sortField: 'name',
      className: 'font-medium',
      render: (lead) => (
        <div className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full shrink-0 ${PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400'}`} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
            {lead.title && (
              <div className="text-xs text-emerald-700 dark:text-emerald-400 truncate">{lead.title}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortField: 'phone',
      className: 'hidden md:table-cell text-muted-foreground text-sm',
      headerClassName: 'hidden md:table-cell',
      render: (lead) => (
        <div className="flex items-center gap-1">
          <span>{lead.phone}</span>
          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
              title="WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="size-3" />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortField: 'email',
      className: 'hidden lg:table-cell text-muted-foreground text-sm',
      headerClassName: 'hidden lg:table-cell',
      render: (lead) => lead.email || '—',
    },
    {
      key: 'source',
      header: 'Source',
      sortField: 'source',
      render: (lead) => renderSourceBadge(lead.source),
    },
    {
      key: 'serviceType',
      header: 'Service',
      sortField: 'serviceType',
      hideOnMobile: true,
      className: 'text-sm text-muted-foreground',
      render: (lead) => (lead.serviceType ? getServiceTypeLabel(lead.serviceType) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      sortField: 'status',
      render: (lead) => renderStatusBadge(lead.status),
    },
    {
      key: 'value',
      header: 'Value',
      sortField: 'value',
      className: 'hidden md:table-cell font-bold text-sm text-emerald-700 dark:text-emerald-400',
      headerClassName: 'hidden md:table-cell',
      render: (lead) => (lead.value > 0 ? formatCompact(lead.value) : '—'),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortField: 'createdAt',
      className: 'hidden lg:table-cell text-sm text-muted-foreground',
      headerClassName: 'hidden lg:table-cell',
      render: (lead) => formatDateShort(lead.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[120px] text-right',
      render: (lead) => (
        // stopPropagation so the row's onRowClick (openLeadDetail) doesn't
        // fire when the user clicks Convert / the row-actions dropdown.
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!['won', 'lost'].includes(lead.status) && (
            <Button
              size="sm"
              className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={() => openConvertDialog(lead)}
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
              <DropdownMenuItem onClick={() => openLeadDetail(lead)}>
                <Eye className="size-3.5 mr-2" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditLead(lead)}>
                <Pencil className="size-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* PAGINATION-ARCHIVE-1: Archive (soft-delete) action — sends the
                  lead to the "Archived" tab. Reversible from the Archived tab. */}
              <DropdownMenuItem
                onClick={() => handleArchiveLead(lead.id)}
                disabled={archiveActionLoadingId === lead.id}
              >
                <ArchiveIcon className="size-3.5 mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(lead)}>
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // ============================================================
  // Render: Kanban board — REMOVED
  // ============================================================
  // The inline drag-and-drop Kanban (`renderKanbanBoard`,
  // `renderKanbanCard`, `renderKanbanSkeletons`) lived here. Removed
  // because the Deal-based SalesPipelineView (sidebar → CRM → Pipeline)
  // is now the single source of truth for the sales pipeline. The Leads
  // page renders the table view only — see renderTableView() below.

  // ============================================================
  // Render: Grid view — EXTRACTED (Phase 4)
  // ============================================================
  // renderGridView() lived here. Moved to
  // src/features/leads/components/lead-grid-view.tsx as <LeadGridView />.

  // ============================================================
  // Render: Table view
  // ============================================================

  const renderTableView = () => {
    // Custom empty state — DataTable's built-in empty state has no
    // "Add Lead" button, so we keep the original empty UI (with the CTA)
    // for the no-data case. Loading and error states are delegated to
    // <DataTable> (skeleton rows + ErrorState with retry).
    if (!loading && !error && sortedLeads.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Target className="size-12 mb-3 opacity-20" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openAddLead}>
            <Plus className="size-4 mr-1" /> Add Lead
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <DataTable
          columns={leadColumns}
          data={sortedLeads}
          rowKey={(lead) => lead.id}
          loading={loading}
          error={error}
          onRetry={fetchLeads}
          emptyMessage="No leads found"
          emptyIcon={Target}
          onRowClick={(lead) => openLeadDetail(lead)}
        />

        {/* Pagination */}
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalLeads}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          itemName="leads"
        />
      </div>
    );
  };

  // ============================================================
  // Render: Lead Form Page (full page, not a modal)
  // ============================================================

  // renderLeadFormPage() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Lead Detail Dialog
  // ============================================================

  // renderDetailDialog() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Convert to Job Dialog
  // ============================================================

  // renderConvertDialog() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Delete Confirmation Dialog
  // ============================================================

  // renderDeleteDialog() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Analytics tab (stat cards + bar chart)
  // ============================================================

  // renderAnalyticsView() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Render: Lead Detail Page (Jobber-style full page)
  // ============================================================
  // renderLeadDetailPage() — extracted to @/features/leads/components/ (Phase 4)

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6 w-full">
      {/* ─── Form page takes over when adding/editing a lead ───────── */}
      {formMode === 'form' ? (
        <LeadFormPage
          editingLead={editingLead}
          leadForm={leadForm}
          setLeadForm={setLeadForm}
          onSave={handleSaveLead}
          onCancel={closeLeadForm}
          saving={saving}
          customers={customers}
          customerQuery={customerQuery}
          setCustomerQuery={setCustomerQuery}
          customerPickerOpen={customerPickerOpen}
          setCustomerPickerOpen={setCustomerPickerOpen}
          onPickCustomer={handlePickCustomer}
          onOpenCreateCustomer={openCreateCustomerDialog}
          showCreateCustomerDialog={showCreateCustomerDialog}
          setShowCreateCustomerDialog={setShowCreateCustomerDialog}
          createCustomerPrefill={createCustomerPrefill}
          onCustomerCreated={addCustomerToList}
          services={services}
          onServiceCreated={addServiceToCatalog}
          symbol={symbol}
        />
      ) : formMode === 'detail' ? (
        <LeadDetailPage
          lead={selectedLead}
          onBack={closeLeadDetail}
          onConvert={openConvertDialog}
          onEdit={openEditLead}
          onDelete={openDeleteDialog}
          onStatusChange={handleStatusChange}
          onAddNote={handleAddNote}
          newNote={newNote}
          setNewNote={setNewNote}
          statusLoadingId={statusLoadingId}
          formatCompact={formatCompact}
          formatCurrency={formatCurrency}
          symbol={symbol}
        />
      ) : (
        <>
      {/* ─── Header (title row + search/New Lead row) ─────────────── */}
      <div className="flex flex-col gap-4">
        {/* Title row with count badge */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shadow-sm">
              <Target className="size-5 text-white" />
            </div>
            <div className="flex items-center gap-2.5">
              <div>
                <h2 className="text-xl font-bold leading-tight">Leads</h2>
                <p className="text-xs text-muted-foreground">Manage leads and track pipeline progress</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs h-6 px-2 shrink-0">
                {totalLeads}
              </Badge>
            </div>
          </div>
        </div>

        {/* Search + New Lead row (stacks vertically on mobile) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search leads by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 h-10 w-full sm:w-auto shrink-0"
            onClick={openAddLead}
          >
            <Plus className="size-4 mr-1" /> New Lead
          </Button>
        </div>
      </div>

      {/* ─── Tabs (List | Archived | Analytics) ───────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'list' | 'archived' | 'analytics')}
      >
        <div className="border-b border-border">
          <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto w-full sm:w-fit justify-start rounded-none">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <List className="size-3.5" /> Active
            </TabsTrigger>
            {/* PAGINATION-ARCHIVE-1: Archived tab — soft-deleted leads with Restore action */}
            <TabsTrigger
              value="archived"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <ArchiveIcon className="size-3.5" /> Archived
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-sm gap-1.5 transition-all duration-200"
            >
              <BarChart3 className="size-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── List Tab (Interactive Filter Chips + Grid/Table Toggle) ─────── */}
        <TabsContent value="list" className="mt-6 space-y-6 outline-none">
          {/* Interactive Status Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Leads', count: totalLeads, color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', activeColor: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900', icon: Target },
              { key: 'new', label: 'New', count: leads.filter(l => l.status === 'new').length, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50', activeColor: 'bg-blue-600 text-white border-blue-600', icon: Clock },
              { key: 'contacted', label: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50', activeColor: 'bg-purple-600 text-white border-purple-600', icon: UserCheck },
              { key: 'qualified', label: 'Qualified', count: leads.filter(l => l.status === 'qualified').length, color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50', activeColor: 'bg-amber-500 text-white border-amber-500', icon: CheckCircle2 },
              { key: 'won', label: 'Won / Converted', count: leads.filter(l => l.status === 'won').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50', activeColor: 'bg-emerald-600 text-white border-emerald-600', icon: CheckCircle2 },
              { key: 'lost', label: 'Lost', count: leads.filter(l => l.status === 'lost').length, color: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800', activeColor: 'bg-zinc-700 text-white border-zinc-700', icon: XCircle },
            ].map((chip) => {
              const Icon = chip.icon;
              const isActive = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(isActive ? 'all' : chip.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all min-h-[36px] shadow-2xs',
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

          {/* Filters Bar + Layout Switcher Toggle (Grid Cards vs Table) */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-44 h-9 text-xs">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => fetchLeads()}>
                <RefreshCw className="size-3.5 mr-1" /> Refresh
              </Button>
            </div>

            {/* Layout Toggle: Grid vs Table */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
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
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                  viewLayout === 'table' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Table View"
              >
                <List className="size-3.5" /> Table
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs gap-1.5 font-medium"
              onClick={() => setGlobalView('salesPipeline')}
              title="Open the Sales Pipeline board"
            >
              <BarChart3 className="size-3.5 text-emerald-600" /> Open Pipeline
            </Button>
          </div>

          {/* View Content — Grid Cards or Table View */}
          {viewLayout === 'grid' ? (
            <>
              <LeadGridView
                leads={sortedLeads}
                loading={loading}
                error={error}
                onRetry={fetchLeads}
                onAddLead={openAddLead}
                onLeadClick={openLeadDetail}
                onConvert={openConvertDialog}
                formatCompact={formatCompact}
              />
              {/* Pagination — same control as the table view for parity */}
              <PaginationBar
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalLeads}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                itemName="leads"
              />
            </>
          ) : renderTableView()}
        </TabsContent>

        {/* ─── Archived Tab (PAGINATION-ARCHIVE-1) ──────────────────────── */}
        {/* Soft-deleted leads with Restore action. Reuses the same useLeads
            query (with archived=true) and renders the same DataTable shape as
            the Active tab, but each row's dropdown only shows "View" and
            "Restore" (no Edit / Convert / Delete). */}
        <TabsContent value="archived" className="mt-6 space-y-6 outline-none">
          <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10">
            <CardContent className="p-4 flex items-start gap-3">
              <ArchiveIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-300">Archived Leads</p>
                <p className="text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                  Soft-deleted leads are kept here for audit. Restore a lead to move it back to the Active list. Archived leads are excluded from the dashboard totals.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Search bar (mirrors the Active tab; archived leads respect the
              same status/source/search filters for parity) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search archived leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => fetchLeads()}
            >
              <RefreshCw className="size-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading archived leads...</span>
              </CardContent>
            </Card>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchLeads} />
          ) : sortedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ArchiveIcon className="size-12 mb-3 opacity-20" />
              <p className="font-medium">No archived leads</p>
              <p className="text-sm mt-1">Archived leads will appear here for audit.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                ...leadColumns.slice(0, -1), // reuse all columns except the Actions column
                {
                  key: 'restore',
                  header: 'Actions',
                  headerClassName: 'w-[140px] text-right',
                  render: (lead) => (
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleRestoreLead(lead.id)}
                        disabled={archiveActionLoadingId === lead.id}
                      >
                        <RotateCcw className="size-3 mr-1" /> Restore
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={sortedLeads}
              rowKey={(lead) => lead.id}
              loading={loading}
              error={error}
              onRetry={fetchLeads}
              emptyMessage="No archived leads"
              emptyIcon={ArchiveIcon}
              onRowClick={(lead) => openLeadDetail(lead)}
            />
          )}

          {/* Pagination — same as the Active tab (the archived list uses the
              same page/limit state) */}
          {sortedLeads.length > 0 && (
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalLeads}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              itemName="archived leads"
            />
          )}
        </TabsContent>

        {/* ─── Analytics Tab (stat cards + charts) ──────────────── */}
        <TabsContent value="analytics" className="mt-6 outline-none">
          <LeadAnalyticsView
            stats={analyticsStats}
            loading={analyticsLoading}
            formatCompact={formatCompact}
            formatCurrency={formatCurrency}
            symbol={symbol}
          />
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ────────────────────────────────────────────── */}
      <LeadDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        lead={selectedLead}
        customers={customers}
        statusLoadingId={statusLoadingId}
        onStatusChange={handleStatusChange}
        onAddNote={handleAddNote}
        newNote={newNote}
        setNewNote={setNewNote}
        onNavigate={setGlobalView}
        onConvert={openConvertDialog}
        onEdit={openEditLead}
        onDelete={openDeleteDialog}
        formatCompact={formatCompact}
        symbol={symbol}
      />
      <LeadConvertDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        lead={convertingLead}
        converting={converting}
        onConfirm={handleConvertToJob}
        formatCompact={formatCompact}
      />
      <LeadDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        lead={deletingLead}
        deleting={deletingLeadLoading}
        onConfirm={handleDeleteLead}
      />
        </>
      )}
    </div>
  );
}

// ============================================================
// DnD helper components — REMOVED
// ============================================================
// `SortableLeadCard` and `DroppableStatusColumn` (the @dnd-kit wrappers
// used by the inline Lead-status Kanban) lived here. Removed together
// with `renderKanbanBoard` / `renderKanbanCard` / `renderKanbanSkeletons`
// above — the Deal-based SalesPipelineView (sidebar → CRM → Pipeline)
// is now the single source of truth for the sales pipeline.

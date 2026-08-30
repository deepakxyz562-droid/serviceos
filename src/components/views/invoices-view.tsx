'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Send,
  Download,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Copy,
  Receipt,
  Settings,
  Mail,
  MessageCircle,
  Bell,
  Loader2,
  CalendarClock,
  ShieldCheck,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';
import {
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useDuplicateInvoice,
  useChangeInvoiceStatus,
  useReopenInvoice,
} from '@/hooks/use-crm-data';
import { useQueryClient } from '@tanstack/react-query';
import { getInvoiceInvalidations } from '@/lib/invalidation-helpers';
import { useAppStore } from '@/store/app-store';
import { DataTable, type Column } from '@/components/ui/data-table';

// Phase 5A: invoice types + helpers + sub-components extracted to
// src/features/invoices/. The closures `renderInvoiceDetailPage` /
// `renderNewInvoicePage` and the inline Settings + Recurring Schedules
// dialogs now live in their own component files under
// src/features/invoices/components/.
import type {
  Customer,
  Invoice,
  InvoiceAction,
  InvoiceAutomationSettings,
  InvoiceFormData,
  InvoiceStatus,
  LineItem,
  RecurringSchedule,
  RecurringScheduleForm,
} from '@/features/invoices/types';
import {
  DEFAULT_INVOICE_SETTINGS,
  EMPTY_FORM,
  EMPTY_LINE_ITEM,
  EMPTY_RECURRING_FORM,
  calcSubtotal,
  calcTotal,
  formatShortDate,
  getStatusConfig,
  parseApiInvoice,
} from '@/features/invoices/utils/invoice-helpers';
import { renderStatusBadge } from '@/features/invoices/components/invoice-shared';
import { InvoiceDetailPage } from '@/features/invoices/components/invoice-detail-page';
import { InvoiceDetailDialog } from '@/features/invoices/components/invoice-detail-dialog';
import { NewInvoicePage } from '@/features/invoices/components/new-invoice-page';
import { InvoiceSettingsDialog } from '@/features/invoices/components/invoice-settings-dialog';
import { RecurringSchedulesDialog } from '@/features/invoices/components/recurring-schedules-dialog';

// ============================================================
// Component
// ============================================================

export function InvoicesView() {
  // Cross-view "New Invoice" create signal — when the sidebar's "+ Create"
  // dropdown or a dashboard quick action sets pendingCreate to 'invoice',
  // we open the create dialog and clear the signal so a refresh doesn't
  // re-open it.
  const pendingCreate = useAppStore((s) => s.pendingCreate);
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);

  // ── Cross-view "open entity detail" signal (Customer 360 → Invoices deep-link) ──
  // When the user clicks an Invoice row inside the Customer 360 detail panel
  // (crm-view.tsx), the signal carries the invoice id; we fetch it (or reuse
  // the local copy) and open the detail panel, then clear the signal so a
  // refresh doesn't re-open it.
  const pendingOpenEntity = useAppStore((s) => s.pendingOpenEntity);
  const setPendingOpenEntity = useAppStore((s) => s.setPendingOpenEntity);

  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Loading state
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Settings state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<InvoiceAutomationSettings>(DEFAULT_INVOICE_SETTINGS);

  // Recurring schedules state
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringActionLoading, setRecurringActionLoading] = useState<Record<string, boolean>>({});
  const [recurringForm, setRecurringForm] = useState<RecurringScheduleForm>(EMPTY_RECURRING_FORM());
  // When non-null, the recurring form dialog is in "edit" mode and will PUT to /api/recurring-invoices/[id]
  // instead of POSTing a new schedule to /api/recurring-invoices.
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);

  // Filter & search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [autoFilter, setAutoFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting is now handled by the shared <DataTable> (client-side, per-column
  // via `sortField` on each column config). The previous parent-level
  // `sortField`/`sortDirection` state + `handleSort`/`renderSortIcon` helpers
  // were removed during the P2-12 DataTable migration.

  // Dialogs
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  // When non-null, the create dialog is in "edit" mode and will PUT instead of POST.
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Full-page detail mode (Jobber-style) — when 'detail', the list is replaced
  // by `renderInvoiceDetailPage()` instead of the legacy small Dialog.
  const [formMode, setFormMode] = useState<'list' | 'detail' | 'create'>('list');

  // ── Mutations (dependency-aware, auto-invalidate via getInvoiceInvalidations) ──
  // create/duplicate → invoices.all ONLY (draft, no dashboard)
  // update/delete/status/mark_paid/reopen → invoices.all + dashboard.all + detail + customer detail
  // send/reminder/approve → invoices.all + detail (NO dashboard)
  //
  // NOTE: invoices-view uses local state for reads (NOT React Query). So the
  // qk.invoices.* invalidations are currently no-ops — the caller MUST keep
  // its existing setInvoices(prev => ...) local state updates. The dashboard
  // + customer detail invalidations DO work (those ARE in RQ).
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const duplicateInvoice = useDuplicateInvoice();
  const changeInvoiceStatus = useChangeInvoiceStatus();
  const reopenInvoice = useReopenInvoice();
  // useQueryClient for handleInvoiceAction's manual invalidation (complex per-channel
  // error handling can't use useCrmMutation — needs response body on !res.ok)
  const queryClient = useQueryClient();

  // Form
  const [form, setForm] = useState<InvoiceFormData>(EMPTY_FORM());

  // Currency from hook
  const { currency, format, symbol } = useCompanyCurrency();

  // ============================================================
  // Fetch data on mount
  // ============================================================

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    setInvoicesError(null);
    try {
      const res = await authFetch('/api/invoices');
      if (!res.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await res.json();
      const rawList: Record<string, unknown>[] = Array.isArray(data.invoices) ? data.invoices : [];
      setInvoices(rawList.map(parseApiInvoice));
    } catch (e) {
      setInvoices([]);
      setInvoicesError(e instanceof Error ? e.message : 'Failed to load invoices. Please try again.');
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const res = await authFetch('/api/customers');
      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }
      const data = await res.json();
      const list: Customer[] = data.customers ?? (Array.isArray(data) ? data : []);
      setCustomers(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, [fetchInvoices, fetchCustomers]);

  // ============================================================
  // Filtered & sorted invoices
  // ============================================================

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    // "Auto-generated only" filter: invoices created by the system
    // (job completion, deposit, recurring) — excludes manual 'standard'.
    if (autoFilter) {
      result = result.filter(
        (inv) =>
          inv.invoiceType === 'job_completion' ||
          inv.invoiceType === 'deposit' ||
          inv.invoiceType === 'recurring'
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          inv.customer.toLowerCase().includes(q)
      );
    }

    // Note: column sorting is delegated to the shared <DataTable> component
    // (client-side, per-column via `sortField`). The API already returns rows
    // ordered by createdAt desc, which serves as the default order.

    return result;
  }, [invoices, statusFilter, autoFilter, searchQuery]);

  // ============================================================
  // Stats
  // ============================================================

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
    const paidAmount = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const sentAmount = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.total, 0);
    const overdueAmount = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const draftCount = invoices.filter((i) => i.status === 'draft').length;
    return { totalRevenue, paidAmount, sentAmount, overdueAmount, draftCount };
  }, [invoices]);

  // ============================================================
  // Handlers
  // ============================================================

  const openCreateDialog = () => {
    setEditingInvoice(null);
    setForm(EMPTY_FORM());
    setFormMode('create');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const closeCreatePage = () => {
    setFormMode('list');
    setEditingInvoice(null);
  };

  // Consume the cross-view "New Invoice" signal — opens the dialog, then clears.
  useEffect(() => {
    if (pendingCreate === 'invoice') {
      openCreateDialog();
      setPendingCreate(null);
    }
  }, [pendingCreate]);

  // ── Consume the cross-view "open invoice detail" signal (Customer 360 deep-link) ──
  // Mirrors the pendingCreate consumer above. The signal is set by crm-view.tsx
  // when the user clicks an Invoice row inside the Customer 360 detail panel. We:
  //   1. clear it immediately (so a re-render doesn't re-trigger),
  //   2. reuse the local invoice if it's already in the list,
  //   3. otherwise fetch it via /api/invoices/[id] — that endpoint includes the
  //      full `customer` relation, so parseApiInvoice can derive customer name/
  //      phone/email without an extra round-trip.
  // If the fetch fails (404 / network), we log + don't open anything.
  useEffect(() => {
    if (!pendingOpenEntity || pendingOpenEntity.kind !== 'invoice') return;
    const targetId = pendingOpenEntity.id;
    setPendingOpenEntity(null);
    const local = invoices.find((inv) => inv.id === targetId);
    if (local) {
      openInvoiceDetail(local);
      return;
    }
    authFetch(`/api/invoices/${encodeURIComponent(targetId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        if (!raw || raw.error) {
          console.error('[invoices-view] pendingOpenEntity: invoice not found for id', targetId);
          return;
        }
        openInvoiceDetail(parseApiInvoice(raw as Record<string, unknown>));
      })
      .catch((err) => console.error('[invoices-view] pendingOpenEntity fetch failed:', err));
  }, [pendingOpenEntity]);

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setForm({
      customer: invoice.customerId || '',
      lineItems:
        invoice.lineItems.length > 0
          ? invoice.lineItems.map((li) => ({
              id: li.id || `li_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              description: li.description,
              quantity: li.quantity,
              rate: li.rate,
            }))
          : [EMPTY_LINE_ITEM()],
      taxPercent: invoice.taxPercent || 0,
      discount: invoice.discount || 0,
      dueDate: invoice.dueDate || '',
      notes: invoice.notes || '',
    });
    setShowDetailDialog(false);
    setFormMode('create');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const openDetailDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailDialog(true);
  };

  // ── Full-page detail (Jobber-style) ──────────────────────────────────
  // Replaces the legacy small Dialog for the primary "click row / View Details"
  // entry points. The legacy Dialog (openDetailDialog) is retained for any
  // other code paths that still call it.
  const openInvoiceDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormMode('detail');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  };

  const closeInvoiceDetail = () => {
    setFormMode('list');
    setSelectedInvoice(null);
  };

  const handleAddLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, EMPTY_LINE_ITEM()],
    }));
  };

  const handleRemoveLineItem = (id: string) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((li) => li.id !== id),
    }));
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li) =>
        li.id === id ? { ...li, [field]: value } : li
      ),
    }));
  };

  const handleSaveInvoice = async () => {
    if (!form.customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!form.dueDate) {
      toast.error('Please set a due date');
      return;
    }
    if (form.lineItems.length === 0 || form.lineItems.every((li) => !li.description.trim())) {
      toast.error('Add at least one line item with a description');
      return;
    }

    const isEditing = !!editingInvoice;
    setSaving(true);
    try {
      if (isEditing) {
        // ── Edit mode: PUT to /api/invoices/[id] ──
        const body = {
          customerId: form.customer,
          itemsJson: form.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            rate: li.rate,
          })),
          taxPercent: form.taxPercent || 0,
          discount: form.discount || 0,
          dueDate: form.dueDate,
          notes: form.notes || '',
        };
        // useUpdateInvoice auto-invalidates: invoices.all + dashboard.all +
        // invoices.detail(id) + customers.detail(customerId). NO manual fetchInvoices() needed.
        const data: any = await updateInvoice.mutateAsync({ id: editingInvoice!.id, ...body });
        const updated = parseApiInvoice(data as Record<string, unknown>);
        setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
        if (selectedInvoice?.id === updated.id) {
          setSelectedInvoice(updated);
        }
        setFormMode('list');
        setEditingInvoice(null);
        toast.success(`Invoice ${updated.number} updated`);
      } else {
        // ── Create mode: POST to /api/invoices ──
        const body = {
          customerId: form.customer,
          items: form.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            rate: li.rate,
          })),
          dueDate: form.dueDate,
          notes: form.notes || undefined,
          discount: form.discount || 0,
          taxPercent: form.taxPercent || 0,
          currency,
        };
        // useCreateInvoice auto-invalidates: invoices.all ONLY (draft, NO dashboard).
        const data: any = await createInvoice.mutateAsync(body);
        const newInvoice = parseApiInvoice((data as { invoice: Record<string, unknown> }).invoice);
        setInvoices((prev) => [newInvoice, ...prev]);
        setFormMode('list');
        toast.success('Invoice created successfully');
      }
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : (isEditing ? 'Failed to update invoice' : 'Failed to create invoice'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
    // Optimistic update — PRESERVED (per Phase 1.9d requirements)
    const prevInvoices = invoices;
    setInvoices((curr) =>
      curr.map((inv) => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv))
    );
    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }
    try {
      // useChangeInvoiceStatus auto-invalidates: invoices.all + dashboard.all +
      // invoices.detail(id) + customers.detail(customerId).
      const data: any = await changeInvoiceStatus.mutateAsync({ id: invoiceId, status: newStatus });
      const parsed = parseApiInvoice(data as Record<string, unknown>);
      setInvoices((curr) => curr.map((inv) => (inv.id === invoiceId ? parsed : inv)));
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(parsed);
      }
      toast.success(`Invoice marked as ${getStatusConfig(newStatus).label}`);
    } catch (e: any) {
      // Rollback — PRESERVED
      setInvoices(prevInvoices);
      if (selectedInvoice?.id === invoiceId) {
        const original = prevInvoices.find((i) => i.id === invoiceId) || null;
        setSelectedInvoice(original);
      }
      toast.error(e instanceof Error ? e.message : 'Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      // useDeleteInvoice auto-invalidates: invoices.all + dashboard.all +
      // invoices.detail(id) + customers.detail(customerId).
      await deleteInvoice.mutateAsync({ id: invoiceId });
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      if (selectedInvoice?.id === invoiceId) {
        setShowDetailDialog(false);
        setSelectedInvoice(null);
      }
      toast.success('Invoice deleted');
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete invoice');
    }
  };

  const handleDuplicateInvoice = async (invoice: Invoice) => {
    if (!invoice.customerId) {
      toast.error('Cannot duplicate — invoice has no customer');
      return;
    }
    setActionLoading((prev) => ({ ...prev, [`dup-${invoice.id}`]: true }));
    try {
      const body = {
        customerId: invoice.customerId,
        jobId: invoice.jobId || undefined,
        employeeId: invoice.employeeId || undefined,
        items: invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          rate: li.rate,
        })),
        dueDate: '',
        notes: invoice.notes || undefined,
        discount: invoice.discount || 0,
        taxPercent: invoice.taxPercent || 0,
        currency: invoice.currency || currency,
      };
      // useDuplicateInvoice auto-invalidates: invoices.all ONLY (draft, NO dashboard).
      const data: any = await duplicateInvoice.mutateAsync(body);
      const newInvoice = parseApiInvoice((data as { invoice: Record<string, unknown> }).invoice);
      setInvoices((prev) => [newInvoice, ...prev]);
      toast.success('Invoice duplicated');
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate invoice');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[`dup-${invoice.id}`];
        return next;
      });
    }
  };

  const handleInvoiceAction = async (invoiceId: string, action: InvoiceAction) => {
    setActionLoading((prev) => ({ ...prev, [`${invoiceId}-${action}`]: true }));
    try {
      const res = await authFetch(`/api/invoices/${invoiceId}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        // For send actions, build a helpful error message from the per-channel
        // results so the user knows WHY it failed (e.g. "Customer has no email
        // address" / "no email provider configured") instead of a generic toast.
        if (action === 'send' || action === 'send_email' || action === 'send_whatsapp') {
          const result = (data as { result?: { email?: { success: boolean; error?: string }; whatsapp?: { success: boolean; error?: string } } }).result;
          const emailErr = result?.email?.success === false ? result.email.error : null;
          const waErr = result?.whatsapp?.success === false ? result.whatsapp.error : null;
          // Translate the NO_EMAIL_PROVIDER_CONFIGURED sentinel into a
          // user-friendly message with guidance on where to fix it.
          const friendlyErrors = [emailErr, waErr].filter(Boolean).map((e) => {
            if (e === 'NO_EMAIL_PROVIDER_CONFIGURED') {
              return 'No email provider configured. Ask your platform admin to add an SMTP/Resend/SendGrid provider in SuperAdmin → Settings → Providers.';
            }
            return e;
          });
          const errors = friendlyErrors;
          const msg = errors.length > 0
            ? `Send failed: ${errors.join('; ')}`
            : (data as { error?: string }).error || `Action "${action}" failed`;
          throw new Error(msg);
        }
        const msg =
          (data as { error?: string }).error ||
          (data as { details?: string }).details ||
          `Action "${action}" failed`;
        throw new Error(msg);
      }

      // For send actions, show a contextual toast based on which channels
      // actually succeeded AND whether they were real or simulated.
      //
      // IMPORTANT: When no email/WhatsApp provider is configured, the backend
      // "simulates" the send (logs to console, returns success:true, simulated:true)
      // but no real message is delivered. We must NOT claim "Invoice sent via Email"
      // in that case — the user would check their inbox, find nothing, and conclude
      // the feature is broken. Instead, surface a clear "simulated" notice with
      // guidance to connect a real provider.
      if (action === 'send' || action === 'send_email' || action === 'send_whatsapp') {
        const result = (data as { result?: { email?: { success: boolean; simulated?: boolean }; whatsapp?: { success: boolean; simulated?: boolean } } }).result;
        const emailOk = result?.email?.success === true;
        const waOk = result?.whatsapp?.success === true;
        const emailSimulated = result?.email?.simulated === true;
        const waSimulated = result?.whatsapp?.simulated === true;

        const realChannels: string[] = [];
        const simulatedChannels: string[] = [];
        if (emailOk) (emailSimulated ? simulatedChannels : realChannels).push('Email');
        if (waOk) (waSimulated ? simulatedChannels : realChannels).push('WhatsApp');

        if (realChannels.length > 0 && simulatedChannels.length === 0) {
          // All channels really sent
          toast.success(`Invoice sent via ${realChannels.join(' + ')}`);
        } else if (realChannels.length > 0 && simulatedChannels.length > 0) {
          // Mixed: some real, some simulated
          toast.warning(`Invoice sent via ${realChannels.join(' + ')}. ${simulatedChannels.join(' + ')} simulated (no provider configured).`);
        } else if (simulatedChannels.length > 0) {
          // All channels simulated — no real provider configured
          toast.info(
            `Invoice marked as sent, but ${simulatedChannels.join(' + ')} delivery was simulated (no provider configured). Connect an email/WhatsApp provider in Settings → Providers to send real messages.`,
            { duration: 8000 },
          );
        } else {
          // Shouldn't reach here (data.success would be false), but guard anyway
          toast.error('Invoice send failed — no delivery channel succeeded');
        }
      } else {
        const successMsg: Record<Exclude<InvoiceAction, 'send' | 'send_email' | 'send_whatsapp'>, string> = {
          mark_paid: 'Invoice marked as paid',
          reminder: 'Payment reminder sent to customer',
          approve: 'Invoice approved and sent to customer',
        };
        // For the approve action, the backend also sends the invoice to the
        // customer (email + WhatsApp). Surface a "simulated" notice when no
        // real provider is configured, exactly like the send action above —
        // otherwise the user would think a real email went out.
        if (action === 'approve') {
          const sendResult = (data as { result?: { email?: { success: boolean; simulated?: boolean }; whatsapp?: { success: boolean; simulated?: boolean } } }).result;
          const emailOk = sendResult?.email?.success === true;
          const waOk = sendResult?.whatsapp?.success === true;
          const emailSimulated = sendResult?.email?.simulated === true;
          const waSimulated = sendResult?.whatsapp?.simulated === true;
          const realChannels: string[] = [];
          const simulatedChannels: string[] = [];
          if (emailOk) (emailSimulated ? simulatedChannels : realChannels).push('Email');
          if (waOk) (waSimulated ? simulatedChannels : realChannels).push('WhatsApp');

          if (simulatedChannels.length > 0 && realChannels.length === 0) {
            toast.info(
              `Invoice approved & marked as sent, but ${simulatedChannels.join(' + ')} delivery was simulated (no provider configured). Connect an email/WhatsApp provider in Settings → Providers to send real messages.`,
              { duration: 8000 },
            );
          } else if (simulatedChannels.length > 0) {
            toast.warning(`Invoice approved. Sent via ${realChannels.join(' + ')}. ${simulatedChannels.join(' + ')} simulated (no provider configured).`);
          } else {
            toast.success(successMsg.approve);
          }
        } else {
          toast.success(successMsg[action as Exclude<InvoiceAction, 'send' | 'send_email' | 'send_whatsapp' | 'approve'>]);
        }
      }

      // ── Dependency-aware invalidation (manual, because handleInvoiceAction's
      // complex per-channel error handling can't use useCrmMutation) ──────────
      // mark_paid → dashboard + customer detail; send/reminder/approve → no dashboard
      const invMutationType = action === 'mark_paid' ? 'mark_paid' : (action || 'send');
      for (const key of getInvoiceInvalidations({
        mutation: invMutationType,
        data,
        variables: { id: invoiceId, action },
      })) {
        queryClient.invalidateQueries({ queryKey: key });
      }

      // Reflect likely status changes locally
      if (action === 'mark_paid') {
        const nowIso = new Date().toISOString();
        setInvoices((curr) =>
          curr.map((inv) =>
            inv.id === invoiceId ? { ...inv, status: 'paid' as InvoiceStatus, paidAt: nowIso } : inv
          )
        );
        if (selectedInvoice?.id === invoiceId) {
          setSelectedInvoice((s) => (s ? { ...s, status: 'paid' as InvoiceStatus, paidAt: nowIso } : s));
        }
      } else if (action === 'send' || action === 'send_email' || action === 'send_whatsapp') {
        // Backend sendInvoice flips draft → sent on success
        setInvoices((curr) =>
          curr.map((inv) =>
            inv.id === invoiceId && inv.status === 'draft'
              ? { ...inv, status: 'sent' as InvoiceStatus }
              : inv
          )
        );
        if (selectedInvoice?.id === invoiceId && selectedInvoice.status === 'draft') {
          setSelectedInvoice((s) => (s ? { ...s, status: 'sent' as InvoiceStatus } : s));
        }
      } else if (action === 'approve') {
        // Backend approve flips pending_approval → sent and emails+WhatsApps customer
        const nowIso = new Date().toISOString();
        setInvoices((curr) =>
          curr.map((inv) =>
            inv.id === invoiceId
              ? { ...inv, status: 'sent' as InvoiceStatus, sentAt: nowIso }
              : inv
          )
        );
        if (selectedInvoice?.id === invoiceId) {
          setSelectedInvoice((s) =>
            s ? { ...s, status: 'sent' as InvoiceStatus, sentAt: nowIso } : s
          );
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Action "${action}" failed`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[`${invoiceId}-${action}`];
        return next;
      });
    }
  };

  // ============================================================
  // Settings handlers
  // ============================================================

  const openSettingsDialog = async () => {
    setShowSettingsDialog(true);
    setSettingsLoading(true);
    try {
      const res = await authFetch('/api/invoice-settings');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to load settings');
      }
      const s = (data as { settings?: Partial<InvoiceAutomationSettings> }).settings || {};
      setSettingsForm({ ...DEFAULT_INVOICE_SETTINGS, ...s });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load invoice settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await authFetch('/api/invoice-settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to save settings');
      }
      const s = (data as { settings?: Partial<InvoiceAutomationSettings> }).settings || {};
      setSettingsForm({ ...DEFAULT_INVOICE_SETTINGS, ...s });
      toast.success('Invoice automation settings saved');
      setShowSettingsDialog(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save invoice settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // ============================================================
  // Recurring schedules handlers
  // ============================================================

  const fetchRecurringSchedules = useCallback(async () => {
    setLoadingRecurring(true);
    try {
      const res = await authFetch('/api/recurring-invoices');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to load recurring schedules');
      }
      const list: RecurringSchedule[] = Array.isArray((data as { schedules?: RecurringSchedule[] }).schedules)
        ? (data as { schedules: RecurringSchedule[] }).schedules
        : [];
      setRecurringSchedules(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load recurring schedules');
      setRecurringSchedules([]);
    } finally {
      setLoadingRecurring(false);
    }
  }, []);

  const openRecurringDialog = () => {
    setShowRecurringDialog(true);
    setShowRecurringForm(false);
    fetchRecurringSchedules();
  };

  const handleCreateRecurring = async () => {
    if (!recurringForm.name.trim()) {
      toast.error('Schedule name is required');
      return;
    }
    if (!recurringForm.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (recurringForm.amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setRecurringSaving(true);
    try {
      const body = {
        name: recurringForm.name,
        customerId: recurringForm.customerId,
        frequency: recurringForm.frequency,
        dayOfMonth: recurringForm.dayOfMonth,
        amount: recurringForm.amount,
        taxPercent: recurringForm.taxPercent,
        currency: recurringForm.currency || 'USD',
        notes: recurringForm.notes || undefined,
        // Phase F: pass timezone (or null for legacy server-local behavior).
        timezone: recurringForm.timezone || null,
      };
      const res = await authFetch('/api/recurring-invoices', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to create recurring schedule');
      }
      const schedule = (data as { schedule: RecurringSchedule }).schedule;
      setRecurringSchedules((prev) => [schedule, ...prev]);
      setRecurringForm(EMPTY_RECURRING_FORM());
      setShowRecurringForm(false);
      toast.success('Recurring schedule created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create recurring schedule');
    } finally {
      setRecurringSaving(false);
    }
  };

  const handleRunRecurring = async (scheduleId: string) => {
    setRecurringActionLoading((prev) => ({ ...prev, [`run-${scheduleId}`]: true }));
    try {
      const res = await authFetch(`/api/recurring-invoices/${scheduleId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'run' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error((data as { error?: string }).error || 'Failed to run schedule');
      }
      const { number, total } = data as { success: boolean; invoiceId: string; number: string; total: number };
      toast.success(`Invoice ${number} generated (total: ${total})`);
      // Refresh schedules to reflect updated lastRunAt / executionCount
      fetchRecurringSchedules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to run schedule');
    } finally {
      setRecurringActionLoading((prev) => {
        const next = { ...prev };
        delete next[`run-${scheduleId}`];
        return next;
      });
    }
  };

  const handleDeactivateRecurring = async (scheduleId: string) => {
    setRecurringActionLoading((prev) => ({ ...prev, [`deactivate-${scheduleId}`]: true }));
    try {
      const res = await authFetch(`/api/recurring-invoices/${scheduleId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to deactivate schedule');
      }
      setRecurringSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      toast.success('Recurring schedule deactivated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to deactivate schedule');
    } finally {
      setRecurringActionLoading((prev) => {
        const next = { ...prev };
        delete next[`deactivate-${scheduleId}`];
        return next;
      });
    }
  };

  // ── Phase D3: Pause / Resume handlers ─────────────────────────────────
  // Pause sets active=false + pausedAt=now() (server route). Resume clears
  // pausedAt + recomputes nextRunAt from now (so we don't fire immediately for
  // a stale past nextRunAt). Both endpoints return { success, schedule } and
  // include the customer relation so we can update local state in-place without
  // a refetch. Mirrors the recurring-jobs pause/resume UI pattern.
  const handlePauseRecurring = async (scheduleId: string) => {
    setRecurringActionLoading((prev) => ({ ...prev, [`pause-${scheduleId}`]: true }));
    try {
      const res = await authFetch(`/api/recurring-invoices/${scheduleId}/pause`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to pause schedule');
      }
      const updated = (data as { schedule: RecurringSchedule }).schedule;
      // Update the specific row in-place; preserve any customer/job relation
      // the API doesn't return (the pause route only includes customer).
      setRecurringSchedules((prev) =>
        prev.map((s) => (s.id === scheduleId ? { ...s, ...updated } : s)),
      );
      toast.success('Schedule paused — no new invoices will be generated until resumed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to pause schedule');
    } finally {
      setRecurringActionLoading((prev) => {
        const next = { ...prev };
        delete next[`pause-${scheduleId}`];
        return next;
      });
    }
  };

  const handleResumeRecurring = async (scheduleId: string) => {
    setRecurringActionLoading((prev) => ({ ...prev, [`resume-${scheduleId}`]: true }));
    try {
      const res = await authFetch(`/api/recurring-invoices/${scheduleId}/resume`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to resume schedule');
      }
      const updated = (data as { schedule: RecurringSchedule }).schedule;
      setRecurringSchedules((prev) =>
        prev.map((s) => (s.id === scheduleId ? { ...s, ...updated } : s)),
      );
      const nextLabel = updated?.nextRunAt ? formatShortDate(updated.nextRunAt) : 'soon';
      toast.success(`Schedule resumed — next run ${nextLabel}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resume schedule');
    } finally {
      setRecurringActionLoading((prev) => {
        const next = { ...prev };
        delete next[`resume-${scheduleId}`];
        return next;
      });
    }
  };

  // Open the recurring form panel pre-filled with an existing schedule's values,
  // switching the dialog into "edit" mode. The same form panel is reused for
  // create — only the title, submit button label and submit handler differ.
  const openEditRecurring = (schedule: RecurringSchedule) => {
    setEditingRecurringId(schedule.id);
    setRecurringForm({
      name: schedule.name || '',
      customerId: schedule.customerId || '',
      frequency: schedule.frequency,
      dayOfMonth: schedule.dayOfMonth ?? 1,
      amount: schedule.amount ?? 0,
      taxPercent: schedule.taxPercent ?? 0,
      currency: schedule.currency || 'USD',
      notes: schedule.notes || '',
      // Phase F: populate the timezone field with the schedule's stored value
      // (null → '' so the Select falls back to its placeholder).
      timezone: schedule.timezone || '',
    });
    setShowRecurringForm(true);
  };

  // Close the recurring form panel and reset to create-mode defaults.
  const closeRecurringForm = () => {
    setShowRecurringForm(false);
    setEditingRecurringId(null);
    setRecurringForm(EMPTY_RECURRING_FORM());
  };

  // Toggle the form panel from the "Create Schedule" / "Cancel" header button.
  // Opening it always starts a fresh create (clears any prior edit selection);
  // closing it clears edit state too.
  const toggleRecurringForm = () => {
    if (showRecurringForm) {
      closeRecurringForm();
    } else {
      setEditingRecurringId(null);
      setRecurringForm(EMPTY_RECURRING_FORM());
      setShowRecurringForm(true);
    }
  };

  const handleUpdateRecurring = async () => {
    if (!editingRecurringId) return;
    if (!recurringForm.name.trim()) {
      toast.error('Schedule name is required');
      return;
    }
    if (!recurringForm.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (recurringForm.amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setRecurringSaving(true);
    try {
      const body = {
        name: recurringForm.name,
        customerId: recurringForm.customerId,
        frequency: recurringForm.frequency,
        dayOfMonth: recurringForm.dayOfMonth,
        amount: recurringForm.amount,
        taxPercent: recurringForm.taxPercent,
        currency: recurringForm.currency || 'USD',
        notes: recurringForm.notes || undefined,
        // Phase F: pass timezone (or null for legacy server-local behavior).
        // Server route treats `undefined` as "no change" and `null` as "clear";
        // we always send one of those two values so the field can be unset.
        timezone: recurringForm.timezone || null,
      };
      const res = await authFetch(`/api/recurring-invoices/${editingRecurringId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to update recurring schedule');
      }
      const updated = (data as { schedule: RecurringSchedule }).schedule;
      setRecurringSchedules((prev) =>
        prev.map((s) => (s.id === editingRecurringId ? { ...s, ...updated } : s))
      );
      setEditingRecurringId(null);
      setRecurringForm(EMPTY_RECURRING_FORM());
      setShowRecurringForm(false);
      toast.success('Schedule updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update recurring schedule');
    } finally {
      setRecurringSaving(false);
    }
  };

  // Form calculations
  const formSubtotal = calcSubtotal(form.lineItems);
  const formTax = formSubtotal * (form.taxPercent / 100);
  const formTotal = calcTotal(formSubtotal, form.taxPercent, form.discount);

  // ── Re-open Invoice (paid → sent) ──────────────────────────────────
  // Mirrors the reopen pattern in jobs-view. Lives at the parent level so
  // the InvoiceDetailPage component (which used to inline this handler as
  // a closure) can stay purely presentational.
  const handleReopenInvoice = async (inv: Invoice) => {
    setActionLoading((prev) => ({ ...prev, [`${inv.id}-reopen`]: true }));
    try {
      // useReopenInvoice auto-invalidates: invoices.all + dashboard.all +
      // invoices.detail(id) + customers.detail(customerId).
      const data: any = await reopenInvoice.mutateAsync({ id: inv.id });
      const parsed = parseApiInvoice(data as Record<string, unknown>);
      setInvoices((curr) => curr.map((i) => (i.id === parsed.id ? parsed : i)));
      setSelectedInvoice(parsed);
      toast.success(`Invoice ${parsed.number} re-opened`);
      // No void fetchInvoices() needed — useReopenInvoice auto-invalidates.
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to re-open invoice');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[`${inv.id}-reopen`];
        return next;
      });
    }
  };

  // ============================================================
  // DataTable columns (main invoices list)
  // ============================================================
  //
  // Each column maps 1:1 to the previous hand-rolled <Table> layout. Sorting
  // is delegated to <DataTable> via the `sortField` prop (client-side, using
  // extractText on the rendered cell). The previous parent-level
  // `sortField`/`sortDirection` + `handleSort`/`renderSortIcon` machinery was
  // removed during the P2-12 migration — the API returns rows ordered by
  // createdAt desc by default, which serves as the initial order until the
  // user clicks a sortable header.

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice #',
      sortField: 'invoiceNumber',
      render: (inv) => (
        <div className="flex items-center gap-2 flex-wrap font-medium text-sm">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            {inv.number}
          </div>
          {inv.invoiceType && inv.invoiceType !== 'standard' && (
            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${
              inv.invoiceType === 'job_completion'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : inv.invoiceType === 'deposit'
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {inv.invoiceType === 'job_completion'
                ? 'Auto · Job'
                : inv.invoiceType === 'deposit'
                ? 'Deposit'
                : 'Recurring'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortField: 'customer',
      render: (inv) => <span className="text-sm">{inv.customer}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortField: 'amount',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (inv) => <span className="block text-right text-sm font-medium">{format(inv.subtotal)}</span>,
    },
    {
      key: 'tax',
      header: 'Tax',
      className: 'text-right hidden md:table-cell',
      headerClassName: 'text-right hidden md:table-cell',
      render: (inv) => <span className="block text-right text-sm text-muted-foreground">{Math.round(inv.taxPercent)}%</span>,
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right hidden lg:table-cell',
      headerClassName: 'text-right hidden lg:table-cell',
      render: (inv) => <span className="block text-right text-sm font-semibold">{format(inv.total)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortField: 'status',
      render: (inv) => renderStatusBadge(inv.status),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortField: 'dueDate',
      className: 'hidden sm:table-cell',
      headerClassName: 'hidden sm:table-cell',
      render: (inv) => <span className="text-sm text-muted-foreground">{formatShortDate(inv.dueDate)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[60px]',
      render: (inv) => {
        const isBusy = Object.keys(actionLoading).some(
          (k) => k.startsWith(`${inv.id}-`) || k === `dup-${inv.id}`
        );
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                {isBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => openInvoiceDetail(inv)}>
                <Eye className="size-3.5 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(inv)}>
                <Pencil className="size-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Send</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!!actionLoading[`${inv.id}-send`]}
                onClick={() => handleInvoiceAction(inv.id, 'send')}
              >
                {actionLoading[`${inv.id}-send`] ? (
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                ) : (
                  <Send className="size-3.5 mr-2" />
                )}
                Send Invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!!actionLoading[`${inv.id}-send_email`]}
                onClick={() => handleInvoiceAction(inv.id, 'send_email')}
              >
                {actionLoading[`${inv.id}-send_email`] ? (
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                ) : (
                  <Mail className="size-3.5 mr-2" />
                )}
                Send Email Only
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!!actionLoading[`${inv.id}-send_whatsapp`]}
                onClick={() => handleInvoiceAction(inv.id, 'send_whatsapp')}
              >
                {actionLoading[`${inv.id}-send_whatsapp`] ? (
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="size-3.5 mr-2" />
                )}
                Send WhatsApp Only
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!!actionLoading[`${inv.id}-reminder`]}
                onClick={() => handleInvoiceAction(inv.id, 'reminder')}
              >
                {actionLoading[`${inv.id}-reminder`] ? (
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                ) : (
                  <Bell className="size-3.5 mr-2" />
                )}
                Send Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
              {inv.status === 'pending_approval' && (
                <DropdownMenuItem
                  disabled={!!actionLoading[`${inv.id}-approve`]}
                  onClick={() => handleInvoiceAction(inv.id, 'approve')}
                >
                  {actionLoading[`${inv.id}-approve`] ? (
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3.5 mr-2" />
                  )}
                  Approve Invoice
                </DropdownMenuItem>
              )}
              {inv.status !== 'paid' && (
                <DropdownMenuItem
                  disabled={!!actionLoading[`${inv.id}-mark_paid`]}
                  onClick={() => handleInvoiceAction(inv.id, 'mark_paid')}
                >
                  {actionLoading[`${inv.id}-mark_paid`] ? (
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-2" />
                  )}
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {inv.status === 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'sent')}>
                  <Send className="size-3.5 mr-2" /> Mark as Sent (no email)
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!!actionLoading[`dup-${inv.id}`]}
                onClick={() => handleDuplicateInvoice(inv)}
              >
                <Copy className="size-3.5 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(`/api/invoices/${inv.id}/print`, '_blank', 'noopener,noreferrer')
                }
              >
                <Download className="size-3.5 mr-2" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDeleteInvoice(inv.id)}
              >
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6 w-full">
      {formMode === 'create' ? (
        <NewInvoicePage
          editingInvoice={editingInvoice}
          form={form}
          setForm={setForm}
          onSave={handleSaveInvoice}
          onCancel={closeCreatePage}
          saving={saving}
          customers={customers}
          loadingCustomers={loadingCustomers}
          onAddLineItem={handleAddLineItem}
          onRemoveLineItem={handleRemoveLineItem}
          onLineItemChange={handleLineItemChange}
          formSubtotal={formSubtotal}
          formTax={formTax}
          formTotal={formTotal}
          format={format}
        />
      ) : formMode === 'detail' ? (
        <InvoiceDetailPage
          invoice={selectedInvoice}
          customers={customers}
          onBack={closeInvoiceDetail}
          onEdit={openEditDialog}
          onInvoiceAction={handleInvoiceAction}
          onReopen={handleReopenInvoice}
          actionLoading={actionLoading}
          format={format}
        />
      ) : (
        <>
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
                <Receipt className="size-5 text-white" />
              </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-sm text-muted-foreground">Create, track, and manage invoices</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openRecurringDialog}>
            <CalendarClock className="size-4 mr-1.5" /> Recurring Schedules
          </Button>
          <Button variant="outline" onClick={openSettingsDialog}>
            <Settings className="size-4 mr-1.5" /> Settings
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Revenue', value: format(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Pending', value: format(stats.sentAmount), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'Paid', value: format(stats.paidAmount), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { title: 'Overdue', value: format(stats.overdueAmount), icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2.5 rounded-xl`}>
                    <Icon className={`size-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Status Filter + Search ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs px-3">Draft</TabsTrigger>
            <TabsTrigger value="sent" className="text-xs px-3">Sent</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs px-3">Paid</TabsTrigger>
            <TabsTrigger value="pending_approval" className="text-xs px-3 text-amber-700 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800">Pending Approval</TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs px-3">Overdue</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          type="button"
          variant={autoFilter ? 'default' : 'outline'}
          size="sm"
          className="h-9 text-xs gap-1.5"
          onClick={() => setAutoFilter((v) => !v)}
          title="Filter to show only system-generated invoices (job completion, deposit, recurring)"
        >
          <Sparkles className="size-3.5" />
          Auto-generated
        </Button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices by # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ── Invoice Table ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={invoiceColumns}
            data={filteredInvoices}
            rowKey={(inv) => inv.id}
            loading={loadingInvoices}
            error={invoicesError}
            onRetry={fetchInvoices}
            emptyMessage="No invoices found"
            emptyIcon={FileText}
            onRowClick={openInvoiceDetail}
          />
        </CardContent>
      </Card>


      {/* ── Invoice Detail Dialog ────────────────────────────────── */}
      <InvoiceDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        invoice={selectedInvoice}
        onEdit={openEditDialog}
        onInvoiceAction={handleInvoiceAction}
        actionLoading={actionLoading}
        currency={currency}
        format={format}
      />

      {/* ── Invoice Automation Settings Dialog ───────────────────── */}
      <InvoiceSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        settingsLoading={settingsLoading}
        settingsSaving={settingsSaving}
        onSave={handleSaveSettings}
      />

      {/* ── Recurring Schedules Dialog ──────────────────────────────── */}
      <RecurringSchedulesDialog
        open={showRecurringDialog}
        onOpenChange={(open) => {
          setShowRecurringDialog(open);
          if (!open) {
            // Closing the outer dialog also resets any in-progress edit/create
            // so the next open starts from a clean slate.
            setShowRecurringForm(false);
            setEditingRecurringId(null);
            setRecurringForm(EMPTY_RECURRING_FORM());
          }
        }}
        recurringSchedules={recurringSchedules}
        loadingRecurring={loadingRecurring}
        showRecurringForm={showRecurringForm}
        onToggleForm={toggleRecurringForm}
        onCloseForm={closeRecurringForm}
        recurringForm={recurringForm}
        setRecurringForm={setRecurringForm}
        editingRecurringId={editingRecurringId}
        recurringSaving={recurringSaving}
        onSubmit={editingRecurringId ? handleUpdateRecurring : handleCreateRecurring}
        onEditSchedule={openEditRecurring}
        onRun={handleRunRecurring}
        onPause={handlePauseRecurring}
        onResume={handleResumeRecurring}
        onDeactivate={handleDeactivateRecurring}
        recurringActionLoading={recurringActionLoading}
        customers={customers}
        loadingCustomers={loadingCustomers}
      />
        </>
      )}
    </div>
  );
}

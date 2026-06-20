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
  X,
  PlusCircle,
  MinusCircle,
  Printer,
  Copy,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  Receipt,
  Settings,
  Mail,
  MessageCircle,
  Bell,
  Loader2,
  CalendarClock,
  ShieldCheck,
  Play,
  Power,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';

// ============================================================
// Types
// ============================================================

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'pending_approval';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

interface InvoiceCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface InvoiceJob {
  id: string;
  title?: string;
}

interface InvoiceEmployee {
  id: string;
  name?: string;
}

interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  paidAt?: string | null;
  notes: string;
  jobId?: string;
  jobTitle?: string;
  employeeId?: string;
  employeeName?: string;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseAmount?: number;
  itemsJson?: string;
  sentAt?: string | null;
  invoiceType?: 'standard' | 'deposit' | 'milestone' | 'recurring';
  milestoneIndex?: number | null;
  parentInvoiceId?: string | null;
  recurrenceId?: string | null;
  bookingId?: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface InvoiceFormData {
  customer: string;
  lineItems: LineItem[];
  taxPercent: number;
  discount: number;
  dueDate: string;
  notes: string;
}

type InvoiceAction = 'send' | 'send_email' | 'send_whatsapp' | 'mark_paid' | 'reminder' | 'approve';

interface InvoiceAutomationSettings {
  autoCreateOnJobComplete: boolean;
  autoSendEmail: boolean;
  autoSendWhatsApp: boolean;
  createDepositOnBooking: boolean;
  depositPercentage: number;
  enableRecurring: boolean;
  enableMilestones: boolean;
  defaultTaxPercent: number;
  creationMethod: 'manual' | 'automatic' | 'approval_required' | 'recurring';
  defaultDueDays: number;
}

// ============================================================
// Constants
// ============================================================

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: <FileText className="size-3" /> },
  sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Send className="size-3" /> },
  paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
  overdue: { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <AlertCircle className="size-3" /> },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: <X className="size-3" /> },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertCircle className="size-3" /> },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

const DEFAULT_INVOICE_SETTINGS: InvoiceAutomationSettings = {
  autoCreateOnJobComplete: false,
  autoSendEmail: false,
  autoSendWhatsApp: false,
  createDepositOnBooking: false,
  depositPercentage: 30,
  enableRecurring: false,
  enableMilestones: false,
  defaultTaxPercent: 0,
  creationMethod: 'manual',
  defaultDueDays: 15,
};

const EMPTY_LINE_ITEM = (): LineItem => ({
  id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  description: '',
  quantity: 1,
  rate: 0,
});

const EMPTY_FORM = (): InvoiceFormData => ({
  customer: '',
  lineItems: [EMPTY_LINE_ITEM()],
  taxPercent: 18,
  discount: 0,
  dueDate: '',
  notes: '',
});

type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface RecurringScheduleCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface RecurringScheduleJob {
  id: string;
  title?: string;
  jobNumber?: string;
}

interface RecurringSchedule {
  id: string;
  name: string;
  tenantId?: string;
  customerId?: string;
  jobId?: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number | null;
  amount: number;
  taxPercent?: number | null;
  currency?: string;
  itemsJson?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  lastInvoiceId?: string;
  active: boolean;
  executionCount: number;
  createdAt: string;
  customer?: RecurringScheduleCustomer | null;
  job?: RecurringScheduleJob | null;
}

interface RecurringScheduleForm {
  name: string;
  customerId: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  amount: number;
  taxPercent: number;
  currency: string;
  notes: string;
}

const EMPTY_RECURRING_FORM = (): RecurringScheduleForm => ({
  name: '',
  customerId: '',
  frequency: 'monthly',
  dayOfMonth: 1,
  amount: 0,
  taxPercent: 0,
  currency: 'USD',
  notes: '',
});

// ============================================================
// Helpers
// ============================================================

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

function calcTotal(subtotal: number, taxPercent: number, discount: number): number {
  const tax = subtotal * (taxPercent / 100);
  return subtotal + tax - discount;
}

/**
 * Parse a raw invoice object returned by the API into the local Invoice shape.
 * The API stores:
 *   - `number` (not invoiceNumber)
 *   - `amount` = subtotal
 *   - `tax` = absolute tax amount (not a percent)
 *   - `discount` = absolute discount amount
 *   - `total` = final total
 *   - `itemsJson` = JSON string of [{ description, quantity, rate }]
 *   - `customer`, `job`, `employee` as nested relation objects
 */
function parseApiInvoice(raw: Record<string, unknown>): Invoice {
  let lineItems: LineItem[] = [];
  const rawItems = raw.itemsJson;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        lineItems = parsed.map((it: Record<string, unknown>, idx: number) => ({
          id: (it.id as string) || `li_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          description: (it.description as string) || '',
          quantity: Number(it.quantity) || 0,
          rate: Number(it.rate) || 0,
        }));
      }
    } catch {
      /* ignore parse errors */
    }
  } else if (Array.isArray(rawItems)) {
    lineItems = rawItems.map((it: Record<string, unknown>, idx: number) => ({
      id: (it.id as string) || `li_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      description: (it.description as string) || '',
      quantity: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
    }));
  }

  const subtotal = Number(raw.amount) || 0;
  const taxAmount = Number(raw.tax) || 0;
  const discount = Number(raw.discount) || 0;
  const total = Number(raw.total) || 0;
  const taxPercent = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

  const customer = (raw.customer as InvoiceCustomer | null) || undefined;
  const job = (raw.job as InvoiceJob | null) || undefined;
  const employee = (raw.employee as InvoiceEmployee | null) || undefined;

  const dueDateRaw = raw.dueDate as string | null | undefined;
  const createdAtRaw = raw.createdAt as string | null | undefined;

  return {
    id: (raw.id as string) || '',
    number: (raw.number as string) || '',
    customerId: (raw.customerId as string) || (customer?.id as string) || '',
    customer: customer?.name || 'Unknown Customer',
    customerEmail: customer?.email || undefined,
    customerPhone: customer?.phone || undefined,
    lineItems,
    subtotal,
    taxPercent,
    taxAmount,
    discount,
    total,
    status: (raw.status as InvoiceStatus) || 'draft',
    dueDate: dueDateRaw ? String(dueDateRaw).split('T')[0] : '',
    createdAt: createdAtRaw ? String(createdAtRaw).split('T')[0] : '',
    paidAt: (raw.paidAt as string | null) || null,
    notes: (raw.notes as string) || '',
    jobId: (raw.jobId as string) || undefined,
    jobTitle: job?.title || undefined,
    employeeId: (raw.employeeId as string) || undefined,
    employeeName: employee?.name || undefined,
    currency: raw.currency as string | undefined,
    exchangeRate: raw.exchangeRate as number | undefined,
    baseCurrency: raw.baseCurrency as string | undefined,
    baseAmount: raw.baseAmount as number | undefined,
    itemsJson: typeof raw.itemsJson === 'string' ? raw.itemsJson : undefined,
    sentAt: (raw.sentAt as string | null) || null,
    invoiceType: (raw.invoiceType as Invoice['invoiceType']) || 'standard',
    milestoneIndex: (raw.milestoneIndex as number | null) ?? null,
    parentInvoiceId: (raw.parentInvoiceId as string | null) || null,
    recurrenceId: (raw.recurrenceId as string | null) || null,
    bookingId: (raw.bookingId as string | null) || null,
  };
}

// ============================================================
// Component
// ============================================================

export function InvoicesView() {
  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Loading state
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
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

  // Filter & search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form
  const [form, setForm] = useState<InvoiceFormData>(EMPTY_FORM());

  // Currency from hook
  const { currency, format, symbol } = useCompanyCurrency();

  // ============================================================
  // Fetch data on mount
  // ============================================================

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await authFetch('/api/invoices');
      if (!res.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await res.json();
      const rawList: Record<string, unknown>[] = Array.isArray(data.invoices) ? data.invoices : [];
      setInvoices(rawList.map(parseApiInvoice));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load invoices');
      setInvoices([]);
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
      const list: Customer[] = Array.isArray(data) ? data : [];
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          inv.customer.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'invoiceNumber': valA = a.number; valB = b.number; break;
        case 'customer': valA = a.customer.toLowerCase(); valB = b.customer.toLowerCase(); break;
        case 'total': valA = a.total; valB = b.total; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'dueDate': valA = a.dueDate; valB = b.dueDate; break;
        case 'createdAt': valA = a.createdAt; valB = b.createdAt; break;
        default: valA = a.createdAt; valB = b.createdAt;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, statusFilter, searchQuery, sortField, sortDirection]);

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="size-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' ? <ChevronUp className="size-3 ml-1" /> : <ChevronDown className="size-3 ml-1" />;
  };

  const openCreateDialog = () => {
    setForm(EMPTY_FORM());
    setShowCreateDialog(true);
  };

  const openDetailDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailDialog(true);
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

  const handleCreateInvoice = async () => {
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

    setSaving(true);
    try {
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
      const res = await authFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to create invoice');
      }
      const newInvoice = parseApiInvoice((data as { invoice: Record<string, unknown> }).invoice);
      setInvoices((prev) => [newInvoice, ...prev]);
      setShowCreateDialog(false);
      toast.success('Invoice created successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
    // Optimistic update
    const prevInvoices = invoices;
    setInvoices((curr) =>
      curr.map((inv) => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv))
    );
    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }
    try {
      const res = await authFetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to update invoice');
      }
      const parsed = parseApiInvoice(data as Record<string, unknown>);
      setInvoices((curr) => curr.map((inv) => (inv.id === invoiceId ? parsed : inv)));
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(parsed);
      }
      toast.success(`Invoice marked as ${getStatusConfig(newStatus).label}`);
    } catch (e) {
      // Rollback
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
      const res = await authFetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to delete invoice');
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      if (selectedInvoice?.id === invoiceId) {
        setShowDetailDialog(false);
        setSelectedInvoice(null);
      }
      toast.success('Invoice deleted');
    } catch (e) {
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
      const res = await authFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to duplicate invoice');
      }
      const newInvoice = parseApiInvoice((data as { invoice: Record<string, unknown> }).invoice);
      setInvoices((prev) => [newInvoice, ...prev]);
      toast.success('Invoice duplicated');
    } catch (e) {
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
        const msg =
          (data as { error?: string }).error ||
          (data as { details?: string }).details ||
          `Action "${action}" failed`;
        throw new Error(msg);
      }

      const successMsg: Record<InvoiceAction, string> = {
        send: 'Invoice sent via Email + WhatsApp',
        send_email: 'Invoice sent via Email',
        send_whatsapp: 'Invoice sent via WhatsApp',
        mark_paid: 'Invoice marked as paid',
        reminder: 'Payment reminder sent to customer',
        approve: 'Invoice approved and sent to customer',
      };
      toast.success(successMsg[action]);

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

  // Form calculations
  const formSubtotal = calcSubtotal(form.lineItems);
  const formTax = formSubtotal * (form.taxPercent / 100);
  const formTotal = calcTotal(formSubtotal, form.taxPercent, form.discount);

  // ============================================================
  // Render helpers
  // ============================================================

  const renderStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${config.bg} ${config.text} ${config.border}`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
      {loadingInvoices ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="size-12 mb-3 opacity-20" />
          <p className="font-medium">No invoices found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new invoice</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1" /> Create Invoice
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('invoiceNumber')}>
                      <span className="flex items-center">Invoice # {renderSortIcon('invoiceNumber')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('customer')}>
                      <span className="flex items-center">Customer {renderSortIcon('customer')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('total')}>
                      <span className="flex items-center justify-end">Amount {renderSortIcon('total')}</span>
                    </TableHead>
                    <TableHead className="text-right hidden md:table-cell">Tax</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Total</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <span className="flex items-center">Status {renderSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort('dueDate')}>
                      <span className="flex items-center">Due Date {renderSortIcon('dueDate')}</span>
                    </TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const isBusy = Object.keys(actionLoading).some(
                      (k) => k.startsWith(`${invoice.id}-`) || k === `dup-${invoice.id}`
                    );
                    return (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetailDialog(invoice)}
                      >
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-muted-foreground" />
                              {invoice.number}
                            </div>
                            {invoice.invoiceType && invoice.invoiceType !== 'standard' && (
                              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${
                                invoice.invoiceType === 'deposit'
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  : invoice.invoiceType === 'milestone'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {invoice.invoiceType === 'deposit'
                                  ? 'Deposit'
                                  : invoice.invoiceType === 'milestone'
                                  ? (invoice.milestoneIndex ? `Milestone ${invoice.milestoneIndex}` : 'Milestone')
                                  : 'Recurring'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{invoice.customer}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {format(invoice.subtotal)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                          {Math.round(invoice.taxPercent)}%
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold hidden lg:table-cell">
                          {format(invoice.total)}
                        </TableCell>
                        <TableCell>{renderStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                          {formatShortDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell>
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
                              <DropdownMenuItem onClick={() => openDetailDialog(invoice)}>
                                <Eye className="size-3.5 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">Send</DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={!!actionLoading[`${invoice.id}-send`]}
                                onClick={() => handleInvoiceAction(invoice.id, 'send')}
                              >
                                {actionLoading[`${invoice.id}-send`] ? (
                                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                                ) : (
                                  <Send className="size-3.5 mr-2" />
                                )}
                                Send Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!!actionLoading[`${invoice.id}-send_email`]}
                                onClick={() => handleInvoiceAction(invoice.id, 'send_email')}
                              >
                                {actionLoading[`${invoice.id}-send_email`] ? (
                                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                                ) : (
                                  <Mail className="size-3.5 mr-2" />
                                )}
                                Send Email Only
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!!actionLoading[`${invoice.id}-send_whatsapp`]}
                                onClick={() => handleInvoiceAction(invoice.id, 'send_whatsapp')}
                              >
                                {actionLoading[`${invoice.id}-send_whatsapp`] ? (
                                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                                ) : (
                                  <MessageCircle className="size-3.5 mr-2" />
                                )}
                                Send WhatsApp Only
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!!actionLoading[`${invoice.id}-reminder`]}
                                onClick={() => handleInvoiceAction(invoice.id, 'reminder')}
                              >
                                {actionLoading[`${invoice.id}-reminder`] ? (
                                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                                ) : (
                                  <Bell className="size-3.5 mr-2" />
                                )}
                                Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
                              {invoice.status === 'pending_approval' && (
                                <DropdownMenuItem
                                  disabled={!!actionLoading[`${invoice.id}-approve`]}
                                  onClick={() => handleInvoiceAction(invoice.id, 'approve')}
                                >
                                  {actionLoading[`${invoice.id}-approve`] ? (
                                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="size-3.5 mr-2" />
                                  )}
                                  Approve Invoice
                                </DropdownMenuItem>
                              )}
                              {invoice.status !== 'paid' && (
                                <DropdownMenuItem
                                  disabled={!!actionLoading[`${invoice.id}-mark_paid`]}
                                  onClick={() => handleInvoiceAction(invoice.id, 'mark_paid')}
                                >
                                  {actionLoading[`${invoice.id}-mark_paid`] ? (
                                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-3.5 mr-2" />
                                  )}
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {invoice.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
                                  <Send className="size-3.5 mr-2" /> Mark as Sent (no email)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={!!actionLoading[`dup-${invoice.id}`]}
                                onClick={() => handleDuplicateInvoice(invoice)}
                              >
                                <Copy className="size-3.5 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('PDF download coming soon')}>
                                <Download className="size-3.5 mr-2" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                              >
                                <Trash2 className="size-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Create Invoice Dialog ────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" />
              Create Invoice
            </DialogTitle>
            <DialogDescription>Fill in the details to create a new invoice</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-5 pr-3">
              {/* Customer & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={form.customer}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, customer: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingCustomers ? 'Loading customers...' : 'Select customer'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCustomers ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="size-3 animate-spin" /> Loading...
                        </div>
                      ) : customers.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No customers found
                        </div>
                      ) : (
                        customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.phone ? ` · ${c.phone}` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Line Items</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs"
                    onClick={handleAddLineItem}
                  >
                    <PlusCircle className="size-3.5 mr-1" /> Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Description</span>
                    <span>Qty</span>
                    <span>Rate ({symbol})</span>
                    <span className="text-right">Amount</span>
                    <span></span>
                  </div>

                  {form.lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 items-center"
                    >
                      <Input
                        placeholder="Service description"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={item.rate}
                        onChange={(e) => handleLineItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                      <div className="text-right text-sm font-medium pr-1">
                        {format(item.quantity * item.rate)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        disabled={form.lineItems.length <= 1}
                        onClick={() => handleRemoveLineItem(item.id)}
                      >
                        <MinusCircle className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{format(formSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={form.taxPercent}
                        onChange={(e) => setForm((prev) => ({ ...prev, taxPercent: parseFloat(e.target.value) || 0 }))}
                        className="h-7 w-16 text-sm text-right"
                      />
                      <span className="text-muted-foreground">%</span>
                      <span className="font-medium ml-2">{format(formTax)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={form.discount}
                        onChange={(e) => setForm((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                        className="h-7 w-20 text-sm text-right"
                      />
                      <span className="font-medium ml-2">-{format(form.discount)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-emerald-700">{format(formTotal)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Payment terms, thank you message, etc."
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateInvoice}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Creating...
                </>
              ) : (
                'Create Invoice'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Invoice Detail Dialog ────────────────────────────────── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="size-5 text-emerald-600" />
                  {selectedInvoice.number}
                </DialogTitle>
                <DialogDescription>
                  Invoice for {selectedInvoice.customer}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] pr-1">
                <div className="space-y-5 pr-3">
                  {/* Status & Date */}
                  <div className="flex items-center justify-between">
                    {renderStatusBadge(selectedInvoice.status)}
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Created: {formatShortDate(selectedInvoice.createdAt)}</p>
                      <p>Due: {formatShortDate(selectedInvoice.dueDate)}</p>
                      {selectedInvoice.paidAt && (
                        <p className="text-emerald-600">Paid: {formatShortDate(selectedInvoice.paidAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Linked Job */}
                  {selectedInvoice.jobTitle && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <span className="text-muted-foreground">Linked Job: </span>
                      <span className="font-medium">{selectedInvoice.jobTitle}</span>
                    </div>
                  )}

                  {/* Milestone Info */}
                  {selectedInvoice.invoiceType === 'milestone' && selectedInvoice.milestoneIndex && (
                    <div className="rounded-lg border bg-purple-50 border-purple-200 p-3 text-sm flex items-center gap-2">
                      <Receipt className="size-4 text-purple-600" />
                      <span className="font-medium text-purple-800">
                        Milestone {selectedInvoice.milestoneIndex} of 3 (
                        {selectedInvoice.milestoneIndex === 1
                          ? '30%'
                          : selectedInvoice.milestoneIndex === 2
                          ? '40%'
                          : '30%'}
                        )
                      </span>
                    </div>
                  )}

                  {/* Assigned Employee */}
                  {selectedInvoice.employeeName && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <span className="text-muted-foreground">Assigned to: </span>
                      <span className="font-medium">{selectedInvoice.employeeName}</span>
                    </div>
                  )}

                  {/* Customer contact */}
                  {(selectedInvoice.customerEmail || selectedInvoice.customerPhone) && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                      {selectedInvoice.customerEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="size-3.5 text-muted-foreground" />
                          <span>{selectedInvoice.customerEmail}</span>
                        </div>
                      )}
                      {selectedInvoice.customerPhone && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="size-3.5 text-muted-foreground" />
                          <span>{selectedInvoice.customerPhone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Currency Info */}
                  {selectedInvoice.currency && selectedInvoice.currency !== currency && (
                    <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 text-sm">
                      <div className="flex items-center gap-2 font-medium text-amber-800">
                        <Receipt className="size-4" />
                        Currency Info
                      </div>
                      <p className="mt-1 text-amber-700">
                        Invoice currency: {selectedInvoice.currency} · Displayed in: {currency}
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Line Items */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Rate</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.lineItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-sm py-3 text-center text-muted-foreground">
                                No line items
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedInvoice.lineItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-sm py-2">{item.description}</TableCell>
                                <TableCell className="text-sm py-2 text-right">{item.quantity}</TableCell>
                                <TableCell className="text-sm py-2 text-right">{format(item.rate)}</TableCell>
                                <TableCell className="text-sm py-2 text-right font-medium">
                                  {format(item.quantity * item.rate)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{format(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({Math.round(selectedInvoice.taxPercent)}%)</span>
                        <span>{format(selectedInvoice.taxAmount)}</span>
                      </div>
                      {selectedInvoice.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span>-{format(selectedInvoice.discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-emerald-700">{format(selectedInvoice.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedInvoice.notes}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-wrap flex-1">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={
                      selectedInvoice.status === 'paid' ||
                      !!actionLoading[`${selectedInvoice.id}-send`]
                    }
                    onClick={() => handleInvoiceAction(selectedInvoice.id, 'send')}
                  >
                    {actionLoading[`${selectedInvoice.id}-send`] ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="size-4 mr-1.5" />
                    )}
                    Send
                  </Button>
                  {selectedInvoice.status === 'pending_approval' && (
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={!!actionLoading[`${selectedInvoice.id}-approve`]}
                      onClick={() => handleInvoiceAction(selectedInvoice.id, 'approve')}
                    >
                      {actionLoading[`${selectedInvoice.id}-approve`] ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-4 mr-1.5" />
                      )}
                      Approve & Send
                    </Button>
                  )}
                  {selectedInvoice.status !== 'paid' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!!actionLoading[`${selectedInvoice.id}-mark_paid`]}
                      onClick={() => handleInvoiceAction(selectedInvoice.id, 'mark_paid')}
                    >
                      {actionLoading[`${selectedInvoice.id}-mark_paid`] ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4 mr-1.5" />
                      )}
                      Mark as Paid
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={!!actionLoading[`${selectedInvoice.id}-reminder`]}
                    onClick={() => handleInvoiceAction(selectedInvoice.id, 'reminder')}
                  >
                    {actionLoading[`${selectedInvoice.id}-reminder`] ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <Bell className="size-4 mr-1.5" />
                    )}
                    Remind
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => toast.info('PDF download coming soon')}
                  >
                    <Download className="size-4 mr-1.5" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.info('Print preview coming soon')}
                  >
                    <Printer className="size-4 mr-1.5" /> Print
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Invoice Automation Settings Dialog ───────────────────── */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5 text-emerald-600" />
              Invoice Automation Settings
            </DialogTitle>
            <DialogDescription>
              Configure how invoices are created and delivered for your workspace
            </DialogDescription>
          </DialogHeader>

          {settingsLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-[65vh] pr-1">
              <div className="space-y-5 pr-3">
                {/* Creation Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Invoice Creation Method</Label>
                  <RadioGroup
                    value={settingsForm.creationMethod}
                    onValueChange={(val) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        creationMethod: val as InvoiceAutomationSettings['creationMethod'],
                      }))
                    }
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                  >
                    {[
                      { value: 'manual', label: 'Manual' },
                      { value: 'automatic', label: 'Automatic' },
                      { value: 'approval_required', label: 'Approval Required' },
                      { value: 'recurring', label: 'Recurring' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        htmlFor={`rm-${opt.value}`}
                        className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/40 text-sm"
                      >
                        <RadioGroupItem id={`rm-${opt.value}`} value={opt.value} />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Toggle switches */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Auto Create on Job Completion</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automatically generate an invoice when a job is marked complete
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.autoCreateOnJobComplete}
                      onCheckedChange={(v) =>
                        setSettingsForm((prev) => ({ ...prev, autoCreateOnJobComplete: v }))
                      }
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Auto Send Invoice Email</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Email new invoices to customers automatically
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.autoSendEmail}
                      onCheckedChange={(v) =>
                        setSettingsForm((prev) => ({ ...prev, autoSendEmail: v }))
                      }
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Auto Send WhatsApp Invoice</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        WhatsApp new invoices to customers automatically
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.autoSendWhatsApp}
                      onCheckedChange={(v) =>
                        setSettingsForm((prev) => ({ ...prev, autoSendWhatsApp: v }))
                      }
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Create Deposit Invoice on Booking</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Generate a deposit invoice when a booking is confirmed
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.createDepositOnBooking}
                      onCheckedChange={(v) =>
                        setSettingsForm((prev) => ({ ...prev, createDepositOnBooking: v }))
                      }
                    />
                  </div>

                  {settingsForm.createDepositOnBooking && (
                    <div className="ml-1 flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
                      <Label className="text-sm">Deposit Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={settingsForm.depositPercentage}
                          onChange={(e) =>
                            setSettingsForm((prev) => ({
                              ...prev,
                              depositPercentage: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="h-8 w-20 text-sm text-right"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Enable Recurring Invoices</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Allow recurring invoice schedules (AMC / subscriptions)
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.enableRecurring}
                      onCheckedChange={(v) =>
                        setSettingsForm((prev) => ({ ...prev, enableRecurring: v }))
                      }
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">Enable Milestone Invoicing (30%/40%/30%)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Creates milestone 1 (30%) when a job starts, milestone 3 (30%) when a job completes. Milestone 2 (40% at 50% progress) is created manually from the invoice row menu.
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.enableMilestones}
                      onCheckedChange={(v) =>
                        setSettingsForm((prev) => ({ ...prev, enableMilestones: v }))
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Numeric defaults */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Default Tax %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={settingsForm.defaultTaxPercent}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            defaultTaxPercent: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-9 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Default Due Days</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={settingsForm.defaultDueDays}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            defaultDueDays: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="h-9 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
              disabled={settingsSaving || settingsLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveSettings}
              disabled={settingsSaving || settingsLoading}
            >
              {settingsSaving ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Recurring Schedules Dialog ──────────────────────────────── */}
      <Dialog open={showRecurringDialog} onOpenChange={setShowRecurringDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-emerald-600" />
              Recurring Invoice Schedules
            </DialogTitle>
            <DialogDescription>
              Recurring invoice schedules automatically generate and send invoices on a schedule (e.g. monthly AMC, subscriptions, maintenance contracts). A cron endpoint at /api/cron/recurring-invoices processes due schedules.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {recurringSchedules.length} schedule{recurringSchedules.length === 1 ? '' : 's'} · {recurringSchedules.filter((s) => s.active).length} active
            </p>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowRecurringForm((v) => !v)}
            >
              <Plus className="size-3.5 mr-1" /> {showRecurringForm ? 'Cancel' : 'Create Schedule'}
            </Button>
          </div>

          {showRecurringForm && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Schedule Name *</Label>
                  <Input
                    placeholder="e.g., Monthly AMC - Server Maintenance"
                    value={recurringForm.name}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer *</Label>
                  <Select
                    value={recurringForm.customerId}
                    onValueChange={(val) => setRecurringForm((prev) => ({ ...prev, customerId: val }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={loadingCustomers ? 'Loading...' : 'Select customer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCustomers ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="size-3 animate-spin" /> Loading...
                        </div>
                      ) : customers.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No customers found</div>
                      ) : (
                        customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.phone ? ` · ${c.phone}` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select
                    value={recurringForm.frequency}
                    onValueChange={(val) => setRecurringForm((prev) => ({ ...prev, frequency: val as RecurringFrequency }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {recurringForm.frequency === 'weekly' ? 'Day of Week (0=Sun, 6=Sat)' : 'Day of Month (1-31)'}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={recurringForm.frequency === 'weekly' ? 6 : 31}
                    value={recurringForm.dayOfMonth}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, dayOfMonth: parseInt(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount *</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={recurringForm.amount}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tax %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={recurringForm.taxPercent}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, taxPercent: parseFloat(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Currency</Label>
                  <Input
                    placeholder="USD"
                    value={recurringForm.currency}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, currency: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    placeholder="Optional notes for generated invoices"
                    value={recurringForm.notes}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRecurringForm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={recurringSaving}
                  onClick={handleCreateRecurring}
                >
                  {recurringSaving ? (
                    <><Loader2 className="size-3.5 mr-1 animate-spin" /> Saving...</>
                  ) : (
                    'Create Schedule'
                  )}
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="max-h-[50vh] pr-1">
            {loadingRecurring ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : recurringSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarClock className="size-10 mb-3 opacity-20" />
                <p className="font-medium">No recurring schedules yet</p>
                <p className="text-sm mt-1">Create a schedule to automate recurring invoices</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2">
                {recurringSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">{schedule.name}</h4>
                            <Badge variant="outline" className={`text-[9px] h-4 ${schedule.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                              {schedule.active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200 capitalize">
                              {schedule.frequency}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {schedule.customer?.name || '—'}
                            {schedule.job?.jobNumber ? ` · Job ${schedule.job.jobNumber}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {schedule.currency || 'USD'} {Number(schedule.amount).toFixed(2)}
                          </p>
                          {schedule.taxPercent ? (
                            <p className="text-[10px] text-muted-foreground">+{schedule.taxPercent}% tax</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span>Next: {schedule.nextRunAt ? formatShortDate(schedule.nextRunAt) : '—'}</span>
                          <span>Last: {schedule.lastRunAt ? formatShortDate(schedule.lastRunAt) : '—'}</span>
                          <span>Runs: {schedule.executionCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!!recurringActionLoading[`run-${schedule.id}`] || !schedule.active}
                            onClick={() => handleRunRecurring(schedule.id)}
                          >
                            {recurringActionLoading[`run-${schedule.id}`] ? (
                              <Loader2 className="size-3 mr-1 animate-spin" />
                            ) : (
                              <Play className="size-3 mr-1" />
                            )}
                            Run Now
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={!!recurringActionLoading[`deactivate-${schedule.id}`] || !schedule.active}
                            onClick={() => handleDeactivateRecurring(schedule.id)}
                          >
                            {recurringActionLoading[`deactivate-${schedule.id}`] ? (
                              <Loader2 className="size-3 mr-1 animate-spin" />
                            ) : (
                              <Power className="size-3 mr-1" />
                            )}
                            Deactivate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

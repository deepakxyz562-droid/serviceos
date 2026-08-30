'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Plus, Search, Send, MoreHorizontal, DollarSign,
  Clock, CheckCircle2, XCircle, Eye, Trash2,
  ArrowUpDown, ChevronUp, ChevronDown,
  Calculator, Mail, Copy,
  Edit3, Loader2, Receipt,
  Sparkles, Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';
import { useFeatureAccess } from '@/hooks/use-tenant-plan';
import { openUpgradeModal } from '@/components/layout/upgrade-modal';
import {
  AiQuoteGeneratorDialog,
  type AiGeneratedQuote,
} from '@/components/quotes/ai-quote-generator-dialog';
import { useAppStore } from '@/store/app-store';

// ── Phase 5B extraction ─────────────────────────────────────────────────────
// Types, helpers, EmailPreview, NewQuotePage and QuoteDetailPage were
// extracted to src/features/quotes/* and are re-imported here. The parent
// QuotesView component owns all state + handlers and threads them through
// as props (mirrors the Phase 5A invoices-view extraction pattern).
import type {
  Customer,
  Quote,
  QuoteFormData,
  QuoteServiceItem,
  QuoteAddOn,
  QuoteStatus,
} from '@/features/quotes/types';
import {
  STATUS_CONFIG,
  MOCK_SERVICE_CATALOG,
  EMPTY_SERVICE_ITEM,
  EMPTY_ADD_ON,
  EMPTY_FORM,
  formatShortDate,
  calcSummary,
  normalizeQuote,
} from '@/features/quotes/utils/quote-helpers';
import { renderStatusBadge } from '@/features/quotes/components/quote-shared';
import { EmailPreview } from '@/features/quotes/components/email-preview';
import { NewQuotePage } from '@/features/quotes/components/new-quote-page';
import { QuoteDetailPage } from '@/features/quotes/components/quote-detail-page';

// ============================================================
// Main Component
// ============================================================

export function QuotesView() {
  // ── Cross-view "open entity detail" signal (Customer 360 → Quotes deep-link) ──
  // When the user clicks a Quote row inside the Customer 360 detail panel
  // (crm-view.tsx), the signal carries the quote id; we fetch it (or reuse the
  // local copy) and open the detail panel, then clear the signal so a refresh
  // doesn't re-open it.
  const pendingOpenEntity = useAppStore((s) => s.pendingOpenEntity);
  const setPendingOpenEntity = useAppStore((s) => s.setPendingOpenEntity);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'list' | 'detail' | 'create'>('list');

  const [form, setForm] = useState<QuoteFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  // ── Plan gating: AI Quote Generator requires Professional (growth) tier ──
  const aiQuoteAccess = useFeatureAccess('ai_quote_generator');
  const aiQuoteLocked = !aiQuoteAccess.enabled && !aiQuoteAccess.loading;

  // ── Currency from hook ───────────────────────────────────
  const { currency, format, formatCompact, symbol } = useCompanyCurrency();

  // ── Fetch real customers + quotes on mount ────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [customersRes, quotesRes, meRes] = await Promise.all([
          authFetch('/api/customers'),
          authFetch('/api/quotes'),
          authFetch('/api/auth/me'),
        ]);

        if (cancelled) return;

        let customersList: Customer[] = [];
        if (customersRes.ok) {
          const data = await customersRes.json();
          customersList = data.customers ?? (Array.isArray(data) ? data : []);
        } else {
          toast.error('Failed to load customers');
        }

        if (quotesRes.ok) {
          const data = await quotesRes.json();
          if (Array.isArray(data)) {
            setQuotes(data.map((q: any) => normalizeQuote(q, customersList)));
          }
        } else {
          toast.error('Failed to load quotes');
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          setTenantId(meData?.user?.tenantId || null);
        }

        setCustomers(customersList);
      } catch {
        if (!cancelled) toast.error('Network error loading quotes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ============================================================
  // Filtered & sorted quotes
  // ============================================================

  const filteredQuotes = useMemo(() => {
    let result = [...quotes];
    if (statusFilter !== 'all') {
      result = result.filter((q) => q.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (qt) => qt.title.toLowerCase().includes(q) || qt.customerName.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortField) {
        case 'title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
        case 'customer': valA = a.customerName.toLowerCase(); valB = b.customerName.toLowerCase(); break;
        case 'total': valA = a.total; valB = b.total; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'validUntil': valA = a.validUntil; valB = b.validUntil; break;
        case 'createdAt': valA = a.createdAt; valB = b.createdAt; break;
        default: valA = a.createdAt; valB = b.createdAt;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [quotes, statusFilter, searchQuery, sortField, sortDirection]);

  // ============================================================
  // Stats
  // ============================================================

  const stats = useMemo(() => {
    const totalValue = quotes.reduce((s, q) => s + q.total, 0);
    const acceptedValue = quotes.filter((q) => q.status === 'accepted').reduce((s, q) => s + q.total, 0);
    const sentValue = quotes.filter((q) => q.status === 'sent').reduce((s, q) => s + q.total, 0);
    const draftCount = quotes.filter((q) => q.status === 'draft').length;
    const acceptanceRate = quotes.length > 0
      ? Math.round((quotes.filter((q) => q.status === 'accepted').length / quotes.length) * 100)
      : 0;
    return { totalValue, acceptedValue, sentValue, draftCount, acceptanceRate };
  }, [quotes]);

  // ============================================================
  // Form calculations
  // ============================================================

  const formSummary = useMemo(() =>
    calcSummary(form.services, form.addOns, form.discountType, form.discountValue, form.taxRate),
    [form.services, form.addOns, form.discountType, form.discountValue, form.taxRate]
  );

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
    setEditingQuoteId(null);
    setFormMode('create');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const closeCreatePage = () => {
    setFormMode('list');
    setEditingQuoteId(null);
  };

  /**
   * Open the AI Quote Generator. If the user's plan doesn't include
   * `ai_quote_generator`, open the UpgradeModal instead (so trial users can
   * still discover the feature, and paid-starter users are nudged to upgrade).
   */
  const openAiQuoteDialog = () => {
    if (aiQuoteLocked) {
      openUpgradeModal({
        menuKey: 'quotes',
        label: 'AI Quote Generator',
        description:
          'Generate professional quotes instantly from a job description. ' +
          'Upgrade to the Professional plan or above to unlock AI Quote Generator.',
        minPlan: 'growth',
      });
      return;
    }
    setShowAiDialog(true);
  };

  /**
   * Called by AiQuoteGeneratorDialog when the user clicks "Open Quote" on the
   * success screen. We normalize the raw API response into our Quote shape,
   * prepend it to the list, and open it in the edit form so the user can
   * tweak the AI-generated line items / pricing / valid-until date.
   */
  const handleAiQuoteCreated = (raw: AiGeneratedQuote) => {
    const normalized = normalizeQuote(raw, customers);
    const customer = customers.find((c) => c.id === normalized.customerId);
    if (customer) {
      normalized.customerName = customer.name;
      normalized.customerPhone = customer.phone;
    }
    setQuotes((prev) => [normalized, ...prev]);
    openEditDialog(normalized);
  };

  const openEditDialog = (quote: Quote) => {
    setEditingQuoteId(quote.id);
    setForm({
      title: quote.title,
      description: quote.description || '',
      customerId: quote.customerId,
      customerName: quote.customerName,
      services: quote.services,
      addOns: quote.addOns,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      taxRate: quote.taxRate,
      validUntil: quote.validUntil,
    });
    setFormMode('create');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  const openDetailDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowDetailDialog(true);
  };

  const openQuoteDetail = (quote: Quote) => {
    setSelectedQuote(quote);
    setFormMode('detail');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  // ── Consume the cross-view "open quote detail" signal (Customer 360 deep-link) ──
  // Mirrors the pendingCreate consumer pattern. The signal is set by crm-view.tsx
  // when the user clicks a Quote row inside the Customer 360 detail panel. We:
  //   1. clear it immediately (so a re-render doesn't re-trigger),
  //   2. reuse the local quote if it's already in the list,
  //   3. otherwise fetch it via /api/quotes/[id] — Phase 4a updated this endpoint
  //      to expose the full `customer` object alongside the flat fields, so the
  //      detail panel can render correctly without an extra fetch.
  // If the fetch fails (404 / network), we log + don't open anything.
  useEffect(() => {
    if (!pendingOpenEntity || pendingOpenEntity.kind !== 'quote') return;
    const targetId = pendingOpenEntity.id;
    setPendingOpenEntity(null);
    const local = quotes.find((q) => q.id === targetId);
    if (local) {
      openQuoteDetail(local);
      return;
    }
    authFetch(`/api/quotes/${encodeURIComponent(targetId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        if (!raw || raw.error) {
          console.error('[quotes-view] pendingOpenEntity: quote not found for id', targetId);
          return;
        }
        // normalizeQuote derives customerName/Phone from the embedded customer
        // relation when the flat fields are missing (Phase 4a fallback path).
        openQuoteDetail(normalizeQuote(raw, customers));
      })
      .catch((err) => console.error('[quotes-view] pendingOpenEntity fetch failed:', err));
  }, [pendingOpenEntity]);

  const closeQuoteDetail = () => {
    setFormMode('list');
    setSelectedQuote(null);
  };

  const openPreviewDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setFormMode('list');
    setShowPreviewDialog(true);
  };

  const handleCreateSimilar = (quote: Quote) => {
    // Open the create dialog pre-filled with this quote's data (re-use edit form as "similar")
    openEditDialog(quote);
    setEditingQuoteId(null);
    setForm((prev) => ({ ...prev, title: `${quote.title} (Copy)` }));
    toast.info('Create similar — prefilled from this quote');
  };

  // Service item handlers
  const handleAddServiceItem = () => {
    setForm((prev) => ({ ...prev, services: [...prev.services, EMPTY_SERVICE_ITEM()] }));
  };

  const handleRemoveServiceItem = (id: string) => {
    setForm((prev) => ({ ...prev, services: prev.services.filter((s) => s.id !== id) }));
  };

  const handleServiceSelect = (itemId: string, serviceId: string) => {
    const catalogItem = MOCK_SERVICE_CATALOG.find((s) => s.id === serviceId);
    if (catalogItem) {
      setForm((prev) => ({
        ...prev,
        services: prev.services.map((s) =>
          s.id === itemId ? { ...s, serviceId, name: catalogItem.name, price: catalogItem.basePrice } : s
        ),
      }));
    }
  };

  const handleServiceFieldChange = (itemId: string, field: keyof QuoteServiceItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) => s.id === itemId ? { ...s, [field]: value } : s),
    }));
  };

  // Add-on handlers
  const handleAddAddOn = () => {
    setForm((prev) => ({ ...prev, addOns: [...prev.addOns, EMPTY_ADD_ON()] }));
  };

  const handleRemoveAddOn = (id: string) => {
    setForm((prev) => ({ ...prev, addOns: prev.addOns.filter((a) => a.id !== id) }));
  };

  const handleAddOnChange = (id: string, field: keyof QuoteAddOn, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      addOns: prev.addOns.map((a) => a.id === id ? { ...a, [field]: value } : a),
    }));
  };

  const handleSaveQuote = async () => {
    if (!form.title.trim()) { toast.error('Quote title is required'); return; }
    if (!form.customerId) { toast.error('Please select a customer'); return; }
    if (!form.validUntil) { toast.error('Please set a valid-until date'); return; }
    if (form.services.length === 0 || form.services.every((s) => !s.name.trim())) {
      toast.error('Add at least one service');
      return;
    }

    setSaving(true);
    try {
      const customer = customers.find((c) => c.id === form.customerId);
      const payload = {
        title: form.title,
        description: form.description,
        customerId: form.customerId,
        services: form.services,
        addOns: form.addOns,
        discountType: form.discountType,
        discountValue: form.discountValue,
        taxRate: form.taxRate,
        validUntil: form.validUntil,
        currency,
        tenantId,
      };

      if (editingQuoteId) {
        const res = await authFetch(`/api/quotes/${editingQuoteId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Failed to update quote');
          return;
        }
        const updated = await res.json();
        const normalized = normalizeQuote(updated, customers);
        if (customer) {
          normalized.customerName = customer.name;
          normalized.customerPhone = customer.phone;
        }
        setQuotes((prev) => prev.map((q) => q.id === editingQuoteId ? normalized : q));
        if (selectedQuote?.id === editingQuoteId) {
          setSelectedQuote(normalized);
        }
        toast.success('Quote updated successfully');
      } else {
        const res = await authFetch('/api/quotes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Failed to create quote');
          return;
        }
        const created = await res.json();
        const normalized = normalizeQuote(created, customers);
        if (customer) {
          normalized.customerName = customer.name;
          normalized.customerPhone = customer.phone;
        }
        setQuotes((prev) => [normalized, ...prev]);
        toast.success('Quote created successfully');
      }

      setFormMode('list');
      setEditingQuoteId(null);
    } catch {
      toast.error('Network error saving quote');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus) => {
    const prevQuotes = quotes;
    const prevStatus = prevQuotes.find((q) => q.id === quoteId)?.status;
    // Optimistic update
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: newStatus } : q));
    if (selectedQuote?.id === quoteId) {
      setSelectedQuote((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    try {
      const res = await authFetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to update status');
        setQuotes(prevQuotes);
        if (selectedQuote?.id === quoteId && prevStatus) {
          setSelectedQuote((prev) => prev ? { ...prev, status: prevStatus } : prev);
        }
        return;
      }
      toast.success(`Quote marked as ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error('Network error updating status');
      setQuotes(prevQuotes);
      if (selectedQuote?.id === quoteId && prevStatus) {
        setSelectedQuote((prev) => prev ? { ...prev, status: prevStatus } : prev);
      }
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    const prevQuotes = quotes;
    // Optimistic remove
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    if (selectedQuote?.id === quoteId) {
      setShowDetailDialog(false);
      setSelectedQuote(null);
    }
    try {
      const res = await authFetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete quote');
        setQuotes(prevQuotes);
        return;
      }
      toast.success('Quote deleted');
    } catch {
      toast.error('Network error deleting quote');
      setQuotes(prevQuotes);
    }
  };

  const handleSendWhatsApp = async (quote: Quote) => {
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send-whatsapp?XTransformPort=3000`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setQuotes((prev) => prev.map((q) => q.id === quote.id ? { ...q, whatsappSent: true, status: q.status === 'draft' ? 'sent' : q.status } : q));
        if (selectedQuote?.id === quote.id) {
          setSelectedQuote((prev) => prev ? { ...prev, whatsappSent: true, status: prev.status === 'draft' ? 'sent' : prev.status } : prev);
        }
        if (data.whatsapp?.success) {
          toast.success(`Quote sent via WhatsApp to ${quote.customerName}`);
        } else {
          toast.warning(`Quote marked as sent, but WhatsApp delivery had an issue: ${data.whatsapp?.error || 'Unknown error'}`);
        }
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to send quote via WhatsApp');
      }
    } catch {
      toast.error('Network error sending quote via WhatsApp');
    }
  };

  // Send the quote to the customer via email ONLY (no SMS, no WhatsApp).
  // Uses the new /api/quotes/[id]/send-email endpoint. Surfaces real errors
  // (e.g. NO_EMAIL_PROVIDER_CONFIGURED) instead of faking success.
  const handleSendEmail = async (quote: Quote) => {
    try {
      const res = await authFetch(`/api/quotes/${quote.id}/send-email`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        // Translate the NO_EMAIL_PROVIDER_CONFIGURED sentinel into a
        // user-friendly message with guidance on where to fix it.
        let errMsg = data.error || data.email?.error || 'Failed to send quote via email';
        if (errMsg === 'NO_EMAIL_PROVIDER_CONFIGURED') {
          errMsg = 'No email provider configured. Ask your platform admin to add an SMTP/Resend/SendGrid provider in SuperAdmin → Settings → Providers.';
        }
        toast.error(errMsg, { duration: 8000 });
        return;
      }
      // Success - flip local status and stamp emailSent.
      setQuotes((prev) => prev.map((q) => q.id === quote.id ? { ...q, emailSent: true, status: q.status === 'draft' ? 'sent' : q.status } : q));
      if (selectedQuote?.id === quote.id) {
        setSelectedQuote((prev) => prev ? { ...prev, emailSent: true, status: prev.status === 'draft' ? 'sent' : prev.status } : prev);
      }
      toast.success(`Quote sent via email`);
    } catch {
      toast.error('Network error sending quote via email');
    }
  };

  const handleDuplicateQuote = async (quote: Quote) => {
    try {
      const payload = {
        title: `${quote.title} (Copy)`,
        description: quote.description || '',
        customerId: quote.customerId,
        services: quote.services.map((s) => ({ ...s, id: `qs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` })),
        addOns: quote.addOns.map((a) => ({ ...a, id: `qa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` })),
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        taxRate: quote.taxRate,
        validUntil: quote.validUntil,
        currency: quote.currency || currency,
        tenantId,
      };
      const res = await authFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to duplicate quote');
        return;
      }
      const created = await res.json();
      const normalized = normalizeQuote(created, customers);
      const customer = customers.find((c) => c.id === quote.customerId);
      if (customer) {
        normalized.customerName = customer.name;
        normalized.customerPhone = customer.phone;
      }
      setQuotes((prev) => [normalized, ...prev]);
      toast.success('Quote duplicated');
    } catch {
      toast.error('Network error duplicating quote');
    }
  };

  // ── Preview WhatsApp / Email dialog trigger from the New Quote form ──────
  // Builds a synthetic preview Quote from the current form state and opens
  // the EmailPreview dialog. The parent owns `selectedQuote` and
  // `showPreviewDialog` state, so the construction stays here (mirrors the
  // closure that used to live inline inside `renderNewQuotePage`).
  const handlePreviewWhatsApp = () => {
    const summary = calcSummary(form.services, form.addOns, form.discountType, form.discountValue, form.taxRate);
    const customer = customers.find((c) => c.id === form.customerId);
    const previewQuote: Quote = {
      id: 'preview',
      title: form.title,
      description: form.description,
      customerName: customer?.name || form.customerName,
      customerId: form.customerId,
      customerPhone: customer?.phone,
      services: form.services,
      addOns: form.addOns,
      ...summary,
      discountType: form.discountType,
      discountValue: form.discountValue,
      taxRate: form.taxRate,
      status: 'draft',
      validUntil: form.validUntil,
      whatsappSent: false,
      emailSent: false,
      createdAt: new Date().toISOString().split('T')[0],
      currency: currency,
      exchangeRate: 1,
      baseCurrency: currency,
      baseAmount: summary.total,
    };
    setSelectedQuote(previewQuote);
    setShowPreviewDialog(true);
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6 w-full">
      {formMode === 'create' ? (
        <NewQuotePage
          editingQuoteId={editingQuoteId}
          form={form}
          setForm={setForm}
          onSave={handleSaveQuote}
          onCancel={closeCreatePage}
          saving={saving}
          customers={customers}
          onOpenAiDialog={openAiQuoteDialog}
          aiLocked={aiQuoteLocked}
          onAddServiceItem={handleAddServiceItem}
          onRemoveServiceItem={handleRemoveServiceItem}
          onServiceSelect={handleServiceSelect}
          onServiceFieldChange={handleServiceFieldChange}
          onAddAddOn={handleAddAddOn}
          onRemoveAddOn={handleRemoveAddOn}
          onAddOnChange={handleAddOnChange}
          formSummary={formSummary}
          currency={currency}
          format={format}
          symbol={symbol}
          onPreviewWhatsApp={handlePreviewWhatsApp}
        />
      ) : formMode === 'detail' ? (
        <QuoteDetailPage
          quote={selectedQuote}
          customers={customers}
          onBack={closeQuoteDetail}
          onEdit={openEditDialog}
          onCreateSimilar={handleCreateSimilar}
          onSendEmail={handleSendEmail}
          onPreviewEmail={openPreviewDialog}
          onDuplicate={handleDuplicateQuote}
          onDelete={handleDeleteQuote}
          currency={currency}
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
            <h1 className="text-2xl font-bold tracking-tight">Quotes</h1>
            <p className="text-sm text-muted-foreground">Create, send, and track quotes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openAiQuoteDialog}
            className="border-emerald-600/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            title={
              aiQuoteLocked
                ? 'AI Quote Generator — upgrade to the Professional plan to unlock'
                : 'Generate a quote from a job description with AI'
            }
          >
            {aiQuoteLocked ? (
              <Lock className="size-4 mr-1.5" />
            ) : (
              <Sparkles className="size-4 mr-1.5" />
            )}
            Generate with AI
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Create Quote
          </Button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Value', value: format(stats.totalValue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Accepted', value: format(stats.acceptedValue), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { title: 'Pending', value: format(stats.sentValue), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'Acceptance Rate', value: `${stats.acceptanceRate}%`, icon: Calculator, color: 'text-purple-500', bg: 'bg-purple-50' },
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
            <TabsTrigger value="accepted" className="text-xs px-3">Accepted</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs px-3">Rejected</TabsTrigger>
            <TabsTrigger value="expired" className="text-xs px-3">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ── Quotes Table ─────────────────────────────────────────── */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-sm text-muted-foreground">Loading quotes...</span>
          </CardContent>
        </Card>
      ) : filteredQuotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="size-12 mb-3 opacity-20" />
          <p className="font-medium">No quotes found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new quote</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1" /> Create Quote
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('title')}>
                      <span className="flex items-center">Title {renderSortIcon('title')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('customer')}>
                      <span className="flex items-center">Customer {renderSortIcon('customer')}</span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('total')}>
                      <span className="flex items-center justify-end">Total {renderSortIcon('total')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <span className="flex items-center">Status {renderSortIcon('status')}</span>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort('validUntil')}>
                      <span className="flex items-center">Valid Until {renderSortIcon('validUntil')}</span>
                    </TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow
                      key={quote.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openQuoteDetail(quote)}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          {quote.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{quote.customerName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{format(quote.total)}</TableCell>
                      <TableCell>{renderStatusBadge(quote.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {quote.emailSent || quote.whatsappSent ? (
                          <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                            <Mail className="size-3 mr-1" /> Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-5 bg-gray-50 text-gray-500 border-gray-200">
                            Not sent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {formatShortDate(quote.validUntil)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openQuoteDetail(quote)}>
                              <Eye className="size-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(quote)}>
                              <Edit3 className="size-3.5 mr-2" /> Edit Quote
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendEmail(quote)}>
                              <Mail className="size-3.5 mr-2" /> Send via Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPreviewDialog(quote)}>
                              <Eye className="size-3.5 mr-2" /> Email Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateQuote(quote)}>
                              <Copy className="size-3.5 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            {quote.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'sent')}>
                                <Send className="size-3.5 mr-2" /> Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {quote.status === 'sent' && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'accepted')}>
                                  <CheckCircle2 className="size-3.5 mr-2" /> Mark as Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'rejected')}>
                                  <XCircle className="size-3.5 mr-2" /> Mark as Rejected
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteQuote(quote.id)}>
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}


      {/* ── Quote Detail Dialog ──────────────────────────────────── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {selectedQuote && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="size-5 text-emerald-600" />
                  {selectedQuote.title}
                </DialogTitle>
                <DialogDescription>
                  Quote for {selectedQuote.customerName}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] pr-1">
                <div className="space-y-5 pr-3">
                  {/* Status & Date */}
                  <div className="flex items-center justify-between">
                    {renderStatusBadge(selectedQuote.status)}
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Created: {formatShortDate(selectedQuote.createdAt)}</p>
                      <p>Valid until: {formatShortDate(selectedQuote.validUntil)}</p>
                    </div>
                  </div>

                  {(selectedQuote.emailSent || selectedQuote.whatsappSent) && (
                    <div className="rounded-lg border bg-green-50 p-3 text-sm flex items-center gap-2">
                      <Mail className="size-4 text-green-600" />
                      <span className="text-green-700">Quote sent via Email</span>
                    </div>
                  )}

                  <Separator />

                  {/* Services */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Services</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Service</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Price</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedQuote.services.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="text-sm py-2">{s.name}</TableCell>
                              <TableCell className="text-sm py-2 text-right">{s.quantity}</TableCell>
                              <TableCell className="text-sm py-2 text-right">{format(s.price)}</TableCell>
                              <TableCell className="text-sm py-2 text-right font-medium">{format(s.price * s.quantity)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Add-ons */}
                  {selectedQuote.addOns.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Add-ons</h4>
                      {selectedQuote.addOns.map((a) => (
                        <div key={a.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                          <span>{a.name}</span>
                          <span className="font-medium">{format(a.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{format(selectedQuote.subtotal)}</span>
                      </div>
                      {selectedQuote.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Discount {selectedQuote.discountType === 'percentage' ? `(${selectedQuote.discountValue}%)` : ''}
                          </span>
                          <span className="text-red-600">-{format(selectedQuote.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({selectedQuote.taxRate}%)</span>
                        <span>{format(selectedQuote.tax)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-emerald-700">{format(selectedQuote.total)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedQuote.description && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Description</h4>
                        <p className="text-sm text-muted-foreground">{selectedQuote.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => { setShowDetailDialog(false); handleSendEmail(selectedQuote); }}
                  >
                    <Mail className="size-4 mr-1.5" /> Send Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowDetailDialog(false); openPreviewDialog(selectedQuote); }}
                  >
                    <Eye className="size-4 mr-1.5" /> Email Preview
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => { setShowDetailDialog(false); openEditDialog(selectedQuote); }}
                >
                  <Edit3 className="size-4 mr-1.5" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Email Preview Dialog ──────────────────────────────── */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-emerald-600" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              How this quote will appear when sent via Email to the customer
            </DialogDescription>
          </DialogHeader>
          <EmailPreview quote={selectedQuote} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Close</Button>
            {selectedQuote && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { handleSendEmail(selectedQuote); setShowPreviewDialog(false); }}
              >
                <Send className="size-4 mr-1.5" /> Send via Email
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}

      {/* ── AI Quote Generator Dialog ────────────────────────────── */}
      {/* Mounted OUTSIDE the formMode ternary so it's accessible from both
          the list header button AND the New Quote form's "Auto-fill" banner. */}
      <AiQuoteGeneratorDialog
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        customers={customers}
        tenantId={tenantId}
        onQuoteCreated={handleAiQuoteCreated}
      />
    </div>
  );
}

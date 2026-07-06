'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Plus, Search, Send, MoreHorizontal, DollarSign,
  Clock, CheckCircle2, AlertCircle, XCircle, Eye, Trash2,
  X, PlusCircle, MinusCircle, ArrowUpDown, ChevronUp, ChevronDown,
  CalendarDays, Calculator, MessageCircle, Phone, ShoppingCart, Tag,
  Percent, Receipt, Copy, Edit3, Loader2,
  User, Mail, MapPin, Briefcase, StickyNote, Printer, ScrollText, Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';
import { FormSectionCard } from '@/components/shared/form-section-card';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  description?: string;
}

interface QuoteServiceItem {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
}

interface QuoteAddOn {
  id: string;
  name: string;
  price: number;
}

interface Quote {
  id: string;
  title: string;
  description?: string;
  customerName: string;
  customerId: string;
  customerPhone?: string;
  services: QuoteServiceItem[];
  addOns: QuoteAddOn[];
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  validUntil: string;
  whatsappSent: boolean;
  createdAt: string;
  currency?: string;       // Transaction currency
  exchangeRate?: number;   // Rate at creation
  baseCurrency?: string;   // Base currency at creation
  baseAmount?: number;     // Amount in base currency
}

interface QuoteFormData {
  title: string;
  description: string;
  customerId: string;
  customerName: string;
  services: QuoteServiceItem[];
  addOns: QuoteAddOn[];
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  taxRate: number;
  validUntil: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  workspaceId?: string;
  preferredCurrency?: string;
}

// ============================================================
// Constants
// ============================================================

const STATUS_CONFIG: Record<QuoteStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: <FileText className="size-3" /> },
  sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Send className="size-3" /> },
  accepted: { label: 'Accepted', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <XCircle className="size-3" /> },
  expired: { label: 'Expired', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="size-3" /> },
};


const MOCK_SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 's1', name: 'Window Cleaning', category: 'Cleaning', basePrice: 120, description: 'Interior & exterior window cleaning' },
  { id: 's2', name: 'Gutter Cleaning', category: 'Cleaning', basePrice: 80, description: 'Full gutter clearing and flush' },
  { id: 's3', name: 'Deep House Cleaning', category: 'Cleaning', basePrice: 250, description: 'Full deep clean of property' },
  { id: 's4', name: 'Carpet Cleaning', category: 'Cleaning', basePrice: 150, description: 'Professional carpet steam clean' },
  { id: 's5', name: 'Plumbing Repair', category: 'Maintenance', basePrice: 95, description: 'General plumbing repair service' },
  { id: 's6', name: 'Electrical Work', category: 'Maintenance', basePrice: 120, description: 'Electrical repair and installation' },
  { id: 's7', name: 'Solar Panel Cleaning', category: 'Specialist', basePrice: 50, description: 'Per panel cleaning' },
  { id: 's8', name: 'Pest Control Treatment', category: 'Specialist', basePrice: 180, description: 'Full property pest treatment' },
  { id: 's9', name: 'Painting (per room)', category: 'Decorating', basePrice: 350, description: 'Full room painting service' },
  { id: 's10', name: 'Garden Maintenance', category: 'Outdoor', basePrice: 75, description: 'Lawn mowing, weeding, tidying' },
];

const EMPTY_SERVICE_ITEM = (): QuoteServiceItem => ({
  id: `qs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  serviceId: '', name: '', price: 0, quantity: 1,
});

const EMPTY_ADD_ON = (): QuoteAddOn => ({
  id: `qa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name: '', price: 0,
});

const EMPTY_FORM = (): QuoteFormData => ({
  title: '', description: '', customerId: '', customerName: '',
  services: [EMPTY_SERVICE_ITEM()],
  addOns: [],
  discountType: 'fixed', discountValue: 0, taxRate: 20, validUntil: '',
});

// ============================================================
// Helpers
// ============================================================

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}

function calcDiscount(subtotal: number, type: 'fixed' | 'percentage', value: number): number {
  if (type === 'percentage') return subtotal * (value / 100);
  return value;
}

function calcSummary(services: QuoteServiceItem[], addOns: QuoteAddOn[], discountType: 'fixed' | 'percentage', discountValue: number, taxRate: number) {
  const servicesTotal = services.reduce((s, item) => s + item.price * item.quantity, 0);
  const addOnsTotal = addOns.reduce((s, a) => s + a.price, 0);
  const subtotal = servicesTotal + addOnsTotal;
  const discount = calcDiscount(subtotal, discountType, discountValue);
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (taxRate / 100);
  const total = afterDiscount + tax;
  return { servicesTotal, addOnsTotal, subtotal, discount, tax, total };
}

/**
 * Normalize a quote coming back from the API into the component's Quote type.
 *
 * The GET /api/quotes endpoint returns a pre-formatted object where
 * `services` / `addOns` are already arrays and `discountValue` is computed.
 * The POST /api/quotes and PUT /api/quotes/[id] endpoints return the raw
 * Prisma row where those arrays live inside `itemsJson` / `addOnsJson` as
 * JSON strings and `discountValue` is not present. This helper handles both
 * shapes so the rest of the UI always works against a consistent Quote.
 */
function normalizeQuote(raw: any, customers: Customer[]): Quote {
  let services: QuoteServiceItem[] = [];
  if (Array.isArray(raw.services)) {
    services = raw.services as QuoteServiceItem[];
  } else if (raw.itemsJson) {
    try { services = JSON.parse(raw.itemsJson) as QuoteServiceItem[]; } catch { services = []; }
  }

  let addOns: QuoteAddOn[] = [];
  if (Array.isArray(raw.addOns)) {
    addOns = raw.addOns as QuoteAddOn[];
  } else if (raw.addOnsJson) {
    try { addOns = JSON.parse(raw.addOnsJson) as QuoteAddOn[]; } catch { addOns = []; }
  }

  const customer = raw.customerId ? customers.find((c) => c.id === raw.customerId) : undefined;
  const customerName = raw.customerName || customer?.name || 'Unknown';
  const customerPhone = raw.customerPhone || customer?.phone;

  const toDateStr = (v: unknown): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.split('T')[0];
    try { return new Date(v as any).toISOString().split('T')[0]; } catch { return ''; }
  };

  let discountValue: number;
  if (raw.discountValue !== undefined && raw.discountValue !== null) {
    discountValue = Number(raw.discountValue);
  } else if (raw.discountType === 'percentage' && Number(raw.subtotal) > 0) {
    discountValue = Math.round((Number(raw.discount) / Number(raw.subtotal)) * 100);
  } else {
    discountValue = Number(raw.discount) || 0;
  }

  return {
    id: raw.id,
    title: raw.title || '',
    description: raw.description || undefined,
    customerName,
    customerId: raw.customerId || '',
    customerPhone,
    services,
    addOns,
    subtotal: Number(raw.subtotal) || 0,
    discountType: raw.discountType === 'percentage' ? 'percentage' : 'fixed',
    discountValue,
    discount: Number(raw.discount) || 0,
    taxRate: Number(raw.taxRate) || 0,
    tax: Number(raw.tax) || 0,
    total: Number(raw.total) || 0,
    status: (raw.status as QuoteStatus) || 'draft',
    validUntil: toDateStr(raw.validUntil),
    whatsappSent: !!raw.whatsappSent,
    createdAt: toDateStr(raw.createdAt),
    currency: raw.currency,
    exchangeRate: raw.exchangeRate !== undefined ? Number(raw.exchangeRate) : undefined,
    baseCurrency: raw.baseCurrency,
    baseAmount: raw.baseAmount !== undefined ? Number(raw.baseAmount) : undefined,
  };
}

// ============================================================
// WhatsApp Preview Component
// ============================================================

function WhatsAppPreview({ quote }: { quote: Quote | null }) {
  const { format: fmt } = useCompanyCurrency();
  if (!quote) return null;
  return (
    <div className="bg-[#e5ddd5] dark:bg-[#1f2c34] rounded-lg p-4 max-w-sm mx-auto">
      <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg p-3 shadow-sm">
        <p className="font-bold text-sm">*Quote: {quote.title}*</p>
        <p className="text-sm mt-1">Customer: {quote.customerName}</p>
        <p className="text-sm mt-2">Services:</p>
        {quote.services.map((s) => (
          <p key={s.id} className="text-sm">✓ {s.name} ({fmt(s.price * s.quantity)})</p>
        ))}
        {quote.addOns.length > 0 && (
          <>
            <p className="text-sm mt-2">Add-ons:</p>
            {quote.addOns.map((a) => (
              <p key={a.id} className="text-sm">✓ {a.name} ({fmt(a.price)})</p>
            ))}
          </>
        )}
        <Separator className="my-2 bg-black/10 dark:bg-white/10" />
        <p className="text-sm">Subtotal: {fmt(quote.subtotal)}</p>
        {quote.discount > 0 && <p className="text-sm">Discount: -{fmt(quote.discount)}</p>}
        <p className="text-sm">Tax ({quote.taxRate}%): {fmt(quote.tax)}</p>
        <p className="font-bold text-sm">*Total: {fmt(quote.total)}*</p>
        <p className="text-xs mt-2 opacity-70">Valid until: {formatShortDate(quote.validUntil)}</p>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function QuotesView() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'list' | 'detail'>('list');

  const [form, setForm] = useState<QuoteFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

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
          if (Array.isArray(data)) customersList = data;
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
    setShowCreateDialog(true);
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
    setFormMode('list');
    setShowCreateDialog(true);
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

      setShowCreateDialog(false);
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

  const renderStatusBadge = (status: QuoteStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${config.bg} ${config.text} ${config.border}`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  // ============================================================
  // Render: Quote Detail Page (Jobber-style full page)
  // ============================================================
  const renderQuoteDetailPage = () => {
    if (!selectedQuote) return null;
    const quote = selectedQuote;
    const customer = customers.find((c) => c.id === quote.customerId);

    const detailRows: { label: string; value: React.ReactNode }[] = [
      { label: 'Quote #', value: <span className="font-mono">#{quote.id.slice(-6).toUpperCase()}</span> },
      { label: 'Created', value: <span>{formatShortDate(quote.createdAt)}</span> },
      {
        label: 'Status',
        value: (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', {
              'bg-gray-400': quote.status === 'draft',
              'bg-blue-500': quote.status === 'sent',
              'bg-emerald-500': quote.status === 'accepted',
              'bg-red-500': quote.status === 'rejected',
              'bg-amber-500': quote.status === 'expired',
            })} />
            <span className="capitalize">{STATUS_CONFIG[quote.status].label}</span>
          </span>
        ),
      },
      { label: 'Valid until', value: <span>{formatShortDate(quote.validUntil)}</span> },
      {
        label: 'WhatsApp sent',
        value: quote.whatsappSent
          ? <span className="text-emerald-700 font-medium">Yes</span>
          : <span className="text-muted-foreground">No</span>,
      },
      { label: 'Currency', value: <span>{quote.currency || currency}</span> },
    ];

    return (
      <div className="w-full space-y-6">
        {/* ─── Sticky page header (Back + title + actions) ────────── */}
        <div className="form-page-header -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={closeQuoteDetail}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                <span className="hidden sm:inline">Back</span>
              </button>
              <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
              <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-emerald-600">
                <Receipt className="size-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {renderStatusBadge(quote.status)}
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">{quote.title}</h2>
                  <button title="Edit quote" onClick={() => openEditDialog(quote)} className="text-muted-foreground hover:text-emerald-600 transition-colors shrink-0">
                    <Pencil className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">Quote for {quote.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleCreateSimilar(quote)}
                title="Create similar quote"
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Copy className="size-4 mr-1.5" /> Create Similar Quote
              </button>
              <button
                type="button"
                onClick={() => openEditDialog(quote)}
                className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
              >
                <Edit3 className="size-4 mr-1.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(quote)}
                title="Send via WhatsApp"
                className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/15 transition-colors"
              >
                <MessageCircle className="size-4" />
                <span className="hidden lg:inline ml-1.5">WhatsApp</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button title="More actions" className="inline-flex items-center justify-center size-9 rounded-lg text-foreground border border-border bg-background hover:bg-muted transition-colors">
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openPreviewDialog(quote)}>
                    <Eye className="size-3.5 mr-2" /> WhatsApp Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateQuote(quote)}>
                    <Copy className="size-3.5 mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('PDF download coming soon')}>
                    <Printer className="size-3.5 mr-2" /> Print / PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => handleDeleteQuote(quote.id)}>
                    <Trash2 className="size-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ─── Two-column layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Left column: main quote details ── */}
          <div className="space-y-6 min-w-0">
            {/* Client card */}
            <FormSectionCard icon={User} title="Client">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                    <p className="text-base font-semibold text-foreground truncate">{quote.customerName || 'No client linked'}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button title="Client actions" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(quote)}>
                        <Edit3 className="size-3.5 mr-2" /> Edit Quote
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendWhatsApp(quote)}>
                        <MessageCircle className="size-3.5 mr-2" /> Send WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property Address</p>
                  <div className="flex items-start gap-2 text-sm text-foreground mt-0.5">
                    <MapPin className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>{customer?.address || '—'}</span>
                  </div>
                </div>
                {quote.customerPhone && (
                  <a href={`tel:${quote.customerPhone}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                    <Phone className="size-4" /> {quote.customerPhone}
                  </a>
                )}
                {customer?.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                    <Mail className="size-4" /> {customer.email}
                  </a>
                )}
                {!quote.customerPhone && !customer?.email && !customer?.address && (
                  <p className="text-sm text-muted-foreground italic">No contact details on file.</p>
                )}
              </div>
            </FormSectionCard>

            {/* Quote details card */}
            <FormSectionCard icon={FileText} title="Quote details">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {detailRows.map((row, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                    <dt className="text-sm text-muted-foreground shrink-0">{row.label}</dt>
                    <dd className="text-sm font-medium text-foreground text-right min-w-0 break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </FormSectionCard>

            {/* Product / Service card */}
            <FormSectionCard
              icon={Briefcase}
              title="Product / Service"
              action={
                <button onClick={() => openEditDialog(quote)} className="text-muted-foreground hover:text-emerald-600 transition-colors" title="Edit services">
                  <Pencil className="size-4" />
                </button>
              }
            >
              {quote.services.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No line items added to this quote.</p>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                          <th className="px-2 py-2 font-medium">Line Item</th>
                          <th className="px-2 py-2 font-medium text-center">Quantity</th>
                          <th className="px-2 py-2 font-medium text-right">Unit Price</th>
                          <th className="px-2 py-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.services.map((s) => (
                          <tr key={s.id} className="border-b border-border/40 last:border-0">
                            <td className="px-2 py-2.5 font-medium text-foreground">{s.name || 'Custom item'}</td>
                            <td className="px-2 py-2.5 text-center text-muted-foreground">{s.quantity || 1}</td>
                            <td className="px-2 py-2.5 text-right text-muted-foreground">{format(s.price)}</td>
                            <td className="px-2 py-2.5 text-right font-semibold text-foreground">{format(s.price * s.quantity)}</td>
                          </tr>
                        ))}
                        {quote.addOns.map((a) => (
                          <tr key={a.id} className="border-b border-border/40 last:border-0 bg-muted/20">
                            <td className="px-2 py-2.5 font-medium text-foreground">
                              {a.name || 'Add-on'}
                              <span className="block text-xs text-muted-foreground font-normal">Add-on</span>
                            </td>
                            <td className="px-2 py-2.5 text-center text-muted-foreground">1</td>
                            <td className="px-2 py-2.5 text-right text-muted-foreground">{format(a.price)}</td>
                            <td className="px-2 py-2.5 text-right font-semibold text-foreground">{format(a.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{format(quote.subtotal)}</span>
                      </div>
                      {quote.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Discount {quote.discountType === 'percentage' ? `(${quote.discountValue}%)` : ''}
                          </span>
                          <span className="font-medium text-red-600">-{format(quote.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({quote.taxRate}%)</span>
                        <span className="font-medium">+{format(quote.tax)}</span>
                      </div>
                      <Separator className="my-1 bg-border/60" />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-emerald-700">{format(quote.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </FormSectionCard>

            {/* Contract / Disclaimer card */}
            <FormSectionCard
              icon={ScrollText}
              title="Contract / Disclaimer"
              action={
                <button onClick={() => openEditDialog(quote)} className="text-muted-foreground hover:text-emerald-600 transition-colors" title="Edit terms">
                  <Pencil className="size-4" />
                </button>
              }
            >
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {quote.description || 'This quote is valid for the next 30 days, after which values may be subject to change. Please review the line items above and let us know if you have any questions or would like to make adjustments.'}
              </p>
            </FormSectionCard>
          </div>

          {/* ── Right column: sidebar ── */}
          <div className="space-y-6 xl:sticky xl:top-4">
            {/* Quick actions */}
            <FormSectionCard icon={Briefcase} title="Actions">
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleSendWhatsApp(quote)}
                  className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/15 transition-colors"
                >
                  <MessageCircle className="size-4" /> Send WhatsApp
                </button>
                <button
                  onClick={() => { setFormMode('list'); openPreviewDialog(quote); }}
                  className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
                >
                  <Eye className="size-4" /> WhatsApp Preview
                </button>
                <button
                  onClick={() => openEditDialog(quote)}
                  className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
                >
                  <Edit3 className="size-4" /> Edit quote
                </button>
                <button
                  onClick={() => toast.info('PDF download coming soon')}
                  className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
                >
                  <Printer className="size-4" /> Print / PDF
                </button>
              </div>
            </FormSectionCard>

            {/* Notes */}
            <FormSectionCard
              icon={StickyNote}
              title="Notes"
              action={
                <button
                  onClick={() => toast.info('Notes editor coming soon')}
                  className="inline-flex items-center justify-center size-7 rounded-md text-emerald-700 border border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/15 transition-colors"
                  title="Add note"
                >
                  <Plus className="size-4" />
                </button>
              }
            >
              <div className="space-y-2">
                <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-foreground">Jobber</p>
                    <p className="text-[11px] text-muted-foreground">{formatShortDate(quote.createdAt)}</p>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {quote.description || 'Quote created.'}
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-[10px] h-5 bg-muted/40 text-muted-foreground border-border/60">
                      Linked note
                    </Badge>
                  </div>
                </div>
                {quote.whatsappSent && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-emerald-800">System</p>
                      <p className="text-[11px] text-emerald-700">{formatShortDate(quote.createdAt)}</p>
                    </div>
                    <p className="text-sm text-emerald-900">Quote sent via WhatsApp</p>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-[10px] h-5 bg-emerald-100 text-emerald-700 border-emerald-200">
                        <MessageCircle className="size-3 mr-1" /> Sent
                      </Badge>
                    </div>
                  </div>
                )}
                {!quote.whatsappSent && !quote.description && (
                  <p className="text-sm text-muted-foreground italic">No notes yet.</p>
                )}
              </div>
            </FormSectionCard>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6 w-full">
      {formMode === 'detail' ? (
        renderQuoteDetailPage()
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
                    <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
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
                        {quote.whatsappSent ? (
                          <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                            <MessageCircle className="size-3 mr-1" /> Sent
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
                            <DropdownMenuItem onClick={() => openPreviewDialog(quote)}>
                              <MessageCircle className="size-3.5 mr-2" /> WhatsApp Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendWhatsApp(quote)}>
                              <Send className="size-3.5 mr-2" /> Send via WhatsApp
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

      {/* ── Create/Edit Quote Dialog ─────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" />
              {editingQuoteId ? 'Edit Quote' : 'Create Quote'}
            </DialogTitle>
            <DialogDescription>
              {editingQuoteId ? 'Update the quote details below' : 'Fill in the details to create a new quote'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[68vh] pr-1">
            <div className="space-y-5 pr-3">
              {/* Title & Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quote Title *</Label>
                  <Input
                    placeholder="e.g., Window Cleaning"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={form.customerId}
                    onValueChange={(val) => {
                      const customer = customers.find((c) => c.id === val);
                      setForm((prev) => ({ ...prev, customerId: val, customerName: customer?.name || '' }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 ? (
                        <SelectItem value="_none" disabled>No customers available</SelectItem>
                      ) : (
                        customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Quote description or notes..."
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <Separator />

              {/* ── Services Section ────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ShoppingCart className="size-4 text-emerald-600" /> Services
                  </Label>
                  <Button
                    variant="ghost" size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs"
                    onClick={handleAddServiceItem}
                  >
                    <PlusCircle className="size-3.5 mr-1" /> Add Service
                  </Button>
                </div>

                <div className="space-y-2">
                  {form.services.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_70px_90px_32px] gap-2 items-center">
                      <Select
                        value={item.serviceId}
                        onValueChange={(val) => handleServiceSelect(item.id, val)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MOCK_SERVICE_CATALOG.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} — {format(s.basePrice)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min={1}
                        value={item.quantity}
                        onChange={(e) => handleServiceFieldChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-8 text-sm"
                        placeholder="Qty"
                      />
                      <Input
                        type="number" min={0}
                        value={item.price}
                        onChange={(e) => handleServiceFieldChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                        placeholder="Price"
                      />
                      <div className="text-right text-sm font-medium pr-1">
                        {format(item.price * item.quantity)}
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        disabled={form.services.length <= 1}
                        onClick={() => handleRemoveServiceItem(item.id)}
                      >
                        <MinusCircle className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* ── Add-ons Section ─────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <PlusCircle className="size-4 text-emerald-600" /> Add-ons
                  </Label>
                  <Button
                    variant="ghost" size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs"
                    onClick={handleAddAddOn}
                  >
                    <PlusCircle className="size-3.5 mr-1" /> Add Add-on
                  </Button>
                </div>

                {form.addOns.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No add-ons added yet</p>
                ) : (
                  <div className="space-y-2">
                    {form.addOns.map((addon) => (
                      <div key={addon.id} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">
                        <Input
                          placeholder="Add-on name"
                          value={addon.name}
                          onChange={(e) => handleAddOnChange(addon.id, 'name', e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number" min={0}
                          value={addon.price}
                          onChange={(e) => handleAddOnChange(addon.id, 'price', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          placeholder="Price"
                        />
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => handleRemoveAddOn(addon.id)}
                        >
                          <MinusCircle className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Discount Section ────────────────────────────── */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="size-4 text-emerald-600" /> Discount
                </Label>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select
                      value={form.discountType}
                      onValueChange={(val: 'fixed' | 'percentage') => setForm((prev) => ({ ...prev, discountType: val }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount ({symbol})</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Value</Label>
                    <Input
                      type="number" min={0}
                      value={form.discountValue}
                      onChange={(e) => setForm((prev) => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Tax Section ─────────────────────────────────── */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Percent className="size-4 text-emerald-600" /> Tax
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number" min={0} max={100}
                    value={form.taxRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                    className="h-8 text-sm w-24"
                  />
                  <span className="text-sm text-muted-foreground">% rate</span>
                  <span className="text-sm ml-auto font-medium">{format(formSummary.tax)}</span>
                </div>
              </div>

              <Separator />

              {/* ── Summary ─────────────────────────────────────── */}
              <div className="rounded-lg border bg-emerald-50/50 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-1.5">
                  <Calculator className="size-4" /> Summary
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (services + add-ons)</span>
                  <span className="font-medium">{format(formSummary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount {form.discountType === 'percentage' ? `(${form.discountValue}%)` : ''}
                  </span>
                  <span className="font-medium text-red-600">-{format(formSummary.discount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({form.taxRate}%)</span>
                  <span className="font-medium">+{format(formSummary.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-emerald-700">{format(formSummary.total)}</span>
                </div>
              </div>

              <Separator />

              {/* ── Valid Until ─────────────────────────────────── */}
              <div className="space-y-2">
                <Label>Valid Until *</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                  className="w-full sm:w-48"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              {form.customerId && form.title && (
                <Button
                  variant="outline"
                  className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => {
                    const summary = calcSummary(form.services, form.addOns, form.discountType, form.discountValue, form.taxRate);
                    const customer = customers.find((c) => c.id === form.customerId);
                    const previewQuote: Quote = {
                      id: 'preview', title: form.title, description: form.description,
                      customerName: customer?.name || form.customerName,
                      customerId: form.customerId, customerPhone: customer?.phone,
                      services: form.services, addOns: form.addOns,
                      ...summary,
                      discountType: form.discountType, discountValue: form.discountValue, taxRate: form.taxRate,
                      status: 'draft', validUntil: form.validUntil, whatsappSent: false,
                      createdAt: new Date().toISOString().split('T')[0],
                      currency: currency, exchangeRate: 1, baseCurrency: currency, baseAmount: summary.total,
                    };
                    setSelectedQuote(previewQuote);
                    setShowPreviewDialog(true);
                  }}
                >
                  <MessageCircle className="size-4 mr-1.5" /> Preview WhatsApp
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveQuote} disabled={saving}>
                {saving ? 'Saving...' : editingQuoteId ? 'Update Quote' : 'Create Quote'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

                  {selectedQuote.whatsappSent && (
                    <div className="rounded-lg border bg-green-50 p-3 text-sm flex items-center gap-2">
                      <MessageCircle className="size-4 text-green-600" />
                      <span className="text-green-700">Quote sent via WhatsApp</span>
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
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => handleSendWhatsApp(selectedQuote)}
                  >
                    <MessageCircle className="size-4 mr-1.5" /> Send WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowDetailDialog(false); openPreviewDialog(selectedQuote); }}
                  >
                    <Eye className="size-4 mr-1.5" /> WhatsApp Preview
                  </Button>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { setShowDetailDialog(false); openEditDialog(selectedQuote); }}
                >
                  <Edit3 className="size-4 mr-1.5" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── WhatsApp Preview Dialog ──────────────────────────────── */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-emerald-600" />
              WhatsApp Preview
            </DialogTitle>
            <DialogDescription>
              How this quote will appear when sent via WhatsApp
            </DialogDescription>
          </DialogHeader>
          <WhatsAppPreview quote={selectedQuote} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Close</Button>
            {selectedQuote && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { handleSendWhatsApp(selectedQuote); setShowPreviewDialog(false); }}
              >
                <Send className="size-4 mr-1.5" /> Send via WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

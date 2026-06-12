'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FileText, Plus, Search, Send, MoreHorizontal, DollarSign,
  Clock, CheckCircle2, AlertCircle, XCircle, Eye, Trash2,
  X, PlusCircle, MinusCircle, ArrowUpDown, ChevronUp, ChevronDown,
  CalendarDays, Calculator, MessageCircle, Phone, ShoppingCart, Tag,
  Percent, Receipt, Copy, Edit3,
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

const MOCK_CUSTOMERS = [
  { id: 'c1', name: 'John Smith', phone: '+447911123456' },
  { id: 'c2', name: 'Sarah Johnson', phone: '+447922234567' },
  { id: 'c3', name: 'Mike Chen', phone: '+447933345678' },
  { id: 'c4', name: 'Emma Wilson', phone: '+447944456789' },
  { id: 'c5', name: 'Robert Brown', phone: '+447955567890' },
  { id: 'c6', name: 'Lisa Park', phone: '+447966678901' },
];

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

const MOCK_QUOTES: Quote[] = [
  {
    id: 'q1', title: 'Window Cleaning', description: 'Full window cleaning service for residential property',
    customerName: 'John Smith', customerId: 'c1', customerPhone: '+447911123456',
    services: [
      { id: 'qs1', serviceId: 's1', name: 'Window Cleaning', price: 120, quantity: 1 },
      { id: 'qs2', serviceId: 's2', name: 'Gutter Cleaning', price: 80, quantity: 1 },
    ],
    addOns: [{ id: 'qa1', name: 'Solar Panel Cleaning', price: 50 }],
    subtotal: 250, discountType: 'fixed', discountValue: 0, discount: 0, taxRate: 20, tax: 50, total: 300,
    status: 'sent', validUntil: '2025-03-20', whatsappSent: true, createdAt: '2025-03-05',
  },
  {
    id: 'q2', title: 'Deep Clean + Carpet', description: 'Full deep clean and carpet steam cleaning',
    customerName: 'Sarah Johnson', customerId: 'c2', customerPhone: '+447922234567',
    services: [
      { id: 'qs3', serviceId: 's3', name: 'Deep House Cleaning', price: 250, quantity: 1 },
      { id: 'qs4', serviceId: 's4', name: 'Carpet Cleaning', price: 150, quantity: 2 },
    ],
    addOns: [],
    subtotal: 550, discountType: 'percentage', discountValue: 10, discount: 55, taxRate: 20, tax: 99, total: 594,
    status: 'accepted', validUntil: '2025-04-01', whatsappSent: true, createdAt: '2025-03-01',
  },
  {
    id: 'q3', title: 'Plumbing Repair', description: '',
    customerName: 'Mike Chen', customerId: 'c3', customerPhone: '+447933345678',
    services: [{ id: 'qs5', serviceId: 's5', name: 'Plumbing Repair', price: 95, quantity: 1 }],
    addOns: [],
    subtotal: 95, discountType: 'fixed', discountValue: 0, discount: 0, taxRate: 20, tax: 19, total: 114,
    status: 'draft', validUntil: '2025-04-15', whatsappSent: false, createdAt: '2025-03-10',
  },
  {
    id: 'q4', title: 'Full Property Maintenance', description: 'Complete property maintenance package',
    customerName: 'Emma Wilson', customerId: 'c4', customerPhone: '+447944456789',
    services: [
      { id: 'qs6', serviceId: 's6', name: 'Electrical Work', price: 120, quantity: 1 },
      { id: 'qs7', serviceId: 's5', name: 'Plumbing Repair', price: 95, quantity: 2 },
      { id: 'qs8', serviceId: 's10', name: 'Garden Maintenance', price: 75, quantity: 1 },
    ],
    addOns: [{ id: 'qa2', name: 'Emergency Callout Fee', price: 150 }],
    subtotal: 535, discountType: 'fixed', discountValue: 35, discount: 35, taxRate: 20, tax: 100, total: 600,
    status: 'rejected', validUntil: '2025-03-01', whatsappSent: true, createdAt: '2025-02-15',
  },
  {
    id: 'q5', title: 'Pest Control', description: 'Full pest control treatment',
    customerName: 'Robert Brown', customerId: 'c5', customerPhone: '+447955567890',
    services: [{ id: 'qs9', serviceId: 's8', name: 'Pest Control Treatment', price: 180, quantity: 1 }],
    addOns: [{ id: 'qa3', name: 'Follow-up Visit', price: 75 }],
    subtotal: 255, discountType: 'fixed', discountValue: 0, discount: 0, taxRate: 20, tax: 51, total: 306,
    status: 'expired', validUntil: '2025-02-28', whatsappSent: true, createdAt: '2025-02-01',
  },
  {
    id: 'q6', title: 'Painting Service', description: 'Two room painting',
    customerName: 'Lisa Park', customerId: 'c6', customerPhone: '+447966678901',
    services: [{ id: 'qs10', serviceId: 's9', name: 'Painting (per room)', price: 350, quantity: 2 }],
    addOns: [{ id: 'qa4', name: 'Wallpaper Removal', price: 200 }],
    subtotal: 900, discountType: 'percentage', discountValue: 5, discount: 45, taxRate: 20, tax: 171, total: 1026,
    status: 'sent', validUntil: '2025-04-10', whatsappSent: false, createdAt: '2025-03-08',
  },
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

function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
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

// ============================================================
// WhatsApp Preview Component
// ============================================================

function WhatsAppPreview({ quote }: { quote: Quote | null }) {
  if (!quote) return null;
  return (
    <div className="bg-[#e5ddd5] dark:bg-[#1f2c34] rounded-lg p-4 max-w-sm mx-auto">
      <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg p-3 shadow-sm">
        <p className="font-bold text-sm">*Quote: {quote.title}*</p>
        <p className="text-sm mt-1">Customer: {quote.customerName}</p>
        <p className="text-sm mt-2">Services:</p>
        {quote.services.map((s) => (
          <p key={s.id} className="text-sm">✓ {s.name} ({formatGBP(s.price * s.quantity)})</p>
        ))}
        {quote.addOns.length > 0 && (
          <>
            <p className="text-sm mt-2">Add-ons:</p>
            {quote.addOns.map((a) => (
              <p key={a.id} className="text-sm">✓ {a.name} ({formatGBP(a.price)})</p>
            ))}
          </>
        )}
        <Separator className="my-2 bg-black/10 dark:bg-white/10" />
        <p className="text-sm">Subtotal: {formatGBP(quote.subtotal)}</p>
        {quote.discount > 0 && <p className="text-sm">Discount: -{formatGBP(quote.discount)}</p>}
        <p className="text-sm">Tax ({quote.taxRate}%): {formatGBP(quote.tax)}</p>
        <p className="font-bold text-sm">*Total: {formatGBP(quote.total)}*</p>
        <p className="text-xs mt-2 opacity-70">Valid until: {formatShortDate(quote.validUntil)}</p>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function QuotesView() {
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const [form, setForm] = useState<QuoteFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

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
    setShowCreateDialog(true);
  };

  const openDetailDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowDetailDialog(true);
  };

  const openPreviewDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowPreviewDialog(true);
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

  const handleSaveQuote = () => {
    if (!form.title.trim()) { toast.error('Quote title is required'); return; }
    if (!form.customerId) { toast.error('Please select a customer'); return; }
    if (!form.validUntil) { toast.error('Please set a valid-until date'); return; }
    if (form.services.length === 0 || form.services.every((s) => !s.name.trim())) {
      toast.error('Add at least one service');
      return;
    }

    setSaving(true);
    setTimeout(() => {
      const customer = MOCK_CUSTOMERS.find((c) => c.id === form.customerId);
      const summary = calcSummary(form.services, form.addOns, form.discountType, form.discountValue, form.taxRate);

      if (editingQuoteId) {
        setQuotes((prev) => prev.map((q) => q.id === editingQuoteId ? {
          ...q,
          title: form.title, description: form.description,
          customerName: customer?.name || form.customerName,
          customerId: form.customerId,
          customerPhone: customer?.phone,
          services: form.services, addOns: form.addOns,
          ...summary,
          discountType: form.discountType, discountValue: form.discountValue, taxRate: form.taxRate,
          validUntil: form.validUntil,
        } : q));
        toast.success('Quote updated successfully');
      } else {
        const newQuote: Quote = {
          id: `q_${Date.now()}`,
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
          createdAt: new Date().toISOString().split('T')[0],
        };
        setQuotes((prev) => [newQuote, ...prev]);
        toast.success('Quote created successfully');
      }

      setSaving(false);
      setShowCreateDialog(false);
      setEditingQuoteId(null);
    }, 400);
  };

  const handleStatusChange = (quoteId: string, newStatus: QuoteStatus) => {
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: newStatus } : q));
    if (selectedQuote?.id === quoteId) {
      setSelectedQuote((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    toast.success(`Quote marked as ${STATUS_CONFIG[newStatus].label}`);
  };

  const handleDeleteQuote = (quoteId: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    if (selectedQuote?.id === quoteId) {
      setShowDetailDialog(false);
      setSelectedQuote(null);
    }
    toast.success('Quote deleted');
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

  const handleDuplicateQuote = (quote: Quote) => {
    const duplicate: Quote = {
      ...quote,
      id: `q_${Date.now()}`,
      title: `${quote.title} (Copy)`,
      status: 'draft',
      whatsappSent: false,
      createdAt: new Date().toISOString().split('T')[0],
      services: quote.services.map((s) => ({ ...s, id: `qs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` })),
      addOns: quote.addOns.map((a) => ({ ...a, id: `qa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` })),
    };
    setQuotes((prev) => [duplicate, ...prev]);
    toast.success('Quote duplicated');
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
            <h1 className="text-2xl font-bold tracking-tight">Quotes</h1>
            <p className="text-sm text-muted-foreground">Create, send, and track quotes</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
          <Plus className="size-4 mr-1.5" /> Create Quote
        </Button>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Value', value: formatGBP(stats.totalValue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Accepted', value: formatGBP(stats.acceptedValue), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { title: 'Pending', value: formatGBP(stats.sentValue), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
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
      {filteredQuotes.length === 0 ? (
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
                      onClick={() => openDetailDialog(quote)}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          {quote.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{quote.customerName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatGBP(quote.total)}</TableCell>
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
                            <DropdownMenuItem onClick={() => openDetailDialog(quote)}>
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
                      const customer = MOCK_CUSTOMERS.find((c) => c.id === val);
                      setForm((prev) => ({ ...prev, customerId: val, customerName: customer?.name || '' }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CUSTOMERS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
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
                              {s.name} — {formatGBP(s.basePrice)}
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
                        {formatGBP(item.price * item.quantity)}
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
                        <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
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
                  <span className="text-sm ml-auto font-medium">{formatGBP(formSummary.tax)}</span>
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
                  <span className="font-medium">{formatGBP(formSummary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount {form.discountType === 'percentage' ? `(${form.discountValue}%)` : ''}
                  </span>
                  <span className="font-medium text-red-600">-{formatGBP(formSummary.discount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({form.taxRate}%)</span>
                  <span className="font-medium">+{formatGBP(formSummary.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-emerald-700">{formatGBP(formSummary.total)}</span>
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
                    const customer = MOCK_CUSTOMERS.find((c) => c.id === form.customerId);
                    const previewQuote: Quote = {
                      id: 'preview', title: form.title, description: form.description,
                      customerName: customer?.name || form.customerName,
                      customerId: form.customerId, customerPhone: customer?.phone,
                      services: form.services, addOns: form.addOns,
                      ...summary,
                      discountType: form.discountType, discountValue: form.discountValue, taxRate: form.taxRate,
                      status: 'draft', validUntil: form.validUntil, whatsappSent: false,
                      createdAt: new Date().toISOString().split('T')[0],
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
                              <TableCell className="text-sm py-2 text-right">{formatGBP(s.price)}</TableCell>
                              <TableCell className="text-sm py-2 text-right font-medium">{formatGBP(s.price * s.quantity)}</TableCell>
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
                          <span className="font-medium">{formatGBP(a.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatGBP(selectedQuote.subtotal)}</span>
                      </div>
                      {selectedQuote.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Discount {selectedQuote.discountType === 'percentage' ? `(${selectedQuote.discountValue}%)` : ''}
                          </span>
                          <span className="text-red-600">-{formatGBP(selectedQuote.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({selectedQuote.taxRate}%)</span>
                        <span>{formatGBP(selectedQuote.tax)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-emerald-700">{formatGBP(selectedQuote.total)}</span>
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
    </div>
  );
}

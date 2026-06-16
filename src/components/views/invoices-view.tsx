'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
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
  Globe,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatCurrency, convertCurrency, CURRENCIES as SHARED_CURRENCIES, currencySymbol, getExchangeRate } from '@/lib/currency';

// ============================================================
// Types
// ============================================================

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  customerId: string;
  lineItems: LineItem[];
  subtotal: number;
  taxPercent: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  notes: string;
  jobId?: string;
  jobTitle?: string;
  currency?: string;       // Transaction currency
  exchangeRate?: number;   // Rate at creation
  baseCurrency?: string;   // Base currency at creation
  baseAmount?: number;     // Amount in base currency
}

interface InvoiceFormData {
  customer: string;
  lineItems: LineItem[];
  taxPercent: number;
  discount: number;
  dueDate: string;
  notes: string;
}

// ============================================================
// Constants
// ============================================================

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: <FileText className="size-3" /> },
  sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Send className="size-3" /> },
  paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
  overdue: { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <AlertCircle className="size-3" /> },
};

const CUSTOMERS = [
  { id: 'c1', name: 'Sharma Electronics' },
  { id: 'c2', name: 'Patel Logistics' },
  { id: 'c3', name: 'Kumar Services' },
  { id: 'c4', name: 'Singh & Associates' },
  { id: 'c5', name: 'Gupta Interiors' },
  { id: 'c6', name: 'Mehta Consulting' },
  { id: 'c7', name: 'Reddy Constructions' },
  { id: 'c8', name: 'Joshi Home Care' },
];

const VIEW_CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-001',
    customer: 'Sharma Electronics',
    customerId: 'c1',
    lineItems: [
      { id: 'li1', description: 'AC Installation', quantity: 2, rate: 4500 },
      { id: 'li2', description: 'Copper Piping', quantity: 1, rate: 1500 },
    ],
    subtotal: 10500,
    taxPercent: 18,
    discount: 500,
    total: 11940,
    status: 'paid',
    dueDate: '2025-02-15',
    createdAt: '2025-01-15',
    notes: 'Thank you for your business!',
    jobId: 'job1',
    jobTitle: 'AC Installation at Shop',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 11940,
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-002',
    customer: 'Patel Logistics',
    customerId: 'c2',
    lineItems: [
      { id: 'li3', description: 'Warehouse Deep Cleaning', quantity: 1, rate: 18000 },
      { id: 'li4', description: 'Sanitization Service', quantity: 1, rate: 5500 },
    ],
    subtotal: 23500,
    taxPercent: 18,
    discount: 0,
    total: 27730,
    status: 'sent',
    dueDate: '2025-02-20',
    createdAt: '2025-01-20',
    notes: 'Payment due within 30 days.',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 27730,
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-003',
    customer: 'Kumar Services',
    customerId: 'c3',
    lineItems: [
      { id: 'li5', description: 'Plumbing Repair', quantity: 1, rate: 4200 },
      { id: 'li6', description: 'Pipe Replacement', quantity: 3, rate: 1200 },
    ],
    subtotal: 7800,
    taxPercent: 18,
    discount: 200,
    total: 8984,
    status: 'overdue',
    dueDate: '2025-01-28',
    createdAt: '2024-12-28',
    notes: 'Overdue — please remit payment immediately.',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 8984,
  },
  {
    id: 'inv4',
    invoiceNumber: 'INV-004',
    customer: 'Singh & Associates',
    customerId: 'c4',
    lineItems: [
      { id: 'li7', description: 'Office Electrical Work', quantity: 1, rate: 25000 },
      { id: 'li8', description: 'Cable Management', quantity: 1, rate: 8000 },
      { id: 'li9', description: 'Safety Inspection', quantity: 1, rate: 3500 },
    ],
    subtotal: 36500,
    taxPercent: 18,
    discount: 1000,
    total: 42070,
    status: 'draft',
    dueDate: '2025-02-25',
    createdAt: '2025-01-25',
    notes: '',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 42070,
  },
  {
    id: 'inv5',
    invoiceNumber: 'INV-005',
    customer: 'Gupta Interiors',
    customerId: 'c5',
    lineItems: [
      { id: 'li10', description: 'Home Cleaning Service', quantity: 4, rate: 2500 },
    ],
    subtotal: 10000,
    taxPercent: 18,
    discount: 0,
    total: 11800,
    status: 'paid',
    dueDate: '2025-02-10',
    createdAt: '2025-01-10',
    notes: 'Recurring monthly service.',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 11800,
  },
  {
    id: 'inv6',
    invoiceNumber: 'INV-006',
    customer: 'Mehta Consulting',
    customerId: 'c6',
    lineItems: [
      { id: 'li11', description: 'Pest Control Treatment', quantity: 1, rate: 6500 },
      { id: 'li12', description: 'Follow-up Visit', quantity: 1, rate: 2500 },
    ],
    subtotal: 9000,
    taxPercent: 18,
    discount: 300,
    total: 10320,
    status: 'sent',
    dueDate: '2025-03-01',
    createdAt: '2025-02-01',
    notes: '',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 10320,
  },
  {
    id: 'inv7',
    invoiceNumber: 'INV-007',
    customer: 'Reddy Constructions',
    customerId: 'c7',
    lineItems: [
      { id: 'li13', description: 'HVAC Maintenance', quantity: 2, rate: 7500 },
      { id: 'li14', description: 'Filter Replacement', quantity: 4, rate: 800 },
    ],
    subtotal: 18200,
    taxPercent: 18,
    discount: 500,
    total: 20976,
    status: 'paid',
    dueDate: '2025-01-30',
    createdAt: '2024-12-30',
    notes: 'Annual maintenance contract.',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 20976,
  },
  {
    id: 'inv8',
    invoiceNumber: 'INV-008',
    customer: 'Joshi Home Care',
    customerId: 'c8',
    lineItems: [
      { id: 'li15', description: 'Moving Service - 2BHK', quantity: 1, rate: 12000 },
      { id: 'li16', description: 'Packing Materials', quantity: 1, rate: 3500 },
    ],
    subtotal: 15500,
    taxPercent: 18,
    discount: 0,
    total: 18290,
    status: 'draft',
    dueDate: '2025-03-05',
    createdAt: '2025-02-05',
    notes: 'Client requested weekend slot.',
    currency: 'INR',
    exchangeRate: 1,
    baseCurrency: 'INR',
    baseAmount: 18290,
  },
];

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

// ============================================================
// Helpers
// ============================================================

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
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
 * Convert an amount from the invoice's original currency to the view currency.
 * Uses the stored exchange rate if available, otherwise uses current rates.
 */
function convertToViewCurrency(amount: number, invoice: Invoice, viewCurrency: string): number {
  const invoiceCurrency = invoice.currency || 'INR';
  return convertCurrency(amount, invoiceCurrency, viewCurrency, invoice.exchangeRate);
}

// ============================================================
// Component
// ============================================================

export function InvoicesView() {
  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);

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
  const [saving, setSaving] = useState(false);

  // Currency state
  const [viewCurrency, setViewCurrency] = useState<string>('INR');
  const [baseCurrency, setBaseCurrency] = useState<string>('INR');
  const baseCurrencyFetched = useRef(false);

  // Fetch tenant base currency on mount
  useEffect(() => {
    if (baseCurrencyFetched.current) return;
    baseCurrencyFetched.current = true;

    fetch('/api/settings/currency')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (data?.baseCurrency) {
          setBaseCurrency(data.baseCurrency);
          setViewCurrency(data.baseCurrency);
        }
      })
      .catch(() => {
        // Silently use default INR
      });
  }, []);

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
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customer.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'invoiceNumber': valA = a.invoiceNumber; valB = b.invoiceNumber; break;
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
    const totalRevenue = invoices.reduce((s, i) => s + convertToViewCurrency(i.total, i, viewCurrency), 0);
    const paidAmount = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + convertToViewCurrency(i.total, i, viewCurrency), 0);
    const sentAmount = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + convertToViewCurrency(i.total, i, viewCurrency), 0);
    const overdueAmount = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + convertToViewCurrency(i.total, i, viewCurrency), 0);
    const draftCount = invoices.filter((i) => i.status === 'draft').length;
    return { totalRevenue, paidAmount, sentAmount, overdueAmount, draftCount };
  }, [invoices, viewCurrency]);

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

  const handleCreateInvoice = () => {
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
    setTimeout(() => {
      const subtotal = calcSubtotal(form.lineItems);
      const total = calcTotal(subtotal, form.taxPercent, form.discount);
      const nextNum = invoices.length + 1;
      const newInvoice: Invoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: `INV-${String(nextNum).padStart(3, '0')}`,
        customer: CUSTOMERS.find((c) => c.id === form.customer)?.name || form.customer,
        customerId: form.customer,
        lineItems: form.lineItems,
        subtotal,
        taxPercent: form.taxPercent,
        discount: form.discount,
        total,
        status: 'draft',
        dueDate: form.dueDate,
        createdAt: new Date().toISOString().split('T')[0],
        notes: form.notes,
        currency: baseCurrency,
        exchangeRate: 1,
        baseCurrency: baseCurrency,
        baseAmount: total,
      };
      setInvoices((prev) => [newInvoice, ...prev]);
      setSaving(false);
      setShowCreateDialog(false);
      toast.success('Invoice created successfully');
    }, 500);
  };

  const handleStatusChange = (invoiceId: string, newStatus: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv))
    );
    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    toast.success(`Invoice marked as ${STATUS_CONFIG[newStatus].label}`);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    if (selectedInvoice?.id === invoiceId) {
      setShowDetailDialog(false);
      setSelectedInvoice(null);
    }
    toast.success('Invoice deleted');
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    const nextNum = invoices.length + 1;
    const duplicate: Invoice = {
      ...invoice,
      id: `inv_${Date.now()}`,
      invoiceNumber: `INV-${String(nextNum).padStart(3, '0')}`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      lineItems: invoice.lineItems.map((li) => ({
        ...li,
        id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      })),
    };
    setInvoices((prev) => [duplicate, ...prev]);
    toast.success('Invoice duplicated');
  };

  // Form calculations
  const formSubtotal = calcSubtotal(form.lineItems);
  const formTax = formSubtotal * (form.taxPercent / 100);
  const formTotal = calcTotal(formSubtotal, form.taxPercent, form.discount);

  // ============================================================
  // Render helpers
  // ============================================================

  const renderStatusBadge = (status: InvoiceStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${config.bg} ${config.text} ${config.border}`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  /**
   * Format a monetary amount from an invoice in the current view currency.
   * Handles conversion from the invoice's original currency to the view currency.
   */
  const fmtCurrency = (amount: number, invoice?: Invoice) => {
    if (invoice && invoice.currency && invoice.currency !== viewCurrency) {
      const converted = convertToViewCurrency(amount, invoice, viewCurrency);
      return formatCurrency(converted, viewCurrency);
    }
    return formatCurrency(amount, viewCurrency);
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
        <div className="flex items-center gap-3">
          {/* View Currency Selector */}
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5 text-muted-foreground" />
            <Select value={viewCurrency} onValueChange={setViewCurrency}>
              <SelectTrigger className="h-8 w-[90px] text-xs">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span className="text-xs">{currencySymbol(viewCurrency)}</span>
                    <span>{viewCurrency}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VIEW_CURRENCY_OPTIONS.map((code) => (
                  <SelectItem key={code} value={code}>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium">{currencySymbol(code)}</span>
                      <span>{code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue, viewCurrency), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Pending', value: formatCurrency(stats.sentAmount, viewCurrency), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'Paid', value: formatCurrency(stats.paidAmount, viewCurrency), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { title: 'Overdue', value: formatCurrency(stats.overdueAmount, viewCurrency), icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
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
      {filteredInvoices.length === 0 ? (
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
                  {filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetailDialog(invoice)}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          {invoice.invoiceNumber}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{invoice.customer}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {fmtCurrency(invoice.subtotal, invoice)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                        {invoice.taxPercent}%
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold hidden lg:table-cell">
                        {fmtCurrency(invoice.total, invoice)}
                      </TableCell>
                      <TableCell>{renderStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {formatShortDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openDetailDialog(invoice)}>
                              <Eye className="size-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
                                <Send className="size-3.5 mr-2" /> Send Invoice
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                <CheckCircle2 className="size-3.5 mr-2" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicateInvoice(invoice)}>
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
                  ))}
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
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMERS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
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
                    <span>Rate ({currencySymbol(viewCurrency)})</span>
                    <span className="text-right">Amount</span>
                    <span></span>
                  </div>

                  {form.lineItems.map((item, idx) => (
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
                        {formatCurrency(item.quantity * item.rate, viewCurrency)}
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
                    <span className="font-medium">{formatCurrency(formSubtotal, viewCurrency)}</span>
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
                      <span className="font-medium ml-2">{formatCurrency(formTax, viewCurrency)}</span>
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
                      <span className="font-medium ml-2">-{formatCurrency(form.discount, viewCurrency)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-emerald-700">{formatCurrency(formTotal, viewCurrency)}</span>
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
              {saving ? 'Creating...' : 'Create Invoice'}
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
                  {selectedInvoice.invoiceNumber}
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
                    </div>
                  </div>

                  {/* Linked Job */}
                  {selectedInvoice.jobTitle && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <span className="text-muted-foreground">Linked Job: </span>
                      <span className="font-medium">{selectedInvoice.jobTitle}</span>
                    </div>
                  )}

                  {/* Exchange Rate Note */}
                  {selectedInvoice.currency && selectedInvoice.currency !== viewCurrency && (
                    <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 text-sm">
                      <div className="flex items-center gap-2 font-medium text-amber-800">
                        <Globe className="size-4" />
                        Currency Conversion
                      </div>
                      <p className="mt-1 text-amber-700">
                        Original: {formatCurrency(selectedInvoice.total, selectedInvoice.currency)} {selectedInvoice.currency} → Viewed in: {fmtCurrency(selectedInvoice.total, selectedInvoice)} {viewCurrency}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-600">
                        Rate: 1 {viewCurrency} = {getExchangeRate(viewCurrency, selectedInvoice.currency).toFixed(2)} {selectedInvoice.currency}
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
                          {selectedInvoice.lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm py-2">{item.description}</TableCell>
                              <TableCell className="text-sm py-2 text-right">{item.quantity}</TableCell>
                              <TableCell className="text-sm py-2 text-right">{fmtCurrency(item.rate, selectedInvoice)}</TableCell>
                              <TableCell className="text-sm py-2 text-right font-medium">
                                {fmtCurrency(item.quantity * item.rate, selectedInvoice)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{fmtCurrency(selectedInvoice.subtotal, selectedInvoice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({selectedInvoice.taxPercent}%)</span>
                        <span>{fmtCurrency(selectedInvoice.subtotal * selectedInvoice.taxPercent / 100, selectedInvoice)}</span>
                      </div>
                      {selectedInvoice.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span>-{fmtCurrency(selectedInvoice.discount, selectedInvoice)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-emerald-700">{fmtCurrency(selectedInvoice.total, selectedInvoice)}</span>
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
                <div className="flex gap-2 flex-1">
                  {selectedInvoice.status === 'draft' && (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleStatusChange(selectedInvoice.id, 'sent')}
                    >
                      <Send className="size-4 mr-1.5" /> Send
                    </Button>
                  )}
                  {selectedInvoice.status !== 'paid' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleStatusChange(selectedInvoice.id, 'paid')}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" /> Mark as Paid
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => toast.info('PDF download coming soon')}
                  >
                    <Download className="size-4 mr-1.5" /> Download PDF
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
    </div>
  );
}

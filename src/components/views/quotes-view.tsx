'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  FileText, Plus, Search, Send, CheckCircle2, XCircle,
  DollarSign, Clock, TrendingUp, BarChart3, MessageCircle,
  Mail, Copy, ArrowRight, PlusCircle, MinusCircle,
  MoreHorizontal, Eye, Trash2,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Types ──────────────────────────────────────────────────────────────────

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'won' | 'expired' | 'job_created';

interface LineItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  itemsJson: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: QuoteStatus;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  validUntil?: string;
  sentVia?: string;
  createdAt: string;
  version: number;
  notesJson?: string;
}

interface QuoteFormData {
  title: string;
  description: string;
  customerId: string;
  lineItems: LineItem[];
  taxRate: number;
  discount: number;
  validUntil: string;
  notes: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  sent: { label: 'Sent', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  accepted: { label: 'Accepted', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  won: { label: 'Won', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  expired: { label: 'Expired', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  job_created: { label: 'Job Created', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const PIPELINE_STAGES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'won', 'job_created'];

const EMPTY_LINE = (): LineItem => ({ name: '', quantity: 1, unitPrice: 0 });

const EMPTY_FORM = (): QuoteFormData => ({
  title: '',
  description: '',
  customerId: '',
  lineItems: [EMPTY_LINE()],
  taxRate: 0,
  discount: 0,
  validUntil: '',
  notes: '',
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}

function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function calcTotal(subtotal: number, tax: number, discount: number): number {
  return subtotal + tax - discount;
}

function parseLineItems(itemsJson: string): LineItem[] {
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuotesView() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [form, setForm] = useState<QuoteFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await authFetch(`/api/quotes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch quotes');
      const data = await res.json();
      setQuotes(data.quotes || data || []);
    } catch {
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/customers?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setCustomers(data.customers || data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ─── Computed Stats ─────────────────────────────────────────────────────

  const stats = useCallback(() => {
    const total = quotes.length;
    const sent = quotes.filter((q) => q.status === 'sent').length;
    const accepted = quotes.filter((q) => ['accepted', 'won', 'job_created'].includes(q.status)).length;
    const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const revenue = quotes.filter((q) => ['accepted', 'won', 'job_created'].includes(q.status)).reduce((s, q) => s + q.total, 0);
    return { total, sent, accepted, conversionRate, revenue };
  }, [quotes]);

  const pipelineCounts = PIPELINE_STAGES.reduce<Record<string, number>>((acc, stage) => {
    acc[stage] = quotes.filter((q) => q.status === stage).length;
    return acc;
  }, {});

  // ─── Handlers ──────────────────────────────────────────────────────────

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return (
      <Badge variant="outline" className={`text-[10px] h-5 ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </Badge>
    );
  };

  const openCreateDialog = () => { setForm(EMPTY_FORM()); setShowCreateDialog(true); };

  const openDetailDialog = (quote: Quote) => { setSelectedQuote(quote); setShowDetailDialog(true); };

  const handleAddLineItem = () => {
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, EMPTY_LINE()] }));
  };

  const handleRemoveLineItem = (index: number) => {
    setForm((prev) => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== index) }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li, i) => (i === index ? { ...li, [field]: value } : li)),
    }));
  };

  const handleCreateQuote = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.validUntil) { toast.error('Please set a valid-until date'); return; }
    if (form.lineItems.length === 0 || form.lineItems.every((li) => !li.name.trim())) {
      toast.error('Add at least one line item'); return;
    }
    setSaving(true);
    try {
      const subtotal = calcSubtotal(form.lineItems);
      const tax = subtotal * (form.taxRate / 100);
      const total = calcTotal(subtotal, tax, form.discount);
      const customer = customers.find((c) => c.id === form.customerId);

      const res = await authFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          itemsJson: JSON.stringify(form.lineItems),
          tax,
          discount: form.discount,
          subtotal,
          total,
          customerId: form.customerId || null,
          customerName: customer?.name || null,
          customerEmail: customer?.email || null,
          validUntil: form.validUntil,
          notesJson: JSON.stringify([{ text: form.notes, date: new Date().toISOString() }]),
        }),
      });
      if (!res.ok) throw new Error('Failed to create quote');
      toast.success('Quote created successfully');
      setShowCreateDialog(false);
      fetchQuotes();
    } catch {
      toast.error('Failed to create quote');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus) => {
    try {
      const res = await authFetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update quote');
      toast.success(`Quote marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchQuotes();
      if (selectedQuote?.id === quoteId) {
        setSelectedQuote((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch {
      toast.error('Failed to update quote status');
    }
  };

  const handleSendQuote = async (quote: Quote, via: string) => {
    try {
      const res = await authFetch(`/api/quotes/${quote.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'sent', sentVia: via }),
      });
      if (!res.ok) throw new Error('Failed to send quote');
      toast.success(`Quote sent via ${via}`);
      fetchQuotes();
    } catch {
      toast.error('Failed to send quote');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const res = await authFetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete quote');
      toast.success('Quote deleted');
      if (selectedQuote?.id === quoteId) { setShowDetailDialog(false); setSelectedQuote(null); }
      fetchQuotes();
    } catch {
      toast.error('Failed to delete quote');
    }
  };

  const handleDuplicateQuote = async (quote: Quote) => {
    try {
      const items = parseLineItems(quote.itemsJson);
      const res = await authFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          title: `${quote.title} (Copy)`,
          description: quote.description,
          itemsJson: quote.itemsJson,
          tax: quote.tax,
          discount: quote.discount,
          subtotal: quote.subtotal,
          total: quote.total,
          customerId: quote.customerId,
          customerName: quote.customerName,
          validUntil: '',
          parentQuoteId: quote.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to duplicate quote');
      toast.success('Quote duplicated');
      fetchQuotes();
    } catch {
      toast.error('Failed to duplicate quote');
    }
  };

  const handleConvertToJob = async (quote: Quote) => {
    try {
      const res = await authFetch(`/api/quotes/${quote.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'job_created' }),
      });
      if (!res.ok) throw new Error('Failed to convert quote');
      toast.success('Quote converted to job');
      fetchQuotes();
    } catch {
      toast.error('Failed to convert quote to job');
    }
  };

  const formSubtotal = calcSubtotal(form.lineItems);
  const formTax = formSubtotal * (form.taxRate / 100);
  const formTotal = calcTotal(formSubtotal, formTax, form.discount);
  const s = stats();

  // ─── Loading Skeleton ───────────────────────────────────────────────────

  if (loading && quotes.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <ViewHeader icon={FileText} iconBg="bg-emerald-600" title="Quotes & Estimates" description="Create, send, and track quotes through the pipeline" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-8 w-full" /></CardContent></Card>
        <Card><CardContent className="p-0"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={FileText}
        iconBg="bg-emerald-600"
        title="Quotes & Estimates"
        description="Create, send, and track quotes through the pipeline"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Create Quote
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Quotes', value: s.total, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Sent', value: s.sent, icon: Send, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Accepted', value: s.accepted, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Conversion Rate', value: `${s.conversionRate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Revenue', value: formatCurrency(s.revenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-xl shrink-0`}>
                    <Icon className={`size-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pipeline Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="size-4 text-emerald-600" />
            <span className="text-sm font-semibold">Quote Pipeline</span>
          </div>
          <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
            {PIPELINE_STAGES.map((stage) => {
              const count = pipelineCounts[stage] || 0;
              const pct = quotes.length > 0 ? (count / quotes.length) * 100 : 0;
              const config = STATUS_CONFIG[stage];
              return (
                <div
                  key={stage}
                  className={`flex items-center justify-center text-[10px] font-medium transition-all ${config.bg} ${config.text}`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                  title={`${config.label}: ${count}`}
                >
                  {count > 0 && <span>{count}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {PIPELINE_STAGES.map((stage) => {
              const config = STATUS_CONFIG[stage];
              return (
                <span key={stage} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`size-2 rounded-full ${config.bg} border ${config.border}`} />
                  {config.label} ({pipelineCounts[stage] || 0})
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs px-3">Draft</TabsTrigger>
            <TabsTrigger value="sent" className="text-xs px-3">Sent</TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs px-3">Accepted</TabsTrigger>
            <TabsTrigger value="won" className="text-xs px-3">Won</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes by #, title, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {quotes.length === 0 && !loading ? (
        <EmptyState
          icon={FileText}
          title="No quotes found"
          description="Try adjusting your filters or create a new quote"
          actionLabel="Create Quote"
          onAction={openCreateDialog}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Sent Via</TableHead>
                    <TableHead className="hidden sm:table-cell">Valid Until</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetailDialog(quote)}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          {quote.quoteNumber}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{quote.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {quote.customerName || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(quote.total)}</TableCell>
                      <TableCell>{renderStatusBadge(quote.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {quote.sentVia ? (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                            {quote.sentVia === 'whatsapp' ? <MessageCircle className="size-3" /> : <Mail className="size-3" />}
                            {quote.sentVia.charAt(0).toUpperCase() + quote.sentVia.slice(1)}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{formatDate(quote.validUntil)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="size-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openDetailDialog(quote)}>
                              <Eye className="size-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            {quote.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => handleSendQuote(quote, 'email')}>
                                  <Mail className="size-3.5 mr-2" /> Send via Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendQuote(quote, 'whatsapp')}>
                                  <MessageCircle className="size-3.5 mr-2" /> Send via WhatsApp
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status === 'sent' && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'accepted')}>
                                  <CheckCircle2 className="size-3.5 mr-2" /> Mark Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'rejected')}>
                                  <XCircle className="size-3.5 mr-2" /> Mark Rejected
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status === 'accepted' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'won')}>
                                <TrendingUp className="size-3.5 mr-2" /> Mark Won
                              </DropdownMenuItem>
                            )}
                            {quote.status === 'won' && (
                              <DropdownMenuItem onClick={() => handleConvertToJob(quote)}>
                                <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicateQuote(quote)}>
                              <Copy className="size-3.5 mr-2" /> Duplicate
                            </DropdownMenuItem>
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

      {/* Create Quote Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" /> Create Quote
            </DialogTitle>
            <DialogDescription>Fill in the details to create a new quote/estimate</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-5 pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input placeholder="Quote title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={form.customerId} onValueChange={(val) => setForm((p) => ({ ...p, customerId: val }))}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Quote description..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Line Items</Label>
                  <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 h-7 text-xs" onClick={handleAddLineItem}>
                    <PlusCircle className="size-3.5 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Description</span><span>Qty</span><span>Price ($)</span><span className="text-right">Amount</span><span></span>
                  </div>
                  {form.lineItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 items-center">
                      <Input placeholder="Service description" value={item.name} onChange={(e) => handleLineItemChange(idx, 'name', e.target.value)} className="h-8 text-sm" />
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => handleLineItemChange(idx, 'quantity', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                      <Input type="number" min={0} value={item.unitPrice} onChange={(e) => handleLineItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                      <div className="text-right text-sm font-medium pr-1">{formatCurrency(item.quantity * item.unitPrice)}</div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" disabled={form.lineItems.length <= 1} onClick={() => handleRemoveLineItem(idx)}>
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
                    <span className="font-medium">{formatCurrency(formSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} max={100} value={form.taxRate} onChange={(e) => setForm((p) => ({ ...p, taxRate: parseFloat(e.target.value) || 0 }))} className="h-7 w-16 text-sm text-right" />
                      <span className="text-muted-foreground">%</span>
                      <span className="font-medium ml-2">{formatCurrency(formTax)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: parseFloat(e.target.value) || 0 }))} className="h-7 w-20 text-sm text-right" />
                      <span className="font-medium ml-2">-{formatCurrency(form.discount)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-emerald-700">{formatCurrency(formTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid Until *</Label>
                  <Input type="date" value={form.validUntil} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Terms, conditions, or special notes..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="text-sm" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateQuote} disabled={saving}>
              {saving ? 'Creating...' : 'Create Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {selectedQuote && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-emerald-600" />
                  {selectedQuote.quoteNumber}
                </DialogTitle>
                <DialogDescription>{selectedQuote.title}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-1">
                <div className="space-y-5 pr-3">
                  <div className="flex items-center justify-between">
                    {renderStatusBadge(selectedQuote.status)}
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Created: {formatDate(selectedQuote.createdAt)}</p>
                      <p>Valid Until: {formatDate(selectedQuote.validUntil)}</p>
                    </div>
                  </div>

                  {selectedQuote.customerName && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      Customer: <span className="font-medium">{selectedQuote.customerName}</span>
                      {selectedQuote.customerEmail && <span className="text-muted-foreground ml-2">({selectedQuote.customerEmail})</span>}
                    </div>
                  )}

                  {selectedQuote.sentVia && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center gap-2">
                      {selectedQuote.sentVia === 'whatsapp' ? <MessageCircle className="size-4 text-emerald-600" /> : <Mail className="size-4 text-sky-600" />}
                      <span>Sent via {selectedQuote.sentVia.charAt(0).toUpperCase() + selectedQuote.sentVia.slice(1)}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Price</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parseLineItems(selectedQuote.itemsJson).map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm py-2">{item.name}</TableCell>
                              <TableCell className="text-sm py-2 text-right">{item.quantity}</TableCell>
                              <TableCell className="text-sm py-2 text-right">{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell className="text-sm py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(selectedQuote.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(selectedQuote.tax)}</span>
                      </div>
                      {selectedQuote.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span>-{formatCurrency(selectedQuote.discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-emerald-700">{formatCurrency(selectedQuote.total)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedQuote.description && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Description</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedQuote.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1 flex-wrap">
                  {selectedQuote.status === 'draft' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { handleSendQuote(selectedQuote, 'email'); setShowDetailDialog(false); }}>
                        <Mail className="size-3.5 mr-1" /> Email
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { handleSendQuote(selectedQuote, 'whatsapp'); setShowDetailDialog(false); }}>
                        <MessageCircle className="size-3.5 mr-1" /> WhatsApp
                      </Button>
                    </>
                  )}
                  {selectedQuote.status === 'sent' && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleStatusChange(selectedQuote.id, 'accepted'); setShowDetailDialog(false); }}>
                        <CheckCircle2 className="size-3.5 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { handleStatusChange(selectedQuote.id, 'rejected'); setShowDetailDialog(false); }}>
                        <XCircle className="size-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {selectedQuote.status === 'accepted' && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleStatusChange(selectedQuote.id, 'won'); setShowDetailDialog(false); }}>
                      <TrendingUp className="size-3.5 mr-1" /> Mark Won
                    </Button>
                  )}
                  {selectedQuote.status === 'won' && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleConvertToJob(selectedQuote); setShowDetailDialog(false); }}>
                      <ArrowRight className="size-3.5 mr-1" /> Convert to Job
                    </Button>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

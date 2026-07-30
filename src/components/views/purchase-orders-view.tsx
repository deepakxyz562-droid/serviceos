'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle2,
  PackageCheck,
  Pencil,
  Eye,
  Trash2,
  RotateCcw,
  Filter,
  X,
  CalendarDays,
  TrendingUp,
  Truck,
  PackageX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';

// ============================================================
// Types & constants
// ============================================================

type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

interface POLineItem {
  inventoryItemId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  receivedQuantity?: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string | null;
  supplierId: string | null;
  branchId: string | null;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  totalAmount: number;
  currency: string;
  itemsJson: string;
  notes: string | null;
  status: POStatus;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  paymentTerms: string | null;
  currency: string;
  isActive: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  costPrice: number;
  supplierId: string | null;
  isActive: boolean;
}

interface PODetail {
  purchaseOrder: PurchaseOrder;
  items: POLineItem[];
  supplier?: { id: string; name: string; email: string | null; phone: string | null } | null;
}

const STATUS_OPTIONS: { value: POStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES: Record<POStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeParseItems(json: string | null): POLineItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================================
// Main component
// ============================================================

export function PurchaseOrdersView() {
  const { format, currency } = useCompanyCurrency();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [viewing, setViewing] = useState<PODetail | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);

  // ── Fetchers ───────────────────────────────────────────────────────────
  const fetchPOs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '200');
      const res = await authFetch(`/api/inventory/purchase-orders?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load purchase orders');
      }
      const data = await res.json();
      let pos: PurchaseOrder[] = data.purchaseOrders || [];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        pos = pos.filter((p) =>
          (p.poNumber || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q) ||
          (p.supplierId || '').toLowerCase().includes(q),
        );
      }
      setPurchaseOrders(pos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await authFetch('/api/inventory/suppliers?limit=200');
      if (!res.ok) return;
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch {
      // silent
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await authFetch('/api/inventory/items?limit=200');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchPOs(); }, [fetchPOs]);
  useEffect(() => { fetchSuppliers(); fetchItems(); }, [fetchSuppliers, fetchItems]);

  // ── Derived KPIs (computed from full PO list, ignoring search filter) ──
  const stats = useMemo(() => {
    const valid = purchaseOrders.filter((p) => p.status !== 'cancelled');
    const pending = purchaseOrders.filter((p) => p.status === 'draft' || p.status === 'sent').length;
    const partial = purchaseOrders.filter((p) => p.status === 'partial').length;
    const totalValue = valid.reduce((s, p) => s + (p.totalAmount || 0), 0);
    return {
      total: purchaseOrders.length,
      pending,
      partial,
      totalValue,
    };
  }, [purchaseOrders]);

  const supplierName = useCallback((id: string | null) => {
    if (!id) return '—';
    return suppliers.find((s) => s.id === id)?.name || 'Unknown supplier';
  }, [suppliers]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleSaved = () => {
    setCreateOpen(false);
    setEditing(null);
    fetchPOs();
  };

  const handleView = async (po: PurchaseOrder) => {
    setViewingLoading(true);
    try {
      const res = await authFetch(`/api/inventory/purchase-orders/${po.id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load PO detail');
      }
      const data = await res.json();
      setViewing(data as PODetail);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load PO detail');
    } finally {
      setViewingLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      const res = await authFetch(`/api/inventory/purchase-orders/${cancelTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to cancel PO');
      }
      toast.success(`PO ${cancelTarget.poNumber || cancelTarget.id.slice(0, 8)} cancelled`);
      setCancelTarget(null);
      fetchPOs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel PO');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 text-white shadow-sm">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">
              Order from suppliers, receive stock, and auto-update inventory.
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setEditing(null); setCreateOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
          disabled={suppliers.length === 0 || items.length === 0}
          title={suppliers.length === 0 ? 'Add at least one supplier first' : items.length === 0 ? 'Add at least one inventory item first' : undefined}
        >
          <Plus className="size-4 mr-1.5" />
          New PO
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard icon={ClipboardList} label="Total POs" value={String(stats.total)} sub="All time" tint="emerald" />
        <KpiCard icon={Clock} label="Pending" value={String(stats.pending)} sub="Draft + Sent" tint="amber" />
        <KpiCard icon={PackageCheck} label="Partial" value={String(stats.partial)} sub="Awaiting full receipt" tint="blue" />
        <KpiCard icon={DollarSign} label="Total Value" value={format(stats.totalValue, currency)} sub="Excludes cancelled" tint="emerald" />
      </div>

      {/* Status filter */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`inline-flex items-center h-8 px-3 rounded-full text-xs font-medium transition-colors border ${
                  statusFilter === opt.value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PO number, notes, or supplier ID..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPOs}>
                <RotateCcw className="size-4 mr-1.5" /> Retry
              </Button>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <ClipboardList className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">No purchase orders yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first PO to order stock from a supplier.'}
              </p>
              <Button
                onClick={() => { setEditing(null); setCreateOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={suppliers.length === 0 || items.length === 0}
              >
                <Plus className="size-4 mr-1.5" /> New PO
              </Button>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-26rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-32">PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-32">Order Date</TableHead>
                    <TableHead className="w-32">Expected</TableHead>
                    <TableHead className="text-right w-32">Total</TableHead>
                    <TableHead className="text-right w-20">Items</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => {
                    const lineItems = safeParseItems(po.itemsJson);
                    return (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {po.poNumber || <span className="text-muted-foreground">{po.id.slice(0, 8)}</span>}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[12rem]" title={supplierName(po.supplierId)}>
                          {supplierName(po.supplierId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${STATUS_STYLES[po.status]}`}>
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(po.orderDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(po.expectedDate)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums whitespace-nowrap">
                          {format(po.totalAmount, po.currency || currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {lineItems.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleView(po)}>
                                <Eye className="size-3.5 mr-2" /> View Details
                              </DropdownMenuItem>
                              {(po.status === 'sent' || po.status === 'partial') && (
                                <DropdownMenuItem onClick={() => setReceivingPO(po)}>
                                  <Truck className="size-3.5 mr-2" /> Receive Items
                                </DropdownMenuItem>
                              )}
                              {(po.status === 'draft' || po.status === 'sent') && (
                                <DropdownMenuItem onClick={() => { setEditing(po); setCreateOpen(true); }}>
                                  <Pencil className="size-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                              )}
                              {po.status !== 'cancelled' && po.status !== 'received' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setCancelTarget(po)}
                                    className="text-red-600 focus:text-red-700"
                                  >
                                    <PackageX className="size-3.5 mr-2" /> Cancel PO
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <POFormDialog
        open={createOpen}
        editing={editing}
        suppliers={suppliers}
        items={items}
        currency={currency}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      <ReceivePODialog
        open={!!receivingPO}
        po={receivingPO}
        currency={currency}
        onClose={() => setReceivingPO(null)}
        onReceived={() => { setReceivingPO(null); fetchPOs(); }}
      />

      <ViewPODialog
        open={!!viewing}
        detail={viewing}
        loading={viewingLoading}
        currency={currency}
        onClose={() => setViewing(null)}
      />

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel PO {cancelTarget?.poNumber || cancelTarget?.id.slice(0, 8)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the purchase order as cancelled. It cannot be received or edited afterwards.
              Already-received stock is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep PO</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleCancel}
            >
              Cancel PO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// KPI card
// ============================================================

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tint: 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const tints: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  };
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-lg sm:text-xl font-bold mt-1 truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
          <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${tints[tint]}`}>
            <Icon className="size-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// PO Form Dialog (create / edit)
// ============================================================

interface POFormState {
  supplierId: string;
  branchId: string;
  poNumber: string;
  expectedDate: string;
  notes: string;
  status: 'draft' | 'sent';
  items: Array<{
    inventoryItemId: string;
    name: string;
    sku: string | null;
    quantity: string;
    unitPrice: string;
  }>;
}

function POFormDialog({
  open,
  editing,
  suppliers,
  items,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: PurchaseOrder | null;
  suppliers: Supplier[];
  items: InventoryItem[];
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { format } = useCompanyCurrency();
  const [form, setForm] = useState<POFormState>({
    supplierId: '',
    branchId: '',
    poNumber: '',
    expectedDate: '',
    notes: '',
    status: 'draft',
    items: [],
  });
  const [selectedItemId, setSelectedItemId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        const parsed = safeParseItems(editing.itemsJson);
        setForm({
          supplierId: editing.supplierId || '',
          branchId: editing.branchId || '',
          poNumber: editing.poNumber || '',
          expectedDate: editing.expectedDate ? editing.expectedDate.slice(0, 10) : '',
          notes: editing.notes || '',
          status: editing.status === 'sent' ? 'sent' : 'draft',
          items: parsed.map((li) => ({
            inventoryItemId: li.inventoryItemId || '',
            name: li.name,
            sku: li.sku,
            quantity: String(li.quantity),
            unitPrice: String(li.unitPrice),
          })),
        });
      } else {
        setForm({
          supplierId: '',
          branchId: '',
          poNumber: '',
          expectedDate: '',
          notes: '',
          status: 'draft',
          items: [],
        });
      }
      setSelectedItemId('');
    }
  }, [open, editing]);

  const totalAmount = useMemo(() => {
    return form.items.reduce((sum, li) => {
      const qty = parseFloat(li.quantity) || 0;
      const price = parseFloat(li.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [form.items]);

  const handleAddItem = () => {
    if (!selectedItemId) return;
    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;
    if (form.items.some((li) => li.inventoryItemId === selectedItemId)) {
      toast.error('Item already added');
      return;
    }
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          inventoryItemId: item.id,
          name: item.name,
          sku: item.sku,
          quantity: '1',
          unitPrice: String(item.costPrice || 0),
        },
      ],
    });
    setSelectedItemId('');
  };

  const handleRemoveItem = (idx: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx),
    });
  };

  const handleItemChange = (idx: number, field: 'quantity' | 'unitPrice', value: string) => {
    setForm({
      ...form,
      items: form.items.map((li, i) => i === idx ? { ...li, [field]: value } : li),
    });
  };

  const handleSubmit = async () => {
    if (!form.supplierId) {
      toast.error('Supplier is required');
      return;
    }
    if (form.items.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    // Validate items
    const normalizedItems = form.items.map((li, idx) => {
      const qty = parseFloat(li.quantity);
      const price = parseFloat(li.unitPrice);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Line ${idx + 1}: quantity must be positive`);
      }
      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`Line ${idx + 1}: unit price must be non-negative`);
      }
      return {
        inventoryItemId: li.inventoryItemId,
        name: li.name,
        sku: li.sku,
        quantity: qty,
        unitPrice: price,
      };
    });

    setSubmitting(true);
    try {
      const payload = {
        supplierId: form.supplierId,
        branchId: form.branchId.trim() || undefined,
        poNumber: form.poNumber.trim() || undefined,
        expectedDate: form.expectedDate || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
        items: normalizedItems,
      };

      const isEdit = !!editing;
      const url = isEdit
        ? `/api/inventory/purchase-orders/${editing!.id}`
        : '/api/inventory/purchase-orders';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed to ${isEdit ? 'update' : 'create'} PO`);
      }
      toast.success(`PO ${isEdit ? 'updated' : 'created'}`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save PO');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Editing PO ${editing.poNumber || editing.id.slice(0, 8)}`
              : 'Order stock from a supplier. Receiving later will increment inventory.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="po-supplier">Supplier *</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger id="po-supplier"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="po-number">PO Number (optional)</Label>
              <Input
                id="po-number"
                placeholder="Auto-generated if blank"
                value={form.poNumber}
                onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="po-branch">Branch ID (optional)</Label>
              <Input
                id="po-branch"
                placeholder="branch UUID"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="po-expected">Expected Date</Label>
              <Input
                id="po-expected"
                type="date"
                value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="po-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as 'draft' | 'sent' })}
              >
                <SelectTrigger id="po-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div className="grid gap-2">
            <Label>Line Items</Label>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select an item to add..." /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} {i.sku ? `(${i.sku})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={handleAddItem} disabled={!selectedItemId}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {form.items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.items.map((li, idx) => {
                    const qty = parseFloat(li.quantity) || 0;
                    const price = parseFloat(li.unitPrice) || 0;
                    const lineTotal = qty * price;
                    return (
                      <TableRow key={li.inventoryItemId + idx}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium truncate max-w-[14rem]">{li.name}</span>
                            {li.sku && <span className="text-xs font-mono text-muted-foreground">{li.sku}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            className="h-8"
                            value={li.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8"
                            value={li.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {format(lineTotal, currency)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <X className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end items-center gap-4 px-3 py-2 border-t bg-muted/30">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-base font-bold tabular-nums">{format(totalAmount, currency)}</span>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="po-notes">Notes</Label>
            <Textarea
              id="po-notes"
              rows={2}
              placeholder="Optional notes for the supplier or internal use"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Receive PO Dialog
// ============================================================

function ReceivePODialog({
  open,
  po,
  currency,
  onClose,
  onReceived,
}: {
  open: boolean;
  po: PurchaseOrder | null;
  currency: string;
  onClose: () => void;
  onReceived: () => void;
}) {
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && po) {
      const parsed = safeParseItems(po.itemsJson);
      const initial: Record<string, string> = {};
      parsed.forEach((li) => {
        if (li.inventoryItemId) {
          initial[li.inventoryItemId] = '';
        }
      });
      setReceiveQtys(initial);
    }
  }, [open, po]);

  if (!po) return null;

  const lineItems = safeParseItems(po.itemsJson);

  const handleSubmit = async () => {
    const receivedItems: Array<{ inventoryItemId: string; quantity: number }> = [];
    for (const li of lineItems) {
      if (!li.inventoryItemId) continue;
      const qtyStr = receiveQtys[li.inventoryItemId];
      if (!qtyStr) continue;
      const qty = parseInt(qtyStr);
      if (!qty || qty <= 0) {
        toast.error(`Invalid quantity for ${li.name}`);
        return;
      }
      receivedItems.push({ inventoryItemId: li.inventoryItemId, quantity: qty });
    }
    if (receivedItems.length === 0) {
      toast.error('Enter at least one quantity to receive');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/inventory/purchase-orders/${po.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedItems }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to receive PO');
      }
      const data = await res.json();
      toast.success(`Received ${receivedItems.length} ${receivedItems.length === 1 ? 'item' : 'items'} against PO`);
      onReceived();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive PO');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive PO — {po.poNumber || po.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            Enter quantities being received now. Stock levels and transactions update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              This PO has no line items.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right w-24">Ordered</TableHead>
                    <TableHead className="text-right w-24">Received</TableHead>
                    <TableHead className="w-32">Receiving Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((li, idx) => (
                    <TableRow key={(li.inventoryItemId || '') + idx}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{li.name}</span>
                          {li.sku && <span className="text-xs font-mono text-muted-foreground">{li.sku}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{li.quantity}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {li.receivedQuantity ?? 0}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="h-8"
                          value={li.inventoryItemId ? (receiveQtys[li.inventoryItemId] || '') : ''}
                          onChange={(e) => li.inventoryItemId && setReceiveQtys({
                            ...receiveQtys,
                            [li.inventoryItemId]: e.target.value,
                          })}
                          disabled={!li.inventoryItemId}
                        />
                        {!li.inventoryItemId && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-300">No linked item</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Receiving...' : 'Receive Items'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// View PO Detail Dialog
// ============================================================

function ViewPODialog({
  open,
  detail,
  loading,
  currency,
  onClose,
}: {
  open: boolean;
  detail: PODetail | null;
  loading: boolean;
  currency: string;
  onClose: () => void;
}) {
  const { format } = useCompanyCurrency();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>PO Details</DialogTitle>
          <DialogDescription>
            {detail?.purchaseOrder.poNumber || (detail ? detail.purchaseOrder.id.slice(0, 8) : '')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground text-center py-6">No data.</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="font-medium">{detail.supplier?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className={`capitalize ${STATUS_STYLES[detail.purchaseOrder.status]}`}>
                  {detail.purchaseOrder.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Order Date</p>
                <p className="font-medium flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  {formatDate(detail.purchaseOrder.orderDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Date</p>
                <p className="font-medium">{formatDate(detail.purchaseOrder.expectedDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Received Date</p>
                <p className="font-medium">{formatDate(detail.purchaseOrder.receivedDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">{detail.purchaseOrder.currency}</p>
              </div>
            </div>

            {detail.supplier && (detail.supplier.email || detail.supplier.phone) && (
              <div className="rounded-lg border p-3 bg-muted/30 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Supplier Contact</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {detail.supplier.email && <span>{detail.supplier.email}</span>}
                  {detail.supplier.phone && <span>{detail.supplier.phone}</span>}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-2">Line Items</p>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right w-24">Ordered</TableHead>
                      <TableHead className="text-right w-24">Received</TableHead>
                      <TableHead className="text-right w-28">Unit Price</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                          No line items
                        </TableCell>
                      </TableRow>
                    ) : detail.items.map((li, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{li.name}</span>
                            {li.sku && <span className="text-xs font-mono text-muted-foreground">{li.sku}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{li.quantity}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {li.receivedQuantity ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {format(li.unitPrice, detail.purchaseOrder.currency || currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {format(li.total, detail.purchaseOrder.currency || currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end items-center gap-4 px-3 py-2 border-t bg-muted/30">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="text-base font-bold tabular-nums">
                    {format(detail.purchaseOrder.totalAmount, detail.purchaseOrder.currency || currency)}
                  </span>
                </div>
              </div>
            </div>

            {detail.purchaseOrder.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted/30 rounded-lg p-3 border">{detail.purchaseOrder.notes}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

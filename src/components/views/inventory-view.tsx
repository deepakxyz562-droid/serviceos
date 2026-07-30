'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  DollarSign,
  AlertTriangle,
  PackageX,
  Boxes,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Truck,
  ArrowRight,
  ClipboardCheck,
  Check,
  X,
  Filter,
  RotateCcw,
  Eye,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currency: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  reorderQty: number;
  supplierId: string | null;
  supplierSku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  branchId: string | null;
  isActive: boolean;
  supplier?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  paymentTerms: string | null;
  currency: string;
  isActive: boolean;
  _count?: { items: number };
  createdAt: string;
}

interface StockTransfer {
  id: string;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  fromEmployeeId: string | null;
  toEmployeeId: string | null;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  transferDate: string;
  receivedDate: string | null;
  itemsJson: string;
  notes: string | null;
  createdAt: string;
}

interface StockTransaction {
  id: string;
  inventoryItemId: string;
  type: 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'consumption' | 'return';
  direction: 'in' | 'out';
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: string | null;
  referenceId: string | null;
  notes: string | null;
  performedByName: string | null;
  createdAt: string;
  item?: { id: string; name: string; sku: string | null; unit: string } | null;
}

interface LowStockAlert {
  id: string;
  inventoryItemId: string;
  currentStock: number;
  reorderLevel: number;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  item?: {
    id: string;
    name: string;
    sku: string | null;
    totalStock: number;
    reorderLevel: number;
    reorderQty: number;
    supplierId: string | null;
    supplier?: { id: string; name: string } | null;
  } | null;
}

const UNITS = ['each', 'kg', 'litre', 'metre', 'box', 'hour', 'pack'] as const;

const ITEM_CATEGORIES = [
  'general',
  'tools',
  'parts',
  'consumables',
  'equipment',
  'supplies',
  'raw_materials',
  'finished_goods',
  'other',
] as const;

const TX_TYPES = ['purchase', 'sale', 'transfer', 'adjustment', 'consumption', 'return'] as const;
const ADJUST_TYPES = ['adjustment', 'consumption', 'return', 'transfer'] as const;
const TRANSFER_STATUSES = ['pending', 'in_transit', 'received', 'cancelled'] as const;
const ALERT_STATUSES = ['active', 'acknowledged', 'resolved'] as const;

const TX_TYPE_STYLES: Record<string, string> = {
  purchase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  sale: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  transfer: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  adjustment: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  consumption: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  return: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
};

const TRANSFER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

const ALERT_STATUS_STYLES: Record<string, string> = {
  active: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  acknowledged: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

function formatCategoryLabel(cat: string): string {
  return cat.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(iso: string): string {
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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeParseItems(json: string | null): Array<{ inventoryItemId: string | null; name: string; quantity: number }> {
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

export function InventoryView() {
  const { format, currency } = useCompanyCurrency();

  const [activeTab, setActiveTab] = useState<'items' | 'transfers' | 'suppliers' | 'transactions' | 'alerts'>('items');

  // ── Items state ────────────────────────────────────────────────────────
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState<string>('all');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // ── Suppliers state ────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  // ── Transfers state ────────────────────────────────────────────────────
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // ── Transactions state ─────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');

  // ── Alerts state ───────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('active');

  // ── Fetchers ───────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const params = new URLSearchParams();
      if (itemSearch.trim()) params.set('search', itemSearch.trim());
      if (itemCategory !== 'all') params.set('category', itemCategory);
      params.set('limit', '200');
      const res = await authFetch(`/api/inventory/items?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load items');
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setItemsError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setItemsLoading(false);
    }
  }, [itemSearch, itemCategory]);

  const fetchSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    try {
      const res = await authFetch('/api/inventory/suppliers?limit=200');
      if (!res.ok) throw new Error('Failed to load suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch {
      // silent
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const res = await authFetch('/api/inventory/transfers?limit=200');
      if (!res.ok) throw new Error('Failed to load transfers');
      const data = await res.json();
      setTransfers(data.transfers || []);
    } catch {
      // silent
    } finally {
      setTransfersLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (txTypeFilter !== 'all') params.set('type', txTypeFilter);
      if (txStartDate) params.set('startDate', txStartDate);
      if (txEndDate) params.set('endDate', `${txEndDate}T23:59:59.999Z`);
      const res = await authFetch(`/api/inventory/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load transactions');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      // silent
    } finally {
      setTransactionsLoading(false);
    }
  }, [txTypeFilter, txStartDate, txEndDate]);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', alertStatusFilter);
      params.set('limit', '200');
      const res = await authFetch(`/api/inventory/alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch {
      // silent
    } finally {
      setAlertsLoading(false);
    }
  }, [alertStatusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // ── Derived KPIs ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeItems = items.filter((i) => i.isActive);
    const totalStockValue = activeItems.reduce((sum, i) => sum + i.totalStock * i.costPrice, 0);
    const lowStockCount = activeItems.filter((i) => i.reorderLevel > 0 && i.totalStock <= i.reorderLevel && i.totalStock > 0).length;
    const outOfStockCount = activeItems.filter((i) => i.totalStock === 0).length;
    return {
      totalItems: activeItems.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [items]);

  // ── Item actions ───────────────────────────────────────────────────────
  const handleItemSaved = () => {
    setItemDialogOpen(false);
    setEditingItem(null);
    fetchItems();
    fetchAlerts();
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      const res = await authFetch(`/api/inventory/items/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete item');
      }
      toast.success(`Item "${deleteTarget.name}" deactivated`);
      setDeleteTarget(null);
      fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete item');
    }
  };

  // ── Supplier actions ───────────────────────────────────────────────────
  const handleSupplierSaved = () => {
    setSupplierDialogOpen(false);
    fetchSuppliers();
  };

  // ── Alert actions ──────────────────────────────────────────────────────
  const handleAlertAction = async (alert: LowStockAlert, action: 'acknowledge' | 'resolve') => {
    try {
      const res = await authFetch('/api/inventory/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [alert.id], action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update alert');
      }
      toast.success(`Alert ${action}d`);
      fetchAlerts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update alert');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Package className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-sm text-muted-foreground">
              Track stock-on-hand, suppliers, transfers, and stock movements.
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
        >
          <Plus className="size-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={Boxes}
          label="Total Items"
          value={String(stats.totalItems)}
          sub="Active SKUs"
          tint="emerald"
        />
        <KpiCard
          icon={DollarSign}
          label="Stock Value"
          value={format(stats.totalStockValue, currency)}
          sub="At cost price"
          tint="blue"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Low Stock"
          value={String(stats.lowStockCount)}
          sub="At or below reorder level"
          tint="amber"
        />
        <KpiCard
          icon={PackageX}
          label="Out of Stock"
          value={String(stats.outOfStockCount)}
          sub="Zero on hand"
          tint="red"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
        </TabsList>

        {/* ── Items tab ─────────────────────────────────────────────────── */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search by name, SKU, or barcode..."
                    className="pl-9"
                  />
                </div>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="size-4 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {ITEM_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {itemsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : itemsError ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-red-600 mb-3">{itemsError}</p>
                  <Button variant="outline" size="sm" onClick={fetchItems}>
                    <RotateCcw className="size-4 mr-1.5" /> Retry
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="p-10 sm:p-16 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                    <Package className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">No inventory items yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                    {itemSearch || itemCategory !== 'all'
                      ? 'Try adjusting your filters.'
                      : 'Add your first item to start tracking stock.'}
                  </p>
                  <Button
                    onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="size-4 mr-1.5" /> Add Item
                  </Button>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-28rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Name</TableHead>
                        <TableHead className="w-32">Category</TableHead>
                        <TableHead className="text-right w-24">Total</TableHead>
                        <TableHead className="text-right w-24">Available</TableHead>
                        <TableHead className="text-right w-24">Reorder At</TableHead>
                        <TableHead className="text-right w-24">Cost</TableHead>
                        <TableHead className="text-right w-24">Sale</TableHead>
                        <TableHead className="w-36">Supplier</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-12 text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const isLow = item.reorderLevel > 0 && item.totalStock <= item.reorderLevel && item.totalStock > 0;
                        const isOut = item.totalStock === 0;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm truncate max-w-[16rem]" title={item.name}>
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {item.sku && (
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {item.sku}
                                    </span>
                                  )}
                                  {isOut && (
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-red-300 text-red-700 dark:text-red-300">
                                      Out
                                    </Badge>
                                  )}
                                  {isLow && (
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-300 text-amber-700 dark:text-amber-300">
                                      Low
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatCategoryLabel(item.category)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {item.totalStock} <span className="text-xs text-muted-foreground">{item.unit}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {item.availableStock}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                              {item.reorderLevel || '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                              {format(item.costPrice, item.currency || currency)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                              {format(item.salePrice, item.currency || currency)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[8rem]">
                              {item.supplier?.name || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={item.isActive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground'}
                              >
                                {item.isActive ? 'Active' : 'Inactive'}
                              </Badge>
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
                                  <DropdownMenuItem onClick={() => { setEditingItem(item); setItemDialogOpen(true); }}>
                                    <Pencil className="size-3.5 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setAdjustTarget(item)}>
                                    <SlidersHorizontal className="size-3.5 mr-2" /> Adjust Stock
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(item)}
                                    className="text-red-600 focus:text-red-700"
                                  >
                                    <Trash2 className="size-3.5 mr-2" /> Deactivate
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transfers tab ─────────────────────────────────────────────── */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setTransferDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={items.length === 0}
            >
              <Plus className="size-4 mr-1.5" /> New Transfer
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {transfersLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transfers.length === 0 ? (
                <div className="p-10 sm:p-16 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                    <Truck className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">No stock transfers yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Move stock between warehouses or employees.
                  </p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-24rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>From → To</TableHead>
                        <TableHead className="w-32">Items</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((t) => {
                        const parsedItems = safeParseItems(t.itemsJson);
                        const fromLabel = t.fromWarehouseId
                          ? `Warehouse ${t.fromWarehouseId.slice(0, 8)}`
                          : t.fromEmployeeId
                            ? `Employee ${t.fromEmployeeId.slice(0, 8)}`
                            : '—';
                        const toLabel = t.toWarehouseId
                          ? `Warehouse ${t.toWarehouseId.slice(0, 8)}`
                          : t.toEmployeeId
                            ? `Employee ${t.toEmployeeId.slice(0, 8)}`
                            : '—';
                        return (
                          <TableRow key={t.id}>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="truncate max-w-[10rem]">{fromLabel}</span>
                                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[10rem]">{toLabel}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {parsedItems.length} {parsedItems.length === 1 ? 'line' : 'lines'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={TRANSFER_STATUS_STYLES[t.status]}>
                                {t.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(t.transferDate)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[16rem]">
                              {t.notes || '—'}
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
        </TabsContent>

        {/* ── Suppliers tab ─────────────────────────────────────────────── */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => { setSupplierDialogOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="size-4 mr-1.5" /> Add Supplier
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {suppliersLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : suppliers.length === 0 ? (
                <div className="p-10 sm:p-16 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                    <Truck className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">No suppliers yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Add a vendor to start creating purchase orders.
                  </p>
                  <Button
                    onClick={() => { setSupplierDialogOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="size-4 mr-1.5" /> Add Supplier
                  </Button>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-24rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Name</TableHead>
                        <TableHead className="w-36">Contact</TableHead>
                        <TableHead className="w-40">Phone</TableHead>
                        <TableHead className="w-32">Payment Terms</TableHead>
                        <TableHead className="w-20">Currency</TableHead>
                        <TableHead className="w-20">Items</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{s.name}</span>
                              {s.contactName && (
                                <span className="text-xs text-muted-foreground">{s.contactName}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[10rem]">
                            {s.email || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.phone || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.paymentTerms || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.currency}</TableCell>
                          <TableCell className="text-sm tabular-nums">{s._count?.items ?? 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={s.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'}
                            >
                              {s.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transactions tab ──────────────────────────────────────────── */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="size-4 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {TX_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 flex-1">
                  <Label htmlFor="tx-start" className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                  <Input
                    id="tx-start"
                    type="date"
                    value={txStartDate}
                    onChange={(e) => setTxStartDate(e.target.value)}
                    className="flex-1"
                  />
                  <Label htmlFor="tx-end" className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                  <Input
                    id="tx-end"
                    type="date"
                    value={txEndDate}
                    onChange={(e) => setTxEndDate(e.target.value)}
                    className="flex-1"
                  />
                  {(txTypeFilter !== 'all' || txStartDate || txEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setTxTypeFilter('all'); setTxStartDate(''); setTxEndDate(''); }}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-10 sm:p-16 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                    <ClipboardCheck className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">No stock transactions</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Audit trail of purchases, sales, transfers, and adjustments will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-28rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-40">Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-28">Type</TableHead>
                        <TableHead className="w-20">Direction</TableHead>
                        <TableHead className="text-right w-24">Qty</TableHead>
                        <TableHead className="text-right w-28">Unit Cost</TableHead>
                        <TableHead className="text-right w-28">Total</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="w-36">Performed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium truncate max-w-[14rem]">
                                {tx.item?.name || '—'}
                              </span>
                              {tx.item?.sku && (
                                <span className="font-mono text-[10px] text-muted-foreground">{tx.item.sku}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize ${TX_TYPE_STYLES[tx.type] || ''}`}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.direction === 'in' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                                <TrendingUp className="size-3.5" /> In
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300">
                                <TrendingDown className="size-3.5" /> Out
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{tx.quantity}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                            {format(tx.unitCost, currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums whitespace-nowrap font-medium">
                            {format(tx.totalCost, currency)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[12rem]">
                            {tx.reference || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[10rem]">
                            {tx.performedByName || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Low Stock Alerts tab ──────────────────────────────────────── */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <Select value={alertStatusFilter} onValueChange={setAlertStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="size-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Status filter" />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {alertsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-10 sm:p-16 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                    <Check className="size-7 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <h3 className="text-base font-semibold">No {alertStatusFilter} alerts</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {alertStatusFilter === 'active'
                      ? 'All stock levels are healthy. Alerts trigger automatically when stock hits reorder level.'
                      : 'No alerts match this status filter.'}
                  </p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-24rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right w-28">Current</TableHead>
                        <TableHead className="text-right w-28">Reorder At</TableHead>
                        <TableHead className="text-right w-28">Reorder Qty</TableHead>
                        <TableHead className="w-32">Supplier</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="text-right w-40">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium truncate max-w-[14rem]">
                                {a.item?.name || 'Unknown item'}
                              </span>
                              {a.item?.sku && (
                                <span className="font-mono text-[10px] text-muted-foreground">{a.item.sku}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-red-700 dark:text-red-300 font-medium">
                            {a.currentStock}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                            {a.reorderLevel}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                            {a.item?.reorderQty ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[10rem]">
                            {a.item?.supplier?.name || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize ${ALERT_STATUS_STYLES[a.status]}`}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              {a.status === 'active' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleAlertAction(a, 'acknowledge')}
                                >
                                  <Eye className="size-3 mr-1" /> Ack
                                </Button>
                              )}
                              {(a.status === 'active' || a.status === 'acknowledged') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                                  onClick={() => handleAlertAction(a, 'resolve')}
                                >
                                  <Check className="size-3 mr-1" /> Resolve
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                title="Create a purchase order"
                                onClick={() => {
                                  // Switch to PO view via app store (if wired up)
                                  toast.info('Open Purchase Orders to create a PO for this item.');
                                }}
                              >
                                <Plus className="size-3 mr-1" /> PO
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <ItemFormDialog
        open={itemDialogOpen}
        editing={editingItem}
        suppliers={suppliers}
        onClose={() => { setItemDialogOpen(false); setEditingItem(null); }}
        onSaved={handleItemSaved}
      />

      <AdjustStockDialog
        open={!!adjustTarget}
        item={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onAdjusted={() => { setAdjustTarget(null); fetchItems(); fetchTransactions(); fetchAlerts(); }}
      />

      <SupplierFormDialog
        open={supplierDialogOpen}
        currency={currency}
        onClose={() => { setSupplierDialogOpen(false); }}
        onSaved={handleSupplierSaved}
      />

      <TransferFormDialog
        open={transferDialogOpen}
        items={items.filter((i) => i.isActive)}
        onClose={() => setTransferDialogOpen(false)}
        onCreated={() => { setTransferDialogOpen(false); fetchTransfers(); fetchTransactions(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the item as inactive. Historical stock transactions are preserved.
              You can reactivate the item later by editing it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteItem}
            >
              Deactivate
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
// Item Form Dialog (create/edit)
// ============================================================

interface ItemFormState {
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: string;
  salePrice: string;
  totalStock: string;
  reorderLevel: string;
  reorderQty: string;
  supplierId: string;
  barcode: string;
  description: string;
  isActive: boolean;
}

const EMPTY_ITEM_FORM: ItemFormState = {
  name: '',
  sku: '',
  category: 'general',
  unit: 'each',
  costPrice: '0',
  salePrice: '0',
  totalStock: '0',
  reorderLevel: '0',
  reorderQty: '0',
  supplierId: '',
  barcode: '',
  description: '',
  isActive: true,
};

function ItemFormDialog({
  open,
  editing,
  suppliers,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: InventoryItem | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          sku: editing.sku || '',
          category: editing.category,
          unit: editing.unit,
          costPrice: String(editing.costPrice),
          salePrice: String(editing.salePrice),
          totalStock: String(editing.totalStock),
          reorderLevel: String(editing.reorderLevel),
          reorderQty: String(editing.reorderQty),
          supplierId: editing.supplierId || '',
          barcode: editing.barcode || '',
          description: editing.description || '',
          isActive: editing.isActive,
        });
      } else {
        setForm(EMPTY_ITEM_FORM);
      }
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        unit: form.unit,
        costPrice: parseFloat(form.costPrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        totalStock: parseInt(form.totalStock) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
        reorderQty: parseInt(form.reorderQty) || 0,
        supplierId: form.supplierId || null,
        barcode: form.barcode.trim() || null,
        isActive: form.isActive,
      };

      const isEdit = !!editing;
      const url = isEdit
        ? `/api/inventory/items/${editing!.id}`
        : '/api/inventory/items';
      const method = isEdit ? 'PATCH' : 'POST';

      // On edit, totalStock should not be patched here — use Adjust Stock instead.
      const body = isEdit
        ? { ...payload, totalStock: undefined }
        : payload;

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed to ${isEdit ? 'update' : 'create'} item`);
      }
      toast.success(`Item "${payload.name}" ${isEdit ? 'updated' : 'created'}`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update item details. To change stock levels, use "Adjust Stock" from the table.'
              : 'Create a new stock-keeping unit (SKU). Opening stock creates a purchase transaction.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="item-name">Name *</Label>
            <Input
              id="item-name"
              placeholder="e.g. HVAC Air Filter 16x25"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                placeholder="e.g. AF-1625-1"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-barcode">Barcode</Label>
              <Input
                id="item-barcode"
                placeholder="UPC/EAN"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-category">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="item-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-unit">Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger id="item-unit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-cost">Cost Price</Label>
              <Input
                id="item-cost"
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-sale">Sale Price</Label>
              <Input
                id="item-sale"
                type="number"
                step="0.01"
                min="0"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-stock">
                {editing ? 'Total Stock (read-only)' : 'Opening Stock'}
              </Label>
              <Input
                id="item-stock"
                type="number"
                min="0"
                disabled={!!editing}
                value={form.totalStock}
                onChange={(e) => setForm({ ...form, totalStock: e.target.value })}
              />
              {editing && (
                <p className="text-[10px] text-muted-foreground">Use Adjust Stock to change levels.</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-reorder">Reorder Level</Label>
              <Input
                id="item-reorder"
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-reorder-qty">Reorder Qty</Label>
              <Input
                id="item-reorder-qty"
                type="number"
                min="0"
                value={form.reorderQty}
                onChange={(e) => setForm({ ...form, reorderQty: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-supplier">Supplier</Label>
            <Select
              value={form.supplierId || 'none'}
              onValueChange={(v) => setForm({ ...form, supplierId: v === 'none' ? '' : v })}
            >
              <SelectTrigger id="item-supplier"><SelectValue placeholder="No supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              rows={2}
              placeholder="Optional notes about this item"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive items are hidden from dropdowns</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: c })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Adjust Stock Dialog
// ============================================================

function AdjustStockDialog({
  open,
  item,
  onClose,
  onAdjusted,
}: {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<string>('adjustment');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDirection('in');
      setQuantity('');
      setReason('');
      setType('adjustment');
      setNotes('');
    }
  }, [open, item]);

  if (!item) return null;

  const qtyNum = parseInt(quantity) || 0;
  const signedQty = direction === 'in' ? Math.abs(qtyNum) : -Math.abs(qtyNum);
  const newTotal = item.totalStock + signedQty;

  const handleSubmit = async () => {
    if (!qtyNum || qtyNum <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (newTotal < 0) {
      toast.error(`Cannot reduce below zero (current: ${item.totalStock})`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/inventory/items/${item.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: signedQty,
          reason: reason.trim(),
          type,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to adjust stock');
      }
      toast.success(`Stock adjusted by ${signedQty > 0 ? '+' : ''}${signedQty} ${item.unit}`);
      onAdjusted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {item.name}</DialogTitle>
          <DialogDescription>
            Current total: <span className="font-medium">{item.totalStock} {item.unit}</span>
            {item.reservedStock > 0 && (
              <> · Reserved: {item.reservedStock} · Available: {item.availableStock}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === 'in' ? 'default' : 'outline'}
              className={direction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setDirection('in')}
            >
              <TrendingUp className="size-4 mr-1.5" /> Add Stock
            </Button>
            <Button
              type="button"
              variant={direction === 'out' ? 'default' : 'outline'}
              className={direction === 'out' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => setDirection('out')}
            >
              <TrendingDown className="size-4 mr-1.5" /> Remove Stock
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="adj-qty">Quantity ({item.unit})</Label>
              <Input
                id="adj-qty"
                type="number"
                min="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adj-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="adj-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADJUST_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adj-reason">Reason *</Label>
            <Input
              id="adj-reason"
              placeholder={direction === 'in' ? 'e.g. Found misplaced stock' : 'e.g. Damaged in transit'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adj-notes">Notes (optional)</Label>
            <Textarea
              id="adj-notes"
              rows={2}
              placeholder="Additional context"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {qtyNum > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current stock:</span>
                <span className="font-medium">{item.totalStock} {item.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change:</span>
                <span className={`font-medium ${signedQty > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {signedQty > 0 ? '+' : ''}{signedQty}
                </span>
              </div>
              <div className="flex justify-between border-t mt-1 pt-1">
                <span className="text-muted-foreground">New stock:</span>
                <span className="font-bold">{newTotal} {item.unit}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Adjusting...' : 'Apply Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Supplier Form Dialog
// ============================================================

interface SupplierFormState {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  paymentTerms: string;
  currency: string;
  notes: string;
}

const EMPTY_SUPPLIER_FORM: SupplierFormState = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  paymentTerms: '',
  currency: 'USD',
  notes: '',
};

function SupplierFormDialog({
  open,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SupplierFormState>(EMPTY_SUPPLIER_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_SUPPLIER_FORM, currency });
    }
  }, [open, currency]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        website: form.website.trim() || null,
        paymentTerms: form.paymentTerms.trim() || null,
        currency: form.currency,
        notes: form.notes.trim() || null,
      };
      const res = await authFetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create supplier');
      }
      toast.success(`Supplier "${payload.name}" created`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
          <DialogDescription>
            Vendor details used when creating purchase orders.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="sup-name">Name *</Label>
            <Input
              id="sup-name"
              placeholder="e.g. Acme Parts Co."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sup-contact">Contact Name</Label>
              <Input
                id="sup-contact"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input
                id="sup-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-website">Website</Label>
              <Input
                id="sup-website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sup-terms">Payment Terms</Label>
              <Input
                id="sup-terms"
                placeholder="e.g. Net 30"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-currency">Currency</Label>
              <Input
                id="sup-currency"
                maxLength={8}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sup-address">Address</Label>
            <Textarea
              id="sup-address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Saving...' : 'Create Supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Transfer Form Dialog
// ============================================================

interface TransferItem {
  inventoryItemId: string;
  name: string;
  sku: string | null;
  quantity: string;
}

function TransferFormDialog({
  open,
  items,
  onClose,
  onCreated,
}: {
  open: boolean;
  items: InventoryItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [fromEmployeeId, setFromEmployeeId] = useState('');
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFromWarehouseId('');
      setToWarehouseId('');
      setFromEmployeeId('');
      setToEmployeeId('');
      setSelectedItemId('');
      setTransferItems([]);
      setNotes('');
      setStatus('pending');
    }
  }, [open]);

  const handleAddItem = () => {
    if (!selectedItemId) return;
    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;
    if (transferItems.some((ti) => ti.inventoryItemId === selectedItemId)) {
      toast.error('Item already added');
      return;
    }
    setTransferItems([
      ...transferItems,
      { inventoryItemId: item.id, name: item.name, sku: item.sku, quantity: '1' },
    ]);
    setSelectedItemId('');
  };

  const handleRemoveItem = (id: string) => {
    setTransferItems(transferItems.filter((ti) => ti.inventoryItemId !== id));
  };

  const handleItemQtyChange = (id: string, qty: string) => {
    setTransferItems(transferItems.map((ti) => ti.inventoryItemId === id ? { ...ti, quantity: qty } : ti));
  };

  const handleSubmit = async () => {
    const hasSource = fromWarehouseId.trim() || fromEmployeeId.trim();
    const hasDest = toWarehouseId.trim() || toEmployeeId.trim();
    if (!hasSource || !hasDest) {
      toast.error('Both source and destination are required');
      return;
    }
    if (transferItems.length === 0) {
      toast.error('Add at least one item to transfer');
      return;
    }
    const normalized = transferItems.map((ti) => {
      const q = parseInt(ti.quantity);
      if (!q || q <= 0) throw new Error(`Invalid quantity for ${ti.name}`);
      return { inventoryItemId: ti.inventoryItemId, name: ti.name, quantity: q };
    });
    setSubmitting(true);
    try {
      const res = await authFetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: fromWarehouseId.trim() || undefined,
          toWarehouseId: toWarehouseId.trim() || undefined,
          fromEmployeeId: fromEmployeeId.trim() || undefined,
          toEmployeeId: toEmployeeId.trim() || undefined,
          items: normalized,
          notes: notes.trim() || undefined,
          status,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create transfer');
      }
      toast.success('Stock transfer created');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Stock Transfer</DialogTitle>
          <DialogDescription>
            Move stock between warehouses or employees. Source and destination each require at least one ID.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="from-warehouse">From Warehouse ID</Label>
              <Input
                id="from-warehouse"
                placeholder="warehouse UUID"
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to-warehouse">To Warehouse ID</Label>
              <Input
                id="to-warehouse"
                placeholder="warehouse UUID"
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="from-employee">From Employee ID (optional)</Label>
              <Input
                id="from-employee"
                placeholder="employee UUID"
                value={fromEmployeeId}
                onChange={(e) => setFromEmployeeId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to-employee">To Employee ID (optional)</Label>
              <Input
                id="to-employee"
                placeholder="employee UUID"
                value={toEmployeeId}
                onChange={(e) => setToEmployeeId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfer-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="transfer-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSFER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Items to Transfer</Label>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select an item..." /></SelectTrigger>
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

          {transferItems.length > 0 && (
            <div className="rounded-lg border divide-y">
              {transferItems.map((ti) => (
                <div key={ti.inventoryItemId} className="flex items-center gap-3 p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ti.name}</div>
                    {ti.sku && <div className="text-xs text-muted-foreground font-mono">{ti.sku}</div>}
                  </div>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={ti.quantity}
                    onChange={(e) => handleItemQtyChange(ti.inventoryItemId, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600"
                    onClick={() => handleRemoveItem(ti.inventoryItemId)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="transfer-notes">Notes</Label>
            <Textarea
              id="transfer-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Creating...' : 'Create Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

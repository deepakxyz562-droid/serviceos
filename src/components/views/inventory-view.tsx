'use client';

/**
 * InventoryView — top-level Inventory page.
 *
 * Phase 6B1 refactor: the 6 inline tab sections, 4 inline form dialogs, and
 * the local KpiCard have been extracted to `src/features/inventory/`. This
 * file now owns only:
 *
 *   • State for the active tab + the 6 data slices (items, assets, transfers,
 *     suppliers, transactions, alerts) + filter state.
 *   • All fetchers (fetchItems / fetchSuppliers / fetchTransfers /
 *     fetchTransactions / fetchAlerts / fetchAssets / fetchEmployees).
 *   • Write handlers that touch multiple slices (handleItemSaved,
 *     handleDeleteItem, handleSupplierSaved, handleAlertAction,
 *     handleCreateAssetFromItem, handleReturnAsset).
 *   • The page header (icon + title + "Add Item" button).
 *   • 4 KPI cards using the shared `<StatCard>` from
 *     `@/components/shared/stat-card`.
 *   • The `<Tabs>` shell with 6 `<TabsContent>` slots, each delegating to an
 *     extracted tab component.
 *   • The 4 extracted form dialogs (open/close state owned here) + the
 *     deactivate-item `AlertDialog`.
 *
 * The Assets tab owns its own "Assign Asset to Employee" dialog internally
 * (state + submission); the parent passes a `onAssigned` callback so the
 * tab can refresh the assets list after a successful assignment.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  DollarSign,
  AlertTriangle,
  PackageX,
  Boxes,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';
import { useInventoryItems, useInventoryTransactions } from '@/hooks/use-crm-data';
import { StatCard } from '@/components/shared/stat-card';

import { ItemsTab } from '@/features/inventory/components/tabs/items-tab';
import { AssetsTab } from '@/features/inventory/components/tabs/assets-tab';
import { TransfersTab } from '@/features/inventory/components/tabs/transfers-tab';
import { SuppliersTab } from '@/features/inventory/components/tabs/suppliers-tab';
import { TransactionsTab } from '@/features/inventory/components/tabs/transactions-tab';
import { AlertsTab } from '@/features/inventory/components/tabs/alerts-tab';
import { ItemFormDialog } from '@/features/inventory/components/item-form-dialog';
import { AdjustStockDialog } from '@/features/inventory/components/adjust-stock-dialog';
import { SupplierFormDialog } from '@/features/inventory/components/supplier-form-dialog';
import { TransferFormDialog } from '@/features/inventory/components/transfer-form-dialog';
import type {
  AssetSubTab,
  InventoryTab,
  InventoryItem,
  InventoryAssetRow,
  Supplier,
  StockTransfer,
  StockTransaction,
  LowStockAlert,
} from '@/features/inventory/types';

export function InventoryView() {
  const { format, currency } = useCompanyCurrency();

  const [activeTab, setActiveTab] = useState<InventoryTab>('items');

  // ── Items state ────────────────────────────────────────────────────────
  // `items` is derived from RQ data (useInventoryItems); only the filter
  // state (itemSearch, itemCategory) and dialog/form state live here.
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState<string>('all');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // ── Assets state (serialized equipment tracking + employee assignment) ──
  const [assets, setAssets] = useState<InventoryAssetRow[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetsSubTab, setAssetsSubTab] = useState<AssetSubTab>('available');
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // ── Suppliers state ────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  // ── Transfers state ────────────────────────────────────────────────────
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // ── Transactions state ─────────────────────────────────────────────────
  // `transactions` is derived from RQ data (useInventoryTransactions); only
  // the filter state (txTypeFilter, txStartDate, txEndDate) lives here.
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');

  // ── Alerts state ───────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('active');

  // ── Fetchers ───────────────────────────────────────────────────────────
  // Main list data — React Query replaces the manual fetchItems and
  // fetchTransactions useCallbacks. RQ keys the queries by their filter
  // params, so rapid filter changes (typing in the search box while a
  // category change is still in-flight) no longer race — the latest filter
  // wins and stale responses are discarded. `refetch` is aliased back to the
  // original names so existing call sites (onRetry, handleItemSaved, the
  // AdjustStockDialog onAdjusted, etc.) keep working unchanged.
  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: rqItemsError,
    refetch: fetchItems,
  } = useInventoryItems({
    search: itemSearch || undefined,
    category: itemCategory !== 'all' ? itemCategory : undefined,
  });
  const items = (itemsData ?? []) as InventoryItem[];
  const itemsError = rqItemsError?.message ?? null;

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

  // Main list data (transactions) — RQ replaces fetchTransactions.
  // `endDate` gets the `T23:59:59.999Z` suffix so picking "Jan 15" includes
  // all transactions ON Jan 15 (not just midnight-UTC); preserves the
  // original fetchTransactions behavior.
  const {
    data: txData,
    isLoading: txLoading,
    error: rqTxError,
    refetch: fetchTransactions,
  } = useInventoryTransactions({
    type: txTypeFilter !== 'all' ? txTypeFilter : undefined,
    startDate: txStartDate || undefined,
    endDate: txEndDate ? `${txEndDate}T23:59:59.999Z` : undefined,
  });
  const transactions = (txData ?? []) as StockTransaction[];

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

  // ── Assets: fetch serialized equipment + employees for assignment ───────
  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true);
    setAssetsError(null);
    try {
      const res = await authFetch('/api/inventory/assets?limit=200');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Normalize: the API returns { assets: [...] } or [...] — handle both
      const rows = Array.isArray(data) ? data : (data.assets || []);
      setAssets(rows);
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const res = await authFetch('/api/employees?status=active&limit=100');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.employees || []);
      setEmployees(rows.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })));
    } catch {
      // silent — dropdown will just be empty
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  // Load assets + employees when the Assets tab is opened
  useEffect(() => {
    if (activeTab === 'assets') {
      fetchAssets();
      fetchEmployees();
    }
  }, [activeTab, fetchAssets, fetchEmployees]);

  // Items + transactions are now sourced from RQ (useInventoryItems /
  // useInventoryTransactions above) — no manual useEffect needed. The
  // remaining useEffects fire the secondary fetches that haven't been
  // migrated yet (suppliers, transfers, alerts).
  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);
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

  // ── Asset actions (Create-from-item, Return; Assign is owned by AssetsTab) ─
  const handleCreateAssetFromItem = async (item: InventoryItem) => {
    try {
      const res = await authFetch('/api/inventory/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          inventoryItemId: item.id,
          serialNumber: item.sku ? `${item.sku}-001` : null,
          status: 'available',
          condition: 'good',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create trackable asset');
      }
      toast.success(`Trackable equipment asset created for "${item.name}". You can now assign it to an employee under Assets or Employees.`);
      fetchAssets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create asset');
    }
  };

  const handleReturnAsset = async (asset: InventoryAssetRow) => {
    try {
      const res = await authFetch(`/api/inventory/assets/${asset.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Returned via inventory UI' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      toast.success(`Asset "${asset.name}" returned`);
      fetchAssets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to return asset');
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
        <StatCard
          label="Total Items"
          value={stats.totalItems}
          icon={Boxes}
          sub="Active SKUs"
          color="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <StatCard
          label="Stock Value"
          value={format(stats.totalStockValue, currency)}
          icon={DollarSign}
          sub="At cost price"
          color="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/40"
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          sub="At or below reorder level"
          color="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/40"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStockCount}
          icon={PackageX}
          sub="Zero on hand"
          color="text-red-600 dark:text-red-400"
          iconBg="bg-red-50 dark:bg-red-950/40"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InventoryTab)}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <ItemsTab
            items={items}
            itemsLoading={itemsLoading}
            itemsError={itemsError}
            itemSearch={itemSearch}
            setItemSearch={setItemSearch}
            itemCategory={itemCategory}
            setItemCategory={setItemCategory}
            onRetry={fetchItems}
            onAddItem={() => { setEditingItem(null); setItemDialogOpen(true); }}
            onEditItem={(item) => { setEditingItem(item); setItemDialogOpen(true); }}
            onCreateAssetFromItem={handleCreateAssetFromItem}
            onAdjustStock={(item) => setAdjustTarget(item)}
            onDeleteItem={(item) => setDeleteTarget(item)}
            format={format}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <AssetsTab
            assets={assets}
            assetsLoading={assetsLoading}
            assetsError={assetsError}
            assetsSubTab={assetsSubTab}
            setAssetsSubTab={setAssetsSubTab}
            onRefresh={fetchAssets}
            onReturnAsset={handleReturnAsset}
            employees={employees}
            employeesLoading={employeesLoading}
            onAssigned={fetchAssets}
          />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <TransfersTab
            transfers={transfers}
            transfersLoading={transfersLoading}
            hasItems={items.length > 0}
            onNewTransfer={() => setTransferDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <SuppliersTab
            suppliers={suppliers}
            suppliersLoading={suppliersLoading}
            onAddSupplier={() => setSupplierDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionsTab
            transactions={transactions}
            transactionsLoading={txLoading}
            txTypeFilter={txTypeFilter}
            setTxTypeFilter={setTxTypeFilter}
            txStartDate={txStartDate}
            setTxStartDate={setTxStartDate}
            txEndDate={txEndDate}
            setTxEndDate={setTxEndDate}
            format={format}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <AlertsTab
            alerts={alerts}
            alertsLoading={alertsLoading}
            alertStatusFilter={alertStatusFilter}
            setAlertStatusFilter={setAlertStatusFilter}
            onAlertAction={handleAlertAction}
          />
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

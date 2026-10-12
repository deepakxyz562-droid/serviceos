'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Barcode,
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { type BosProductItem, formatBosCurrency } from '@/components/bos/bos-types';

type InventorySubTab =
  | 'all'
  | 'categories'
  | 'stockInOut'
  | 'lowStock'
  | 'suppliers'
  | 'purchaseOrders';

type BosInventoryWorkstationProps = {
  currencySymbol: string;
  products: BosProductItem[];
  initialOpenAddModal?: boolean;
  onSaveProduct: (product: BosProductItem, isNew: boolean) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAdjustStock: (productId: string, delta: number, reason: string) => Promise<void>;
};

export function BosInventoryWorkstation({
  currencySymbol,
  products,
  initialOpenAddModal = false,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
}: BosInventoryWorkstationProps) {
  const [subTab, setSubTab] = useState<InventorySubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  const [showProductModal, setShowProductModal] = useState(initialOpenAddModal);
  const [editingProduct, setEditingProduct] = useState<BosProductItem | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    category: 'Groceries',
    price: 120,
    mrp: 135,
    costPrice: 95,
    stockQuantity: 45,
    lowStockThreshold: 10,
    sku: '',
    barcode: '',
    unit: '1 kg',
    gstRate: 5,
    hsnCode: '1006',
  });
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState([
    {
      id: 'PO-2026-089',
      supplier: 'Metro Cash & Carry Wholesale',
      itemsCount: 8,
      totalAmount: 28450,
      status: 'Received',
      date: '22 Apr 2026',
    },
    {
      id: 'PO-2026-090',
      supplier: 'Hindustan FMCG Distributors',
      itemsCount: 12,
      totalAmount: 42800,
      status: 'In Transit',
      date: '24 Apr 2026',
    },
    {
      id: 'PO-2026-091',
      supplier: 'Amul & Mother Dairy Depot',
      itemsCount: 5,
      totalAmount: 14200,
      status: 'Ordered',
      date: '24 Apr 2026',
    },
  ]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All Categories']);
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (subTab === 'lowStock' && p.stockQuantity > (p.lowStockThreshold || 5)) return false;
      if (categoryFilter !== 'All Categories' && p.category !== categoryFilter) return false;
      if (statusFilter === 'in_stock' && p.stockQuantity <= (p.lowStockThreshold || 5)) return false;
      if (
        statusFilter === 'low_stock' &&
        (p.stockQuantity === 0 || p.stockQuantity > (p.lowStockThreshold || 5))
      )
        return false;
      if (statusFilter === 'out_of_stock' && p.stockQuantity > 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, subTab, categoryFilter, statusFilter, searchQuery]);

  const selectedProduct = useMemo(() => {
    return (
      products.find((p) => p.id === selectedProductId) ||
      filteredProducts[0] ||
      products[0] ||
      null
    );
  }, [products, filteredProducts, selectedProductId]);

  const inventoryStats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter((p) => p.stockQuantity <= 0).length;
    const lowStock = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 5),
    ).length;
    const inStock = Math.max(0, total - outOfStock - lowStock);
    const costValue = products.reduce(
      (sum, p) => sum + (p.costPrice || Math.round(p.price * 0.78)) * Math.max(0, p.stockQuantity),
      0,
    );
    const retailValue = products.reduce(
      (sum, p) => sum + p.price * Math.max(0, p.stockQuantity),
      0,
    );

    return {
      total,
      inStock,
      lowStock,
      outOfStock,
      costValue,
      retailValue,
    };
  }, [products]);

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormState({
      name: '',
      category: 'Groceries',
      price: 150,
      mrp: 165,
      costPrice: 120,
      stockQuantity: 30,
      lowStockThreshold: 8,
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: `89010308${Math.floor(1000 + Math.random() * 9000)}`,
      unit: '1 Pack',
      gstRate: 5,
      hsnCode: '2106',
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (product: BosProductItem) => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      category: product.category,
      price: product.price,
      mrp: product.mrp || Math.round(product.price * 1.1),
      costPrice: product.costPrice || Math.round(product.price * 0.8),
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold || 5,
      sku: product.sku,
      barcode: product.barcode || '890103084521',
      unit: product.unit || '1 Unit',
      gstRate: product.gstRate ?? 5,
      hsnCode: product.hsnCode || '1006',
    });
    setShowProductModal(true);
  };

  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;
    const item: BosProductItem = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: formState.name.trim(),
      category: formState.category.trim() || 'General',
      price: Number(formState.price) || 0,
      mrp: Number(formState.mrp) || Number(formState.price) || 0,
      costPrice: Number(formState.costPrice) || Math.round((Number(formState.price) || 0) * 0.8),
      stockQuantity: Math.max(0, Number(formState.stockQuantity) || 0),
      lowStockThreshold: Math.max(1, Number(formState.lowStockThreshold) || 5),
      sku: formState.sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: formState.barcode.trim() || '890103084521',
      unit: formState.unit.trim() || '1 Unit',
      gstRate: Number(formState.gstRate) || 0,
      hsnCode: formState.hsnCode.trim() || '1006',
      onlineVisible: true,
    };
    await onSaveProduct(item, !editingProduct);
    setSelectedProductId(item.id);
    setShowProductModal(false);
    setBannerMessage(
      editingProduct ? `Updated "${item.name}" in catalog.` : `Added "${item.name}" to catalog.`,
    );
    setTimeout(() => setBannerMessage(null), 3000);
  };

  const handleExportCsv = () => {
    const header = ['SKU', 'Name', 'Category', 'Cost Price', 'Selling Price', 'MRP', 'Stock', 'GST %'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.costPrice || Math.round(p.price * 0.8),
      p.price,
      p.mrp || p.price,
      p.stockQuantity,
      p.gstRate ?? 5,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bos-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
          {(
            [
              { id: 'all', label: 'All Products' },
              { id: 'categories', label: 'Categories' },
              { id: 'stockInOut', label: 'Stock In / Out' },
              { id: 'lowStock', label: `Low Stock (${inventoryStats.lowStock})` },
              { id: 'suppliers', label: 'Suppliers' },
              { id: 'purchaseOrders', label: 'Purchase Orders' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                subTab === tab.id
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#F4F8F6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
          >
            <Download className="h-4 w-4 text-[#0A6847]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={openAddProductModal}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {bannerMessage}
          </span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Inventory KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <div className="bos-card p-3.5">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
            <span>Total Products</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F6F0] text-[#0A6847]">
              <Boxes className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-[22px] font-extrabold text-[#111827]">{inventoryStats.total}</p>
          <p className="mt-0.5 text-[11px] font-medium text-[#0A6847]">+12 added this month</p>
        </div>

        <div className="bos-card p-3.5">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
            <span>In Stock</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <PackageCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-[22px] font-extrabold text-[#111827]">{inventoryStats.inStock}</p>
          <p className="mt-0.5 text-[11px] text-[#64748B]">
            {Math.round((inventoryStats.inStock / Math.max(1, inventoryStats.total)) * 100)}% availability
          </p>
        </div>

        <div className="bos-card p-3.5">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
            <span>Low Stock Alerts</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-[22px] font-extrabold text-amber-600">{inventoryStats.lowStock}</p>
          <p className="mt-0.5 text-[11px] font-medium text-amber-700">Needs restocking</p>
        </div>

        <div className="bos-card p-3.5">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
            <span>Out of Stock</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <PackageX className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-[22px] font-extrabold text-red-600">{inventoryStats.outOfStock}</p>
          <p className="mt-0.5 text-[11px] font-medium text-red-600">Action required</p>
        </div>

        <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B]">
            <span>Inventory Value</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
              {currencySymbol}
            </span>
          </div>
          <p className="mt-2 text-[20px] font-extrabold text-[#111827]">
            {formatBosCurrency(inventoryStats.costValue, currencySymbol)}
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748B]">
            Retail: {formatBosCurrency(inventoryStats.retailValue, currencySymbol)}
          </p>
        </div>
      </div>

      {subTab === 'purchaseOrders' ? (
        <div className="bos-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#111827]">Supplier Purchase Orders</h2>
              <p className="text-[12.5px] text-[#64748B]">
                Track wholesale restocking orders and receive inventory directly into stock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newPo = {
                  id: `PO-2026-0${92 + purchaseOrders.length}`,
                  supplier: 'Metro Cash & Carry Wholesale',
                  itemsCount: 6,
                  totalAmount: 19500,
                  status: 'Ordered',
                  date: 'Today',
                };
                setPurchaseOrders((prev) => [newPo, ...prev]);
                setBannerMessage(`Created Purchase Order ${newPo.id}`);
              }}
              className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#E4EFEA] text-[11px] font-bold uppercase text-[#64748B]">
                  <th className="py-2.5">PO Number</th>
                  <th className="py-2.5">Supplier</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Items</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F6F3]">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F8FCFA]">
                    <td className="py-3 font-bold text-[#111827]">{po.id}</td>
                    <td className="py-3 font-medium text-[#334155]">{po.supplier}</td>
                    <td className="py-3 text-[#64748B]">{po.date}</td>
                    <td className="py-3">{po.itemsCount} SKUs</td>
                    <td className="py-3 font-bold text-[#111827]">
                      {formatBosCurrency(po.totalAmount, currencySymbol)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          po.status === 'Received'
                            ? 'bg-[#E6F6F0] text-[#0A6847]'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {po.status !== 'Received' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPurchaseOrders((prev) =>
                              prev.map((x) => (x.id === po.id ? { ...x, status: 'Received' } : x)),
                            );
                            setBannerMessage(`Marked ${po.id} as Received into inventory.`);
                          }}
                          className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-semibold text-[#0A6847]"
                        >
                          Receive Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Main Split Layout: Left Inventory Table (8 cols) + Right Product Inspector (4 cols) */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Left: Filter Bar & Inventory Table */}
          <div className="bos-card p-4 lg:col-span-8 space-y-3.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, SKU, barcode, or brand..."
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 pl-9 pr-3 text-[13px] text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-medium text-[#334155]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-medium text-[#334155]"
                >
                  <option value="all">Stock Status: All</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E4EFEA] text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-2.5 pr-2">Product</th>
                    <th className="py-2.5 px-2">SKU / Barcode</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">Cost / MRP</th>
                    <th className="py-2.5 px-2">Selling Price</th>
                    <th className="py-2.5 px-2">Stock Level</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F6F3] text-[12.5px]">
                  {filteredProducts.map((item) => {
                    const isSelected = selectedProduct?.id === item.id;
                    const isOut = item.stockQuantity <= 0;
                    const isLow = !isOut && item.stockQuantity <= (item.lowStockThreshold || 5);
                    const pct = Math.min(100, Math.round((item.stockQuantity / 60) * 100));

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedProductId(item.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-[#E6F6F0]/60' : 'hover:bg-[#F8FCFA]'
                        }`}
                      >
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F6F3] text-[#0A6847]">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#111827] truncate max-w-[180px]">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-[#64748B]">
                                {item.unit || '1 Unit'} • GST {item.gstRate ?? 5}%
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-semibold text-[#334155]">{item.sku}</p>
                          <p className="text-[10.5px] font-mono text-[#94A3B8]">
                            {item.barcode || '890103084521'}
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          <span className="inline-flex rounded-lg bg-[#F1F6F3] px-2 py-0.5 text-[11px] font-semibold text-[#334155]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-[11.5px] text-[#64748B]">
                          <div>Cost: {formatBosCurrency(item.costPrice || Math.round(item.price * 0.8), currencySymbol)}</div>
                          <div>MRP: {formatBosCurrency(item.mrp || item.price, currencySymbol)}</div>
                        </td>
                        <td className="py-3 px-2 font-extrabold text-[#111827]">
                          {formatBosCurrency(item.price, currencySymbol)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24">
                            <div className="flex justify-between text-[11.5px] font-bold">
                              <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#111827]'}>
                                {item.stockQuantity} units
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-[#10B981]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              isOut
                                ? 'bg-red-50 text-red-600'
                                : isLow
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-[#E6F6F0] text-[#0A6847]'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onAdjustStock(item.id, 10, 'Quick Restock');
                              }}
                              className="rounded-lg border border-[#BCE3D4] bg-white px-2 py-1 text-[11px] font-semibold text-[#0A6847] hover:bg-[#E6F6F0]"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditProductModal(item);
                              }}
                              className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F6F3] hover:text-[#111827]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Product Details & Stock Inspector */}
          {selectedProduct && (
            <div className="bos-card p-4 lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
                <h3 className="text-[14.5px] font-bold text-[#111827]">Product Details</h3>
                <button
                  type="button"
                  onClick={() => openEditProductModal(selectedProduct)}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0A6847] hover:underline"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A6847]">
                  <Package className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                      {selectedProduct.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <span className="rounded-md bg-[#F1F6F3] px-2 py-0.5 text-[10.5px] font-semibold text-[#475569]">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <h4 className="mt-1 text-[15px] font-bold text-[#111827] leading-snug">
                    {selectedProduct.name}
                  </h4>
                  <p className="text-[11.5px] text-[#64748B]">
                    SKU: {selectedProduct.sku} • HSN: {selectedProduct.hsnCode || '1006'}
                  </p>
                </div>
              </div>

              {/* Pricing & Tax */}
              <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Pricing & Tax
                  </span>
                  <span className="rounded-full bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    Margin: +
                    {Math.max(
                      12,
                      Math.round(
                        ((selectedProduct.price -
                          (selectedProduct.costPrice || selectedProduct.price * 0.8)) /
                          Math.max(1, selectedProduct.price)) *
                          100,
                      ),
                    )}
                    %
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white p-2 border border-[#EDF4F0]">
                    <p className="text-[10.5px] text-[#64748B]">Cost Price</p>
                    <p className="text-[13.5px] font-bold text-[#111827]">
                      {formatBosCurrency(
                        selectedProduct.costPrice || Math.round(selectedProduct.price * 0.8),
                        currencySymbol,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-[#BCE3D4]">
                    <p className="text-[10.5px] text-[#0A6847] font-semibold">Selling Price</p>
                    <p className="text-[14px] font-extrabold text-[#0A6847]">
                      {formatBosCurrency(selectedProduct.price, currencySymbol)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-[#EDF4F0]">
                    <p className="text-[10.5px] text-[#64748B]">MRP</p>
                    <p className="text-[13.5px] font-bold text-[#111827]">
                      {formatBosCurrency(selectedProduct.mrp || selectedProduct.price, currencySymbol)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Stock & Quick Stock In/Out */}
              <div className="rounded-xl border border-[#E4EFEA] bg-white p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Current Stock
                    </p>
                    <p className="text-[20px] font-extrabold text-[#111827]">
                      {selectedProduct.stockQuantity} Units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#64748B]">Low Stock Alert</p>
                    <p className="text-[13px] font-bold text-amber-600">
                      ≤ {selectedProduct.lowStockThreshold || 5} Units
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void onAdjustStock(selectedProduct.id, 10, 'Manual Stock In')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#E6F6F0] py-2 text-[12px] font-bold text-[#0A6847] hover:bg-[#D1EFE4]"
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    <span>+ Stock In (10)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onAdjustStock(selectedProduct.id, -1, 'Manual Stock Out')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white py-2 text-[12px] font-semibold text-[#334155] hover:bg-[#F4F8F6]"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />
                    <span>- Stock Out (1)</span>
                  </button>
                </div>
              </div>

              {/* Barcode Label Box */}
              <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10.5px] font-bold uppercase text-[#64748B]">Barcode / EAN-13</p>
                  <p className="font-mono text-[13px] font-bold text-[#111827] mt-0.5">
                    {selectedProduct.barcode || '890103084521'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBannerMessage(`Sent barcode labels for "${selectedProduct.name}" to label printer.`);
                    setTimeout(() => setBannerMessage(null), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#0A6847]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Labels</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openEditProductModal(selectedProduct)}
                  className="rounded-xl border border-[#DCE9E3] bg-white py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
                >
                  Edit Product
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('purchaseOrders')}
                  className="bos-btn-primary rounded-xl py-2 text-[12.5px]"
                >
                  Create PO
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
              <h3 className="text-[16px] font-bold text-[#111827]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProductFormSubmit} className="mt-4 space-y-3.5 text-[13px]">
              <div>
                <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. India Gate Basmati Rice 5kg"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Unit / Pack Size
                  </label>
                  <input
                    type="text"
                    value={formState.unit}
                    onChange={(e) => setFormState((s) => ({ ...s, unit: e.target.value }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Cost Price ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={formState.costPrice}
                    onChange={(e) => setFormState((s) => ({ ...s, costPrice: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#0A6847] mb-1">
                    Selling Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formState.price}
                    onChange={(e) => setFormState((s) => ({ ...s, price: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#0A6847] px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    MRP ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={formState.mrp}
                    onChange={(e) => setFormState((s) => ({ ...s, mrp: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    value={formState.stockQuantity}
                    onChange={(e) => setFormState((s) => ({ ...s, stockQuantity: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    value={formState.lowStockThreshold}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, lowStockThreshold: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={formState.gstRate}
                    onChange={(e) => setFormState((s) => ({ ...s, gstRate: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 bg-white"
                  >
                    {[0, 5, 12, 18, 28].map((r) => (
                      <option key={r} value={r}>
                        {r}% GST
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">SKU</label>
                  <input
                    type="text"
                    value={formState.sku}
                    onChange={(e) => setFormState((s) => ({ ...s, sku: e.target.value }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Barcode / EAN
                  </label>
                  <input
                    type="text"
                    value={formState.barcode}
                    onChange={(e) => setFormState((s) => ({ ...s, barcode: e.target.value }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF4F0]">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteProduct(editingProduct.id);
                      setShowProductModal(false);
                    }}
                    className="mr-auto inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[12.5px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12.5px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bos-btn-primary rounded-xl px-5 py-2 text-[12.5px]"
                >
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

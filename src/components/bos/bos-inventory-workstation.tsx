'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Globe,
  MoreVertical,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { type BosProductItem, type BosOrder, formatBosCurrency } from '@/components/bos/bos-types';
import {
  BosProductThumbnail,
  lookupPublicProductByBarcodeOrName,
} from '@/components/bos/bos-product-image-resolver';
import { useBosTranslation } from '@/components/bos/i18n/bos-i18n-context';

type InventorySubTab =
  | 'all'
  | 'categories'
  | 'stockInOut'
  | 'lowStock'
  | 'suppliers'
  | 'purchaseOrders';

type InspectorTab = 'overview' | 'stockHistory' | 'sales' | 'edit';

type BosInventoryWorkstationProps = {
  currencySymbol: string;
  products: BosProductItem[];
  orders?: BosOrder[];
  demoMode?: boolean;
  initialOpenAddModal?: boolean;
  onSaveProduct: (product: BosProductItem, isNew: boolean) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAdjustStock: (productId: string, delta: number, reason: string) => Promise<void>;
};

type InventoryRowMeta = {
  displayName: string;
  inspectorTitle: string;
  unitSubtitle: string;
  inspectorUnit: string;
  sku: string;
  barcode: string;
  categoryPill: string;
  brand: string;
  stock: number;
  minStock: number;
  price: number;
  purchasePrice: number;
  mrp: number;
  gstRate: number;
  location: string;
  statusOverride?: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

/**
 * Curated metadata for the 10 inventory showcase rows so the Products & Inventory
 * table and right-hand Product Detail Inspector match the design 1:1.
 */
const INVENTORY_SHOWCASE_ORDER = [
  'prod-2', // Maggi Noodles
  'prod-3', // Amul Milk
  'prod-1', // Tata Salt
  'prod-4', // Sunflower Oil
  'prod-5', // Parle-G Biscuits
  'prod-6', // Coca Cola
  'prod-8', // Dove Soap
  'prod-10', // Aashirvaad Atta
  'prod-14', // Dettol Handwash
  'prod-9', // Surf Excel
];

const INVENTORY_META_BY_ID: Record<string, InventoryRowMeta> = {
  'prod-2': {
    displayName: 'Maggi Noodles',
    inspectorTitle: 'Maggi Noodles 70g',
    unitSubtitle: '70g Packet',
    inspectorUnit: 'Packet (70g)',
    sku: 'MAG-001',
    barcode: '8901058000012',
    categoryPill: 'Noodles',
    brand: 'Nestle',
    stock: 48,
    minStock: 10,
    price: 14,
    purchasePrice: 11,
    mrp: 15,
    gstRate: 5,
    location: 'Main Store',
    statusOverride: 'In Stock',
  },
  'prod-3': {
    displayName: 'Amul Milk',
    inspectorTitle: 'Amul Milk 1L',
    unitSubtitle: '1L',
    inspectorUnit: 'Pack (1L)',
    sku: 'AMU-001',
    barcode: '8901262000015',
    categoryPill: 'Dairy',
    brand: 'Amul',
    stock: 12,
    minStock: 15,
    price: 68,
    purchasePrice: 62,
    mrp: 70,
    gstRate: 5,
    location: 'Main Store',
    statusOverride: 'Low Stock',
  },
  'prod-1': {
    displayName: 'Tata Salt',
    inspectorTitle: 'Tata Salt 1kg',
    unitSubtitle: '1kg',
    inspectorUnit: 'Pouch (1kg)',
    sku: 'TAT-001',
    barcode: '8901030000019',
    categoryPill: 'Grocery',
    brand: 'Tata',
    stock: 5,
    minStock: 10,
    price: 28,
    purchasePrice: 22,
    mrp: 30,
    gstRate: 0,
    location: 'Main Store',
    statusOverride: 'Low Stock',
  },
  'prod-4': {
    displayName: 'Sunflower Oil',
    inspectorTitle: 'Sunflower Oil 1L',
    unitSubtitle: '1L',
    inspectorUnit: 'Pouch (1L)',
    sku: 'SUN-001',
    barcode: '8905009000023',
    categoryPill: 'Oil & Ghee',
    brand: 'Fortune',
    stock: 24,
    minStock: 10,
    price: 140,
    purchasePrice: 118,
    mrp: 155,
    gstRate: 5,
    location: 'Main Store',
    statusOverride: 'In Stock',
  },
  'prod-5': {
    displayName: 'Parle-G Biscuits',
    inspectorTitle: 'Parle-G Biscuits 100g',
    unitSubtitle: '100g',
    inspectorUnit: 'Packet (100g)',
    sku: 'PAR-001',
    barcode: '8901719213304',
    categoryPill: 'Biscuits',
    brand: 'Parle',
    stock: 0,
    minStock: 20,
    price: 10,
    purchasePrice: 8,
    mrp: 10,
    gstRate: 18,
    location: 'Main Store',
    statusOverride: 'Out of Stock',
  },
  'prod-6': {
    displayName: 'Coca Cola',
    inspectorTitle: 'Coca Cola 500ml',
    unitSubtitle: '500ml',
    inspectorUnit: 'Bottle (500ml)',
    sku: 'COC-001',
    barcode: '8901764011234',
    categoryPill: 'Beverages',
    brand: 'Coca-Cola',
    stock: 36,
    minStock: 12,
    price: 40,
    purchasePrice: 32,
    mrp: 40,
    gstRate: 28,
    location: 'Main Store',
    statusOverride: 'In Stock',
  },
  'prod-8': {
    displayName: 'Dove Soap',
    inspectorTitle: 'Dove Soap 100g',
    unitSubtitle: '100g',
    inspectorUnit: 'Bar (100g)',
    sku: 'DOV-001',
    barcode: '8901030834567',
    categoryPill: 'Personal Care',
    brand: 'Unilever',
    stock: 18,
    minStock: 10,
    price: 38,
    purchasePrice: 30,
    mrp: 42,
    gstRate: 18,
    location: 'Main Store',
    statusOverride: 'In Stock',
  },
  'prod-10': {
    displayName: 'Aashirvaad Atta',
    inspectorTitle: 'Aashirvaad Atta 5kg',
    unitSubtitle: '5kg',
    inspectorUnit: 'Bag (5kg)',
    sku: 'AAS-001',
    barcode: '8901360007890',
    categoryPill: 'Grocery',
    brand: 'ITC',
    stock: 7,
    minStock: 10,
    price: 245,
    purchasePrice: 205,
    mrp: 265,
    gstRate: 5,
    location: 'Main Store',
    statusOverride: 'Low Stock',
  },
  'prod-14': {
    displayName: 'Dettol Handwash',
    inspectorTitle: 'Dettol Handwash 200ml',
    unitSubtitle: '200ml',
    inspectorUnit: 'Pump (200ml)',
    sku: 'DET-001',
    barcode: '8901396123456',
    categoryPill: 'Personal Care',
    brand: 'Reckitt',
    stock: 20,
    minStock: 8,
    price: 95,
    purchasePrice: 76,
    mrp: 105,
    gstRate: 12,
    location: 'Main Store',
    statusOverride: 'In Stock',
  },
  'prod-9': {
    displayName: 'Surf Excel',
    inspectorTitle: 'Surf Excel 1kg',
    unitSubtitle: '1kg',
    inspectorUnit: 'Pack (1kg)',
    sku: 'SUR-001',
    barcode: '8901030245678',
    categoryPill: 'Household',
    brand: 'Unilever',
    stock: 4,
    minStock: 8,
    price: 145,
    purchasePrice: 120,
    mrp: 160,
    gstRate: 18,
    location: 'Main Store',
    statusOverride: 'Low Stock',
  },
};

function getResolvedRowMeta(product: BosProductItem): InventoryRowMeta {
  // Always use real API data — the INVENTORY_META_BY_ID showcase overrides
  // have been removed because they replaced real product data with hardcoded
  // demo values (names, stock levels, categories) even in production mode.
  const cleanBaseName = product.name.replace(/\s*\([^)]+\)\s*$/, '');
  const stock = product.stockQuantity;
  const minStock = product.lowStockThreshold || 10;
  const statusOverride: InventoryRowMeta['statusOverride'] =
    stock <= 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock';

  return {
    displayName: cleanBaseName,
    inspectorTitle: product.unit
      ? `${cleanBaseName} ${product.unit}`
      : product.name,
    unitSubtitle: product.unit || '1 Unit',
    inspectorUnit: product.unit || '1 Unit',
    sku: product.sku || 'SKU-001',
    barcode: product.barcode || '8901030845210',
    categoryPill: product.category || 'Grocery',
    brand: product.brand || 'Store Brand',
    stock,
    minStock,
    price: product.price,
    purchasePrice: product.costPrice || Math.round(product.price * 0.8),
    mrp: product.mrp || Math.round(product.price * 1.1),
    gstRate: product.gstRate ?? 5,
    location: product.location || 'Main Store',
    statusOverride,
  };
}

function formatInvPrice(amount: number, symbol = '₹'): string {
  const rounded = Math.round(Number(amount) || 0);
  return `${symbol} ${rounded.toLocaleString('en-IN')}`;
}

export function BosInventoryWorkstation({
  currencySymbol = '₹',
  products,
  orders = [],
  demoMode = false,
  initialOpenAddModal = false,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
}: BosInventoryWorkstationProps) {
  const { t, language } = useBosTranslation();
  const [subTab, setSubTab] = useState<InventorySubTab>('all');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('all');
  const [brandFilter, setBrandFilter] = useState('All Brands');

  // Default selected product
  const [selectedProductId, setSelectedProductId] = useState<string>(() =>
    demoMode ? 'prod-2' : (products[0]?.id || ''),
  );
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Stock override map for interactive stock adjustments
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>({});
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockDeltaInput, setStockDeltaInput] = useState<number>(10);

  // Add / Edit Product Modal
  const [showProductModal, setShowProductModal] = useState(initialOpenAddModal);
  const [editingProduct, setEditingProduct] = useState<BosProductItem | null>(null);
  const [fetchingPublicImage, setFetchingPublicImage] = useState(false);
  const [modalFetchMessage, setModalFetchMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    category: 'Grocery',
    brand: '',
    price: 120,
    mrp: 135,
    costPrice: 95,
    stockQuantity: 45,
    lowStockThreshold: 10,
    sku: '',
    barcode: '',
    unit: '1kg',
    gstRate: 5,
    hsnCode: '1006',
    imageUrl: '',
  });
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState(() =>
    demoMode
      ? [
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
        ]
      : [],
  );

  const showToast = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => {
      setBannerMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Ordered product rows: in production mode, display products directly; in demoMode, showcase order
  const orderedProducts = useMemo(() => {
    if (!demoMode) {
      return products;
    }
    const customAdded = products.filter(
      (p) => !p.id.startsWith('prod-') || Number(p.id.replace('prod-', '')) > 15,
    );
    const showcase = INVENTORY_SHOWCASE_ORDER.map((id) =>
      products.find((p) => p.id === id),
    ).filter((p): p is BosProductItem => Boolean(p));
    const others = products.filter(
      (p) =>
        !customAdded.some((c) => c.id === p.id) &&
        !showcase.some((s) => s.id === p.id),
    );
    return [...customAdded, ...showcase, ...others];
  }, [demoMode, products]);

  const inventoryStats = useMemo(() => {
    if (demoMode) {
      return {
        totalProducts: '248',
        totalProductsTrend: '↑ 12%',
        inStock: '186',
        inStockTrend: '↑ 8%',
        lowStock: '32',
        lowStockTrend: '↓ 14%',
        outOfStock: '8',
        outOfStockTrend: '↓ 20%',
        totalValuation: '1,24,580',
        totalValuationTrend: '↑ 10%',
      };
    }
    const total = products.length;
    const inStock = products.filter(
      (p) => (stockOverrides[p.id] ?? p.stockQuantity) > (p.lowStockThreshold || 5),
    ).length;
    const lowStock = products.filter((p) => {
      const s = stockOverrides[p.id] ?? p.stockQuantity;
      return s > 0 && s <= (p.lowStockThreshold || 5);
    }).length;
    const outOfStock = products.filter(
      (p) => (stockOverrides[p.id] ?? p.stockQuantity) <= 0,
    ).length;
    const totalVal = products.reduce((acc, p) => {
      const s = stockOverrides[p.id] ?? p.stockQuantity;
      return acc + Math.max(0, s) * (p.costPrice || p.price || 0);
    }, 0);
    return {
      totalProducts: String(total),
      totalProductsTrend: total > 0 ? `${total} active` : '0 active',
      inStock: String(inStock),
      inStockTrend: total > 0 ? `${Math.round((inStock / Math.max(1, total)) * 100)}%` : '0%',
      lowStock: String(lowStock),
      lowStockTrend: lowStock > 0 ? 'Needs reorder' : 'Healthy',
      outOfStock: String(outOfStock),
      outOfStockTrend: outOfStock > 0 ? 'Out of stock' : 'None',
      totalValuation: totalVal.toLocaleString('en-IN'),
      totalValuationTrend: 'Live catalog',
    };
  }, [demoMode, products, stockOverrides]);

  const enrichedRows = useMemo(() => {
    return orderedProducts.map((product) => {
      const baseMeta = getResolvedRowMeta(product);
      const effectiveStock =
        stockOverrides[product.id] !== undefined
          ? stockOverrides[product.id]
          : baseMeta.stock;
      const status: 'In Stock' | 'Low Stock' | 'Out of Stock' =
        stockOverrides[product.id] !== undefined
          ? effectiveStock <= 0
            ? 'Out of Stock'
            : effectiveStock <= baseMeta.minStock
              ? 'Low Stock'
              : 'In Stock'
          : baseMeta.statusOverride || 'In Stock';

      return {
        product,
        meta: {
          ...baseMeta,
          stock: effectiveStock,
          statusOverride: status,
        },
      };
    });
  }, [orderedProducts, stockOverrides]);

  const categories = useMemo(() => {
    const set = new Set<string>([
      'All Categories',
      'Noodles',
      'Dairy',
      'Grocery',
      'Oil & Ghee',
      'Biscuits',
      'Beverages',
      'Personal Care',
      'Household',
    ]);
    for (const r of enrichedRows) {
      if (r.meta.categoryPill) set.add(r.meta.categoryPill);
    }
    return Array.from(set);
  }, [enrichedRows]);

  const brands = useMemo(() => {
    const set = new Set<string>([
      'All Brands',
      'Nestle',
      'Amul',
      'Tata',
      'Fortune',
      'Parle',
      'Coca-Cola',
      'Unilever',
      'ITC',
      'Reckitt',
    ]);
    for (const r of enrichedRows) {
      if (r.meta.brand) set.add(r.meta.brand);
    }
    return Array.from(set);
  }, [enrichedRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedRows.filter(({ product, meta }) => {
      if (
        subTab === 'lowStock' &&
        meta.statusOverride !== 'Low Stock' &&
        meta.statusOverride !== 'Out of Stock'
      ) {
        return false;
      }
      if (
        categoryFilter !== 'All Categories' &&
        meta.categoryPill.toLowerCase() !== categoryFilter.toLowerCase() &&
        product.category.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }
      if (statusFilter !== 'all' && meta.statusOverride !== statusFilter) {
        return false;
      }
      if (
        brandFilter !== 'All Brands' &&
        meta.brand.toLowerCase() !== brandFilter.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        meta.displayName.toLowerCase().includes(q) ||
        product.name.toLowerCase().includes(q) ||
        meta.sku.toLowerCase().includes(q) ||
        meta.barcode.toLowerCase().includes(q) ||
        meta.brand.toLowerCase().includes(q) ||
        meta.categoryPill.toLowerCase().includes(q)
      );
    });
  }, [enrichedRows, subTab, categoryFilter, statusFilter, brandFilter, searchQuery]);

  const visibleRows = useMemo(() => {
    return filteredRows.slice(0, pageSize);
  }, [filteredRows, pageSize]);

  const selectedEntry = useMemo(() => {
    return (
      enrichedRows.find((r) => r.product.id === selectedProductId) ||
      filteredRows[0] ||
      enrichedRows[0] ||
      null
    );
  }, [enrichedRows, filteredRows, selectedProductId]);

  const productSalesAnalytics = useMemo(() => {
    if (demoMode) {
      return {
        totalSold: 186,
        trend: '↑ 12%',
        recentList: [
          { time: 'Today, 10:32 AM', qty: '2 pcs' },
          { time: '11 Oct, 05:12 PM', qty: '1 pc' },
          { time: '11 Oct, 02:14 PM', qty: '3 pcs' },
          { time: '10 Oct, 11:20 AM', qty: '1 pc' },
          { time: '10 Oct, 09:05 AM', qty: '2 pcs' },
        ],
      };
    }
    const targetId = selectedEntry?.product?.id;
    const targetName = selectedEntry?.product?.name?.toLowerCase();
    const matchedOrders = orders.filter((o) =>
      o.items.some(
        (it) => it.id === targetId || (targetName && it.name.toLowerCase() === targetName),
      ),
    );
    const totalSold = matchedOrders.reduce((acc, o) => {
      const it = o.items.find(
        (i) => i.id === targetId || (targetName && i.name.toLowerCase() === targetName),
      );
      return acc + (it?.qty || 0);
    }, 0);
    const recentList = matchedOrders.slice(0, 5).map((o) => {
      const it = o.items.find(
        (i) => i.id === targetId || (targetName && i.name.toLowerCase() === targetName),
      );
      return {
        time: o.createdAt || 'Recent',
        qty: `${it?.qty || 1} ${selectedEntry?.product?.unit || 'pcs'}`,
      };
    });
    return {
      totalSold,
      trend: totalSold > 0 ? `${matchedOrders.length} orders` : 'No sales yet',
      recentList,
    };
  }, [demoMode, orders, selectedEntry]);

  const toggleSelectAll = () => {
    if (selectedRowIds.length === visibleRows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(visibleRows.map((r) => r.product.id));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setModalFetchMessage(null);
    setFormState({
      name: '',
      category: 'Grocery',
      brand: '',
      price: 120,
      mrp: 135,
      costPrice: 95,
      stockQuantity: 40,
      lowStockThreshold: 10,
      sku: `PRD-${Math.floor(100 + Math.random() * 899)}`,
      barcode: '',
      unit: '1kg',
      gstRate: 5,
      hsnCode: '1006',
      imageUrl: '',
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (product: BosProductItem) => {
    const meta = getResolvedRowMeta(product);
    setEditingProduct(product);
    setModalFetchMessage(null);
    setFormState({
      name: meta.displayName,
      category: meta.categoryPill,
      brand: meta.brand,
      price: meta.price,
      mrp: meta.mrp,
      costPrice: meta.purchasePrice,
      stockQuantity: meta.stock,
      lowStockThreshold: meta.minStock,
      sku: meta.sku,
      barcode: meta.barcode,
      unit: meta.unitSubtitle,
      gstRate: meta.gstRate,
      hsnCode: product.hsnCode || '1006',
      imageUrl: product.imageUrl || '',
    });
    setShowProductModal(true);
  };

  const handleAutoFetchPublicImage = async () => {
    if (!formState.barcode.trim() && !formState.name.trim()) {
      const msg = 'Enter a product name or barcode first to auto-fetch image';
      setModalFetchMessage(msg);
      showToast(msg);
      return;
    }
    setFetchingPublicImage(true);
    setModalFetchMessage('Searching centralized catalog & public barcode CDNs...');
    try {
      const result = await lookupPublicProductByBarcodeOrName({
        barcode: formState.barcode,
        name: formState.name,
      });
      if (result?.imageUrl) {
        setFormState((prev) => ({
          ...prev,
          imageUrl: result.imageUrl || '',
          brand: result.brand || prev.brand,
          unit: result.unit || prev.unit,
        }));
        const okMsg = `✓ Image fetched from ${result.source || 'Public Barcode CDN'}`;
        setModalFetchMessage(okMsg);
        showToast(okMsg);
      } else {
        setFormState((prev) => ({
          ...prev,
          imageUrl: '',
        }));
        const fallbackMsg =
          'No external image found — showing Category Icon + Product Name badge';
        setModalFetchMessage(fallbackMsg);
        showToast(fallbackMsg);
      }
    } finally {
      setFetchingPublicImage(false);
    }
  };

  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;
    const item: BosProductItem = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: formState.name.trim(),
      category: formState.category.trim() || 'Grocery',
      brand: formState.brand.trim() || 'Store Brand',
      price: Number(formState.price) || 0,
      mrp: Number(formState.mrp) || Number(formState.price) || 0,
      costPrice:
        Number(formState.costPrice) || Math.round((Number(formState.price) || 0) * 0.8),
      stockQuantity: Math.max(0, Number(formState.stockQuantity) || 0),
      lowStockThreshold: Math.max(1, Number(formState.lowStockThreshold) || 10),
      sku: formState.sku.trim() || `SKU-${Date.now().toString().slice(-3)}`,
      barcode: formState.barcode.trim() || '8901030845210',
      unit: formState.unit.trim() || '1 Unit',
      gstRate: Number(formState.gstRate) || 0,
      hsnCode: formState.hsnCode.trim() || '1006',
      location: 'Main Store',
      imageUrl: formState.imageUrl.trim() || undefined,
      onlineVisible: true,
    };
    await onSaveProduct(item, !editingProduct);
    setStockOverrides((prev) => ({ ...prev, [item.id]: item.stockQuantity }));
    setSelectedProductId(item.id);
    setShowProductModal(false);
    showToast(
      editingProduct
        ? `Updated "${item.name}" in inventory.`
        : `Added "${item.name}" to inventory.`,
    );
  };

  const handleDuplicateSelected = async () => {
    if (!selectedEntry) return;
    const { product, meta } = selectedEntry;
    const copy: BosProductItem = {
      ...product,
      id: `prod-${Date.now()}`,
      name: `${meta.displayName} (Copy)`,
      sku: `${meta.sku}-C`,
    };
    await onSaveProduct(copy, true);
    setSelectedProductId(copy.id);
    showToast(`Duplicated "${meta.displayName}"`);
  };

  const handleDeleteSelected = async () => {
    if (!selectedEntry) return;
    const { product, meta } = selectedEntry;
    await onDeleteProduct(product.id);
    showToast(`Deleted "${meta.displayName}" from inventory`);
  };

  const handleApplyStockAdjustment = async () => {
    if (!selectedEntry) return;
    const { product, meta } = selectedEntry;
    const nextStock = Math.max(0, meta.stock + stockDeltaInput);
    setStockOverrides((prev) => ({ ...prev, [product.id]: nextStock }));
    await onAdjustStock(product.id, stockDeltaInput, 'Manual stock update');
    setShowStockModal(false);
    showToast(`Updated stock for "${meta.displayName}" to ${nextStock} units`);
  };

  const handleExportCsv = () => {
    const header = [
      'SKU',
      'Barcode',
      'Name',
      'Brand',
      'Category',
      'Stock',
      'Price',
      'Status',
    ];
    const rows = enrichedRows.map(({ meta }) => [
      meta.sku,
      meta.barcode,
      `"${meta.displayName.replace(/"/g, '""')}"`,
      meta.brand,
      meta.categoryPill,
      meta.stock,
      meta.price,
      meta.statusOverride,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bos-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported inventory CSV');
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        showToast('CSV file is empty or missing data rows.');
        return;
      }

      const header = lines[0]
        .split(',')
        .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
      const skuIdx = header.findIndex((h) => h.includes('sku'));
      const barcodeIdx = header.findIndex((h) => h.includes('barcode'));
      const nameIdx = header.findIndex((h) =>
        h.includes('name') || h.includes('title') || h.includes('item'),
      );
      const brandIdx = header.findIndex((h) => h.includes('brand'));
      const catIdx = header.findIndex((h) => h.includes('category'));
      const stockIdx = header.findIndex((h) =>
        h.includes('stock') || h.includes('qty'),
      );
      const priceIdx = header.findIndex((h) =>
        h.includes('price') || h.includes('rate') || h.includes('mrp'),
      );

      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        const parts = match
          ? match.map((v) => v.replace(/^"|"$/g, '').trim())
          : line.split(',').map((s) => s.trim());

        const rawName =
          nameIdx >= 0 && parts[nameIdx]
            ? parts[nameIdx]
            : parts[0] || `Imported Item ${i}`;
        const rawPrice =
          priceIdx >= 0 && parts[priceIdx] ? parseFloat(parts[priceIdx]) : 50;
        const rawStock =
          stockIdx >= 0 && parts[stockIdx] ? parseInt(parts[stockIdx], 10) : 20;
        const rawCategory =
          catIdx >= 0 && parts[catIdx] ? parts[catIdx] : 'Grocery';
        const rawBrand =
          brandIdx >= 0 && parts[brandIdx] ? parts[brandIdx] : 'Store Brand';
        const rawSku =
          skuIdx >= 0 && parts[skuIdx] ? parts[skuIdx] : `SKU-${Date.now()}-${i}`;
        const rawBarcode =
          barcodeIdx >= 0 && parts[barcodeIdx]
            ? parts[barcodeIdx]
            : `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;

        const newItem: BosProductItem = {
          id: `prod-${Date.now()}-${i}`,
          name: rawName,
          category: rawCategory,
          brand: rawBrand,
          price: isNaN(rawPrice) ? 50 : rawPrice,
          mrp: isNaN(rawPrice) ? 50 : Math.round(rawPrice * 1.1),
          costPrice: isNaN(rawPrice) ? 40 : Math.round(rawPrice * 0.8),
          stockQuantity: isNaN(rawStock) ? 20 : Math.max(0, rawStock),
          lowStockThreshold: 10,
          sku: rawSku,
          barcode: rawBarcode,
          unit: '1 Unit',
          gstRate: 5,
          location: 'Main Store',
          onlineVisible: true,
        };

        await onSaveProduct(newItem, true);
        setStockOverrides((prev) => ({
          ...prev,
          [newItem.id]: newItem.stockQuantity,
        }));
        importedCount++;
      }

      showToast(
        `Successfully imported ${importedCount} product${
          importedCount > 1 ? 's' : ''
        } into inventory!`,
      );
    } catch (err: any) {
      showToast(`Import error: ${err?.message || 'Failed to parse CSV'}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Hidden File Input for CSV Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCsvFileChange}
      />

      {/* Page Title & Top Right Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827] leading-tight">
            {t('inventory.title', 'Products & Inventory')}
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            {t('inventory.subtitle', 'Manage your products, stock, categories and suppliers.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Upload className="h-4 w-4 text-[#475569]" />
            <span>{t('inventory.importCsv', 'Import')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#475569]" />
            <span>{t('inventory.exportCsv', 'Export')}</span>
          </button>

          <button
            type="button"
            onClick={openAddProductModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A6847] px-4 py-2 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{t('inventory.addProduct', 'Add Product')}</span>
          </button>
        </div>
      </div>

      {/* Underline Sub-Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E2ECE7] overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'all', label: t('inventory.allProducts', 'All Products') },
            { id: 'categories', label: t('inventory.categories', 'Categories') },
            { id: 'stockInOut', label: t('inventory.stockInOut', 'Stock In/Out') },
            { id: 'lowStock', label: t('inventory.lowStock', 'Low Stock') },
            { id: 'suppliers', label: t('inventory.suppliers', 'Suppliers') },
            { id: 'purchaseOrders', label: t('inventory.purchaseOrders', 'Purchase Orders') },
          ] as const
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`relative shrink-0 pb-2.5 pt-1 text-[13.5px] transition cursor-pointer ${
                active
                  ? 'font-bold text-[#0A6847]'
                  : 'font-medium text-[#475569] hover:text-[#111827]'
              }`}
            >
              <span>{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Toast Notification Banner */}
      {bannerMessage && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2 text-[12.5px] font-medium text-[#065F46]">
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

      {/* 5 Top KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Products */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0A7B56] text-white shadow-xs">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#64748B]">{t('inventory.totalProducts', 'Total Products')}</p>
            <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
              {inventoryStats.totalProducts}
            </p>
            <p className="mt-0.5 text-[11.5px] font-bold text-[#0A7B56]">{inventoryStats.totalProductsTrend}</p>
          </div>
        </div>

        {/* Card 2: In Stock */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#64748B]">{t('inventory.inStock', 'In Stock')}</p>
            <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
              {inventoryStats.inStock}
            </p>
            <p className="mt-0.5 text-[11.5px] font-bold text-[#0A7B56]">{inventoryStats.inStockTrend}</p>
          </div>
        </div>

        {/* Card 3: Low Stock */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#EF4444]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#64748B]">{t('inventory.lowStock', 'Low Stock')}</p>
            <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
              {inventoryStats.lowStock}
            </p>
            <p className="mt-0.5 text-[11.5px] font-bold text-[#EF4444]">{inventoryStats.lowStockTrend}</p>
          </div>
        </div>

        {/* Card 4: Out of Stock */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#EF4444]">
            <X className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#64748B]">{t('inventory.outOfStock', 'Out of Stock')}</p>
            <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
              {inventoryStats.outOfStock}
            </p>
            <p className="mt-0.5 text-[11.5px] font-bold text-[#EF4444]">{inventoryStats.outOfStockTrend}</p>
          </div>
        </div>

        {/* Card 5: Total Inventory Value */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
            <span className="text-[22px] font-bold leading-none">
              {currencySymbol}
            </span>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#64748B]">
              {t('inventory.inventoryValue', 'Total Inventory Value')}
            </p>
            <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
              {currencySymbol} {inventoryStats.totalValuation}
            </p>
            <p className="mt-0.5 text-[11.5px] font-bold text-[#0A7B56]">{inventoryStats.totalValuationTrend}</p>
          </div>
        </div>
      </div>

      {subTab === 'purchaseOrders' ? (
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#111827]">
                Supplier Purchase Orders
              </h2>
              <p className="text-[12.5px] text-[#64748B]">
                Track wholesale restocking orders and receive inventory directly into stock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => showToast('Purchase Order creation requires a Supplier API. Coming soon.')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-3.5 py-2 text-[12.5px] font-semibold text-white"
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
                              prev.map((x) =>
                                x.id === po.id ? { ...x, status: 'Received' } : x,
                              ),
                            );
                            showToast('Stock receipt requires a Purchase Order API. Coming soon.');
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
        /* Main Split Layout: Left Inventory Table (8 cols) + Right Product Detail Inspector (4 cols) */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Left Panel: Filter Bar, Table & Pagination */}
          <div className="lg:col-span-8 rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#EBF2EE] px-4 py-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('inventory.searchPlaceholder', 'Search products by name, barcode or SKU...')}
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] pl-9 pr-3 text-[12.5px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Barcode Button */}
              <button
                type="button"
                onClick={() =>
                  showToast('Barcode scanner active — scan EAN-13 barcode to filter or add')
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DCE9E3] bg-white text-[#475569] hover:bg-[#F4F8F6] cursor-pointer"
                title="Scan Barcode"
              >
                <Barcode className="h-4 w-4" />
              </button>

              {/* All Categories Select */}
              <select
                aria-label="Category filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12.5px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Stock Status Select */}
              <select
                aria-label="Stock Status filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
                className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12.5px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
              >
                <option value="all">{t('inventory.allStockStatus', 'Stock Status')}</option>
                <option value="In Stock">{t('inventory.inStock', 'In Stock')}</option>
                <option value="Low Stock">{t('inventory.lowStock', 'Low Stock')}</option>
                <option value="Out of Stock">{t('inventory.outOfStock', 'Out of Stock')}</option>
              </select>

              {/* Brand Select */}
              <select
                aria-label="Brand filter"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12.5px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b === 'All Brands' ? t('inventory.brand', 'Brand') : b}
                  </option>
                ))}
              </select>

              {/* More Filters Button */}
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('All Categories');
                  setStatusFilter('all');
                  setBrandFilter('All Brands');
                  setSearchQuery('');
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12.5px] font-medium text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#64748B]" />
                <span>More Filters</span>
              </button>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11.5px] font-semibold text-[#475569]">
                    <th className="w-10 py-3 pl-4 pr-2">
                      <input
                        type="checkbox"
                        aria-label="Select all products"
                        checked={
                          visibleRows.length > 0 &&
                          selectedRowIds.length === visibleRows.length
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-2.5">{t('inventory.productName', 'Product')}</th>
                    <th className="py-3 px-2.5">{t('inventory.barcode', 'SKU / Barcode')}</th>
                    <th className="py-3 px-2.5">{t('inventory.category', 'Category')}</th>
                    <th className="py-3 px-2.5">{t('inventory.stockUnits', 'Stock')}</th>
                    <th className="py-3 px-2.5">{t('inventory.sellingPrice', 'Price')} ({currencySymbol})</th>
                    <th className="py-3 px-2.5">{t('common.status', 'Status')}</th>
                    <th className="py-3 pl-2 pr-4 text-center">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF5F1] text-[13px]">
                  {visibleRows.map(({ product, meta }) => {
                    const isSelected = selectedEntry?.product.id === product.id;
                    const isChecked = selectedRowIds.includes(product.id);
                    const isOut = meta.statusOverride === 'Out of Stock';
                    const isLow = meta.statusOverride === 'Low Stock';
                    const stockRed = meta.stock <= 7;

                    return (
                      <tr
                        key={product.id}
                        onClick={() => setSelectedProductId(product.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#F1FAF5]'
                            : 'hover:bg-[#F9FCFA]'
                        }`}
                      >
                        <td
                          className="py-2.5 pl-4 pr-2"
                          onClick={(e) => toggleSelectRow(product.id, e)}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select ${meta.displayName}`}
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                          />
                        </td>

                        {/* Product Packshot (or Icon + Name fallback) + Title + Unit */}
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-3">
                            <BosProductThumbnail product={product} size="md" />
                            <div className="min-w-0">
                              <p className="font-bold text-[#111827] truncate">
                                {meta.displayName}
                              </p>
                              <p className="text-[11.5px] text-[#64748B]">
                                {meta.unitSubtitle}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* SKU / Barcode */}
                        <td className="py-2.5 px-2.5">
                          <p className="font-semibold text-[#1E293B] text-[12.5px]">
                            {meta.sku}
                          </p>
                          <p className="text-[11.5px] text-[#64748B]">
                            {meta.barcode}
                          </p>
                        </td>

                        {/* Category Pill */}
                        <td className="py-2.5 px-2.5">
                          <span className="inline-flex rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11.5px] font-medium text-[#334155]">
                            {meta.categoryPill}
                          </span>
                        </td>

                        {/* Stock Quantity */}
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`font-bold ${
                              stockRed ? 'text-[#EF4444]' : 'text-[#111827]'
                            }`}
                          >
                            {meta.stock}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-2.5 px-2.5 font-bold text-[#111827]">
                          {formatInvPrice(meta.price, currencySymbol)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                              isOut
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : isLow
                                  ? 'bg-[#FEF3C7] text-[#D97706]'
                                  : 'bg-[#E6F6F0] text-[#0A7B56]'
                            }`}
                          >
                            {meta.statusOverride}
                          </span>
                        </td>

                        {/* Actions Kebab */}
                        <td className="py-2.5 pl-2 pr-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductId(product.id);
                              openEditProductModal(product);
                            }}
                            aria-label={`Actions for ${meta.displayName}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EBF2EE] hover:text-[#111827]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col gap-2.5 border-t border-[#EBF2EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] font-medium text-[#64748B]">
                Showing 1–{Math.min(pageSize, visibleRows.length)} of {visibleRows.length} product{visibleRows.length === 1 ? '' : 's'}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {[1, 2, 3, 4, 5].map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold transition ${
                        currentPage === pg
                          ? 'bg-[#0A6847] text-white'
                          : 'border border-[#DCE9E3] bg-white text-[#334155] hover:bg-[#F4F8F6]'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <span className="px-1 text-[12px] text-[#64748B]">...</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(25)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[12px] font-bold text-[#334155] hover:bg-[#F4F8F6]`}
                  >
                    25
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(25, p + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <select
                  aria-label="Items per page"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded-lg border border-[#DCE9E3] bg-white px-2 text-[12px] font-medium text-[#334155]"
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={25}>25 / page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Panel: Product Detail Inspector */}
          {selectedEntry && (
            <div className="lg:col-span-4 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
              {/* Top Product Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <BosProductThumbnail product={selectedEntry.product} size="lg" />
                  <div>
                    <h2 className="text-[16.5px] font-extrabold text-[#111827] leading-snug">
                      {selectedEntry.meta.inspectorTitle}
                    </h2>
                    <p className="text-[12.5px] font-medium text-[#64748B]">
                      {selectedEntry.meta.brand}
                    </p>
                    <span
                      className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        selectedEntry.meta.statusOverride === 'Out of Stock'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : selectedEntry.meta.statusOverride === 'Low Stock'
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#E6F6F0] text-[#0A7B56]'
                      }`}
                    >
                      {selectedEntry.meta.statusOverride}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectorTab('overview')}
                  className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6] hover:text-[#111827]"
                  aria-label="Close inspector"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Inspector Underline Tabs: Overview | Stock History | Sales | Edit */}
              <div className="flex items-center gap-5 border-b border-[#EBF2EE]">
                {(
                  [
                    { id: 'overview', label: t('inventory.overview', 'Overview') },
                    { id: 'stockHistory', label: t('inventory.stockHistory', 'Stock History') },
                    { id: 'sales', label: t('inventory.salesTrend', 'Sales') },
                    { id: 'edit', label: t('common.edit', 'Edit') },
                  ] as const
                ).map((tabItem) => {
                  const active = inspectorTab === tabItem.id;
                  return (
                    <button
                      key={tabItem.id}
                      type="button"
                      onClick={() => {
                        if (tabItem.id === 'edit') {
                          openEditProductModal(selectedEntry.product);
                        } else {
                          setInspectorTab(tabItem.id);
                        }
                      }}
                      className={`relative pb-2 text-[12.5px] transition cursor-pointer ${
                        active
                          ? 'font-bold text-[#0A6847]'
                          : 'font-medium text-[#64748B] hover:text-[#111827]'
                      }`}
                    >
                      <span>{tabItem.label}</span>
                      {active && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#0A6847]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Inspector Body */}
              {inspectorTab === 'stockHistory' ? (
                <div className="space-y-2 py-1 text-[12px]">
                  <div className="rounded-xl border border-[#EBF2EE] bg-[#F8FCFA] p-2.5 flex justify-between">
                    <div>
                      <p className="font-bold text-[#111827]">Opening Stock Count</p>
                      <p className="text-[11px] text-[#64748B]">10 Oct, 09:00 AM • Main Store</p>
                    </div>
                    <span className="font-bold text-[#0A6847]">+60 pcs</span>
                  </div>
                  <div className="rounded-xl border border-[#EBF2EE] bg-[#F8FCFA] p-2.5 flex justify-between">
                    <div>
                      <p className="font-bold text-[#111827]">POS Counter Sales</p>
                      <p className="text-[11px] text-[#64748B]">Today • Register #1</p>
                    </div>
                    <span className="font-bold text-[#EF4444]">-12 pcs</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  {/* Left Metadata Key-Value Column (7 cols) */}
                  <div className="sm:col-span-7 space-y-1.5 text-[12px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">SKU</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.sku}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Barcode</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.barcode}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Category</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.categoryPill}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Brand</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.brand}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 pt-1">
                      <span className="text-[#64748B]">Selling Price</span>
                      <span className="font-extrabold text-[#111827] text-right">
                        {formatInvPrice(selectedEntry.meta.price, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Purchase Price</span>
                      <span className="font-bold text-[#111827] text-right">
                        {formatInvPrice(selectedEntry.meta.purchasePrice, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">MRP</span>
                      <span className="font-bold text-[#111827] text-right">
                        {formatInvPrice(selectedEntry.meta.mrp, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 pt-1">
                      <span className="text-[#64748B]">Current Stock</span>
                      <span className="font-extrabold text-[#111827] text-right">
                        {selectedEntry.meta.stock}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Minimum Stock</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.minStock}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Unit</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.inspectorUnit}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Tax (GST)</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.gstRate}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Location</span>
                      <span className="font-bold text-[#111827] text-right">
                        {selectedEntry.meta.location}
                      </span>
                    </div>
                  </div>

                  {/* Right Analytics Column: Sales (Last 30 days) + Recent Sales (5 cols) */}
                  <div className="sm:col-span-5 space-y-2.5">
                    {/* Sales (Last 30 days) Card */}
                    <div className="rounded-xl border border-[#E6EFEA] bg-[#FBFDFC] p-2.5">
                      <p className="text-[11px] font-semibold text-[#475569]">
                        Sales (Last 30 days)
                      </p>
                      <p className="mt-0.5 text-[20px] font-extrabold text-[#111827] leading-tight">
                        {productSalesAnalytics.totalSold}
                      </p>
                      <span className="mt-0.5 inline-flex rounded bg-[#E6F6F0] px-1.5 py-0.2 text-[10.5px] font-bold text-[#0A7B56]">
                        {productSalesAnalytics.trend}
                      </span>
                      <svg
                        viewBox="0 0 120 42"
                        className="mt-1.5 h-10 w-full overflow-visible"
                        fill="none"
                      >
                        <defs>
                          <linearGradient id="invSalesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M2 35 L 22 30 L 42 32 L 64 20 L 82 22 L 102 10 L 118 6 L 118 40 L 2 40 Z"
                          fill="url(#invSalesGrad)"
                        />
                        <path
                          d="M2 35 L 22 30 L 42 32 L 64 20 L 82 22 L 102 10 L 118 6"
                          stroke="#0A7B56"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    {/* Recent Sales Card */}
                    <div className="rounded-xl border border-[#E6EFEA] bg-[#FBFDFC] p-2.5">
                      <p className="text-[11.5px] font-bold text-[#111827] mb-1.5">
                        Recent Sales
                      </p>
                      <div className="space-y-1.5 text-[10.5px]">
                        {productSalesAnalytics.recentList.length > 0 ? (
                          productSalesAnalytics.recentList.map((s, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[#64748B]"
                            >
                              <span className="truncate">{s.time}</span>
                              <span className="font-bold text-[#111827] shrink-0">
                                {s.qty}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-[#94A3B8] italic py-1">
                            No sales recorded yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Inline Stock Updater (when Update Stock is clicked) */}
              {showStockModal && (
                <div className="rounded-xl border border-[#BCE3D4] bg-[#F2FAF6] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#0A6847]">
                      Adjust Stock ({selectedEntry.meta.displayName})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowStockModal(false)}
                      className="text-[11px] font-semibold text-[#64748B]"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={stockDeltaInput}
                      onChange={(e) => setStockDeltaInput(Number(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[12.5px] font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleApplyStockAdjustment}
                      className="rounded-lg bg-[#0A6847] px-3 py-1.5 text-[12px] font-semibold text-white"
                    >
                      Save Stock
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom 2x2 Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowStockModal((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A6847] px-3 py-2.5 text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
                >
                  <Box className="h-4 w-4" />
                  <span>Update Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditProductModal(selectedEntry.product)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#BCE3D4] bg-[#F2FAF6] px-3 py-2.5 text-[12.5px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] transition cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Product</span>
                </button>

                <button
                  type="button"
                  onClick={handleDuplicateSelected}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12.5px] font-bold text-[#334155] hover:bg-[#F1F5F9] transition cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFE4E6] bg-[#FFF1F2] px-3 py-2.5 text-[12.5px] font-bold text-[#E11D48] hover:bg-[#FFE4E6] transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Product</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal with Zero-Hosting Public Barcode Image Lookup & Icon+Name Fallback Preview */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-[#DCE9E3]">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#111827]">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="text-[12px] text-[#64748B]">
                  Auto-fetches image from centralized/public barcode CDN or displays Icon + Product Name.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProductFormSubmit} className="mt-4 space-y-3">
              {/* Live Thumbnail Preview (Image or Icon + Product Name fallback) */}
              <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BosProductThumbnail
                      product={{
                        name: formState.name || 'New Product',
                        category: formState.category,
                        barcode: formState.barcode,
                        imageUrl: formState.imageUrl,
                      }}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-[#111827] truncate">
                        {formState.name || 'Product Preview'}
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate">
                        {modalFetchMessage
                          ? modalFetchMessage
                          : formState.imageUrl
                            ? 'Using Centralized / Public CDN Image URL'
                            : 'No hosted image needed — auto-resolves or shows Icon + Product Name'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {formState.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormState((s) => ({ ...s, imageUrl: '' }));
                          setModalFetchMessage('Cleared external image — using Icon + Product Name');
                        }}
                        className="rounded-lg border border-[#DCE9E3] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        Use Icon
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={fetchingPublicImage}
                      onClick={handleAutoFetchPublicImage}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A6847] px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#085238] disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>
                        {fetchingPublicImage ? 'Looking up...' : 'Auto-Fetch Image'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setModalFetchMessage(null);
                      setFormState((s) => ({ ...s, name: nextName }));
                    }}
                    placeholder="e.g. Loose Basmati Rice"
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formState.brand}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, brand: e.target.value }))
                    }
                    placeholder="e.g. Nestle, Amul, Local"
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formState.sku}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, sku: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Barcode (EAN-13)
                  </label>
                  <input
                    type="text"
                    value={formState.barcode}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, barcode: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, category: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Selling ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={formState.price}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, price: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-2.5 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Purchase ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={formState.costPrice}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        costPrice: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-2.5 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    value={formState.stockQuantity}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        stockQuantity: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-2.5 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155]">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formState.unit}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, unit: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#DCE9E3] px-2.5 py-2 text-[12.5px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12.5px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#085238]"
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

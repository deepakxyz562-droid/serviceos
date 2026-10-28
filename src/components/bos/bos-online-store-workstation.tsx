'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgePercent,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  FolderTree,
  IndianRupee,
  Link2,
  MapPin,
  Menu,
  MoreVertical,
  Package,
  Palette,
  Plus,
  Power,
  QrCode,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { BosProductThumbnail } from '@/components/bos/bos-product-image-resolver';
import {
  type BosOrder,
  type BosProductItem,
  type BosStoreSettings,
} from '@/components/bos/bos-types';
import { authFetch } from '@/lib/client-auth';
import { isValidUpiId, sanitizeUpiId } from '@/lib/upi-qr';

type StoreSubTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'deliverySettings'
  | 'storeSettings'
  | 'themes'
  | 'promotions';

type PreviewDeviceMode = 'mobile' | 'desktop';

type BosOnlineStoreWorkstationProps = {
  storeSettings: BosStoreSettings;
  products: BosProductItem[];
  orders: BosOrder[];
  demoMode?: boolean;
  onUpdateStoreSettings: (patch: Partial<BosStoreSettings>) => Promise<void>;
  onToggleProductOnline: (productId: string, visible: boolean) => void;
};

type OnlineShowcaseRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'Active' | 'Draft';
  featured: boolean;
  barcode: string;
  imageUrl: string;
};

function mapProductsToOnlineRows(items: BosProductItem[]): OnlineShowcaseRow[] {
  return items.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stockQuantity,
    status: (p.onlineVisible !== false ? 'Active' : 'Draft') as 'Active' | 'Draft',
    featured: p.onlineVisible !== false,
    barcode: p.barcode || p.sku || '',
    imageUrl: p.imageUrl || '',
  }));
}

const INITIAL_ONLINE_PRODUCTS: OnlineShowcaseRow[] = [
  {
    id: 'prod-2',
    name: 'Maggi Noodles 70g',
    category: 'Snacks',
    price: 14,
    stock: 120,
    status: 'Active',
    featured: true,
    barcode: '8901058000012',
    imageUrl: '/bos/products/maggi-noodles.png',
  },
  {
    id: 'prod-6',
    name: 'Coca Cola 500ml',
    category: 'Beverages',
    price: 40,
    stock: 85,
    status: 'Active',
    featured: true,
    barcode: '8901764011234',
    imageUrl: '/bos/products/coca-cola.png',
  },
  {
    id: 'prod-15',
    name: 'Ariel Detergent 1kg',
    category: 'Home Care',
    price: 360,
    stock: 45,
    status: 'Active',
    featured: true,
    barcode: '4987176045218',
    imageUrl: '/bos/products/ariel-detergent.png',
  },
  {
    id: 'prod-8',
    name: 'Dove Soap 100g',
    category: 'Personal Care',
    price: 38,
    stock: 200,
    status: 'Active',
    featured: false,
    barcode: '8901030834567',
    imageUrl: '/bos/products/dove-soap.png',
  },
  {
    id: 'prod-4',
    name: 'Sunflower Oil 1L',
    category: 'Grocery',
    price: 140,
    stock: 60,
    status: 'Active',
    featured: true,
    barcode: '8905009000023',
    imageUrl: '/bos/products/sunflower-oil.png',
  },
];

export function BosOnlineStoreWorkstation({
  storeSettings,
  products = [],
  orders = [],
  demoMode = false,
  onUpdateStoreSettings,
  onToggleProductOnline,
}: BosOnlineStoreWorkstationProps) {
  const currencySymbol = storeSettings.currencySymbol || '₹';

  const [subTab, setSubTab] = useState<StoreSubTab>('overview');
  const [previewMode, setPreviewMode] = useState<PreviewDeviceMode>('mobile');

  // Store Settings Card States
  const [storeName, setStoreName] = useState(() =>
    demoMode ? 'Ravi Store' : (storeSettings.businessName || 'My Store')
  );
  const [businessType, setBusinessType] = useState(() =>
    demoMode ? 'Grocery Store' : (storeSettings.businessType || 'Retail Store')
  );
  const [storeDescription, setStoreDescription] = useState(() =>
    demoMode
      ? 'Daily groceries, home essentials, fresh products and more. Fast delivery in your area.'
      : (storeSettings.tagline || '')
  );

  // Delivery & Ordering States
  const [homeDelivery, setHomeDelivery] = useState(
    () => storeSettings.enableLocalDelivery ?? true
  );
  const [selfPickup, setSelfPickup] = useState(
    () => storeSettings.enableStorePickup ?? true
  );
  const [dineInTakeaway, setDineInTakeaway] = useState(false);

  // GST & Tax Configuration States
  const [enableGst, setEnableGst] = useState(() => Boolean(storeSettings.enableGst));
  const [storeTaxRate, setStoreTaxRate] = useState(() => Number(storeSettings.taxRate ?? 0));
  const [storeTaxType, setStoreTaxType] = useState<'inclusive' | 'exclusive'>(() => storeSettings.taxType || 'inclusive');
  const [storeGstin, setStoreGstin] = useState(() => storeSettings.gstin || '');

  // Products Table States
  const [catalogRows, setCatalogRows] = useState<OnlineShowcaseRow[]>(() =>
    demoMode ? INITIAL_ONLINE_PRODUCTS : mapProductsToOnlineRows(products)
  );

  useEffect(() => {
    if (storeSettings.businessName) setStoreName(storeSettings.businessName);
    if (storeSettings.tagline !== undefined) setStoreDescription(storeSettings.tagline);
    if (storeSettings.businessType) setBusinessType(storeSettings.businessType);
    if (storeSettings.enableLocalDelivery !== undefined) setHomeDelivery(storeSettings.enableLocalDelivery);
    if (storeSettings.enableStorePickup !== undefined) setSelfPickup(storeSettings.enableStorePickup);
    if (storeSettings.enableGst !== undefined) setEnableGst(Boolean(storeSettings.enableGst));
    if (storeSettings.taxRate !== undefined) setStoreTaxRate(Number(storeSettings.taxRate));
    if (storeSettings.taxType) setStoreTaxType(storeSettings.taxType);
    if (storeSettings.gstin !== undefined) setStoreGstin(storeSettings.gstin);
  }, [storeSettings]);

  useEffect(() => {
    if (!demoMode) {
      setCatalogRows(mapProductsToOnlineRows(products));
    }
  }, [products, demoMode]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Modals & Toast
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrMode, setQrMode] = useState<'storefront' | 'table' | 'payment' | 'booking'>(
    'storefront',
  );
  const [qrTableNumber, setQrTableNumber] = useState('12');
  const [whatsappShareUrl, setWhatsappShareUrl] = useState('');
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'Grocery',
    price: 95,
    stock: 50,
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Real share-action tracking for the onboarding checklist: the "Share your
  // store" step is only marked done after the operator ACTUALLY copies the
  // store link or shares it on WhatsApp in this session. No fabricated state.
  const [storeSharedOnce, setStoreSharedOnce] = useState(false);
  const markStoreShared = () => setStoreSharedOnce(true);

  const [serverStoreUrl, setServerStoreUrl] = useState<string | null>(null);
  const [serverStoreSlug, setServerStoreSlug] = useState<string | null>(null);

  const liveOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://bos.fieseros.com';
  const effectiveSlug = serverStoreSlug || storeSettings.businessSlug || 'my-store';
  const storeUrl = serverStoreUrl || `${liveOrigin}/store/${effectiveSlug}`;
  const publicStorePath = `/store/${effectiveSlug}`;

  // Store "created/published" — TRUE only when the server confirms the
  // commerce config is active (/api/commerce/store-share returns a real
  // storeUrl) or the store settings flag says the store is live.
  const storePublished = Boolean(serverStoreUrl) || storeSettings.storeLive === true;

  useEffect(() => {
    let active = true;
    authFetch('/api/commerce/store-share')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.storeUrl) {
          setServerStoreUrl(data.storeUrl);
          try {
            const parsed = new URL(data.storeUrl);
            const pathParts = parsed.pathname.split('/').filter(Boolean);
            const s = pathParts[pathParts.length - 1];
            if (s) setServerStoreSlug(s);
          } catch {}
        }
        if (data.whatsappShareUrl) {
          setWhatsappShareUrl(String(data.whatsappShareUrl));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const [themeColor, setThemeColor] = useState('#0A6847');
  const [themeLayout, setThemeLayout] = useState<'grid' | 'list'>('grid');
  const [minOrderInput, setMinOrderInput] = useState(() => String(storeSettings.minOrderAmount || 200));
  const [deliveryChargeInput, setDeliveryChargeInput] = useState(() => String(storeSettings.deliveryCharge || 30));
  const [freeDeliveryAboveInput, setFreeDeliveryAboveInput] = useState(() => String(storeSettings.freeDeliveryAbove || 500));
  const [deliveryRadiusInput, setDeliveryRadiusInput] = useState(() => String(storeSettings.deliveryRadiusKm || 5));
  const [estimatedDeliveryTimeInput, setEstimatedDeliveryTimeInput] = useState(() => storeSettings.estimatedDeliveryTime || '30 - 45 minutes');
  const [bannerText, setBannerText] = useState(() => storeSettings.announcementBanner || '');
  const [storeUpiId, setStoreUpiId] = useState(() => storeSettings.upiId || '');
  const [storePaymentQr, setStorePaymentQr] = useState(() => storeSettings.paymentQrUrl || '');
  const [storeOnlinePayEnabled, setStoreOnlinePayEnabled] = useState(() => storeSettings.enableOnlinePayment ?? true);

  useEffect(() => {
    if (storeSettings.upiId !== undefined) setStoreUpiId(storeSettings.upiId);
    if (storeSettings.paymentQrUrl !== undefined) setStorePaymentQr(storeSettings.paymentQrUrl);
    if (storeSettings.enableOnlinePayment !== undefined) setStoreOnlinePayEnabled(storeSettings.enableOnlinePayment);
  }, [storeSettings.upiId, storeSettings.paymentQrUrl, storeSettings.enableOnlinePayment]);

  const activeQrTargetUrl = useMemo(() => {
    if (qrMode === 'table') {
      return `${storeUrl}?table=${encodeURIComponent(qrTableNumber || '1')}`;
    }
    if (qrMode === 'payment') {
      const rawUpi = (storeUpiId || storeSettings.upiId || '').trim();
      const upi = sanitizeUpiId(rawUpi);
      // If merchant has no UPI ID or format is invalid, do not generate an invalid UPI URI
      if (!upi || !isValidUpiId(upi)) {
        return '';
      }
      // Strict NPCI compliance: pa, pn, and cu=INR are mandatory
      return `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(storeSettings.businessName || storeName)}&cu=INR`;
    }
    if (qrMode === 'booking') {
      return `${storeUrl}?mode=booking`;
    }
    return storeUrl;
  }, [qrMode, qrTableNumber, storeSettings.businessName, storeSettings.upiId, storeUpiId, storeName, storeUrl]);

  const handleDownloadQr = (targetData: string, filename: string) => {
    if (!targetData) {
      showToast('No QR code data available to download');
      return;
    }
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(targetData)}`;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded printable ${filename}`);
  };

  const onlineKpiStats = useMemo(() => {
    if (demoMode) {
      return {
        totalOrders: 86,
        ordersTrend: '↑ 28%',
        totalSales: 24580,
        salesTrend: '↑ 32%',
        avgOrderValue: 286,
        aovTrend: '↑ 18%',
        newCustomers: 42,
        custTrend: '↑ 25%',
      };
    }
    const onlineOrders = orders.filter(
      (o) => o.channel === 'online' && o.status !== 'cancelled',
    );
    const totalOrders = onlineOrders.length;
    const totalSales = onlineOrders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || 0),
      0,
    );
    const avgOrderValue =
      totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
    const uniqueCusts = new Set(
      onlineOrders.map((o) => o.customerPhone || o.customerName).filter(Boolean),
    ).size;
    return {
      totalOrders,
      ordersTrend: totalOrders > 0 ? 'Live' : '—',
      totalSales,
      salesTrend: totalSales > 0 ? 'Live' : '—',
      avgOrderValue,
      aovTrend: avgOrderValue > 0 ? 'Live' : '—',
      newCustomers: uniqueCusts,
      custTrend: uniqueCusts > 0 ? 'Live' : '—',
    };
  }, [demoMode, orders]);

  const categoriesList = useMemo(() => {
    const map = new Map<string, { total: number; online: number }>();
    for (const p of catalogRows) {
      const cat = p.category || 'General';
      const cur = map.get(cat) || { total: 0, online: 0 };
      cur.total += 1;
      if (p.featured) cur.online += 1;
      map.set(cat, cur);
    }
    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    }));
  }, [catalogRows]);

  const onlineOrdersList = useMemo(() => {
    return orders.filter((o) => o.channel === 'online');
  }, [orders]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogRows.filter((row) => {
      if (
        categoryFilter !== 'All Categories' &&
        row.category.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }
      if (
        statusFilter !== 'All Status' &&
        row.status.toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.barcode.toLowerCase().includes(q)
      );
    });
  }, [catalogRows, categoryFilter, statusFilter, searchQuery]);

  const handleCopyStoreLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl).catch(() => {});
    }
    markStoreShared();
    showToast(`Copied store link: ${storeUrl}`);
  };

  const handleOpenStore = () => {
    if (typeof window !== 'undefined') {
      window.open(publicStorePath, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleFeatured = (id: string) => {
    setCatalogRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = !row.featured;
        onToggleProductOnline(id, next);
        return { ...row, featured: next };
      }),
    );
  };

  const handleAddCatalogProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) return;
    const added: OnlineShowcaseRow = {
      id: `prod-online-${Date.now()}`,
      name: newProductForm.name.trim(),
      category: newProductForm.category,
      price: Number(newProductForm.price) || 50,
      stock: Number(newProductForm.stock) || 25,
      status: 'Active',
      featured: true,
      barcode: '',
      imageUrl: '',
    };
    setCatalogRows((prev) => [added, ...prev]);
    setShowAddProductModal(false);
    setNewProductForm({ name: '', category: 'Grocery', price: 95, stock: 50 });
    showToast(`Added "${added.name}" to your online store`);
  };

  const renderCategoriesView = () => (
    <div className="rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-extrabold text-[#111827]">
            Store Categories ({categoriesList.length})
          </h2>
          <p className="text-[12.5px] text-[#64748B]">
            Manage product categories displayed on your online storefront navigation and search.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubTab('products');
            setShowAddProductModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-[#085238] transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categoriesList.map((cat) => (
          <div
            key={cat.name}
            className="flex items-center justify-between rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-3.5 hover:border-[#0A6847] transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A6847]">
                <FolderTree className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-[#111827]">{cat.name}</p>
                <p className="text-[11.5px] text-[#64748B]">
                  {cat.total} product{cat.total === 1 ? '' : 's'} · {cat.online} online
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter(cat.name);
                setSubTab('products');
              }}
              className="rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A6847] hover:bg-[#F4F8F6] cursor-pointer"
            >
              Filter →
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOrdersView = () => (
    <div className="rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-extrabold text-[#111827]">
            Online Store Orders ({onlineOrdersList.length})
          </h2>
          <p className="text-[12.5px] text-[#64748B]">
            Orders placed directly through your online storefront link and QR code menu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-[#E6F6F0] px-3 py-1 text-[12px] font-bold text-[#0A6847]">
            {onlineOrdersList.length} Total Online
          </span>
        </div>
      </div>

      {onlineOrdersList.length === 0 ? (
        <div className="py-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-[#94A3B8]" />
          <p className="mt-3 text-[14px] font-bold text-[#1E293B]">
            No online store orders yet
          </p>
          <p className="mt-1 text-[12px] text-[#64748B] max-w-sm mx-auto">
            Orders placed by customers on your digital storefront ({publicStorePath}) will automatically appear here with delivery details and payment status.
          </p>
          <button
            type="button"
            onClick={handleOpenStore}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#085238] transition cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Open Online Storefront</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                <th className="py-2.5 px-3">Order #</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF5F1]">
              {onlineOrdersList.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#F9FCFA]">
                  <td className="py-2.5 px-3 font-bold text-[#111827]">
                    #{ord.id}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-[#111827]">{ord.customerName}</p>
                    <p className="text-[10.5px] text-[#64748B]">{ord.customerPhone}</p>
                  </td>
                  <td className="py-2.5 px-3 text-[#64748B]">
                    {ord.items?.length || 0} item{(ord.items?.length || 0) === 1 ? '' : 's'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="uppercase font-mono text-[11px] font-bold text-[#475569]">
                      {ord.paymentMode} ({ord.paymentStatus})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#111827]">
                    {currencySymbol} {ord.totalAmount}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderThemesView = () => (
    <div className="rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold text-[#111827]">
            Storefront Themes &amp; Branding
          </h2>
          <p className="text-[12.5px] text-[#64748B]">
            Customize colors, layout, and visual identity for your public digital storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onUpdateStoreSettings({ tagline: storeDescription });
            showToast('Storefront theme updated successfully');
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#085238] transition cursor-pointer"
        >
          <Palette className="h-4 w-4" />
          <span>Save Theme</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Brand Primary Color */}
        <div className="rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-4 space-y-3">
          <label className="block text-[13px] font-bold text-[#111827]">
            Storefront Accent Color
          </label>
          <div className="flex items-center gap-3">
            {[
              { hex: '#0A6847', label: 'Forest Emerald' },
              { hex: '#4F46E5', label: 'Royal Indigo' },
              { hex: '#D97706', label: 'Warm Amber' },
              { hex: '#E11D48', label: 'Ruby Rose' },
              { hex: '#0F172A', label: 'Midnight Slate' },
            ].map((col) => (
              <button
                key={col.hex}
                type="button"
                onClick={() => {
                  setThemeColor(col.hex);
                  showToast(`Selected ${col.label}`);
                }}
                className={`h-9 w-9 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  themeColor === col.hex ? 'scale-110 ring-2 ring-offset-2 ring-[#0A6847]' : ''
                }`}
                style={{ backgroundColor: col.hex }}
                title={col.label}
              >
                {themeColor === col.hex && <CheckCircle2 className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Layout Style */}
        <div className="rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-4 space-y-3">
          <label className="block text-[13px] font-bold text-[#111827]">
            Product Catalog Layout
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'grid', label: '2-Column Cards', desc: 'Recommended for Kirana & Retail' },
              { id: 'list', label: 'Compact List', desc: 'Recommended for Quick Groceries' },
            ].map((lt) => (
              <button
                key={lt.id}
                type="button"
                onClick={() => setThemeLayout(lt.id as 'grid' | 'list')}
                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                  themeLayout === lt.id
                    ? 'border-[#0A6847] bg-[#E6F6F0] text-[#0A6847]'
                    : 'border-[#DCE9E3] bg-white text-[#475569] hover:bg-[#F8FCFA]'
                }`}
              >
                <p className="font-bold text-[12.5px]">{lt.label}</p>
                <p className="text-[10.5px] text-[#64748B] mt-0.5">{lt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPromotionsView = () => (
    <div className="rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold text-[#111827]">
            Storefront Promotions &amp; Announcement Banner
          </h2>
          <p className="text-[12.5px] text-[#64748B]">
            Highlight offers, free shipping thresholds, and seasonal sales banner on top of your store.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onUpdateStoreSettings({
              announcementBanner: bannerText,
              freeDeliveryAbove: Number(freeDeliveryAboveInput) || 0,
              deliveryCharge: Number(deliveryChargeInput) || 0,
            });
            showToast('Promotions and banner saved');
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#085238] transition cursor-pointer"
        >
          <Tag className="h-4 w-4" />
          <span>Save Promotions</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-4 space-y-2">
          <label className="block text-[12.5px] font-bold text-[#111827]">
            Top Announcement Banner Text
          </label>
          <input
            type="text"
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            placeholder="e.g. 🎉 Flat 20% OFF on all Grocery items this weekend!"
            className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#111827]"
          />
          <p className="text-[11px] text-[#64748B]">
            Appears across the top strip of your online store.
          </p>
        </div>

        <div className="rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-4 space-y-2">
          <label className="block text-[12.5px] font-bold text-[#111827]">
            Free Delivery Threshold ({currencySymbol})
          </label>
          <input
            type="number"
            value={freeDeliveryAboveInput}
            onChange={(e) => setFreeDeliveryAboveInput(e.target.value)}
            placeholder="e.g. 499"
            className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#111827]"
          />
          <p className="text-[11px] text-[#64748B]">
            Orders above this amount qualify for free home delivery.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-none space-y-4 pb-6">
      {/* Status Toast Banner */}
      {toastMsg && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {toastMsg}
          </span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header: Title + Subtitle on Left, 4 Action Buttons on Right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-[#111827] leading-tight">
            Online Store
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Create your digital storefront and start selling online. Share via WhatsApp, QR code or a link.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenStore}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-[#475569]" />
            <span>View Store</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5 text-[#475569]" />
            <span>QR Code</span>
          </button>

          <button
            type="button"
            onClick={handleCopyStoreLink}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Link2 className="h-3.5 w-3.5 text-[#475569]" />
            <span>Share Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void onUpdateStoreSettings({
                businessName: storeName,
                businessType: businessType,
                tagline: storeDescription,
                enableLocalDelivery: homeDelivery,
                enableStorePickup: selfPickup,
              });
              showToast('Store customization saved');
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 text-[12.5px] font-semibold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Customize Store</span>
          </button>
        </div>
      </div>

      {/* 8 Underline Sub-Tabs */}
      <div className="flex items-center gap-6 overflow-x-auto border-b border-[#E2ECE7]">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'products', label: 'Products' },
            { id: 'categories', label: 'Categories' },
            { id: 'orders', label: 'Orders' },
            { id: 'deliverySettings', label: 'Delivery Settings' },
            { id: 'storeSettings', label: 'Store Settings' },
            { id: 'themes', label: 'Themes' },
            { id: 'promotions', label: 'Promotions' },
          ] as const
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`relative pb-2.5 text-[13px] whitespace-nowrap transition cursor-pointer ${
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

      {/* Main 12-Column Split Grid: Left Store Dashboard & Products (9 cols) + Right Live Store Preview (3 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* HERO BANNER + VALUE PROPS + SETUP CHECKLIST (Vyapar online-store
              onboarding pattern — every state below comes from REAL data:
              item count from the live product list, publish state from the
              store-share API / storeLive flag, share state from actual
              copy/share actions. No invented social proof. */}
          {subTab === 'overview' && (
            <>
              {/* Hero banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A6847] via-[#0D7A54] to-[#064E3B] p-5 text-white shadow-md sm:p-6">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -bottom-16 right-20 h-28 w-28 rounded-full bg-white/5"
                  aria-hidden="true"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide">
                  <ShoppingBag className="h-3 w-3" />
                  <span>Online Store</span>
                </span>
                <h2 className="mt-2.5 text-[20px] font-extrabold leading-snug tracking-tight sm:text-[22px]">
                  Take {storeName || 'your store'} online — sell 24×7
                </h2>
                <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-white/85">
                  Customers browse your items, place orders and pay directly — from a link and QR
                  you already own. No app download needed.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenStore}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-4 text-[12.5px] font-bold text-[#0A6847] shadow-2xs hover:bg-[#F0FDF6] transition cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Store</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyStoreLink}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/40 px-4 text-[12.5px] font-bold text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </button>
                </div>
                {storePublished && (
                  <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Store live at {storeUrl}</span>
                  </p>
                )}
              </div>

              {/* 3 value-prop cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: ShoppingCart,
                    title: 'Take orders 24×7',
                    desc: 'Customers order anytime — even when your counter is closed.',
                  },
                  {
                    icon: QrCode,
                    title: 'Share in one tap',
                    desc: 'Your link & QR work on WhatsApp, Instagram and printed posters.',
                  },
                  {
                    icon: Truck,
                    title: 'Delivery & pickup built-in',
                    desc: 'Set charges, radius and free-delivery rules in seconds.',
                  },
                ].map((vp) => {
                  const Icon = vp.icon;
                  return (
                    <div
                      key={vp.title}
                      className="flex items-start gap-3 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A6847]">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-extrabold text-[#111827]">{vp.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748B]">{vp.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Setup checklist card — real step states */}
              {(() => {
                const itemsReady = catalogRows.length > 0;
                const steps = [
                  {
                    n: 1,
                    title: 'Add items to inventory',
                    done: itemsReady,
                    sub: itemsReady
                      ? `${catalogRows.length} item${catalogRows.length === 1 ? '' : 's'} ready to sell`
                      : 'Your store needs at least one item before customers can order.',
                    actionLabel: itemsReady ? null : 'Add Item',
                    onAction: () => {
                      setSubTab('products');
                      setShowAddProductModal(true);
                    },
                    blockedBy: null as string | null,
                  },
                  {
                    n: 2,
                    title: 'Create your Online Store',
                    done: storePublished,
                    sub: storePublished
                      ? 'Storefront published — customers can order right now.'
                      : 'Publish your storefront to get a shareable link and QR.',
                    actionLabel: !storePublished && itemsReady ? 'Set Up Store' : null,
                    onAction: () => setSubTab('storeSettings'),
                    blockedBy: !storePublished && !itemsReady ? 'Add items first' : null,
                  },
                  {
                    n: 3,
                    title: 'Share your store',
                    done: storeSharedOnce,
                    sub: storeSharedOnce
                      ? 'Link shared — invite customers on WhatsApp next!'
                      : 'Copy your store link and send it to customers.',
                    actionLabel:
                      !storeSharedOnce && storePublished && itemsReady ? 'Copy Link' : null,
                    onAction: handleCopyStoreLink,
                    blockedBy:
                      !storeSharedOnce && (!itemsReady || !storePublished)
                        ? itemsReady
                          ? 'Publish the store first'
                          : 'Add items first'
                        : null,
                  },
                ];
                const completedCount = steps.filter((s) => s.done).length;
                const primaryStep = steps.find((s) => !s.done && s.actionLabel);
                return (
                  <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-[15px] font-extrabold text-[#111827]">
                          Get your store ready
                        </h2>
                        <p className="text-[11.5px] text-[#64748B]">
                          3 quick steps between you and your first online order.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#E6F6F0] px-2.5 py-1 text-[11px] font-extrabold text-[#0A6847]">
                        {completedCount} of 3 done
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF5F1]">
                      <div
                        className="h-full rounded-full bg-[#0A6847] transition-all duration-300"
                        style={{ width: `${(completedCount / 3) * 100}%` }}
                      />
                    </div>

                    <ol className="space-y-2.5">
                      {steps.map((step) => (
                        <li
                          key={step.n}
                          className="flex items-center gap-3 rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-3"
                        >
                          {step.done ? (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-white">
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#CBD5E1] bg-white text-[11.5px] font-extrabold text-[#94A3B8]">
                              {step.n}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[12.5px] font-bold ${
                                step.done ? 'text-[#0A6847]' : 'text-[#111827]'
                              }`}
                            >
                              {step.title}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[#64748B]">{step.sub}</p>
                          </div>
                          {step.actionLabel ? (
                            <button
                              type="button"
                              onClick={step.onAction}
                              className="shrink-0 rounded-lg bg-[#0A6847] px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-[#085238] transition cursor-pointer"
                            >
                              {step.actionLabel}
                            </button>
                          ) : step.blockedBy ? (
                            <span className="shrink-0 text-[10.5px] font-semibold text-[#94A3B8]">
                              {step.blockedBy}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>

                    {/* Blocking CTA — first incomplete, actionable step */}
                    {primaryStep && (
                      <button
                        type="button"
                        onClick={primaryStep.onAction}
                        className="w-full rounded-xl bg-[#0A6847] py-2.5 text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
                      >
                        {primaryStep.actionLabel}
                      </button>
                    )}

                    {/* Honest social proof — only REAL metrics, never invented */}
                    {(catalogRows.length > 0 || onlineOrdersList.length > 0) && (
                      <p className="text-center text-[11px] font-medium text-[#64748B]">
                        {catalogRows.length > 0 &&
                          `${catalogRows.length} item${catalogRows.length === 1 ? '' : 's'} ready to sell`}
                        {catalogRows.length > 0 &&
                          onlineOrdersList.length > 0 &&
                          ' · '}
                        {onlineOrdersList.length > 0 &&
                          `${onlineOrdersList.length} online order${onlineOrdersList.length === 1 ? '' : 's'} so far`}
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          )}

          {/* ROW 1: 4 KPI Cards with Colored Icons & Sparklines */}
          {subTab === 'overview' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* 1. Total Orders */}
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11.5px] font-medium text-[#64748B]">
                    Total Orders
                  </p>
                  <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
                    {onlineKpiStats.totalOrders}
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">{onlineKpiStats.ordersTrend}</p>
                </div>
              </div>
              <svg viewBox="0 0 70 36" className="h-8 w-16 shrink-0" fill="none">
                <path
                  d="M2 30 L 18 24 L 32 27 L 48 16 L 68 6"
                  stroke="#0A7B56"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* 2. Total Sales */}
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11.5px] font-medium text-[#64748B]">
                    Total Sales
                  </p>
                  <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
                    {currencySymbol} {onlineKpiStats.totalSales.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">{onlineKpiStats.salesTrend}</p>
                </div>
              </div>
              <svg viewBox="0 0 70 36" className="h-8 w-16 shrink-0" fill="none">
                <path
                  d="M2 31 L 20 26 L 36 22 L 52 15 L 68 5"
                  stroke="#0A7B56"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* 3. Avg. Order Value */}
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <BadgePercent className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11.5px] font-medium text-[#64748B]">
                    Avg. Order Value
                  </p>
                  <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
                    {currencySymbol} {onlineKpiStats.avgOrderValue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">{onlineKpiStats.aovTrend}</p>
                </div>
              </div>
              <svg viewBox="0 0 70 36" className="h-8 w-16 shrink-0" fill="none">
                <path
                  d="M2 30 L 18 25 L 34 27 L 50 18 L 68 6"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* 4. New Customers */}
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11.5px] font-medium text-[#64748B]">
                    New Customers
                  </p>
                  <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
                    {onlineKpiStats.newCustomers}
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">{onlineKpiStats.custTrend}</p>
                </div>
              </div>
              <svg viewBox="0 0 70 36" className="h-8 w-16 shrink-0" fill="none">
                <path
                  d="M2 30 L 18 26 L 34 20 L 52 17 L 68 6"
                  stroke="#0A7B56"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

          {/* ROW 2: Configuration Cards (Store Status | Store Settings | Delivery & Ordering) */}
          {(subTab === 'overview' || subTab === 'storeSettings' || subTab === 'deliverySettings') && (
            <div className={`grid grid-cols-1 gap-4 ${subTab === 'deliverySettings' ? 'max-w-2xl' : subTab === 'storeSettings' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {(subTab === 'overview' || subTab === 'storeSettings') && (
                /* CARD 1: Store Status */
                <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">
                  Store Status
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const nextOpen = storeSettings.isStoreOpen === false;
                    void onUpdateStoreSettings({
                      isStoreOpen: nextOpen,
                      lastActiveDate: new Date().toISOString().slice(0, 10),
                      manualCloseReason: nextOpen ? '' : 'Closed manually by merchant',
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                    storeSettings.isStoreOpen !== false
                      ? 'bg-[#E6F6F0] text-[#0A7B56] hover:bg-[#D4EFE4]'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      storeSettings.isStoreOpen !== false ? 'bg-[#0A7B56]' : 'bg-rose-600'
                    }`}
                  />
                  <span>{storeSettings.isStoreOpen !== false ? 'Open • Accepting Orders' : 'Store Paused / Closed'}</span>
                </button>
              </div>

              <div className="space-y-1 rounded-xl bg-[#FAFDFB] border border-[#E4EFEA] p-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#1E293B]">Daily Auto-Close Protection</span>
                  <span className="inline-flex items-center gap-1 text-[#0A7B56] font-semibold text-[10px]">
                    <ShieldCheck className="h-3 w-3" />
                    Active
                  </span>
                </div>
                <p className="text-[10.5px] text-[#64748B] leading-tight">
                  Protects roadside stalls &amp; small shops: store auto-pauses if you haven&apos;t opened the app today.
                </p>
              </div>

              {/* Store Link */}
              <div className="space-y-1.5">
                <label className="block text-[11.5px] font-bold text-[#1E293B]">
                  Store Link
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-1 items-center justify-between rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] px-2.5 py-1.5 min-w-0">
                    <span className="truncate text-[11px] font-medium text-[#334155]">
                      {storeUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyStoreLink}
                      aria-label="Copy store link"
                      className="ml-1.5 text-[#64748B] hover:text-[#111827] shrink-0 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenStore}
                    className="rounded-xl bg-[#0A6847] px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-[#085238] shrink-0 cursor-pointer"
                  >
                    View Store
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="space-y-2 pt-0.5">
                <label className="block text-[11.5px] font-bold text-[#1E293B]">
                  QR Code
                </label>
                <div className="flex items-center gap-3">
                  {/* Real Scannable Storefront QR Code */}
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-[#DCE9E3] bg-white p-1.5 shadow-2xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(storeUrl)}`}
                      alt="Storefront QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] leading-relaxed text-[#64748B]">
                      Scan this QR code to open your digital store
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadQr(storeUrl, `${storeName.replace(/\s+/g, '-').toLowerCase()}-storefront-qr.png`)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-[#475569]" />
                      <span>Download QR</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARD 2: Store Settings */}
          {(subTab === 'overview' || subTab === 'storeSettings') && (
            <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">
                  Store Settings
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    void onUpdateStoreSettings({
                      businessName: storeName,
                      businessType: businessType,
                      tagline: storeDescription,
                      enableGst: enableGst,
                      taxRate: enableGst ? storeTaxRate : 0,
                      taxType: storeTaxType,
                      gstin: storeGstin.trim(),
                    });
                    showToast('Updated Store & GST Settings');
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 text-[11.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-[#0A6847]" />
                  <span>Save</span>
                </button>
              </div>

              {/* Store Thumbnail */}
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-[#DCE9E3] bg-[#E6F6F0] text-[#0A7B56] flex items-center justify-center font-bold text-base shadow-2xs">
                {storeSettings.logoUrl ? (
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  storeName.slice(0, 2).toUpperCase()
                )}
              </div>

              {/* Store Name */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-semibold text-[#111827]"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Business Type
                </label>
                <select
                  aria-label="Business Type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                >
                  <option value="Grocery Store">Grocery Store</option>
                  <option value="Supermarket & Kirana">
                    Supermarket &amp; Kirana
                  </option>
                  <option value="Pharmacy & Medical">
                    Pharmacy &amp; Medical
                  </option>
                  <option value="Electronics & Retail">
                    Electronics &amp; Retail
                  </option>
                </select>
              </div>

              {/* Store Description */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Store Description
                </label>
                <textarea
                  rows={2}
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white p-2.5 text-[11.5px] leading-relaxed text-[#334155]"
                />
              </div>

              {/* GST & Tax Configuration (Opt-in for Roadside Carts & Small Shops) */}
              <div className="border-t border-[#F1F5F3] pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-bold text-[#111827]">GST &amp; Taxes</p>
                    <p className="text-[10.5px] text-[#64748B]">Small shops &amp; roadside stalls can keep this OFF</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableGst}
                      onChange={(e) => setEnableGst(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0A6847]"></div>
                  </label>
                </div>

                {enableGst && (
                  <div className="space-y-2.5 pt-1 pl-2.5 border-l-2 border-emerald-500">
                    <div>
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                        GST Rate (%)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[0, 5, 12, 18].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setStoreTaxRate(rate)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              storeTaxRate === rate
                                ? 'bg-[#0A6847] text-white'
                                : 'bg-slate-100 text-[#475569] hover:bg-slate-200'
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={storeTaxRate}
                          onChange={(e) => setStoreTaxRate(Number(e.target.value) || 0)}
                          className="h-7 w-16 rounded-lg border border-[#DCE9E3] bg-white px-2 text-[11.5px] font-bold text-[#111827]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                        Tax Calculation Mode
                      </label>
                      <select
                        value={storeTaxType}
                        onChange={(e) => setStoreTaxType(e.target.value as 'inclusive' | 'exclusive')}
                        className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[11.5px] font-semibold text-[#111827]"
                      >
                        <option value="inclusive">Prices already include GST (Inclusive)</option>
                        <option value="exclusive">Add GST on top at checkout (Exclusive)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                        Store GSTIN (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 27AABCV1234F1Z2"
                        value={storeGstin}
                        onChange={(e) => setStoreGstin(e.target.value.toUpperCase())}
                        className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 text-[11.5px] font-mono font-semibold text-[#111827]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CARD 3: Delivery & Ordering */}
          {(subTab === 'overview' || subTab === 'deliverySettings') && (
            <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">
                  Delivery &amp; Ordering
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    void onUpdateStoreSettings({
                      enableLocalDelivery: homeDelivery,
                      enableStorePickup: selfPickup,
                      minOrderAmount: Number(minOrderInput) || 0,
                      deliveryCharge: Number(deliveryChargeInput) || 0,
                      freeDeliveryAbove: Number(freeDeliveryAboveInput) || 0,
                      deliveryRadiusKm: Number(deliveryRadiusInput) || 0,
                      estimatedDeliveryTime: estimatedDeliveryTimeInput,
                    });
                    showToast('Updated Delivery & Ordering rules');
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 text-[11.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-[#0A6847]" />
                  <span>Save</span>
                </button>
              </div>

              {/* Order Types */}
              <div className="flex items-start gap-2.5">
                <ShoppingBag className="mt-0.5 h-4 w-4 text-[#475569] shrink-0" />
                <div className="space-y-1.5 text-[12px] flex-1">
                  <p className="font-bold text-[#111827]">Order Types</p>
                  <div className="flex flex-wrap gap-4 pt-0.5">
                    <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={homeDelivery}
                        onChange={(e) => setHomeDelivery(e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-[#2563EB]"
                      />
                      <span>Home Delivery</span>
                    </label>
                    <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selfPickup}
                        onChange={(e) => setSelfPickup(e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-[#2563EB]"
                      />
                      <span>Self Pickup</span>
                    </label>
                    <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dineInTakeaway}
                        onChange={(e) => setDineInTakeaway(e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-[#2563EB]"
                      />
                      <span>Dine-in / Takeaway</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Delivery Area */}
              <div className="border-t border-[#F1F5F3] pt-2.5">
                <label className="flex items-center gap-2 text-[11.5px] font-bold text-[#111827] mb-1">
                  <MapPin className="h-4 w-4 text-[#475569] shrink-0" />
                  <span>Delivery Radius (km)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={deliveryRadiusInput}
                    onChange={(e) => setDeliveryRadiusInput(e.target.value)}
                    className="h-8 w-28 rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                  />
                  <span className="text-[11.5px] text-[#64748B]">km around your location</span>
                </div>
              </div>

              {/* Minimum Order Amount */}
              <div className="border-t border-[#F1F5F3] pt-2.5">
                <label className="flex items-center gap-2 text-[11.5px] font-bold text-[#111827] mb-1">
                  <Calendar className="h-4 w-4 text-[#475569] shrink-0" />
                  <span>Minimum Order Amount ({currencySymbol})</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={minOrderInput}
                  onChange={(e) => setMinOrderInput(e.target.value)}
                  className="h-8 w-36 rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                />
              </div>

              {/* Delivery Charges */}
              <div className="border-t border-[#F1F5F3] pt-2.5">
                <label className="flex items-center gap-2 text-[11.5px] font-bold text-[#111827] mb-1">
                  <Truck className="h-4 w-4 text-[#475569] shrink-0" />
                  <span>Delivery Charges &amp; Free Delivery Threshold</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10.5px] text-[#64748B] mb-0.5">Base Delivery Fee ({currencySymbol})</span>
                    <input
                      type="number"
                      min="0"
                      value={deliveryChargeInput}
                      onChange={(e) => setDeliveryChargeInput(e.target.value)}
                      className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                    />
                  </div>
                  <div>
                    <span className="block text-[10.5px] text-[#64748B] mb-0.5">Free Delivery Above ({currencySymbol})</span>
                    <input
                      type="number"
                      min="0"
                      value={freeDeliveryAboveInput}
                      onChange={(e) => setFreeDeliveryAboveInput(e.target.value)}
                      className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Delivery Time */}
              <div className="border-t border-[#F1F5F3] pt-2.5">
                <label className="flex items-center gap-2 text-[11.5px] font-bold text-[#111827] mb-1">
                  <Clock className="h-4 w-4 text-[#475569] shrink-0" />
                  <span>Estimated Delivery Time</span>
                </label>
                <input
                  type="text"
                  value={estimatedDeliveryTimeInput}
                  onChange={(e) => setEstimatedDeliveryTimeInput(e.target.value)}
                  placeholder="e.g. 30 - 45 minutes"
                  className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-semibold text-[#111827]"
                />
              </div>
            </div>
          )}

          {/* CARD 4: Online Payments & UPI QR */}
          {(subTab === 'overview' || subTab === 'storeSettings') && (
            <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-extrabold text-[#111827]">
                    Online Payments &amp; UPI QR
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Receive instant direct-to-bank customer payments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cleanUpi = sanitizeUpiId(storeUpiId);
                    setStoreUpiId(cleanUpi);
                    void onUpdateStoreSettings({
                      upiId: cleanUpi,
                      paymentQrUrl: storePaymentQr,
                      enableOnlinePayment: storeOnlinePayEnabled,
                    });
                    showToast('Updated Online Payment Settings');
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 text-[11.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-[#0A6847]" />
                  <span>Save</span>
                </button>
              </div>

              {/* Toggle */}
              <label className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#111827] cursor-pointer">
                <span>Accept UPI Payments on Store</span>
                <input
                  type="checkbox"
                  checked={storeOnlinePayEnabled}
                  onChange={(e) => setStoreOnlinePayEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#0A6847]"
                />
              </label>

              {/* UPI ID Input */}
              <div className="border-t border-[#F1F5F3] pt-2.5">
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Merchant UPI ID
                </label>
                <input
                  type="text"
                  value={storeUpiId}
                  onChange={(e) => setStoreUpiId(e.target.value)}
                  onBlur={() => setStoreUpiId((prev) => sanitizeUpiId(prev))}
                  placeholder="e.g. storename@okhdfcbank"
                  className={`h-8 w-full rounded-xl border bg-white px-3 text-[12px] font-semibold text-[#111827] ${
                    storeUpiId && storeUpiId.trim().length > 3 && !isValidUpiId(storeUpiId)
                      ? 'border-amber-300 focus:border-amber-500'
                      : 'border-[#DCE9E3] focus:border-[#0A6847]'
                  }`}
                />
                {storeUpiId && storeUpiId.trim().length > 3 && !isValidUpiId(storeUpiId) && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>Format must include @handle (e.g. shop@okhdfcbank or 9876543210@paytm)</span>
                  </p>
                )}
                {storeUpiId && isValidUpiId(storeUpiId) && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>Valid UPI ID — Ready for GPay, PhonePe, Paytm, BHIM</span>
                  </p>
                )}
              </div>

              {/* QR Code thumbnail */}
              <div className="border-t border-[#F1F5F3] pt-2.5 flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] p-1 flex items-center justify-center shrink-0">
                  {storePaymentQr ? (
                    <img src={storePaymentQr} alt="Payment QR" className="h-full w-full object-contain" />
                  ) : storeUpiId && isValidUpiId(storeUpiId) ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                        `upi://pay?pa=${encodeURIComponent(storeUpiId.trim())}&pn=${encodeURIComponent(storeName.trim())}&cu=INR`
                      )}`}
                      alt="UPI QR"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <QrCode className="h-6 w-6 text-[#94A3B8]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-[11px]">
                  <p className="font-semibold text-[#111827]">
                    {storePaymentQr
                      ? 'Custom Shop QR Active'
                      : storeUpiId && isValidUpiId(storeUpiId)
                      ? 'Auto-generated UPI QR'
                      : 'No Valid UPI Set'}
                  </p>
                  <p className="text-[#64748B] text-[10.5px] truncate">
                    {storeUpiId && !isValidUpiId(storeUpiId)
                      ? 'Enter a valid UPI handle above'
                      : 'Customers can scan or 1-tap open UPI apps'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {subTab === 'categories' && renderCategoriesView()}
        {subTab === 'orders' && renderOrdersView()}
        {subTab === 'themes' && renderThemesView()}
        {subTab === 'promotions' && renderPromotionsView()}

        {/* ROW 3: PRODUCTS TABLE CARD */}
        {(subTab === 'overview' || subTab === 'products') && (
          <div className="rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#EBF2EE] px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                <h2 className="text-[15.5px] font-extrabold text-[#111827] shrink-0">
                  Products{' '}
                  <span className="font-medium text-[#64748B]">({catalogRows.length})</span>
                </h2>

                <div className="relative flex-1 max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by name, barcode or SKU..."
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-8 pr-3 text-[12px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B]"
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Home Care">Home Care</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Grocery">Grocery</option>
                </select>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B]"
                >
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0A6847] px-3.5 text-[12px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11.5px] font-semibold text-[#64748B]">
                    <th className="w-10 py-2.5 pl-4 pr-2">
                      <input
                        type="checkbox"
                        aria-label="Select all online products"
                        checked={
                          filteredRows.length > 0 &&
                          selectedRowIds.length === filteredRows.length
                        }
                        onChange={() => {
                          if (selectedRowIds.length === filteredRows.length) {
                            setSelectedRowIds([]);
                          } else {
                            setSelectedRowIds(filteredRows.map((r) => r.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-2.5">Product</th>
                    <th className="py-2.5 px-2.5">Category</th>
                    <th className="py-2.5 px-2.5">Price</th>
                    <th className="py-2.5 px-2.5">Stock</th>
                    <th className="py-2.5 px-2.5">Status</th>
                    <th className="py-2.5 px-2.5">Featured</th>
                    <th className="py-2.5 pl-2 pr-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[13px] text-[#64748B]">
                        No online products found. Click &quot;Add Product&quot; to publish your first product to the storefront.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                    const isChecked = selectedRowIds.includes(row.id);
                    return (
                      <tr key={row.id} className="hover:bg-[#F9FCFA]">
                        <td className="py-2.5 pl-4 pr-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.name}`}
                            checked={isChecked}
                            onChange={() =>
                              setSelectedRowIds((prev) =>
                                prev.includes(row.id)
                                  ? prev.filter((x) => x !== row.id)
                                  : [...prev, row.id],
                              )
                            }
                            className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                          />
                        </td>

                        {/* Product Packshot + Name */}
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <BosProductThumbnail
                              product={{
                                name: row.name,
                                category: row.category,
                                barcode: row.barcode,
                                imageUrl: row.imageUrl,
                              }}
                              size="sm"
                            />
                            <span className="font-bold text-[#111827]">
                              {row.name}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-2.5 text-[#64748B]">
                          {row.category}
                        </td>

                        {/* Price */}
                        <td className="py-2.5 px-2.5 font-bold text-[#111827]">
                          {currencySymbol} {row.price}
                        </td>

                        {/* Stock */}
                        <td className="py-2.5 px-2.5 font-medium text-[#334155]">
                          {row.stock}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-2.5">
                          <span className="inline-flex rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A7B56]">
                            {row.status}
                          </span>
                        </td>

                        {/* Featured Toggle */}
                        <td className="py-2.5 px-2.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={row.featured}
                            aria-label={`Toggle featured for ${row.name}`}
                            onClick={() => handleToggleFeatured(row.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition cursor-pointer ${
                              row.featured ? 'bg-[#0A6847]' : 'bg-[#CBD5E1]'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                                row.featured ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions Kebab */}
                        <td className="py-2.5 pl-2 pr-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              showToast(`Updated visibility for ${row.name}`)
                            }
                            aria-label={`More actions for ${row.name}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EBF2EE] hover:text-[#111827] cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        {/* RIGHT COLUMN: LIVE STORE PREVIEW (3 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
          <h2 className="text-[15.5px] font-extrabold text-[#111827]">
            Live Store Preview
          </h2>

          {/* Mobile View | Desktop View Toggle */}
          <div className="grid grid-cols-2 rounded-xl border border-[#DCE9E3] bg-[#F8FAFC] p-0.5 text-[12px] font-bold">
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`rounded-lg py-1.5 transition cursor-pointer ${
                previewMode === 'mobile'
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#111827]'
              }`}
            >
              Mobile View
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`rounded-lg py-1.5 transition cursor-pointer ${
                previewMode === 'desktop'
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#111827]'
              }`}
            >
              Desktop View
            </button>
          </div>

          {/* Realistic Smartphone Mockup */}
          <div
            className={`mx-auto rounded-[34px] border-[7px] border-[#1E293B] bg-white shadow-xl overflow-hidden ${
              previewMode === 'mobile' ? 'max-w-[310px]' : 'w-full'
            }`}
          >
            {/* Dark Forest Green Store Header inside Phone */}
            <div className="bg-[#06392A] px-3.5 pt-2.5 pb-5 text-white">
              {/* iOS Status Bar */}
              <div className="flex items-center justify-between text-[10px] font-semibold opacity-90 mb-2.5">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
                  <span className="inline-block h-2 w-3 rounded-xs bg-white/90" />
                </div>
              </div>

              {/* Store Identity Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Menu className="h-4 w-4 shrink-0 text-white/90" />
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/25 bg-[#78350F] flex items-center justify-center font-bold text-xs text-white">
                    {storeSettings.logoUrl ? (
                      <img
                        src={storeSettings.logoUrl}
                        alt={storeName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      storeName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[13px] font-extrabold truncate">
                      {storeName}
                    </p>
                    <p className="text-[9.5px] text-white/80 line-clamp-2">
                      {storeDescription || 'Daily groceries, home essentials and more'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Search className="h-4 w-4 text-white/90" />
                  <div className="relative">
                    <ShoppingCart className="h-4 w-4 text-white/90" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#EF4444] text-[8.5px] font-extrabold text-white">
                      2
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Body Content */}
            <div className="-mt-3 rounded-t-2xl bg-white px-3 pt-3 pb-4 space-y-3">
              {/* Search Bar */}
              <div className="flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] px-2.5 py-1.5 text-[10.5px] text-[#94A3B8]">
                <Search className="h-3.5 w-3.5 text-[#64748B]" />
                <span>
                  {storeSettings.blueprintType === 'services'
                    ? 'Search services & quotes...'
                    : storeSettings.blueprintType === 'salon'
                    ? 'Search services & packages...'
                    : 'Search products...'}
                </span>
              </div>

              {/* Hero Promotional Card */}
              {(() => {
                const bpType = storeSettings.blueprintType || (demoMode ? 'grocery' : 'retail');
                const customTagline = storeSettings.tagline?.trim();
                const hasCustomTagline = customTagline && !/Fresh Groceries|Daily essentials/i.test(customTagline);
                const storeName = storeSettings.businessName && !/My Store|Main Store/i.test(storeSettings.businessName)
                  ? storeSettings.businessName
                  : 'Our Store';
                const firstImg = catalogRows.find((p) => p.imageUrl)?.imageUrl;

                const heroContent = demoMode
                  ? {
                      title: 'Fresh Groceries at Your Doorstep',
                      subtitle: 'Daily essentials, great prices and fast delivery',
                      cta: 'Shop Now',
                      image: firstImg || '/bos/products/aashirvaad-atta.png',
                    }
                  : bpType === 'services'
                  ? {
                      title: hasCustomTagline ? customTagline : `${storeName} • Services & Works`,
                      subtitle: hasCustomTagline
                        ? 'Professional service, custom quotes and reliable quality'
                        : 'Custom fabrication, expert services and fast quote response',
                      cta: 'Request Quote / Book',
                      image: firstImg || storeSettings.logoUrl || null,
                    }
                  : bpType === 'salon'
                  ? {
                      title: hasCustomTagline ? customTagline : `${storeName} • Salon & Spa`,
                      subtitle: 'Hair styling, treatments, grooming and self-care',
                      cta: 'Book Appointment',
                      image: firstImg || storeSettings.logoUrl || null,
                    }
                  : bpType === 'restaurant'
                  ? {
                      title: hasCustomTagline ? customTagline : `${storeName} • Kitchen`,
                      subtitle: 'Freshly prepared food, dining and doorstep delivery',
                      cta: 'Order Food Now',
                      image: firstImg || storeSettings.logoUrl || null,
                    }
                  : bpType === 'creative'
                  ? {
                      title: hasCustomTagline ? customTagline : `${storeName} • Portfolio`,
                      subtitle: 'Showreels, photoshoots and commercial production packages',
                      cta: 'Explore Works',
                      image: firstImg || storeSettings.logoUrl || null,
                    }
                  : bpType === 'grocery'
                  ? {
                      title: hasCustomTagline ? customTagline : 'Fresh Groceries at Your Doorstep',
                      subtitle: 'Daily essentials, great prices and fast delivery',
                      cta: 'Shop Now',
                      image: firstImg || '/bos/products/aashirvaad-atta.png',
                    }
                  : {
                      title: customTagline || `${storeName} Online Store`,
                      subtitle: 'Quality products, great prices and doorstep delivery',
                      cta: 'Shop Now',
                      image: firstImg || storeSettings.logoUrl || '/bos/products/sunflower-oil.png',
                    };

                return (
                  <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#E3F5EC] to-[#D1FAE5] p-3 flex items-center justify-between gap-2">
                    <div className="space-y-1 z-10 max-w-[62%]">
                      <p className="text-[13px] font-extrabold leading-tight text-[#06392A]">
                        {heroContent.title}
                      </p>
                      <p className="text-[9px] leading-snug text-[#1E293B]">
                        {heroContent.subtitle}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenStore}
                        className="mt-1 inline-flex rounded-full bg-[#0A6847] px-3 py-1 text-[9.5px] font-bold text-white cursor-pointer"
                      >
                        {heroContent.cta}
                      </button>
                    </div>

                    {/* Hero Packshot / Brand Image */}
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white/70 p-1 shadow-2xs">
                      {heroContent.image ? (
                        <img
                          src={heroContent.image}
                          alt={heroContent.title}
                          className="h-16 w-16 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ShoppingBag className="h-10 w-10 text-[#0A6847]/60" />
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 5 Circular Category Icons */}
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {(categoriesList.length > 0
                  ? categoriesList.slice(0, 5).map((cat, idx) => ({
                      label: cat.name,
                      bg: ['bg-[#FEF3C7]', 'bg-[#DCFCE7]', 'bg-[#FFEDD5]', 'bg-[#DBEAFE]', 'bg-[#F3E8FF]'][idx % 5],
                      img: catalogRows.find((p) => p.category === cat.name && p.imageUrl)?.imageUrl || null,
                    }))
                  : [
                      {
                        label: 'Grocery',
                        img: '/bos/products/sunflower-oil.png',
                        bg: 'bg-[#FEF3C7]',
                      },
                      {
                        label: 'Beverages',
                        img: '/bos/products/tropicana-juice.png',
                        bg: 'bg-[#DCFCE7]',
                      },
                      {
                        label: 'Snacks',
                        img: '/bos/products/maggi-noodles.png',
                        bg: 'bg-[#FFEDD5]',
                      },
                      {
                        label: 'Home Care',
                        img: '/bos/products/surf-excel.png',
                        bg: 'bg-[#DBEAFE]',
                      },
                      {
                        label: 'Personal Care',
                        img: '/bos/products/clinic-plus.png',
                        bg: 'bg-[#F3E8FF]',
                      },
                    ]
                ).map((cat) => (
                  <div key={cat.label} className="space-y-1">
                    <div
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${cat.bg} p-1.5 text-[#0A6847] font-bold text-xs`}
                    >
                      {cat.img ? (
                        <img
                          src={cat.img}
                          alt={cat.label}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span>{cat.label.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <p className="truncate text-[8.5px] font-semibold text-[#334155]">
                      {cat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Popular Products Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-[#111827]">
                    Popular Products
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenStore}
                    className="text-[10px] font-bold text-[#0A6847] cursor-pointer"
                  >
                    See All
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(catalogRows.length > 0
                    ? catalogRows.slice(0, 3).map((item) => ({
                        id: item.id,
                        name: item.name,
                        unit: item.stock ? `${item.stock} in stock` : 'Standard',
                        price: item.price,
                        img: item.imageUrl || null,
                      }))
                    : [
                        {
                          id: '1',
                          name: 'Maggi Noodles',
                          unit: '70g',
                          price: 14,
                          img: '/bos/products/maggi-noodles.png',
                        },
                        {
                          id: '2',
                          name: 'Coca Cola',
                          unit: '500ml',
                          price: 40,
                          img: '/bos/products/coca-cola.png',
                        },
                        {
                          id: '3',
                          name: 'Ariel Detergent',
                          unit: '1kg',
                          price: 360,
                          img: '/bos/products/ariel-detergent.png',
                        },
                      ]
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-xl border border-[#EBF2EE] bg-white p-1.5 shadow-2xs"
                    >
                      <div>
                        <div className="flex h-12 items-center justify-center rounded-lg bg-[#FAFDFB] p-1 text-[#0A6847] font-bold text-xs">
                          {item.img ? (
                            <img
                              src={item.img}
                              alt={item.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span>{item.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[9px] font-bold text-[#111827]">
                          {item.name}
                        </p>
                        <p className="text-[8px] text-[#64748B] truncate">{item.unit}</p>
                        <p className="mt-0.5 text-[10px] font-extrabold text-[#111827]">
                          {currencySymbol} {item.price}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          showToast(`Added ${item.name} in preview`)
                        }
                        className="mt-1 w-full rounded-md border border-[#BCE3D4] bg-[#F2FAF6] py-0.5 text-[9px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Promo Coupon Strip */}
              <div className="flex items-center justify-between rounded-xl bg-[#D1FAE5] px-3 py-2">
                <div className="text-[10px] leading-tight text-[#064E3B]">
                  <p>
                    Get <span className="font-extrabold">10% OFF</span>
                  </p>
                  <p>on your first order</p>
                </div>
                <span className="rounded-lg bg-white px-2 py-1 text-[9px] font-extrabold text-[#0A6847] shadow-2xs">
                  WELCOME10
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <h3 className="text-[15.5px] font-bold text-[#111827]">
                Add Product to Online Store
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleAddCatalogProduct}
              className="mt-4 space-y-3 text-[12.5px]"
            >
              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProductForm.name}
                  onChange={(e) =>
                    setNewProductForm((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="e.g. Amul Butter 500g"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Category
                  </label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) =>
                      setNewProductForm((s) => ({
                        ...s,
                        category: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Home Care">Home Care</option>
                    <option value="Personal Care">Personal Care</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Price ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={newProductForm.price}
                    onChange={(e) =>
                      setNewProductForm((s) => ({
                        ...s,
                        price: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-2.5 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={newProductForm.stock}
                    onChange={(e) =>
                      setNewProductForm((s) => ({
                        ...s,
                        stock: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-2.5 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#085238]"
                >
                  Add to Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Mode QR Code & WhatsApp Share Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <div>
                <h3 className="text-[15.5px] font-extrabold text-[#111827]">
                  Multi-Mode Store QR &amp; Share
                </h3>
                <p className="text-[11.5px] text-[#64748B]">
                  Generate QR codes for Storefront, Dine-In Table Ordering, UPI Payment, or Bookings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 4 QR Mode Tabs */}
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#F4F8F6] p-1 text-[11.5px] font-bold">
              {(
                [
                  { id: 'storefront', label: 'Storefront' },
                  { id: 'table', label: 'Table QR' },
                  { id: 'payment', label: 'Pay QR' },
                  { id: 'booking', label: 'Booking' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setQrMode(m.id)}
                  className={`rounded-lg py-1.5 transition ${
                    qrMode === m.id
                      ? 'bg-[#0A6847] text-white shadow-2xs'
                      : 'text-[#475569] hover:text-[#111827]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {qrMode === 'table' && (
              <div className="flex items-center justify-between rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 text-[12px]">
                <span className="font-semibold text-[#334155]">Table / Counter Number</span>
                <input
                  type="text"
                  value={qrTableNumber}
                  onChange={(e) => setQrTableNumber(e.target.value)}
                  className="w-20 rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-center font-bold text-[#111827]"
                />
              </div>
            )}

            {/* Printable QR Poster Card */}
            <div className="flex flex-col items-center rounded-2xl border border-[#DCE9E3] bg-[#FAFDFB] p-4 text-center space-y-2.5">
              <span className="rounded-full bg-[#E6F6F0] px-3 py-0.5 text-[11px] font-extrabold text-[#0A6847]">
                {storeName}
              </span>
              <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-[#0A6847] bg-white p-2.5 shadow-xs">
                {qrMode === 'payment' && !activeQrTargetUrl ? (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-amber-700 bg-amber-50 rounded-xl border border-amber-200 h-full w-full">
                    <AlertCircle className="h-6 w-6 text-amber-600 mb-1" />
                    <p className="text-[11px] font-bold">UPI ID Required</p>
                    <p className="text-[9.5px] text-[#64748B] mt-0.5 leading-tight">
                      Please enter a valid UPI ID (e.g. <code>store@okhdfcbank</code>) in Settings to generate a Pay QR.
                    </p>
                  </div>
                ) : (
                  <img
                    src={
                      qrMode === 'payment' && storePaymentQr
                        ? storePaymentQr
                        : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
                            activeQrTargetUrl
                          )}`
                    }
                    alt={`${qrMode} QR Code`}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
              <p className="text-[11px] font-mono text-[#475569] break-all px-2">
                {activeQrTargetUrl || (qrMode === 'payment' ? 'No valid UPI ID configured' : storeUrl)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const target = activeQrTargetUrl || storeUrl;
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(target).catch(() => {});
                  }
                  if (qrMode === 'storefront') markStoreShared();
                  showToast(`Copied link: ${target}`);
                  setShowQrModal(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white py-2 text-[11.5px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-[#0A6847]" />
                <span>Copy Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeQrTargetUrl) {
                    showToast('Please configure a valid UPI ID first');
                    return;
                  }
                  handleDownloadQr(
                    activeQrTargetUrl,
                    `${storeName.replace(/\s+/g, '-').toLowerCase()}-${qrMode}-qr.png`
                  );
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#0A6847] bg-[#F2FAF6] py-2 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetShare =
                    whatsappShareUrl ||
                    `https://wa.me/?text=${encodeURIComponent(`Order online from ${storeName}: ${activeQrTargetUrl || storeUrl}`)}`;
                  if (typeof window !== 'undefined') {
                    window.open(targetShare, '_blank', 'noopener,noreferrer');
                  }
                  markStoreShared();
                  showToast('Opened WhatsApp Store Share');
                  setShowQrModal(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0A6847] py-2 text-[11.5px] font-bold text-white hover:bg-[#085238] cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

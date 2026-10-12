'use client';

import React, { useMemo, useState } from 'react';
import {
  BadgePercent,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  IndianRupee,
  Link2,
  MapPin,
  Menu,
  MoreVertical,
  Palette,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  ShoppingCart,
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
  onUpdateStoreSettings,
  onToggleProductOnline,
}: BosOnlineStoreWorkstationProps) {
  const currencySymbol = storeSettings.currencySymbol || '₹';

  const [subTab, setSubTab] = useState<StoreSubTab>('overview');
  const [previewMode, setPreviewMode] = useState<PreviewDeviceMode>('mobile');

  // Store Settings Card States
  const [storeName, setStoreName] = useState('Ravi Store');
  const [businessType, setBusinessType] = useState('Grocery Store');
  const [storeDescription, setStoreDescription] = useState(
    'Daily groceries, home essentials, fresh products and more. Fast delivery in your area.',
  );

  // Delivery & Ordering States
  const [homeDelivery, setHomeDelivery] = useState(true);
  const [selfPickup, setSelfPickup] = useState(true);
  const [dineInTakeaway, setDineInTakeaway] = useState(false);

  // Products Table States
  const [catalogRows, setCatalogRows] = useState<OnlineShowcaseRow[]>(
    INITIAL_ONLINE_PRODUCTS,
  );
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Modals & Toast
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'Grocery',
    price: 95,
    stock: 50,
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const storeUrl = 'https://bos.fieseros.com/ravi-store';
  const publicStorePath = `/store/${storeSettings.businessSlug || 'ravi-store'}`;

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
            onClick={() => showToast('Downloaded high-resolution Store QR Code')}
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
              void onUpdateStoreSettings({ businessName: storeName });
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
          {/* ROW 1: 4 KPI Cards with Colored Icons & Sparklines */}
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
                    86
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">↑ 28%</p>
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
                    {currencySymbol} 24,580
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">↑ 32%</p>
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
                    {currencySymbol} 286
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">↑ 18%</p>
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
                    42
                  </p>
                  <p className="text-[11px] font-bold text-[#0A7B56]">↑ 25%</p>
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

          {/* ROW 2: 3 Configuration Cards (Store Status | Store Settings | Delivery & Ordering) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* CARD 1: Store Status */}
            <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
              <h2 className="text-[15px] font-extrabold text-[#111827]">
                Store Status
              </h2>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11.5px] font-bold text-[#0A7B56]">
                  <span className="h-2 w-2 rounded-full bg-[#0A7B56]" />
                  <span>Live</span>
                </span>
                <p className="text-[11.5px] text-[#64748B]">
                  Your online store is active and accepting orders.
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
                  {/* Detailed SVG QR Code */}
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-[#DCE9E3] bg-white p-1.5">
                    <svg
                      viewBox="0 0 36 36"
                      className="h-full w-full text-[#111827]"
                      fill="currentColor"
                    >
                      <path d="M2 2h10v10H2V2zm2 2v6h6V4H4zm2 2h2v2H6V6zm18-4h10v10H24V2zm2 2v6h6V4h-6zm2 2h2v2h-2V6zM2 24h10v10H2V24zm2 2v6h6v-6H4zm2 2h2v2H6v-2zm10-24h2v4h-2V4zm4 2h2v4h-2V6zm-4 6h4v2h-4v-2zm-2 4h4v2h-4v-2zm6 0h2v4h-2v-4zm4 4h6v2h-6v-2zm-10 4h2v6h-2v-6zm4 2h4v2h-4v-2zm6 2h4v6h-4v-6zm-6 4h4v2h-4v-2z" />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] leading-relaxed text-[#64748B]">
                      Scan this QR code to open your store
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        showToast('Downloaded printable Store QR Code')
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

            {/* CARD 2: Store Settings */}
            <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">
                  Store Settings
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    void onUpdateStoreSettings({ businessName: storeName });
                    showToast('Updated Store Settings');
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 text-[11.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-[#0A6847]" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Store Thumbnail */}
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-[#DCE9E3] bg-linear-to-br from-[#78350F] via-[#B45309] to-[#451A03] flex items-center justify-center shadow-2xs">
                <img
                  src="/bos/products/coca-cola.png"
                  alt="Ravi Store"
                  className="h-11 w-11 object-contain"
                />
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
            </div>

            {/* CARD 3: Delivery & Ordering */}
            <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">
                  Delivery &amp; Ordering
                </h2>
                <button
                  type="button"
                  onClick={() => showToast('Updated Delivery & Ordering rules')}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 text-[11.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-[#0A6847]" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Order Types */}
              <div className="flex items-start gap-2.5">
                <ShoppingBag className="mt-0.5 h-4 w-4 text-[#475569] shrink-0" />
                <div className="space-y-1.5 text-[12px]">
                  <p className="font-bold text-[#111827]">Order Types</p>
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

              {/* Delivery Area */}
              <div className="flex items-start justify-between gap-2 border-t border-[#F1F5F3] pt-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 text-[#475569] shrink-0" />
                  <div className="text-[11.5px]">
                    <p className="font-bold text-[#111827]">Delivery Area</p>
                    <p className="text-[#64748B]">5 km around your location</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Delivery radius set to 5 km')}
                  className="text-[11.5px] font-bold text-[#0A6847] hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>

              {/* Minimum Order Amount */}
              <div className="flex items-start gap-2.5 border-t border-[#F1F5F3] pt-2.5">
                <Calendar className="mt-0.5 h-4 w-4 text-[#475569] shrink-0" />
                <div className="text-[11.5px]">
                  <p className="font-bold text-[#111827]">
                    Minimum Order Amount
                  </p>
                  <p className="text-[#64748B]">{currencySymbol} 200</p>
                </div>
              </div>

              {/* Delivery Charges */}
              <div className="flex items-start gap-2.5 border-t border-[#F1F5F3] pt-2.5">
                <Truck className="mt-0.5 h-4 w-4 text-[#475569] shrink-0" />
                <div className="text-[11.5px]">
                  <p className="font-bold text-[#111827]">Delivery Charges</p>
                  <p className="text-[#64748B]">
                    {currencySymbol} 30 (Free above {currencySymbol} 500)
                  </p>
                </div>
              </div>

              {/* Estimated Delivery Time */}
              <div className="flex items-start gap-2.5 border-t border-[#F1F5F3] pt-2.5">
                <Clock className="mt-0.5 h-4 w-4 text-[#475569] shrink-0" />
                <div className="text-[11.5px]">
                  <p className="font-bold text-[#111827]">
                    Estimated Delivery Time
                  </p>
                  <p className="text-[#64748B]">30 - 45 minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: PRODUCTS (48) TABLE CARD */}
          <div className="rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#EBF2EE] px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                <h2 className="text-[15.5px] font-extrabold text-[#111827] shrink-0">
                  Products{' '}
                  <span className="font-medium text-[#64748B]">(48)</span>
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
                  {filteredRows.map((row) => {
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/25 bg-[#78350F] flex items-center justify-center">
                    <img
                      src="/bos/products/coca-cola.png"
                      alt={storeName}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[13px] font-extrabold truncate">
                      {storeName}
                    </p>
                    <p className="text-[9.5px] text-white/80 line-clamp-2">
                      Daily groceries, home essentials and more
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
                <span>Search products...</span>
              </div>

              {/* Hero Promotional Card */}
              <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#E3F5EC] to-[#D1FAE5] p-3 flex items-center justify-between gap-2">
                <div className="space-y-1 z-10 max-w-[62%]">
                  <p className="text-[13px] font-extrabold leading-tight text-[#06392A]">
                    Fresh Groceries at Your Doorstep
                  </p>
                  <p className="text-[9px] leading-snug text-[#1E293B]">
                    Daily essentials, great prices and fast delivery
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenStore}
                    className="mt-1 inline-flex rounded-full bg-[#0A6847] px-3 py-1 text-[9.5px] font-bold text-white cursor-pointer"
                  >
                    Shop Now
                  </button>
                </div>

                {/* Grocery Basket Packshots Collage */}
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white/70 p-1 shadow-2xs">
                  <img
                    src="/bos/products/aashirvaad-atta.png"
                    alt="Groceries"
                    className="h-16 w-16 object-contain"
                  />
                </div>
              </div>

              {/* 5 Circular Category Icons */}
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[
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
                ].map((cat) => (
                  <div key={cat.label} className="space-y-1">
                    <div
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${cat.bg} p-1.5`}
                    >
                      <img
                        src={cat.img}
                        alt={cat.label}
                        className="h-full w-full object-contain"
                      />
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
                  {[
                    {
                      name: 'Maggi Noodles',
                      unit: '70g',
                      price: 14,
                      img: '/bos/products/maggi-noodles.png',
                    },
                    {
                      name: 'Coca Cola',
                      unit: '500ml',
                      price: 40,
                      img: '/bos/products/coca-cola.png',
                    },
                    {
                      name: 'Ariel Detergent',
                      unit: '1kg',
                      price: 360,
                      img: '/bos/products/ariel-detergent.png',
                    },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="flex flex-col justify-between rounded-xl border border-[#EBF2EE] bg-white p-1.5 shadow-2xs"
                    >
                      <div>
                        <div className="flex h-12 items-center justify-center rounded-lg bg-[#FAFDFB] p-1">
                          <img
                            src={item.img}
                            alt={item.name}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <p className="mt-1 truncate text-[9px] font-bold text-[#111827]">
                          {item.name}
                        </p>
                        <p className="text-[8px] text-[#64748B]">{item.unit}</p>
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
    </div>
  );
}

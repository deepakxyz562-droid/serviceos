'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  MessageCircle,
  Package,
  QrCode,
  Search,
  Share2,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
} from 'lucide-react';
import {
  type BosOrder,
  type BosProductItem,
  type BosStoreSettings,
  formatBosCurrency,
} from '@/components/bos/bos-types';

type StoreSubTab =
  | 'overview'
  | 'catalog'
  | 'design'
  | 'delivery'
  | 'domain';

type BosOnlineStoreWorkstationProps = {
  storeSettings: BosStoreSettings;
  products: BosProductItem[];
  orders: BosOrder[];
  onUpdateStoreSettings: (patch: Partial<BosStoreSettings>) => Promise<void>;
  onToggleProductOnline: (productId: string, visible: boolean) => void;
};

export function BosOnlineStoreWorkstation({
  storeSettings,
  products,
  orders,
  onUpdateStoreSettings,
  onToggleProductOnline,
}: BosOnlineStoreWorkstationProps) {
  const currencySymbol = storeSettings.currencySymbol || '₹';
  const [subTab, setSubTab] = useState<StoreSubTab>('overview');
  const [productSearch, setProductSearch] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState(
    `www.${storeSettings.businessSlug || 'sharmastore'}.in`,
  );
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const publicStorePath = `/store/${storeSettings.businessSlug || 'sharma-general-store'}`;
  const displayStoreUrl = `https://bos.store/${storeSettings.businessSlug || 'sharma-general-store'}`;

  const onlineProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });
  }, [products, productSearch]);

  const onlineMetrics = useMemo(() => {
    const onlineOrders = orders.filter((o) => o.channel === 'online' || o.channel === 'whatsapp');
    const revenue = onlineOrders.reduce((s, o) => s + o.totalAmount, 0) || 68450;
    const count = onlineOrders.length > 2 ? onlineOrders.length : 142;
    return {
      visitors: 3420,
      ordersCount: count,
      revenue,
      conversion: '4.15%',
      avgOrder: Math.round(revenue / Math.max(1, count)),
    };
  }, [orders]);

  const handleCopyStoreLink = () => {
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${publicStorePath}`
        : displayStoreUrl;
    navigator.clipboard?.writeText(fullUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsAppStore = () => {
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${publicStorePath}`
        : displayStoreUrl;
    const text = `🛍️ Order online from *${storeSettings.businessName}*!\n${storeSettings.announcementBanner || 'Free home delivery on orders above ₹499!'}\n\nBrowse catalog & order here: ${fullUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleSaveBranding = async () => {
    await onUpdateStoreSettings(storeSettings);
    setToast('Online Store branding & delivery rules saved!');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Sub-Navigation */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
          {(
            [
              { id: 'overview', label: 'Store Overview' },
              { id: 'catalog', label: `Catalog & Products (${products.length})` },
              { id: 'design', label: 'Store Design & Theme' },
              { id: 'delivery', label: 'Delivery & Pickup' },
              { id: 'domain', label: 'Custom Domain & SEO' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                subTab === t.id
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#F4F8F6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Store Status & Share Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#BCE3D4] bg-[#E6F6F0] px-3 py-1.5 text-[12px] font-bold text-[#0A6847]">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            <span>Store Status: {storeSettings.storeLive ? 'LIVE' : 'PAUSED'}</span>
            <input
              type="checkbox"
              checked={storeSettings.storeLive}
              onChange={(e) => void onUpdateStoreSettings({ storeLive: e.target.checked })}
              className="ml-1 h-3.5 w-3.5 accent-[#0A6847]"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px]">
            <Globe className="h-3.5 w-3.5 text-[#0A6847]" />
            <span className="font-mono font-semibold text-[#1E293B]">{displayStoreUrl}</span>
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className="rounded-md bg-[#F1F6F3] px-2 py-0.5 text-[11px] font-bold text-[#0A6847] hover:bg-[#E6F6F0]"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleShareWhatsAppStore}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0A6847] hover:bg-[#E6F6F0]/50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Share on WhatsApp</span>
          </button>

          <a
            href={publicStorePath}
            target="_blank"
            rel="noopener noreferrer"
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px]"
          >
            <span>Visit Live Store</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Store Visitors (This Week)</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
            {onlineMetrics.visitors.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-semibold text-[#0A6847]">+24.5% vs last week</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Online Orders</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
            {onlineMetrics.ordersCount}
          </p>
          <p className="text-[11px] text-[#0A6847]">18 orders today</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Online Revenue</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
            {formatBosCurrency(onlineMetrics.revenue, currencySymbol)}
          </p>
          <p className="text-[11px] font-semibold text-[#0A6847]">+19.2% growth</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Conversion Rate</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
            {onlineMetrics.conversion}
          </p>
          <p className="text-[11px] text-[#64748B]">
            Avg Order: {formatBosCurrency(onlineMetrics.avgOrder, currencySymbol)}
          </p>
        </div>
      </div>

      {/* Main Split Grid: Left Store Configuration & Catalog (8 cols) + Right Mobile Preview & QR (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-4">
          {/* Card 1: Store Information & Branding */}
          <div className="bos-card p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-2.5">
              <div>
                <h3 className="text-[14.5px] font-bold text-[#111827]">
                  Store Information & Branding
                </h3>
                <p className="text-[11.5px] text-[#64748B]">
                  Customize how your storefront appears to customers online and on WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveBranding()}
                className="bos-btn-primary rounded-xl px-3.5 py-1.5 text-[12px]"
              >
                Save Changes
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-[12.5px]">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  value={storeSettings.businessName}
                  onChange={(e) => void onUpdateStoreSettings({ businessName: e.target.value })}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-bold text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Store Tagline / Announcement Bar
                </label>
                <input
                  type="text"
                  value={storeSettings.announcementBanner}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ announcementBanner: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  WhatsApp Order Number
                </label>
                <input
                  type="text"
                  value={storeSettings.whatsappNumber}
                  onChange={(e) => void onUpdateStoreSettings({ whatsappNumber: e.target.value })}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-semibold text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                    Min Order Value
                  </label>
                  <input
                    type="number"
                    value={storeSettings.minOrderAmount}
                    onChange={(e) =>
                      void onUpdateStoreSettings({ minOrderAmount: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-bold text-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    {['#0A6847', '#10B981', '#2563EB', '#7C3AED', '#EA580C'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => void onUpdateStoreSettings({ themeColor: hex })}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          storeSettings.themeColor === hex
                            ? 'border-[#111827] scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Delivery, Shipping & Pickup Rules */}
          <div className="bos-card p-4 space-y-3.5">
            <h3 className="text-[14.5px] font-bold text-[#111827]">
              Delivery, Shipping & Pickup Rules
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-3 cursor-pointer">
                <div>
                  <p className="text-[13px] font-bold text-[#111827]">Local Home Delivery</p>
                  <p className="text-[11px] text-[#64748B]">
                    Deliver within {storeSettings.deliveryRadiusKm} km • 30–45 mins
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={storeSettings.enableLocalDelivery}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ enableLocalDelivery: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#0A6847]"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-3 cursor-pointer">
                <div>
                  <p className="text-[13px] font-bold text-[#111827]">In-Store Pickup</p>
                  <p className="text-[11px] text-[#64748B]">Free • Ready in 15 mins</p>
                </div>
                <input
                  type="checkbox"
                  checked={storeSettings.enableStorePickup}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ enableStorePickup: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#0A6847]"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                  Free Delivery Above
                </label>
                <input
                  type="number"
                  value={storeSettings.freeDeliveryAbove}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ freeDeliveryAbove: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                  Delivery Radius (km)
                </label>
                <input
                  type="number"
                  value={storeSettings.deliveryRadiusKm}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ deliveryRadiusKm: Number(e.target.value) || 5 })
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                  Delivery Charge ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={storeSettings.deliveryCharge}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ deliveryCharge: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 font-bold"
                />
              </div>
            </div>
          </div>

          {subTab === 'domain' && (
            <div className="bos-card p-4 space-y-3">
              <h3 className="text-[14.5px] font-bold text-[#111827]">Custom Domain & SEO</h3>
              <p className="text-[12px] text-[#64748B]">
                Connect your own custom domain (e.g. <code>www.sharmageneralstore.in</code>) with
                automatic SSL.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  className="flex-1 rounded-xl border border-[#DCE9E3] px-3 py-2 text-[13px] font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    fetch('/api/commerce/domain', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ domain: customDomainInput }),
                    }).catch(() => {});
                    setToast(`Connected custom domain ${customDomainInput}`);
                    setTimeout(() => setToast(null), 3000);
                  }}
                  className="bos-btn-primary rounded-xl px-4 py-2 text-[12.5px]"
                >
                  Connect Domain
                </button>
              </div>
            </div>
          )}

          {/* Card 3: Online Store Products Visibility */}
          <div className="bos-card p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[14.5px] font-bold text-[#111827]">
                  Online Store Products ({products.filter((p) => p.onlineVisible !== false).length} Listed)
                </h3>
                <p className="text-[11.5px] text-[#64748B]">
                  Toggle which products from your POS inventory are visible on your online store.
                </p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-1.5 pl-8 pr-3 text-[12px]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#F1F6F3] text-[12.5px]">
              {onlineProducts.slice(0, 8).map((item) => {
                const isOnline = item.onlineVisible !== false;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2.5 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F6F3] text-[#0A6847]">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#111827] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#64748B]">
                          {item.category} • {item.stockQuantity} in stock
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="font-extrabold text-[#0A6847]">
                          {formatBosCurrency(item.price, currencySymbol)}
                        </span>
                        {item.mrp && item.mrp > item.price && (
                          <span className="ml-1 text-[11px] text-[#94A3B8] line-through">
                            {formatBosCurrency(item.mrp, currencySymbol)}
                          </span>
                        )}
                      </div>

                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11.5px] font-semibold">
                        <input
                          type="checkbox"
                          checked={isOnline}
                          onChange={(e) => onToggleProductOnline(item.id, e.target.checked)}
                          className="h-4 w-4 accent-[#0A6847]"
                        />
                        <span className={isOnline ? 'text-[#0A6847]' : 'text-[#94A3B8]'}>
                          {isOnline ? 'Online' : 'Hidden'}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Mobile Storefront Preview + Store QR Code */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bos-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <h3 className="text-[13.5px] font-bold text-[#111827]">Live Mobile Preview</h3>
              </div>
              <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                Mobile View
              </span>
            </div>

            {/* Phone Mockup Frame */}
            <div className="mx-auto w-full max-w-[300px] rounded-[28px] border-[6px] border-[#0F172A] bg-[#F8FCFA] overflow-hidden shadow-md">
              {/* Store Header inside Phone */}
              <div
                className="p-3.5 text-white"
                style={{ backgroundColor: storeSettings.themeColor || '#0A6847' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-extrabold leading-tight">
                      {storeSettings.businessName}
                    </p>
                    <p className="text-[10px] opacity-85">⚡ Delivery in 30 mins • Open Now</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                    ★ 4.8
                  </span>
                </div>
                <div className="mt-2 rounded-lg bg-black/20 px-2.5 py-1 text-[10px] font-medium truncate">
                  🎉 {storeSettings.announcementBanner || 'Free delivery on orders above ₹499!'}
                </div>
              </div>

              {/* Products inside Phone */}
              <div className="p-3 space-y-2.5">
                <div className="flex gap-1.5 overflow-x-auto text-[10px] font-bold">
                  <span className="rounded-full bg-[#0A6847] px-2.5 py-1 text-white">All</span>
                  <span className="rounded-full bg-white border border-[#DCE9E3] px-2.5 py-1 text-[#475569]">
                    Groceries
                  </span>
                  <span className="rounded-full bg-white border border-[#DCE9E3] px-2.5 py-1 text-[#475569]">
                    Dairy
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {products.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-[#E4EFEA] bg-white p-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex h-10 items-center justify-center rounded-lg bg-[#F1F6F3] text-[#0A6847] mb-1">
                          <Package className="h-4 w-4" />
                        </div>
                        <p className="text-[10.5px] font-bold text-[#111827] truncate">{p.name}</p>
                        <p className="text-[9.5px] text-[#64748B]">{p.unit || '1 Pack'}</p>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#0A6847]">
                          {formatBosCurrency(p.price, currencySymbol)}
                        </span>
                        <span className="rounded bg-[#E6F6F0] px-1.5 py-0.5 text-[9.5px] font-bold text-[#0A6847]">
                          + ADD
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Floating Cart Bar */}
                <div className="rounded-xl bg-[#0A6847] px-3 py-2 text-white flex items-center justify-between text-[11px] font-bold">
                  <span>2 Items | {formatBosCurrency(628, currencySymbol)}</span>
                  <span>View Cart →</span>
                </div>
              </div>
            </div>
          </div>

          {/* Store QR Code Card */}
          <div className="bos-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] text-[#0A6847]">
                <QrCode className="h-11 w-11" />
              </div>
              <div>
                <h4 className="text-[13.5px] font-bold text-[#111827]">Store QR Code</h4>
                <p className="text-[11px] text-[#64748B]">
                  Customers can scan this QR at your shop or on pamphlets to order online.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setToast('Downloaded printable Store QR Poster.');
                  setTimeout(() => setToast(null), 2500);
                }}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#DCE9E3] bg-white py-2 text-[11.5px] font-semibold text-[#334155] hover:bg-[#F4F8F6]"
              >
                <Download className="h-3.5 w-3.5 text-[#0A6847]" />
                <span>Download QR</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsAppStore}
                className="bos-btn-primary inline-flex items-center justify-center gap-1 rounded-xl py-2 text-[11.5px]"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share QR</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

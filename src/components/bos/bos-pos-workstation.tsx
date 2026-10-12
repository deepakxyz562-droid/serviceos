'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Barcode,
  CheckCircle2,
  Clock,
  CreditCard,
  Minus,
  Package,
  PauseCircle,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Wallet,
} from 'lucide-react';
import {
  type BosCoupon,
  type BosCustomer,
  type BosOrder,
  type BosProductItem,
  formatBosCurrency,
} from '@/components/bos/bos-types';

type CartItem = {
  product: BosProductItem;
  qty: number;
};

type HeldBill = {
  id: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  savedAt: string;
};

type BosPosWorkstationProps = {
  businessName: string;
  currencySymbol: string;
  products: BosProductItem[];
  customers: BosCustomer[];
  orders: BosOrder[];
  coupons: BosCoupon[];
  onCompleteSale: (payload: {
    customerName: string;
    customerPhone: string;
    paymentMode: 'cash' | 'upi' | 'card' | 'khata';
    items: Array<{ id: string; name: string; qty: number; price: number; gstRate?: number; sku?: string }>;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    notes?: string;
    printReceipt?: boolean;
  }) => Promise<void>;
  onOpenPrinterModal?: () => void;
};

export function BosPosWorkstation({
  businessName,
  currencySymbol,
  products,
  customers,
  orders,
  coupons,
  onCompleteSale,
  onOpenPrinterModal,
}: BosPosWorkstationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [cart, setCart] = useState<CartItem[]>(() => {
    const initial = products.slice(0, 3);
    if (initial.length === 0) return [];
    return [
      { product: initial[0], qty: 2 },
      ...(initial[1] ? [{ product: initial[1], qty: 1 }] : []),
    ];
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');
  const [showCustomCustomerForm, setShowCustomCustomerForm] = useState(false);

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'khata'>('upi');
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(['All Items']);
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'All Items' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'walk-in') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const addToCart = (product: BosProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim().toLowerCase();
    if (!code) return;
    const match = products.find(
      (p) =>
        p.sku.toLowerCase() === code ||
        (p.barcode || '').toLowerCase() === code ||
        p.name.toLowerCase().includes(code),
    );
    if (match) {
      addToCart(match);
      setBarcodeInput('');
      setStatusMessage(`Added ${match.name} via barcode scan`);
      setTimeout(() => setStatusMessage(null), 2500);
    } else {
      setStatusMessage(`No product matched barcode "${barcodeInput}"`);
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const billCalculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const matchedCoupon = coupons.find(
      (c) => c.active && c.code.toLowerCase() === couponCode.trim().toLowerCase() && subtotal >= c.minOrder,
    );
    const couponDiscount = matchedCoupon
      ? matchedCoupon.type === 'percentage'
        ? Math.round((subtotal * matchedCoupon.value) / 100)
        : matchedCoupon.value
      : 0;
    const manualDiscount = discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : 0;
    const totalDiscount = Math.min(subtotal, couponDiscount + manualDiscount);
    const taxable = Math.max(0, subtotal - totalDiscount);
    const taxAmount = Math.round(
      cart.reduce((sum, item) => {
        const rate = item.product.gstRate ?? 5;
        return sum + (item.product.price * item.qty * rate) / (100 + rate);
      }, 0),
    );
    const grandTotal = Math.round(taxable);
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

    return {
      subtotal,
      totalDiscount,
      taxAmount,
      grandTotal,
      totalQty,
      matchedCoupon,
    };
  }, [cart, coupons, couponCode, discountPercent]);

  const posMetrics = useMemo(() => {
    const posOrders = orders.filter((o) => o.channel === 'pos' && o.status !== 'cancelled');
    const todayRevenue = posOrders.reduce((s, o) => s + o.totalAmount, 0) || 18450;
    const cashOrders = posOrders
      .filter((o) => o.paymentMode === 'cash')
      .reduce((s, o) => s + o.totalAmount, 0);
    return {
      todayRevenue,
      posOrdersCount: posOrders.length || 34,
      cashInRegister: (cashOrders || 7450) + 5000,
      heldCount: heldBills.length,
    };
  }, [orders, heldBills.length]);

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const cname =
      customCustomerName.trim() || selectedCustomer?.name || 'Walk-in Customer';
    const cphone = customCustomerPhone.trim() || selectedCustomer?.phone || '';
    const held: HeldBill = {
      id: `HOLD-${String(heldBills.length + 1).padStart(2, '0')}`,
      customerName: cname,
      customerPhone: cphone,
      items: cart,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHeldBills((prev) => [held, ...prev]);
    setCart([]);
    setStatusMessage(`Bill ${held.id} placed on hold`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleCompleteOrder = async (printReceipt: boolean) => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const cname =
        customCustomerName.trim() || selectedCustomer?.name || 'Walk-in Customer';
      const cphone = customCustomerPhone.trim() || selectedCustomer?.phone || '+91 98765 43210';
      await onCompleteSale({
        customerName: cname,
        customerPhone: cphone,
        paymentMode,
        items: cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          qty: item.qty,
          price: item.product.price,
          gstRate: item.product.gstRate,
          sku: item.product.sku,
        })),
        subtotalAmount: billCalculations.subtotal,
        discountAmount: billCalculations.totalDiscount,
        taxAmount: billCalculations.taxAmount,
        totalAmount: billCalculations.grandTotal,
        notes: orderNote.trim() || undefined,
        printReceipt,
      });
      setCart([]);
      setDiscountPercent(0);
      setCouponCode('');
      setOrderNote('');
      setCashTendered(null);
      setStatusMessage(
        printReceipt
          ? `Sale completed (${formatBosCurrency(billCalculations.grandTotal, currencySymbol)}) & receipt sent to printer!`
          : `Sale completed (${formatBosCurrency(billCalculations.grandTotal, currencySymbol)})!`,
      );
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top POS Action Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[21px] font-bold text-[#111827]">Sales / POS Billing Counter</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0A6847]">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              Register #01 Active
            </span>
          </div>
          <p className="text-[13px] text-[#64748B]">
            Fast barcode billing, walk-in & Khata checkout, and 80mm thermal receipt printing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0A6847]" />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or SKU..."
              className="w-52 rounded-xl border border-[#DCE9E3] bg-white py-2 pl-9 pr-3 text-[12.5px] font-medium text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:outline-hidden"
            />
          </form>

          <button
            type="button"
            onClick={() => setShowHeldModal((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] transition"
          >
            <PauseCircle className="h-4 w-4 text-amber-600" />
            <span>Hold Bills ({heldBills.length})</span>
          </button>

          {onOpenPrinterModal && (
            <button
              type="button"
              onClick={onOpenPrinterModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] transition"
            >
              <Printer className="h-4 w-4 text-[#0A6847]" />
              <span>Thermal Printer</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setCart([]);
              setDiscountPercent(0);
              setCouponCode('');
              searchInputRef.current?.focus();
            }}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
          >
            <Plus className="h-4 w-4" />
            <span>New Sale</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {statusMessage}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Held Bills Drawer */}
      {showHeldModal && heldBills.length > 0 && (
        <div className="bos-card p-4 border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[13.5px] font-bold text-[#111827]">Held / Parked Bills</h3>
            <button
              type="button"
              onClick={() => setShowHeldModal(false)}
              className="text-xs font-semibold text-[#64748B]"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {heldBills.map((hb) => (
              <div
                key={hb.id}
                className="flex items-center justify-between rounded-xl border border-[#E4EFEA] bg-white p-3"
              >
                <div>
                  <p className="text-[12.5px] font-bold text-[#111827]">
                    {hb.id} • {hb.customerName}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {hb.items.length} items • Parked at {hb.savedAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCart(hb.items);
                    setHeldBills((prev) => prev.filter((x) => x.id !== hb.id));
                    setShowHeldModal(false);
                  }}
                  className="rounded-lg bg-[#0A6847] px-2.5 py-1 text-[11.5px] font-semibold text-white"
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 POS KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="bos-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-medium text-[#64748B]">Today&apos;s POS Sales</p>
            <p className="mt-1 text-[20px] font-extrabold text-[#111827]">
              {formatBosCurrency(posMetrics.todayRevenue, currencySymbol)}
            </p>
          </div>
          <span className="rounded-full bg-[#E6F6F0] px-2.5 py-1 text-[11px] font-bold text-[#0A6847]">
            +14.2%
          </span>
        </div>

        <div className="bos-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-medium text-[#64748B]">POS Bills Completed</p>
            <p className="mt-1 text-[20px] font-extrabold text-[#111827]">{posMetrics.posOrdersCount}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
            Avg {formatBosCurrency(Math.round(posMetrics.todayRevenue / Math.max(1, posMetrics.posOrdersCount)), currencySymbol)}
          </span>
        </div>

        <div className="bos-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-medium text-[#64748B]">Cash in Register</p>
            <p className="mt-1 text-[20px] font-extrabold text-[#111827]">
              {formatBosCurrency(posMetrics.cashInRegister, currencySymbol)}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            Drawer Open
          </span>
        </div>

        <div className="bos-card p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-medium text-[#64748B]">Pending / Hold Bills</p>
            <p className="mt-1 text-[20px] font-extrabold text-[#111827]">{posMetrics.heldCount}</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            Quick Resume
          </span>
        </div>
      </div>

      {/* Main Split Grid: Left Product Catalog (7 cols) + Right Cart & Checkout (5 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left: Product Browser */}
        <div className="bos-card p-4 lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Search & Category Tabs */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items by name, SKU, barcode (F2)..."
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 pl-9 pr-3 text-[13px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                />
              </div>
              <span className="text-[12px] font-medium text-[#64748B] shrink-0">
                Showing <strong>{filteredProducts.length}</strong> items
              </span>
            </div>

            {/* Category Pills */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
                      active
                        ? 'bg-[#0A6847] text-white shadow-2xs'
                        : 'bg-[#F1F6F3] text-[#475569] hover:bg-[#E4EFEA]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Product Grid */}
            <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 max-h-[540px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id)?.qty || 0;
                const isLow = product.stockQuantity <= (product.lowStockThreshold || 5);
                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`group cursor-pointer rounded-xl border p-3 transition flex flex-col justify-between ${
                      inCart > 0
                        ? 'border-[#0A6847] bg-[#F3FAF7] shadow-2xs'
                        : 'border-[#E4EFEA] bg-white hover:border-[#10B981] hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            isLow
                              ? 'bg-red-50 text-red-600'
                              : 'bg-[#E6F6F0] text-[#0A6847]'
                          }`}
                        >
                          {isLow ? `Low: ${product.stockQuantity}` : `${product.stockQuantity} in stock`}
                        </span>
                        {inCart > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A6847] px-1.5 text-[10.5px] font-bold text-white">
                            ×{inCart}
                          </span>
                        )}
                      </div>

                      <div className="flex h-14 w-full items-center justify-center rounded-lg bg-[#F4F8F6] text-[#0A6847] mb-2 overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 opacity-80" />
                        )}
                      </div>

                      <p className="text-[12.5px] font-bold text-[#111827] line-clamp-2 leading-snug">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-[#64748B]">
                        {product.sku} {product.unit ? `• ${product.unit}` : ''}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#EDF4F0] flex items-center justify-between">
                      <div>
                        <span className="text-[14px] font-extrabold text-[#0A6847]">
                          {formatBosCurrency(product.price, currencySymbol)}
                        </span>
                        {product.mrp && product.mrp > product.price && (
                          <span className="ml-1 text-[10.5px] text-[#94A3B8] line-through">
                            {formatBosCurrency(product.mrp, currencySymbol)}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F6F0] text-[#0A6847] group-hover:bg-[#0A6847] group-hover:text-white transition">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shortcut Legend Bar */}
          <div className="mt-4 pt-3 border-t border-[#EDF4F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                <kbd className="rounded border border-[#DCE9E3] bg-[#F8FCFA] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1E293B]">
                  F2
                </kbd>{' '}
                Search Item
              </span>
              <span>
                <kbd className="rounded border border-[#DCE9E3] bg-[#F8FCFA] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1E293B]">
                  F4
                </kbd>{' '}
                Select Customer
              </span>
              <span>
                <kbd className="rounded border border-[#DCE9E3] bg-[#F8FCFA] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1E293B]">
                  F8
                </kbd>{' '}
                Hold Bill
              </span>
              <span>
                <kbd className="rounded border border-[#DCE9E3] bg-[#F8FCFA] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1E293B]">
                  F12
                </kbd>{' '}
                Print & Pay
              </span>
            </div>
            <span className="font-semibold text-[#0A6847]">GST Inclusive POS Mode</span>
          </div>
        </div>

        {/* Right: Active Bill & Checkout Panel */}
        <div className="bos-card p-4 lg:col-span-5 space-y-3.5">
          {/* Bill Header & Customer Selector */}
          <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-extrabold text-[#111827]">
                  Current Bill #{1049 + orders.length}
                </span>
                <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                  {billCalculations.totalQty} Qty
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">Counter #1 • Tax Invoice / Retail Receipt</p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Customer Selector */}
          <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <UserCheck className="h-4 w-4 text-[#0A6847] shrink-0" />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setShowCustomCustomerForm(false);
                  }}
                  className="w-full bg-transparent text-[12.5px] font-semibold text-[#111827] focus:outline-hidden"
                >
                  <option value="walk-in">Walk-in Customer (Cash / Counter)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) — {c.loyaltyPoints} pts
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomCustomerForm((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white border border-[#DCE9E3] px-2 py-1 text-[11px] font-semibold text-[#0A6847]"
              >
                <UserPlus className="h-3 w-3" />
                <span>+ New</span>
              </button>
            </div>

            {showCustomCustomerForm && (
              <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-[#E4EFEA]">
                <input
                  type="text"
                  value={customCustomerName}
                  onChange={(e) => setCustomCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12px]"
                />
                <input
                  type="text"
                  value={customCustomerPhone}
                  onChange={(e) => setCustomCustomerPhone(e.target.value)}
                  placeholder="Mobile (+91...)"
                  className="rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12px]"
                />
              </div>
            )}
          </div>

          {/* Cart Items Table */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[#F1F6F3] border border-[#EDF4F0] rounded-xl">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-[#64748B]">
                <ShoppingBag className="mx-auto h-8 w-8 text-[#94A3B8] mb-1.5" />
                <p className="text-[13px] font-semibold text-[#334155]">Cart is empty</p>
                <p className="text-[11.5px]">Click any product on the left or scan a barcode to bill.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-[12.5px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#111827] truncate">{item.product.name}</p>
                    <p className="text-[11px] text-[#64748B]">
                      {formatBosCurrency(item.product.price, currencySymbol)} × {item.qty}
                      {item.product.gstRate ? ` • GST ${item.product.gstRate}%` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.product.id, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-[#DCE9E3] bg-[#F8FCFA] text-[#334155] hover:bg-[#E4EFEA]"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-[#111827]">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.product.id, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-[#DCE9E3] bg-[#F8FCFA] text-[#0A6847] hover:bg-[#E6F6F0]"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="w-20 text-right font-bold text-[#111827]">
                    {formatBosCurrency(item.product.price * item.qty, currencySymbol)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount & Coupon Controls */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] px-2.5 py-1.5">
              <Percent className="h-3.5 w-3.5 text-[#0A6847]" />
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent || ''}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                placeholder="Disc %"
                className="w-full bg-transparent text-[12px] font-semibold text-[#111827] focus:outline-hidden"
              />
            </div>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] px-2.5 py-1.5 text-[12px] font-semibold text-[#111827] uppercase focus:outline-hidden"
            />
            <input
              type="text"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Bill note..."
              className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] px-2.5 py-1.5 text-[12px] text-[#111827] focus:outline-hidden"
            />
          </div>

          {/* Bill Breakdown */}
          <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-3 space-y-1.5 text-[12.5px]">
            <div className="flex justify-between text-[#475569]">
              <span>Subtotal ({billCalculations.totalQty} items)</span>
              <span className="font-semibold text-[#111827]">
                {formatBosCurrency(billCalculations.subtotal, currencySymbol)}
              </span>
            </div>
            {billCalculations.totalDiscount > 0 && (
              <div className="flex justify-between text-[#0A6847]">
                <span>
                  Discount {billCalculations.matchedCoupon ? `(${billCalculations.matchedCoupon.code})` : ''}
                </span>
                <span className="font-semibold">
                  -{formatBosCurrency(billCalculations.totalDiscount, currencySymbol)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#64748B]">
              <span>Included GST (CGST + SGST)</span>
              <span>{formatBosCurrency(billCalculations.taxAmount, currencySymbol)}</span>
            </div>
            <div className="border-t border-[#DCE9E3] pt-2 flex items-baseline justify-between">
              <span className="text-[14px] font-bold text-[#111827]">Total Payable</span>
              <span className="text-[22px] font-extrabold text-[#0A6847]">
                {formatBosCurrency(billCalculations.grandTotal, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
              Payment Mode
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'cash', label: 'Cash', icon: Wallet },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'khata', label: 'Khata Due', icon: Receipt },
                ] as const
              ).map((pm) => {
                const Icon = pm.icon;
                const active = paymentMode === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMode(pm.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 px-2 text-[11.5px] font-semibold transition ${
                      active
                        ? 'border-[#0A6847] bg-[#E6F6F0] text-[#0A6847]'
                        : 'border-[#E4EFEA] bg-white text-[#475569] hover:bg-[#F8FCFA]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>

            {paymentMode === 'cash' && billCalculations.grandTotal > 0 && (
              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#E4EFEA] bg-[#FCFDFD] p-2.5 text-[12px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[billCalculations.grandTotal, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                        cashTendered === amt
                          ? 'border-[#0A6847] bg-[#0A6847] text-white'
                          : 'border-[#DCE9E3] bg-white text-[#334155]'
                      }`}
                    >
                      {amt === billCalculations.grandTotal ? 'Exact' : `${currencySymbol}${amt}`}
                    </button>
                  ))}
                </div>
                {cashTendered && cashTendered >= billCalculations.grandTotal && (
                  <span className="font-bold text-[#0A6847]">
                    Return: {formatBosCurrency(cashTendered - billCalculations.grandTotal, currencySymbol)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Primary Checkout Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={handleHoldBill}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white py-2.5 px-3 text-[12.5px] font-semibold text-[#334155] hover:bg-[#F4F8F6] disabled:opacity-50"
            >
              <PauseCircle className="h-4 w-4 text-amber-600" />
              <span>Hold Bill</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={() => void handleCompleteOrder(true)}
              className="col-span-2 bos-btn-primary flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-[13.5px] shadow-xs disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>
                {submitting
                  ? 'Completing Sale...'
                  : `Print & Complete (${formatBosCurrency(billCalculations.grandTotal, currencySymbol)})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

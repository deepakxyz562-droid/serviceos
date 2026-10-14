'use client';
import { RequestTracker } from '../../../../shared/money';

import React, { useState, useMemo, useRef } from 'react';
import {
  ShoppingCart,
  MessageCircle,
  Plus,
  Minus,
  UtensilsCrossed,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Bell,
  Tag,
  Check,
  Truck,
  Lock,
  BadgePercent,
  Store,
  Home,
  Layers,
  Smartphone,
  Heart,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
}

interface BillingConfig {
  taxRate?: number;
  taxType?: 'exclusive' | 'inclusive';
  taxName?: string;
  serviceChargeRate?: number;
  gstin?: string;
  billFooterText?: string;
}

interface DiscountRule {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  label?: string;
}

interface StoreClientProps {
  businessId: string;
  businessName: string;
  businessPhone: string;
  businessAddress?: string;
  currency: string;
  currencySymbol: string;
  upiId: string;
  greeting?: string;
  catalog: Product[];
  tableNumber: string | null;
  billing?: BillingConfig | null;
  discounts?: DiscountRule[];
  bannerText?: string;
}

export function StoreClient({
  businessId,
  businessName,
  businessPhone,
  businessAddress,
  currency,
  currencySymbol,
  upiId,
  greeting,
  bannerText,
  catalog,
  tableNumber,
  billing,
  discounts = [],
}: StoreClientProps) {
  const requestTracker = useRef(new RequestTracker());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'DELIVERY' | 'TAKEOUT'>(
    tableNumber ? 'DINE_IN' : 'DELIVERY'
  );

  // Customer checkout inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [timingType, setTimingType] = useState<'NOW' | 'ORDER_AHEAD'>('NOW');
  const [scheduledSlot, setScheduledSlot] = useState<string>('Today at 5:30 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
  const [promoError, setPromoError] = useState('');
  const [callServerSuccess, setCallServerSuccess] = useState(false);
  const [whatsappUpdatesOptIn, setWhatsappUpdatesOptIn] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);

  // Restore customer from device localStorage on QR scan / page load
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('gptform_store_customer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) {
          setCustomerPhone(parsed.phone);
          if (parsed.name) setCustomerName(parsed.name);
          if (parsed.address) setDeliveryAddress(parsed.address);
          setIsReturningCustomer(true);
        }
      }
    } catch {}
  }, []);

  const handleResetCustomer = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setIsReturningCustomer(false);
    try {
      localStorage.removeItem('gptform_store_customer');
    } catch {}
  };

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [catalog]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return catalog.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  // Cart operations
  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = catalog.find((p) => p.id === id);
        if (!product) return null;
        return { ...product, qty, amount: product.price * qty };
      })
      .filter(Boolean) as Array<Product & { qty: number; amount: number }>;
  }, [cart, catalog]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

  // Take.app Parity: Subtotal, Discounts & Tax Calculation
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.amount, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.minOrder && subtotal < appliedDiscount.minOrder) return 0;
    if (appliedDiscount.type === 'percentage') {
      return (subtotal * appliedDiscount.value) / 100;
    }
    return Math.min(subtotal, appliedDiscount.value);
  }, [appliedDiscount, subtotal]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxRate = billing?.taxRate ?? 5;
  const taxName = billing?.taxName || 'GST';
  const taxType = billing?.taxType || 'exclusive';
  const serviceChargeRate = billing?.serviceChargeRate ?? 0;

  const taxAmount = taxType === 'inclusive' ? 0 : (taxableAmount * taxRate) / 100;
  const serviceChargeAmount = (taxableAmount * serviceChargeRate) / 100;

  const grandTotal = taxableAmount + taxAmount + serviceChargeAmount;

  const handleApplyPromo = async () => {
    setPromoError('');
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    const match = discounts?.find((d) => d.code.toUpperCase() === code);
    if (match) {
      if (match.minOrder && subtotal < match.minOrder) {
        setPromoError(`Min order of ${currencySymbol}${match.minOrder} required for this coupon`);
        return;
      }
      setAppliedDiscount(match);
      return;
    }

    try {
      const res = await fetch('/api/public/store/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessSlug: businessId, code, cartTotal: subtotal }),
      }).then((r) => r.json());

      if (res.valid) {
        setAppliedDiscount({
          code: res.code,
          type: 'fixed',
          value: res.discountAmount,
          label: res.description,
        });
      } else {
        setPromoError(res.error || 'Invalid coupon code');
      }
    } catch {
      setPromoError('Could not validate coupon code');
    }
  };

  const handleCallWaiter = (action: 'WATER' | 'SERVER' | 'BILL') => {
    const cleanBizPhone = businessPhone.replace(/\D/g, '');
    let label = 'Service Assistance';
    if (action === 'BILL') label = 'Request Final Bill';
    if (action === 'WATER') label = 'Water Refill';
    if (action === 'SERVER') label = 'Call Server / Waiter';

    const text = `🔔 *Table #${tableNumber} — ${label}*\nStore: ${businessName}\nCustomer at Table #${tableNumber} is requesting: ${label}.`;
    const waUrl = cleanBizPhone
      ? `https://wa.me/${cleanBizPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    setCallServerSuccess(true);
    setTimeout(() => setCallServerSuccess(false), 4000);
  };

  // Checkout via WhatsApp, UPI, or Counter COD
  const handleCheckout = async (method: 'WHATSAPP' | 'UPI' | 'COD') => {
    if (cartItems.length === 0) return;
    if (!customerPhone.trim()) {
      alert('Please enter your phone / WhatsApp number so we can confirm your order.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Submit order to backend
      const deliveryTiming = timingType === 'ORDER_AHEAD' ? scheduledSlot : 'Immediate (Now)';
      const payload = {
          businessId,
          customerName: customerName.trim() || 'Guest',
          customerPhone: customerPhone.trim(),
          deliveryAddress: orderType === 'DINE_IN' ? `Table #${tableNumber}` : deliveryAddress.trim(),
          deliveryType: orderType.toLowerCase(),
          deliveryDate: deliveryTiming,
          tableNumber: orderType === 'DINE_IN' ? tableNumber : null,
          notes: notes.trim(),
          items: cartItems.map((i) => ({
            productId: i.id,
            name: i.name,
            qty: i.qty,
            price: i.price,
            amount: i.amount,
          })),
          discountCode: appliedDiscount?.code || null,
          discountAmount,
          taxAmount,
          total: grandTotal,
          paymentMethod: method === 'UPI' ? 'UPI' : 'WHATSAPP_COD',
          whatsappConsent: whatsappUpdatesOptIn,
        };
      const response = await fetch('/api/public/store/order', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestTracker.current.for(payload) }, body: JSON.stringify(payload) });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Order could not be placed.');
      requestTracker.current.clear();

      // Persist customer profile to device localStorage for 1-tap re-ordering
      try {
        localStorage.setItem(
          'gptform_store_customer',
          JSON.stringify({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            address: deliveryAddress.trim(),
            lastOrderAt: new Date().toISOString(),
          })
        );
        setIsReturningCustomer(true);
      } catch {}

      const orderNumber = res.orderNumber || (res.orderId ? res.orderId.slice(-6).toUpperCase() : 'NEW');

      // 2. Format WhatsApp Message
      let waMessage = `🛒 *New Order #${orderNumber}*\n`;
      waMessage += `*Store:* ${businessName}\n`;
      if (orderType === 'DINE_IN' && tableNumber) {
        waMessage += `📍 *Order Type:* Dine-In (Table #${tableNumber})\n`;
      } else if (orderType === 'TAKEOUT') {
        waMessage += `🛍️ *Order Type:* Pickup / Takeout\n`;
      } else {
        waMessage += `🚚 *Order Type:* Delivery\n`;
        if (deliveryAddress) waMessage += `🏠 *Address:* ${deliveryAddress}\n`;
      }

      if (timingType === 'ORDER_AHEAD') {
        waMessage += `⏰ *Pickup / Service Slot:* ${scheduledSlot}\n`;
      }

      waMessage += `👤 *Customer:* ${customerName || 'Guest'} (${customerPhone})\n\n`;
      waMessage += `*Items:*\n`;
      cartItems.forEach((it) => {
        waMessage += `• ${it.name} × ${it.qty} = ${currencySymbol}${it.amount.toFixed(2)}\n`;
      });
      waMessage += `\nSubtotal: ${currencySymbol}${subtotal.toFixed(2)}\n`;
      if (discountAmount > 0) {
        waMessage += `Discount (${appliedDiscount?.code}): -${currencySymbol}${discountAmount.toFixed(2)}\n`;
      }
      if (taxAmount > 0) {
        waMessage += `${taxName} (${taxRate}%): ${currencySymbol}${taxAmount.toFixed(2)}\n`;
      }
      if (serviceChargeAmount > 0) {
        waMessage += `Service Charge (${serviceChargeRate}%): ${currencySymbol}${serviceChargeAmount.toFixed(2)}\n`;
      }
      waMessage += `*Total Payable:* ${currencySymbol}${grandTotal.toFixed(2)}\n`;

      if (notes) {
        waMessage += `📝 *Notes:* ${notes}\n`;
      }

      const cleanBizPhone = businessPhone.replace(/\D/g, '');
      const waUrl = cleanBizPhone
        ? `https://wa.me/${cleanBizPhone}?text=${encodeURIComponent(waMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

      const trackingUrl = res.trackingUrl || res.trackingUrl || `/store/${businessId}/order/${res.orderId || orderNumber}`;

      setOrderSuccess({
        orderNumber,
        orderId: res.orderId,
        trackingUrl,
        waUrl,
        waMessage,
      });

      // 3. Only Launch WhatsApp if customer explicitly opted in
      if (whatsappUpdatesOptIn && cleanBizPhone) {
        window.open(waUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-stone-900 font-sans pb-32">
      {/* ── Top Promotional Announcement Bar ────────────────────────────── */}
      {bannerText && (
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="shrink-0 text-sm">🎉</span>
              <span className="truncate">{bannerText}</span>
            </div>
            {discounts && discounts.length > 0 && !appliedDiscount && (
              <button
                type="button"
                onClick={() => {
                  setPromoCodeInput(discounts[0].code);
                  setAppliedDiscount(discounts[0]);
                }}
                className="shrink-0 ml-3 px-2.5 py-0.5 rounded-full bg-white text-emerald-800 text-[11px] font-bold hover:bg-emerald-50 transition shadow-2xs"
              >
                Apply Coupon
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Smart App Banner (BOS Customer Mobile App Link) ──────────────── */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs text-emerald-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate font-medium">
              Get the <strong>BOS Customer App</strong> for instant QR ordering, favorites &amp; live delivery tracking.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/marketplace';
              }
            }}
            className="shrink-0 font-bold text-emerald-700 hover:text-emerald-800 underline text-xs"
          >
            Explore App →
          </button>
        </div>
      </div>

      {/* ── Main Web Storefront Header (Panel 2 from Mockup) ───────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Store Logo & Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate flex items-center gap-1.5">
                {businessName}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Open
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate font-medium">
                Fresh Products • Best Prices • Home Delivery
              </p>
            </div>
          </div>

          {/* Middle: Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search for products, grocery, snacks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Navigation & Cart Action */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('categories-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
            >
              <Layers className="h-4 w-4" />
              <span>Categories</span>
            </button>
            {discounts.length > 0 && (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition"
              >
                <Tag className="h-4 w-4" />
                <span>Offers</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition border border-emerald-200"
            >
              <ShoppingCart className="h-4 w-4 text-emerald-700" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Customer Status or Login */}
            {isReturningCustomer && customerName ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  {customerName.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="hidden sm:block px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Input (Visible on small screens) */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 border-none text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </header>

      {/* ── Table / Dine-In Notification (if applicable) ────────────────── */}
      {tableNumber && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <UtensilsCrossed className="h-4 w-4 text-amber-700" />
              <span>Dine-In Table #{tableNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCallWaiter('SERVER')}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-stone-950 text-xs font-bold transition"
              >
                Call Server
              </button>
              <button
                type="button"
                onClick={() => handleCallWaiter('BILL')}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-stone-900 text-xs font-bold transition"
              >
                Request Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Grid (Panel 2 Mockup: Sidebar + Main Section) ──── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Left Sidebar: Category Menu (Sticky on Desktop) ─────────── */}
          <aside
            id="categories-section"
            className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs lg:sticky lg:top-24"
          >
            <div className="px-3 py-2 border-b border-slate-100 mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories</h2>
              <span className="text-[11px] font-medium text-slate-400">{categories.length} Total</span>
            </div>

            <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:overflow-visible pb-1 lg:pb-0">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const count = cat === 'ALL'
                  ? catalog.length
                  : catalog.filter((p) => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap lg:whitespace-normal w-full text-left ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{cat === 'ALL' ? 'All Products' : cat}</span>
                    <span
                      className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Store Information Card inside Sidebar */}
            <div className="hidden lg:block mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2 px-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{businessAddress || 'Patna, Bihar'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Delivery: 30 - 45 mins</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Truck className="h-4 w-4 shrink-0" />
                <span>Free delivery above ₹299</span>
              </div>
            </div>
          </aside>

          {/* ── Right Column: Hero Banner + Value Props + Product Grid ───── */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Hero Promotional Banner (Matching Panel 2) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#D8EEDB] via-[#EAF7EE] to-[#FEF3D6] p-6 sm:p-8 border border-emerald-100 shadow-xs">
              <div className="max-w-md relative z-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-2xs">
                  <Sparkles className="h-3 w-3" />
                  100% Fresh Guarantee
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  Fresh Groceries Delivered to Your Home
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Farm fresh produce, daily essentials, snacks, and dairy delivered in 30–45 minutes.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('featured-products');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition shadow-sm active:scale-95"
                  >
                    <span>Shop Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Decorative fresh basket badge */}
              <div className="absolute right-4 bottom-2 sm:right-8 sm:bottom-4 opacity-80 sm:opacity-100 pointer-events-none">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-emerald-500/10 flex items-center justify-center p-2 border-2 border-dashed border-emerald-400/40">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-emerald-600 text-white flex flex-col items-center justify-center font-black text-center shadow-lg">
                    <span className="text-[10px] tracking-widest text-emerald-200">CERTIFIED</span>
                    <span className="text-xs sm:text-sm">100%</span>
                    <span className="text-[10px]">FRESH</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Value Proposition Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Quality Products</h4>
                  <p className="text-[10px] text-slate-500">Handpicked items</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Fast Delivery</h4>
                  <p className="text-[10px] text-slate-500">30–45 mins local</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Secure Payment</h4>
                  <p className="text-[10px] text-slate-500">UPI, Card &amp; Cash</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <BadgePercent className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Best Prices</h4>
                  <p className="text-[10px] text-slate-500">Direct kirana rates</p>
                </div>
              </div>
            </div>

            {/* Featured Products Section Header */}
            <div id="featured-products" className="pt-2 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedCategory === 'ALL' ? 'Featured Products' : selectedCategory}
                </h3>
                <p className="text-xs text-slate-500">Showing {filteredProducts.length} items available</p>
              </div>
              {selectedCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  View All Products
                </button>
              )}
            </div>

            {/* Products Grid (Panel 2 Mockup: 4 Columns on Desktop) */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <p className="text-sm font-semibold">No products found matching your search.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((p) => {
                  const qty = cart[p.id] || 0;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between overflow-hidden group p-3.5"
                    >
                      {/* Product Image Area */}
                      <div className="relative aspect-square w-full rounded-xl bg-slate-50 overflow-hidden mb-3 flex items-center justify-center">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                            <Store className="h-10 w-10 mb-1" />
                            <span className="text-[10px] font-bold text-slate-400">Grocery</span>
                          </div>
                        )}
                        {p.category && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-slate-700 shadow-2xs">
                            {p.category}
                          </span>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-800 transition">
                          {p.name}
                        </h4>
                        {p.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                            {p.description}
                          </p>
                        )}
                      </div>

                      {/* Price & Add to Cart Action */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Price</span>
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            {currencySymbol}{p.price}
                          </span>
                        </div>

                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateQty(p.id, 1)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center gap-1 active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-emerald-700 text-white rounded-xl px-2 py-1 shadow-xs">
                            <button
                              type="button"
                              onClick={() => updateQty(p.id, -1)}
                              className="w-5 h-5 flex items-center justify-center font-bold hover:opacity-80"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-black min-w-[14px] text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(p.id, 1)}
                              className="w-5 h-5 flex items-center justify-center font-bold hover:opacity-80"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

        {/* Floating Bottom Cart Bar (Take.app style) */}
        {totalItems > 0 && !cartOpen && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between font-bold active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-black">
                  {totalItems}
                </span>
                <span className="text-sm">View Cart</span>
              </div>
              <div className="flex items-center gap-1.5 text-base font-black">
                <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        )}

        {/* Cart Slide-Over / Modal */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-stone-900">Your Shopping Cart</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="overflow-y-auto py-3 space-y-2.5 flex-1 max-h-52">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-stone-900">{item.name}</span>
                      <span className="text-stone-400 ml-1.5">
                        {currencySymbol}{item.price} each
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-stone-100 rounded-lg px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        className="text-stone-600 font-bold px-1"
                      >
                        -
                      </button>
                      <span className="font-black text-stone-900">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="text-stone-600 font-bold px-1"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-16 text-right font-black text-stone-900">
                      {currencySymbol}{item.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Info & Delivery Inputs */}
              <div className="border-t border-stone-100 pt-3 space-y-2.5 text-xs">
                {/* Order Type Toggle */}
                {!tableNumber && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('DELIVERY')}
                      className={`py-1.5 rounded-xl font-bold border transition ${
                        orderType === 'DELIVERY'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-stone-50 text-stone-600 border-stone-200'
                      }`}
                    >
                      🚚 Home Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('TAKEOUT')}
                      className={`py-1.5 rounded-xl font-bold border transition ${
                        orderType === 'TAKEOUT'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-stone-50 text-stone-600 border-stone-200'
                      }`}
                    >
                      🛍️ Store Takeout
                    </button>
                  </div>
                )}

                {/* Timing Selector: Immediate vs Order Ahead */}
                <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-stone-500" />
                      Order Timing
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {timingType === 'NOW' ? '⚡ Immediate preparation' : '📅 Pre-scheduled'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTimingType('NOW')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        timingType === 'NOW'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>🟢 Order Now (ASAP)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimingType('ORDER_AHEAD')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        timingType === 'ORDER_AHEAD'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>⏰ Order Ahead</span>
                    </button>
                  </div>

                  {timingType === 'ORDER_AHEAD' && (
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Select Pickup Slot:
                      </label>
                      <select
                        value={scheduledSlot}
                        onChange={(e) => setScheduledSlot(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800"
                      >
                        <option value="Today at 12:30 PM">Today at 12:30 PM</option>
                        <option value="Today at 1:00 PM">Today at 1:00 PM</option>
                        <option value="Today at 1:30 PM">Today at 1:30 PM</option>
                        <option value="Today at 2:00 PM">Today at 2:00 PM</option>
                        <option value="Today at 4:30 PM">Today at 4:30 PM</option>
                        <option value="Today at 5:00 PM">Today at 5:00 PM</option>
                        <option value="Today at 5:30 PM">Today at 5:30 PM</option>
                        <option value="Today at 6:00 PM">Today at 6:00 PM</option>
                        <option value="Today at 6:30 PM">Today at 6:30 PM</option>
                        <option value="Today at 7:00 PM">Today at 7:00 PM</option>
                        <option value="Today at 7:30 PM">Today at 7:30 PM</option>
                        <option value="Today at 8:00 PM">Today at 8:00 PM</option>
                        <option value="Tomorrow at 10:00 AM">Tomorrow at 10:00 AM</option>
                        <option value="Tomorrow at 1:00 PM">Tomorrow at 1:00 PM</option>
                        <option value="Tomorrow at 6:00 PM">Tomorrow at 6:00 PM</option>
                      </select>
                    </div>
                  )}
                </div>

                {tableNumber && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                    <span>Ordering for Dine-In Table #{tableNumber}</span>
                  </div>
                )}

                {/* Customer Details */}
                {isReturningCustomer && customerPhone && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <div>
                        <p className="font-bold text-stone-900 leading-tight">
                          {customerName ? `${customerName}` : 'Recognized Customer'}
                        </p>
                        <p className="text-[10px] text-stone-500 font-mono">Auto-filled: {customerPhone}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetCustomer}
                      className="text-[10px] text-stone-400 hover:text-stone-700 underline font-medium"
                    >
                      Change
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp Number *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold"
                  />
                </div>

                {orderType === 'DELIVERY' && !tableNumber && (
                  <input
                    type="text"
                    placeholder="Complete Delivery Address *"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                  />
                )}

                <input
                  type="text"
                  placeholder="Special instructions or dietary notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                />
              </div>

              {/* Promo Code Box (Take.app Parity) */}
              <div className="border-t border-stone-100 pt-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Promo code (e.g. WELCOME10)"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs uppercase font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold shrink-0 hover:bg-black transition"
                  >
                    Apply
                  </button>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between items-center text-[11px] text-emerald-700 font-bold mt-1 px-1">
                    <span>✓ Code {appliedDiscount.code} applied ({appliedDiscount.label || 'Discount'})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedDiscount(null);
                        setPromoCodeInput('');
                      }}
                      className="text-stone-400 hover:text-stone-700 underline text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {promoError && (
                  <p className="text-[10px] text-red-600 font-bold mt-1 px-1">{promoError}</p>
                )}
              </div>

              {/* Total & Tax Breakdown */}
              <div className="border-t border-stone-100 pt-3 mt-3 space-y-1 text-xs">
                <div className="flex justify-between items-center text-stone-500">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold">
                    <span>Discount ({appliedDiscount?.code})</span>
                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between items-center text-stone-500">
                    <span>{taxName} ({taxRate}%)</span>
                    <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between items-center text-stone-500">
                    <span>Service Charge ({serviceChargeRate}%)</span>
                    <span>{currencySymbol}{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-stone-200 font-black text-base text-stone-900">
                  <span>Total Amount</span>
                  <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
              </div>

                {/* Optional WhatsApp Updates Checkbox */}
                <div className="flex items-center gap-2 py-2 px-1">
                  <input
                    type="checkbox"
                    id="waOptInCheckbox"
                    checked={whatsappUpdatesOptIn}
                    onChange={(e) => setWhatsappUpdatesOptIn(e.target.checked)}
                    className="size-4 rounded accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="waOptInCheckbox" className="text-xs text-stone-600 font-medium cursor-pointer">
                    Send order updates to my WhatsApp
                  </label>
                </div>

                <div className="space-y-2">
                  {/* Instant Pay with UPI if configured */}
                  {upiId && (
                    <button
                      type="button"
                      onClick={() => handleCheckout('UPI')}
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
                    >
                      <QrCode className="h-5 w-5" />
                      <span>Pay with UPI ({currencySymbol}{grandTotal.toFixed(2)})</span>
                    </button>
                  )}

                  {/* Place Order & Pay at Counter */}
                  <button
                    type="button"
                    onClick={() => handleCheckout('COD')}
                    disabled={isSubmitting}
                    className="w-full bg-stone-900 hover:bg-black text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <span>Place Order • Pay at Counter ({currencySymbol}{grandTotal.toFixed(2)})</span>
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Order Confirmed Dialog */}
        {orderSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-stone-900">Order Confirmed!</h3>
              <p className="text-xs text-stone-500 mt-1">
                Order #{orderSuccess.orderNumber} has been received by {businessName}. Keep this link to check its status.
              </p>

              <div className="mt-5 space-y-2">
                <a
                  href={orderSuccess.trackingUrl}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
                >
                  <Clock className="h-4 w-4" />
                  <span>🔥 Track Live Order & Virtual Queue</span>
                </a>

                {orderSuccess.waUrl && (
                  <a
                    href={orderSuccess.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span>Open in WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOrderSuccess(null);
                    setCart({});
                    setCartOpen(false);
                  }}
                  className="w-full text-stone-400 hover:text-stone-600 py-2 text-xs font-semibold"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

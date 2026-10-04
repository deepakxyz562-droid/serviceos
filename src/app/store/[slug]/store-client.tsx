'use client';

import React, { useState, useMemo } from 'react';
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
  catalog,
  tableNumber,
  billing,
  discounts = [],
}: StoreClientProps) {
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
  const [whatsappUpdatesOptIn, setWhatsappUpdatesOptIn] = useState(true);

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

  const grandTotal = taxType === 'inclusive' ? taxableAmount : taxableAmount + taxAmount + serviceChargeAmount;

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    const match = discounts?.find((d) => d.code.toUpperCase() === code);
    if (!match) {
      setPromoError('Invalid coupon code');
      return;
    }
    if (match.minOrder && subtotal < match.minOrder) {
      setPromoError(`Min order of ${currencySymbol}${match.minOrder} required for this coupon`);
      return;
    }
    setAppliedDiscount(match);
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

  // Checkout via WhatsApp
  const handleCheckout = async (method: 'WHATSAPP' | 'UPI') => {
    if (cartItems.length === 0) return;
    if (!customerPhone.trim()) {
      alert('Please enter your phone / WhatsApp number so we can confirm your order.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Submit order to backend
      const deliveryTiming = timingType === 'ORDER_AHEAD' ? scheduledSlot : 'Immediate (Now)';
      const res = await fetch('/api/public/store/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      }).then((r) => r.json());

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

      const trackingUrl = res.trackingUrl || `/store/${businessId}/order/${res.orderId || orderNumber}`;

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
    <div className="min-h-screen bg-stone-100 flex justify-center text-stone-900 font-sans pb-28">
      {/* Mobile-first frame container */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-md flex flex-col">
        {/* Store Banner & Brand Header */}
        <div className="bg-stone-900 text-white p-5 pt-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Dine-In Table Pill & Server Call (Take.app Parity) */}
          {tableNumber && (
            <div className="flex items-center justify-between gap-2 mb-3 bg-amber-400/20 border border-amber-400/40 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black uppercase tracking-wider">
                <UtensilsCrossed className="h-4 w-4" />
                Table #{tableNumber}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCallWaiter('SERVER')}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black flex items-center gap-1 shadow-2xs active:scale-95 transition"
                >
                  <Bell className="h-3 w-3" />
                  Call Server
                </button>
                <button
                  type="button"
                  onClick={() => handleCallWaiter('BILL')}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-900 text-[10px] font-black flex items-center gap-1 shadow-2xs active:scale-95 transition"
                >
                  Request Bill
                </button>
              </div>
            </div>
          )}

          <h1 className="text-2xl font-black tracking-tight">{businessName}</h1>
          {businessAddress && (
            <div className="flex items-center gap-1 text-stone-400 text-xs mt-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{businessAddress}</span>
            </div>
          )}
          <p className="text-xs text-stone-300 mt-2 font-medium">{greeting}</p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 space-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search food, products, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-100 border-none text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Chips Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products List */}
        <div className="p-4 space-y-3 flex-1">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-stone-400 text-xs">
              No items found. Try a different search or category.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const qty = cart[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 transition shadow-2xs"
                >
                  <div className="flex-1 pr-2">
                    <h3 className="text-sm font-bold text-stone-900 leading-snug">{p.name}</h3>
                    {p.description && (
                      <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2 text-sm font-black text-stone-900">
                      {currencySymbol}{p.price.toFixed(2)}
                    </div>
                  </div>

                  {/* Quantity Controller / Add Button */}
                  <div className="shrink-0 pt-1">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQty(p.id, 1)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 active:scale-95 transition"
                      >
                        Add +
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-2 py-1 shadow-xs">
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
            })
          )}
        </div>

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
                Order #{orderSuccess.orderNumber} has been received and forwarded to {businessName}.
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
    </div>
  );
}

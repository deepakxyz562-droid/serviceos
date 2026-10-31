'use client';
import { RequestTracker } from '../../../../shared/money';
import { isValidUpiId, sanitizeUpiId } from '@/lib/upi-qr';
import { qrSvgMarkup } from '@/lib/qr-svg';
import { getBosText, detectRegionalDefaultLanguage, type BosLanguage } from '@/components/bos/i18n/bos-translations';
import { formatStoreAddress } from '@/lib/format-utils';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ShieldAlert,
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
  Copy,
  ShoppingBag,
  ArrowLeft,
  Trash2,
  User,
  Phone,
  RotateCcw,
  LogOut,
  Wrench,
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
  enableGst?: boolean;
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
  businessType?: string;
  upiId: string;
  paymentQrUrl?: string;
  enableOnlinePayment?: boolean;
  greeting?: string;
  catalog: Product[];
  tableNumber: string | null;
  billing?: BillingConfig | null;
  discounts?: DiscountRule[];
  bannerText?: string;
  isStoreOpen?: boolean;
  storeCloseReason?: string;
  todayHoursText?: string;
  storeLanguage?: 'en' | 'hi' | 'both';
}

export function StoreClient({
  businessId,
  businessName,
  businessPhone,
  businessAddress,
  currency,
  currencySymbol,
  businessType,
  upiId,
  paymentQrUrl,
  enableOnlinePayment = true,
  greeting,
  bannerText,
  catalog,
  tableNumber,
  billing,
  discounts = [],
  isStoreOpen = true,
  storeCloseReason = '',
  todayHoursText = '',
  storeLanguage = 'en',
}: StoreClientProps) {
  const requestTracker = useRef(new RequestTracker());

  const isCreativeOrFreelancer = useMemo(() => {
    if (businessType === 'creative' || businessType === 'freelancer') return true;
    return (catalog || []).some((c) => {
      const cat = (c.category || '').toLowerCase();
      const n = (c.name || '').toLowerCase();
      return (
        cat.includes('photograph') ||
        cat.includes('video') ||
        cat.includes('shoot') ||
        cat.includes('voiceover') ||
        cat.includes('creator') ||
        cat.includes('actor') ||
        cat.includes('collab') ||
        cat.includes('design') ||
        n.includes('headshot') ||
        n.includes('showreel') ||
        n.includes('voiceover')
      );
    });
  }, [businessType, catalog]);

  const isServiceOrTrades = useMemo(() => {
    if (businessType === 'services' || businessType === 'manufacturing') return true;
    return (catalog || []).some((c) => {
      const cat = (c.category || '').toLowerCase();
      return (
        cat.includes('fabrication') ||
        cat.includes('repair') ||
        cat.includes('plumbing') ||
        cat.includes('installation') ||
        cat.includes('consulting') ||
        cat.includes('inspection')
      );
    });
  }, [businessType, catalog]);

  const isSalon = businessType === 'salon';
  const isRestaurant = businessType === 'restaurant';

  // Language state: defaults to regional detection (Hindi for Hindi belt/India, English for Telugu/Tamil/Marathi or outside India), persists to customer localStorage
  const [language, setLanguage] = useState<BosLanguage>(() => {
    return detectRegionalDefaultLanguage(businessAddress, storeLanguage);
  });

  const cleanBusinessAddress = useMemo(() => formatStoreAddress(businessAddress), [businessAddress]);

  const handleSetLanguage = (lang: BosLanguage) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('store_language', lang);
      } catch {}
    }
  };

  const t = (key: string, fallbackEn?: string, fallbackHi?: string) =>
    getBosText(key, language, fallbackEn, fallbackHi);

  const getCategoryLabel = (cat: string) => {
    if (cat === 'ALL') {
      return isCreativeOrFreelancer || isServiceOrTrades
        ? t('store.allServices', 'All Services', 'सभी सेवाएं')
        : t('store.allProducts', 'All Products', 'सभी सामान');
    }
    const catLower = cat.toLowerCase();
    if (catLower.includes('photograph') || catLower.includes('headshot')) {
      return language === 'hi' ? 'फोटोग्राफी व हेडशॉट' : language === 'both' ? `${cat} / फोटोग्राफी` : cat;
    }
    if (catLower.includes('video') || catLower.includes('shoot') || catLower.includes('production')) {
      return language === 'hi' ? 'वीडियो व प्रोडक्शन' : language === 'both' ? `${cat} / वीडियो प्रोडक्शन` : cat;
    }
    if (catLower.includes('voice') || catLower.includes('audio')) {
      return language === 'hi' ? 'वॉइसओवर व ऑडियो' : language === 'both' ? `${cat} / ऑडियो` : cat;
    }
    if (catLower.includes('creator') || catLower.includes('collab')) {
      return language === 'hi' ? 'क्रिएटर व कोलैब' : language === 'both' ? `${cat} / कोलैब` : cat;
    }
    if (catLower.includes('grocer') || catLower.includes('staple') || catLower.includes('kirana')) {
      return language === 'hi' ? 'किराना / राशन' : language === 'both' ? `${cat} / किराना` : cat;
    }
    if (catLower.includes('dairy') || catLower.includes('egg') || catLower.includes('milk')) {
      return language === 'hi' ? 'दूध और डेयरी' : language === 'both' ? `${cat} / दूध-डेयरी` : cat;
    }
    if (catLower.includes('snack') || catLower.includes('biscuit') || catLower.includes('namkeen')) {
      return language === 'hi' ? 'नमकीन व स्नैक्स' : language === 'both' ? `${cat} / स्नैक्स` : cat;
    }
    if (catLower.includes('beverage') || catLower.includes('drink') || catLower.includes('juice') || catLower.includes('tea')) {
      return language === 'hi' ? 'चाय व पेय पदार्थ' : language === 'both' ? `${cat} / पेय` : cat;
    }
    if (catLower.includes('personal') || catLower.includes('soap') || catLower.includes('shampoo')) {
      return language === 'hi' ? 'पर्सनल केयर' : language === 'both' ? `${cat} / पर्सनल केयर` : cat;
    }
    if (catLower.includes('house') || catLower.includes('clean') || catLower.includes('detergent')) {
      return language === 'hi' ? 'घरेलू सामान' : language === 'both' ? `${cat} / घरेलू सामान` : cat;
    }
    if (catLower.includes('veg') || catLower.includes('fruit')) {
      return language === 'hi' ? 'फल और सब्जियां' : language === 'both' ? `${cat} / फल-सब्जी` : cat;
    }
    return cat;
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart state: hydrated from localStorage so page refresh never empties the cart
  const cartStorageKey = `bos_store_cart_${businessId}`;
  const [cart, setCart] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`bos_store_cart_${businessId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const clean: Record<string, number> = {};
            for (const [k, v] of Object.entries(parsed)) {
              if (typeof v === 'number' && v > 0) {
                clean[k] = v;
              }
            }
            return clean;
          }
        }
      } catch {}
    }
    return {};
  });

  // Automatically sync cart to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const key = `bos_store_cart_${businessId}`;
        if (Object.keys(cart).length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(cart));
        }
      } catch {}
    }
  }, [cart, businessId]);

  const [cartOpen, setCartOpen] = useState(false);
  const [upiTrustConfirmed, setUpiTrustConfirmed] = useState(false);
  const [storeClosedAlert, setStoreClosedAlert] = useState(false);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'DELIVERY' | 'TAKEOUT'>(
    tableNumber ? 'DINE_IN' : 'DELIVERY'
  );
  const [customerAppModalOpen, setCustomerAppModalOpen] = useState(false);
  const [appBannerDismissed, setAppBannerDismissed] = useState(false);

  // Online Payment vs Counter COD state
  const effectiveUpiId = sanitizeUpiId(upiId);
  const isUpiValid = isValidUpiId(effectiveUpiId);
  const hasOnlinePayment = enableOnlinePayment && (Boolean(paymentQrUrl) || (Boolean(effectiveUpiId) && isUpiValid));
  const [paymentMode, setPaymentMode] = useState<'ONLINE_UPI' | 'COUNTER_COD'>(() =>
    hasOnlinePayment ? 'ONLINE_UPI' : 'COUNTER_COD'
  );
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Customer checkout inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [timingType, setTimingType] = useState<'NOW' | 'ORDER_AHEAD'>('NOW');
  const [scheduledSlot, setScheduledSlot] = useState<string>('Today at 5:30 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [modalUtrInput, setModalUtrInput] = useState('');
  const [isSubmittingModalUtr, setIsSubmittingModalUtr] = useState(false);
  const [modalUtrSubmitted, setModalUtrSubmitted] = useState(false);

  // Play a cheerful ascending chime when payment is auto-detected
  const playPaymentSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(523.25, 0.0, 0.35);
      playTone(659.25, 0.15, 0.35);
      playTone(783.99, 0.3, 0.45);
    } catch {}
  };

  // Live polling for UPI payment verification on storefront checkout modal
  useEffect(() => {
    if (!orderSuccess || orderSuccess.paymentMethod !== 'UPI' || orderSuccess.paymentStatus === 'PAID') {
      return;
    }

    const orderId = orderSuccess.orderId;
    const token = orderSuccess.trackingToken;
    if (!orderId) return;

    let isSubscribed = true;

    const pollPaymentStatus = async () => {
      try {
        const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
        const res = await fetch(`/api/public/store/order?orderId=${encodeURIComponent(orderId)}${tokenQuery}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed) return;

        if (data?.order) {
          const isPaid =
            data.order.paymentStatus === 'PAID' ||
            data.order.status === 'CONFIRMED' ||
            data.order.status === 'PREPARING' ||
            data.order.status === 'COMPLETED';
          if (isPaid) {
            playPaymentSuccessChime();
            setOrderSuccess((prev: any) =>
              prev ? { ...prev, paymentStatus: 'PAID', status: data.order.status } : null
            );
          }
        }
      } catch {
        // Network retry
      }
    };

    const interval = setInterval(pollPaymentStatus, 2500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [
    orderSuccess?.orderId,
    orderSuccess?.paymentMethod,
    orderSuccess?.paymentStatus,
    orderSuccess?.trackingToken,
  ]);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
  const [promoError, setPromoError] = useState('');
  const [callServerSuccess, setCallServerSuccess] = useState(false);
  const [whatsappUpdatesOptIn, setWhatsappUpdatesOptIn] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);

  // Customer Account & Order Tracking States
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPhoneInput, setAuthPhoneInput] = useState('');
  const [authNameInput, setAuthNameInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [showOrdersSheet, setShowOrdersSheet] = useState(false);

  // Fetch past orders & profile for a given phone
  const fetchCustomerOrders = async (phone: string) => {
    const clean = (phone || '').replace(/\D/g, '');
    if (clean.length < 7) return;
    try {
      setAuthLoading(true);
      setAuthError('');
      const res = await fetch(
        `/api/public/store/customer-orders?phone=${encodeURIComponent(clean)}&businessId=${encodeURIComponent(businessId)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          if (data.customer.name && data.customer.name !== 'Customer') {
            setCustomerName(data.customer.name);
          }
          if (data.customer.address) {
            setDeliveryAddress(data.customer.address);
          }
          setCustomerPhone(clean);
          setIsReturningCustomer(true);
        }
        if (Array.isArray(data.orders)) {
          setCustomerOrders(data.orders);
        }
        try {
          localStorage.setItem(
            'gptform_store_customer',
            JSON.stringify({
              name: data.customer?.name || customerName,
              phone: clean,
              address: data.customer?.address || deliveryAddress,
              lastSync: new Date().toISOString(),
            })
          );
        } catch {}
      } else {
        const errData = await res.json().catch(() => null);
        if (errData?.error) setAuthError(errData.error);
      }
    } catch {
      // ignore network errors
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = authPhoneInput.replace(/\D/g, '');
    if (clean.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number');
      return;
    }
    await fetchCustomerOrders(clean);
    if (authNameInput.trim()) {
      setCustomerName(authNameInput.trim());
    }
    setAuthModalOpen(false);
    setShowOrdersSheet(true);
  };

  const handleReorder = (order: any) => {
    if (!order || !Array.isArray(order.items)) return;
    const newCart: Record<string, number> = {};
    for (const item of order.items) {
      if (item.productId) {
        newCart[item.productId] = item.qty || 1;
      } else {
        const match = catalog.find((p) => p.name.toLowerCase() === (item.name || '').toLowerCase());
        if (match) newCart[match.id] = item.qty || 1;
      }
    }
    if (Object.keys(newCart).length > 0) {
      setCart((prev) => ({ ...prev, ...newCart }));
      setShowOrdersSheet(false);
      openCart();
    }
  };

  // Open / Close Cart with browser history & hardware back button support
  const openCart = () => {
    setCartOpen(true);
    if (typeof window !== 'undefined' && window.location.hash !== '#cart') {
      window.history.pushState({ cartOpen: true }, '', '#cart');
    }
  };

  const closeCart = () => {
    setCartOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#cart') {
      window.history.back();
    }
  };

  React.useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        if (window.location.hash === '#cart') {
          setCartOpen(true);
        } else {
          setCartOpen(false);
        }
      }
    };
    if (typeof window !== 'undefined' && window.location.hash === '#cart') {
      setCartOpen(true);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restore customer from device localStorage on QR scan / page load & sync order history
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('gptform_store_customer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) {
          setCustomerPhone(parsed.phone);
          setAuthPhoneInput(parsed.phone);
          if (parsed.name) {
            setCustomerName(parsed.name);
            setAuthNameInput(parsed.name);
          }
          if (parsed.address) setDeliveryAddress(parsed.address);
          setIsReturningCustomer(true);
          void fetchCustomerOrders(parsed.phone);
        }
      }
    } catch {}
  }, []);

  const handleResetCustomer = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setCustomerOrders([]);
    setIsReturningCustomer(false);
    setShowOrdersSheet(false);
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
    if (!isStoreOpen && delta > 0) {
      setStoreClosedAlert(true);
      return;
    }
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

  const enableGst = Boolean(billing?.enableGst);
  const taxRate = enableGst ? Number(billing?.taxRate ?? 0) : 0;
  const taxName = billing?.taxName || 'GST';
  const taxType = billing?.taxType || 'inclusive';
  const serviceChargeRate = billing?.serviceChargeRate ?? 0;

  const taxAmount = (!enableGst || taxType === 'inclusive') ? 0 : (taxableAmount * taxRate) / 100;
  const serviceChargeAmount = (taxableAmount * serviceChargeRate) / 100;

  const grandTotal = taxableAmount + taxAmount + serviceChargeAmount;

  const upiUri = useMemo(() => {
    if (!effectiveUpiId || !isUpiValid) return '';
    return `upi://pay?pa=${encodeURIComponent(effectiveUpiId)}&pn=${encodeURIComponent(businessName)}&am=${grandTotal.toFixed(2)}&tn=${encodeURIComponent(`Order at ${businessName}`)}&cu=INR`;
  }, [effectiveUpiId, isUpiValid, businessName, grandTotal]);

  // UPI QR is generated fully on-device — the deep link never leaves the
  // browser. A merchant-uploaded static QR image (paymentQrUrl) still renders
  // from its own hosted URL.
  const dynamicQrCodeUrl = paymentQrUrl || '';
  const dynamicQrMarkup = useMemo(() => {
    if (paymentQrUrl || !effectiveUpiId || !upiUri) return '';
    return qrSvgMarkup(upiUri) ?? '';
  }, [paymentQrUrl, effectiveUpiId, upiUri]);

  const handleCopyUpiId = () => {
    if (!effectiveUpiId) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(effectiveUpiId).catch(() => {});
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

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
    if (!isStoreOpen) {
      alert(storeCloseReason || `${businessName} is currently closed and not accepting orders.`);
      return;
    }
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

      // If UPI payment and customer entered UTR, record payment ref
      if (method === 'UPI' && utrNumber.trim() && res.orderId) {
        try {
          await fetch('/api/public/store/order', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: res.orderId,
              trackingToken: res.trackingToken,
              utrNumber: utrNumber.trim(),
              paymentStatus: 'DETECTION_PENDING',
            }),
          });
        } catch {
          // background UTR recording
        }
      }

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
      waMessage += `💳 *Payment Method:* ${method === 'UPI' ? (utrNumber.trim() ? `UPI (UTR: ${utrNumber.trim()})` : 'UPI (Online)') : 'Pay at Counter / Cash'}\n`;

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
        trackingToken: res.trackingToken,
        trackingUrl,
        waUrl,
        waMessage,
        paymentMethod: method === 'UPI' ? 'UPI' : 'COD',
        total: grandTotal,
        paymentStatus: method === 'UPI' ? 'UNPAID' : 'PAID',
      });
      setModalUtrInput('');
      setModalUtrSubmitted(false);

      setCart({});
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`bos_store_cart_${businessId}`);
        } catch {}
      }

      setCartOpen(false);
      if (typeof window !== 'undefined' && window.location.hash === '#cart') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

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
      {/* ── Store Closed / Offline Warning Banner ────────────────────────── */}
      {!isStoreOpen && (
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-amber-900 text-white px-4 py-3 shadow-md z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="flex size-3 shrink-0 rounded-full bg-rose-400 animate-pulse mt-0.5 sm:mt-0" />
              <div>
                <p className="text-xs sm:text-sm font-extrabold tracking-wide uppercase flex items-center gap-1.5">
                  <span>Store is Currently Closed • Not Taking Orders</span>
                </p>
                <p className="text-[11px] text-rose-100 font-medium leading-relaxed">
                  {storeCloseReason || `${businessName} is currently offline and not taking orders right now.`}
                  {todayHoursText ? ` • Hours: ${todayHoursText}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {businessPhone && (
                <a
                  href={`tel:${businessPhone.replace(/\D/g, '')}`}
                  className="px-3 py-1.5 bg-white text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-100 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Phone className="size-3.5 text-rose-600" />
                  <span>Call Store</span>
                </a>
              )}
              {businessPhone && (
                <a
                  href={`https://wa.me/${businessPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste ${businessName}, is your store/cart open today?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageCircle className="size-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Store Closed Alert Modal (Triggered on Attempted Add-to-Cart) ── */}
      {storeClosedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-scale-in">
            <div className="size-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Store className="size-7 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">{businessName} is {t('store.closed', 'Closed', 'बंद')}</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                {storeCloseReason || t('store.storeClosedMsg', 'This cart/store is currently offline and not taking online orders right now.', 'यह दुकान अभी ऑनलाइन ऑर्डर स्वीकार नहीं कर रही है।')}
              </p>
              {todayHoursText && (
                <p className="text-[11px] font-bold text-stone-500 mt-1.5">
                  {t('store.operatingHours', 'Operating Hours', 'खुलने का समय')}: {todayHoursText}
                </p>
              )}
            </div>
            <div className="space-y-2 pt-1">
              {businessPhone && (
                <a
                  href={`tel:${businessPhone.replace(/\D/g, '')}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                >
                  <Phone className="size-4" />
                  <span>{t('store.callOwner', 'Call Store Owner', 'दुकानदार को कॉल करें')} ({businessPhone})</span>
                </a>
              )}
              {businessPhone && (
                <a
                  href={`https://wa.me/${businessPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste ${businessName}, is your store open today?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition"
                >
                  <MessageCircle className="size-4 text-emerald-600" />
                  <span>{t('store.askWhatsApp', 'Ask on WhatsApp', 'व्हाट्सएप पर पूछें')}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setStoreClosedAlert(false)}
                className="w-full py-2 text-stone-400 hover:text-stone-700 text-xs font-semibold cursor-pointer"
              >
                {t('store.close', 'Close', 'बंद करें')}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {t('store.applyCoupon', 'Apply Coupon', 'कूपन लगाएं')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Smart App Banner (BOS Customer Mobile App Link) ──────────────── */}
      {!appBannerDismissed && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs text-emerald-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate font-medium">
                {t('store.smartBanner', 'Get the BOS Customer App for instant QR ordering, favorites & live delivery tracking.', 'त्वरित QR ऑर्डर और लाइव ट्रैकिंग के लिए BOS ऐप देखें।')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCustomerAppModalOpen(true)}
                className="font-bold text-emerald-700 hover:text-emerald-800 underline text-xs cursor-pointer"
              >
                {t('store.exploreApp', 'Explore App →', 'ऐप देखें →')}
              </button>
              <button
                type="button"
                onClick={() => setAppBannerDismissed(true)}
                className="text-emerald-500 hover:text-emerald-800 p-0.5 rounded cursor-pointer transition"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isStoreOpen !== false
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isStoreOpen !== false ? t('store.open', 'Open', 'चालू') : t('store.closed', 'Closed', 'बंद')}
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate font-medium">
                {greeting || cleanBusinessAddress || 'Direct Online Store'}
              </p>
            </div>
          </div>

          {/* Middle: Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={t('store.searchPlaceholder', 'Search for products, grocery, snacks...', 'सामान, किराना या स्नैक्स खोजें...')}
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

          {/* Right: Navigation, Language Switcher & Cart Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Switcher Pill: [ EN | हिंदी | Both ] */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSetLanguage('en')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleSetLanguage('hi')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  language === 'hi'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="हिंदी में बदलें"
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => handleSetLanguage('both')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  language === 'both'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bilingual / दोनों भाषाएँ"
              >
                Both
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
            >
              <Home className="h-4 w-4" />
              <span>{t('store.home', 'Home', 'होम')}</span>
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
              <span>{t('store.categories', 'Categories', 'श्रेणियां')}</span>
            </button>
            {discounts.length > 0 && (
              <button
                type="button"
                onClick={openCart}
                className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition"
              >
                <Tag className="h-4 w-4" />
                <span>{t('store.offers', 'Offers', 'ऑफ़र्स')}</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={openCart}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition border border-emerald-200"
            >
              <ShoppingCart className="h-4 w-4 text-emerald-700" />
              <span className="hidden sm:inline">{t('store.cart', 'Cart', 'कार्ट')}</span>
              {totalItems > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Customer Status or Login */}
            {isReturningCustomer && customerPhone ? (
              <button
                type="button"
                onClick={() => setShowOrdersSheet(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer text-xs font-bold border border-slate-200"
                title="View your orders and account"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-[10px] sm:text-[11px]">
                  {(customerName || customerPhone).charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline truncate max-w-[90px]">{customerName || t('store.myAccount', 'My Account', 'मेरा खाता')}</span>
                {customerOrders.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    {customerOrders.length}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('store.signInOrders', 'Sign In / Orders', 'लॉग इन / ऑर्डर्स')}</span>
                <span className="sm:hidden">{t('store.signIn', 'Sign In', 'लॉग इन')}</span>
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
              placeholder={t('store.searchShort', 'Search products...', 'सामान खोजें...')}
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
              <span>{t('store.dineInTable', 'Dine-In Table', 'टेबल नं.')} #{tableNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCallWaiter('SERVER')}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-stone-950 text-xs font-bold transition"
              >
                {t('store.callServer', 'Call Server', 'वेटर बुलाएं')}
              </button>
              <button
                type="button"
                onClick={() => handleCallWaiter('BILL')}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-stone-900 text-xs font-bold transition"
              >
                {t('store.requestBill', 'Request Bill', 'बिल मांगें')}
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('store.categories', 'Categories', 'श्रेणियां')}</h2>
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
                    <span className="truncate">{getCategoryLabel(cat)}</span>
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
                <span className="leading-relaxed font-medium">{cleanBusinessAddress || 'Patna, Bihar'}</span>
              </div>
              {isCreativeOrFreelancer ? (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{t('store.creativeTurnaround', 'Fast Turnaround & Milestone Delivery', 'समय पर प्रोजेक्ट डिलीवरी')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t('store.verifiedCreator', 'Direct Booking & Portfolio Output', 'सत्यापित सीधी बुकिंग')}</span>
                  </div>
                </>
              ) : isServiceOrTrades ? (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{t('store.serviceVisits', 'Doorstep Visits & On-Site Estimates', 'डोरस्टेप विज़िट व कोटेशन')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t('store.serviceWarranty', 'Verified Work & Direct Support', 'सत्यापित काम व सीधी गारंटी')}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{t('store.deliveryTime', 'Delivery: 30 - 45 mins', 'डिलीवरी: 30 - 45 मिनट')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <Truck className="h-4 w-4 shrink-0" />
                    <span>{t('store.freeDeliveryAbove', 'Free delivery above ₹299', '₹299 से ऊपर मुफ्त डिलीवरी')}</span>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* ── Right Column: Hero Banner + Value Props + Product Grid ───── */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Hero Promotional Banner (Matching Panel 2) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#D8EEDB] via-[#EAF7EE] to-[#FEF3D6] p-6 sm:p-8 border border-emerald-100 shadow-xs">
              <div className="max-w-md relative z-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-2xs">
                  {isServiceOrTrades ? (
                    <Wrench className="h-3 w-3" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {isCreativeOrFreelancer
                    ? t('store.verifiedCreative', 'Verified Professional Portfolio', 'सत्यापित पेशेवर पोर्टफोलियो')
                    : isServiceOrTrades
                    ? t('store.verifiedServices', 'Professional Quality Guarantee', 'पेशेवर गुणवत्ता गारंटी')
                    : isSalon
                    ? t('store.certifiedSalon', 'Certified Stylists & Hygiene', 'प्रमाणित स्टाइलिस्ट और स्वच्छता')
                    : isRestaurant
                    ? t('store.freshPrepared', 'Freshly Prepared Food', 'ताज़ा तैयार भोजन')
                    : t('store.freshGuarantee', '100% Fresh Guarantee', '100% ताज़ा गारंटी')}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {bannerText?.trim() ||
                    greeting?.trim() ||
                    (businessName
                      ? `Welcome to ${businessName}`
                      : isCreativeOrFreelancer
                      ? t('store.creativePortfolio', 'Professional Services & Portfolio', 'व्यावसायिक सेवाएं व पोर्टफोलियो')
                      : isServiceOrTrades
                      ? t('store.servicesTitle', 'Quality Services & Workmanship', 'विश्वसनीय सेवाएं व कारीगरी')
                      : t('store.heroTitle', 'Fresh Groceries Delivered to Your Home', 'ताज़ा राशन और फल-सब्जियां सीधे आपके घर'))}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {greeting?.trim() && bannerText?.trim()
                    ? greeting.trim()
                    : businessName
                    ? (isCreativeOrFreelancer
                        ? t('store.creativeSubtitle', 'Explore creative packages, view deliverables and book directly.', 'क्रिएटिव पैकेज देखें, काम के नमूने देखें और सीधे बुक करें।')
                        : isServiceOrTrades
                        ? t('store.servicesSubtitle', 'Explore services, request upfront estimates and book visits.', 'सेवाएं देखें, कोटेशन मंगाएं और सीधे अपॉइंटमेंट बुक करें।')
                        : t('store.heroSubtitleDefault', 'Explore our catalog, special offers and order directly.', 'हमारी कैटलॉग और विशेष ऑफर देखें और सीधे ऑर्डर करें।'))
                    : t(
                        'store.heroSubtitle',
                        'Farm fresh produce, daily essentials, snacks, and dairy delivered in 30–45 minutes.',
                        'दैनिक जरूरत का सामान, दूध और नाश्ता मात्र 30–45 मिनट में डिलीवरी।',
                      )}
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
                    <span>
                      {isCreativeOrFreelancer || isServiceOrTrades
                        ? t('store.viewServices', 'View Services', 'सेवाएं देखें')
                        : t('store.shopNow', 'Shop Now', 'अभी खरीदें')}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Decorative certified stamp badge */}
              <div className="absolute right-4 bottom-2 sm:right-8 sm:bottom-4 opacity-80 sm:opacity-100 pointer-events-none">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-emerald-500/10 flex items-center justify-center p-2 border-2 border-dashed border-emerald-400/40">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-emerald-600 text-white flex flex-col items-center justify-center font-black text-center shadow-lg">
                    <span className="text-[10px] tracking-widest text-emerald-200">CERTIFIED</span>
                    <span className="text-xs sm:text-sm">100%</span>
                    <span className="text-[10px]">
                      {isCreativeOrFreelancer
                        ? t('store.stampVerified', 'VERIFIED', 'सत्यापित')
                        : isServiceOrTrades
                        ? t('store.stampGenuine', 'GENUINE', 'प्रामाणिक')
                        : isSalon
                        ? t('store.stampHygiene', 'HYGIENIC', 'स्वच्छ')
                        : t('store.certifiedFresh', 'FRESH', 'ताज़ा')}
                    </span>
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
                  <h4 className="text-xs font-bold text-slate-900">
                    {isCreativeOrFreelancer
                      ? t('store.proQuality', 'Top Quality', 'उत्कृष्ट काम')
                      : isServiceOrTrades
                      ? t('store.expertWork', 'Expert Quality', 'कुशल कारीगर')
                      : t('store.qualityProducts', 'Quality Products', 'उत्तम गुणवत्ता')}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isCreativeOrFreelancer
                      ? t('store.proQualitySub', 'Portfolio-grade output', 'हाई-क्वालिटी परिणाम')
                      : isServiceOrTrades
                      ? t('store.expertWorkSub', 'Verified workmanship', 'सत्यापित काम')
                      : t('store.qualitySub', 'Handpicked items', 'चुनिंदा सामान')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  {isCreativeOrFreelancer || isServiceOrTrades ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <Truck className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isCreativeOrFreelancer
                      ? t('store.fastTurnaround', 'On-Time Delivery', 'समय पर डिलीवरी')
                      : isServiceOrTrades
                      ? t('store.onTimeVisit', 'On-Time Service', 'समय पर सेवा')
                      : t('store.fastDelivery', 'Fast Delivery', 'तेज़ डिलीवरी')}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isCreativeOrFreelancer
                      ? t('store.fastTurnaroundSub', 'Agreed milestones', 'तय समय पर पूरा')
                      : isServiceOrTrades
                      ? t('store.onTimeVisitSub', 'Doorstep visit', 'द्वार पर सेवा')
                      : t('store.deliveryTime', '30–45 mins local', '30-45 मिनट डिलीवरी')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t('store.securePayment', 'Secure Payment', 'सुरक्षित भुगतान')}</h4>
                  <p className="text-[10px] text-slate-500">{t('store.paymentModesSub', 'UPI, Card & Cash', 'यूपीआई, कार्ड और नकद')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <BadgePercent className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isCreativeOrFreelancer
                      ? t('store.transparentRates', 'Clear Pricing', 'पारदर्शी दरें')
                      : isServiceOrTrades
                      ? t('store.fairQuotes', 'Fair Quotes', 'उचित कोटेशन')
                      : t('store.bestPrices', 'Best Prices', 'किफायती दाम')}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isCreativeOrFreelancer
                      ? t('store.transparentRatesSub', 'Direct creator rates', 'सीधे क्रिएटर रेट')
                      : isServiceOrTrades
                      ? t('store.fairQuotesSub', 'Upfront pricing', 'कोई छुपा खर्च नहीं')
                      : t('store.kiranaRates', 'Direct kirana rates', 'सीधे बाज़ार दर पर')}
                  </p>
                </div>
              </div>
            </div>

            {/* Featured Products Section Header */}
            <div id="featured-products" className="pt-2 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedCategory === 'ALL'
                    ? isCreativeOrFreelancer || isServiceOrTrades
                      ? t('store.featuredServices', 'Services & Packages', 'सेवाएं व पैकेज')
                      : t('store.featuredProducts', 'Featured Products', 'प्रमुख उत्पाद')
                    : getCategoryLabel(selectedCategory)}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('store.showingItems', 'Showing', 'दिखा रहे हैं')} {filteredProducts.length}{' '}
                  {isCreativeOrFreelancer || isServiceOrTrades
                    ? t('store.servicesCount', 'services available', 'सेवाएं उपलब्ध')
                    : t('store.itemsCount', 'items available', 'सामान उपलब्ध')}
                </p>
              </div>
              {selectedCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  {isCreativeOrFreelancer || isServiceOrTrades
                    ? t('store.viewAllServices', 'View All Services', 'सभी सेवाएं देखें')
                    : t('store.viewAll', 'View All Products', 'सभी उत्पाद देखें')}
                </button>
              )}
            </div>

            {/* Products Grid (Panel 2 Mockup: 4 Columns on Desktop) */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <p className="text-sm font-semibold">{t('store.noProducts', 'No products found matching your search.', 'आपकी खोज के अनुसार कोई उत्पाद नहीं मिला।')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold"
                >
                  {t('store.clearFilters', 'Clear Filters', 'फ़िल्टर हटाएं')}
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
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-b from-slate-50 to-slate-100 p-2 text-center">
                            {isCreativeOrFreelancer ? (
                              <Sparkles className="h-8 w-8 mb-1 text-emerald-600/70" />
                            ) : isServiceOrTrades ? (
                              <Wrench className="h-8 w-8 mb-1 text-emerald-600/70" />
                            ) : (
                              <Store className="h-8 w-8 mb-1 text-slate-400" />
                            )}
                            <span className="text-[10px] font-bold text-slate-600 line-clamp-1 max-w-full">
                              {p.category || (isCreativeOrFreelancer || isServiceOrTrades ? 'Service' : 'Product')}
                            </span>
                          </div>
                        )}
                        {p.category && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-slate-700 shadow-2xs">
                            {getCategoryLabel(p.category)}
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
                          <span className="text-xs text-slate-400 block font-medium">{t('store.price', 'Price', 'कीमत')}</span>
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            {currencySymbol}{p.price}
                          </span>
                        </div>

                        {!isStoreOpen ? (
                          <button
                            type="button"
                            onClick={() => setStoreClosedAlert(true)}
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-500 text-xs font-bold transition cursor-pointer"
                          >
                            {t('store.closed', 'Closed', 'दुकान बंद')}
                          </button>
                        ) : qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateQty(p.id, 1)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{t('store.add', '+ Add', '+ जोड़ें')}</span>
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
              onClick={openCart}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between font-bold active:scale-[0.99] transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-black">
                  {totalItems}
                </span>
                <span className="text-sm">{t('store.viewCart', 'View Cart', 'कार्ट देखें')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-base font-black">
                <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        )}

        {/* Full-Screen Mobile Checkout View & Desktop Modal */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
            <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-[#F8FAFC] flex flex-col sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
              {/* ── Fixed Top App Bar / Header ────────────────────────── */}
              <header className="shrink-0 bg-white border-b border-stone-200/90 px-4 py-3.5 flex items-center justify-between shadow-2xs z-10">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={closeCart}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 -ml-1.5 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95"
                    title="Back to store menu"
                  >
                    <ArrowLeft className="size-4 text-stone-800" />
                    <span>{t('common.back', 'Back', 'वापस')}</span>
                  </button>
                  <div className="h-4 w-px bg-stone-200" />
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-stone-900 leading-tight flex items-center gap-2">
                      <span>{t('store.yourCart', 'Your Shopping Cart', 'आपकी शॉपिंग कार्ट')}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-black">
                        {totalItems} {totalItems === 1 ? t('store.itemSingle', 'item', 'सामान') : t('store.itemsCount', 'items', 'सामान')}
                      </span>
                    </h2>
                    <p className="text-[10.5px] text-stone-500 truncate max-w-[180px] sm:max-w-[300px]">
                      {businessName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.confirm('Remove all items from your cart?')) {
                          setCart({});
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Clear Cart"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="hidden sm:inline">{t('store.clearCart', 'Clear', 'खाली करें')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeCart}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
                    title="Close"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </header>

              {/* ── Unified Scrollable Content Area ──────────────────────── */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 pb-28 sm:pb-6">
                {/* 1. Selected Products Card */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <ShoppingBag className="size-3.5 text-emerald-600" />
                      {t('store.yourCart', 'Selected Items', 'चुने हुए सामान')} ({totalItems})
                    </span>
                    <button
                      type="button"
                      onClick={closeCart}
                      className="text-[11.5px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>{t('header.newBill', '+ Add More', '+ और सामान जोड़ें')}</span>
                    </button>
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <ShoppingBag className="size-10 text-stone-300 mx-auto" />
                      <p className="text-xs font-bold text-stone-600">{t('store.emptyCart', 'Your cart is currently empty', 'आपकी कार्ट खाली है')}</p>
                      <button
                        type="button"
                        onClick={closeCart}
                        className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        {t('store.continueShopping', 'Browse Store Menu', 'सामान चुनें')}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {cartItems.map((item) => (
                        <div key={item.id} className="py-3 first:pt-1 last:pb-1 flex items-center gap-3">
                          {/* Image Thumbnail */}
                          <div className="relative size-14 shrink-0 rounded-xl border border-stone-200/80 bg-stone-50 overflow-hidden flex items-center justify-center shadow-2xs">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-stone-400 p-1 text-center">
                                <ShoppingBag className="size-4 text-emerald-600/70 mb-0.5" />
                                <span className="text-[7.5px] font-bold uppercase truncate max-w-[48px]">
                                  {item.category || 'Item'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 pr-1">
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug line-clamp-1">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                              {currencySymbol}{item.price.toFixed(2)} each
                            </p>
                          </div>

                          {/* Stepper with Trash Icon when Qty is 1 */}
                          <div className="flex items-center gap-1.5 bg-stone-100/90 rounded-xl p-1 border border-stone-200/70 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, -1)}
                              className={`size-7 rounded-lg flex items-center justify-center transition active:scale-90 cursor-pointer ${
                                item.qty === 1
                                  ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
                                  : 'text-stone-700 hover:bg-white shadow-2xs'
                              }`}
                              title={item.qty === 1 ? 'Remove item' : 'Decrease quantity'}
                            >
                              {item.qty === 1 ? (
                                <Trash2 className="size-3.5 text-red-500" />
                              ) : (
                                <Minus className="size-3.5" />
                              )}
                            </button>
                            <span className="font-black text-xs min-w-[20px] text-center text-stone-900">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, 1)}
                              className="size-7 rounded-lg flex items-center justify-center text-stone-700 hover:bg-white shadow-2xs transition active:scale-90 cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="w-16 text-right shrink-0">
                            <span className="text-xs sm:text-sm font-black text-stone-900">
                              {currencySymbol}{item.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Order Fulfillment & Delivery Card */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Truck className="size-3.5 text-emerald-600" />
                    {t('store.orderType', 'Delivery & Fulfillment', 'डिलीवरी और प्राप्ति')}
                  </span>

                  {tableNumber ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold flex items-center gap-2 text-xs">
                      <UtensilsCrossed className="size-4 text-amber-600 shrink-0" />
                      <span>{t('store.dineInTable', 'Dine-In Table', 'टेबल नं.')} #{tableNumber}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType('DELIVERY')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-2 cursor-pointer ${
                          orderType === 'DELIVERY'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <Truck className="size-3.5" />
                        <span>{t('store.delivery', 'Home Delivery', 'होम डिलीवरी')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('TAKEOUT')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-2 cursor-pointer ${
                          orderType === 'TAKEOUT'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <Store className="size-3.5" />
                        <span>{t('store.takeout', 'Store Pickup', 'दुकान से पिकअप')}</span>
                      </button>
                    </div>
                  )}

                  {/* Order Timing: ASAP vs Order Ahead */}
                  <div className="bg-stone-50/90 p-3 rounded-xl border border-stone-200/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-stone-500" />
                        {t('store.orderType', 'Order Timing', 'ऑर्डर का समय')}
                      </span>
                      <span className="text-[10.5px] text-stone-400">
                        {timingType === 'NOW' ? '⚡ Immediate preparation' : '📅 Pre-scheduled slot'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTimingType('NOW')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          timingType === 'NOW'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{t('store.orderNow', '🟢 Order Now (ASAP)', '🟢 अभी मंगाएं (तुरंत)')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimingType('ORDER_AHEAD')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          timingType === 'ORDER_AHEAD'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{t('store.orderAhead', '⏰ Order Ahead', '⏰ बाद के लिए')}</span>
                      </button>
                    </div>

                    {timingType === 'ORDER_AHEAD' && (
                      <div className="pt-1.5">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                          {t('store.selectSlot', 'Select Delivery / Pickup Slot:', 'डिलीवरी या पिकअप का समय चुनें:')}
                        </label>
                        <select
                          value={scheduledSlot}
                          onChange={(e) => setScheduledSlot(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-hidden focus:border-emerald-600"
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

                  {/* Delivery Address if Home Delivery */}
                  {orderType === 'DELIVERY' && !tableNumber && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                        <MapPin className="size-3.5 text-emerald-600" />
                        <span>{t('store.addressLabel', 'Complete Delivery Address *', 'डिलीवरी का पूरा पता *')}</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder={t('store.addressPlaceholder', 'House / Flat No., Building, Street Name, Landmark', 'मकान / फ्लैट नं., गली का नाम, लैंडमार्क')}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl bg-stone-50/80 border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                      />
                    </div>
                  )}

                  {/* Special Instructions / Notes */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder={t('store.instructionsPlaceholder', 'Special instructions or notes for the store (optional)', 'दुकानदार के लिए विशेष निर्देश (ऐच्छिक)')}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-stone-50/80 border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                {/* 3. Customer Contact Details Card */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <User className="size-3.5 text-emerald-600" />
                    {t('store.customerInfo', 'Customer Information', 'ग्राहक का विवरण')}
                  </span>

                  {isReturningCustomer && customerPhone && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                        <div>
                          <p className="font-bold text-stone-900 leading-tight">
                            {customerName ? `${customerName}` : t('store.welcomeBack', 'Welcome Back', 'स्वागत है')}
                          </p>
                          <p className="text-[10px] text-stone-500 font-mono">
                            Auto-filled: {customerPhone}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetCustomer}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-bold cursor-pointer"
                      >
                        {t('store.change', 'Change', 'बदलें')}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('store.yourName', 'Your Name (Optional)', 'आपका नाम (ऐच्छिक)')}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-stone-50/80 border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="tel"
                        placeholder={t('store.whatsAppNumber', 'WhatsApp Number *', 'व्हाट्सएप मोबाइल नंबर *')}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl bg-stone-50/80 border border-stone-200 text-xs font-bold text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Updates Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="waOptInCheckbox"
                      checked={whatsappUpdatesOptIn}
                      onChange={(e) => setWhatsappUpdatesOptIn(e.target.checked)}
                      className="size-4 rounded-md accent-emerald-600 cursor-pointer"
                    />
                    <label
                      htmlFor="waOptInCheckbox"
                      className="text-xs text-stone-600 font-medium cursor-pointer flex items-center gap-1.5 select-none"
                    >
                      <MessageCircle className="size-3.5 text-emerald-600" />
                      <span>{t('store.waUpdatesOptIn', 'Send order receipt & status updates to my WhatsApp', 'ऑर्डर रसीद और लाइव अपडेट व्हाट्सएप पर भेजें')}</span>
                    </label>
                  </div>
                </div>

                {/* 4. Payment Method Card */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-emerald-600" />
                      {t('store.paymentMethod', 'Payment Method', 'भुगतान का तरीका')}
                    </span>
                    {hasOnlinePayment && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {t('store.zeroFeeUpi', 'Zero Fee UPI', 'मुफ़्त UPI')}
                      </span>
                    )}
                  </div>

                  {hasOnlinePayment ? (
                    <div className="space-y-3">
                      {/* Segmented 2-option selector */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMode('ONLINE_UPI')}
                          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            paymentMode === 'ONLINE_UPI'
                              ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                              : 'border-stone-200 hover:border-stone-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                              <QrCode className="size-4 text-emerald-600" />
                              {t('store.payOnline', 'Pay Online', 'ऑनलाइन भुगतान')}
                            </span>
                            <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              {t('store.fast', 'FAST', 'तुरंत')}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-stone-500 font-medium">UPI / QR Scan</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMode('COUNTER_COD')}
                          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            paymentMode === 'COUNTER_COD'
                              ? 'border-stone-900 bg-stone-100 ring-2 ring-stone-900/10'
                              : 'border-stone-200 hover:border-stone-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                              <Store className="size-4 text-stone-700" />
                              {t('store.payAtCounter', 'Pay at Counter', 'काउंटर पर भुगतान')}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-stone-500 font-medium">{t('store.cashCod', 'Cash / COD', 'नकद (Cash / COD)')}</p>
                        </button>
                      </div>

                      {/* Pay Online UPI Details Container */}
                      {paymentMode === 'ONLINE_UPI' && (
                        <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-white to-stone-50 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-3">
                          {/* PRE-UPI TRUST SHIELD: Protect roadside stalls and prevent lost payments */}
                          {!upiTrustConfirmed ? (
                            <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-300 space-y-3 text-left">
                              <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
                                  <ShieldAlert className="size-5" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                                    {t('store.trustShieldTitle', 'Trust & Safety Check: Do you know this store?', 'सुरक्षा जांच: क्या आप इस दुकान को जानते हैं?')}
                                  </h4>
                                  <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                                    {t('store.trustShieldMsg', "Direct UPI payments transfer instantly to the store owner's bank account with no middleman. If you are not physically at the shop or haven't confirmed with the store today, we strongly advise verifying first or choosing Pay at Counter.", "सीधा UPI भुगतान बिना किसी बिचौलिए के सीधे दुकानदार के बैंक खाते में जाता है। यदि आप दुकान पर नहीं हैं या आज पुष्टि नहीं की है, तो पहले कॉल करें या नकद भुगतान चुनें।")}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setPaymentMode('COUNTER_COD')}
                                  className="w-full py-2 px-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                                >
                                  <Store className="size-3.5 text-stone-600" />
                                  {t('store.switchToCash', 'Switch to Cash / COD', 'नकद (Cash / COD) चुनें')}
                                </button>
                                {businessPhone ? (
                                  <a
                                    href={`tel:${businessPhone.replace(/[^0-9+]/g, '')}`}
                                    className="w-full py-2 px-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                                  >
                                    <Phone className="size-3.5 text-emerald-600" />
                                    {t('store.callToConfirm', 'Call Store to Confirm', 'पुष्टि के लिए कॉल करें')}
                                  </a>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                onClick={() => setUpiTrustConfirmed(true)}
                                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                              >
                                <CheckCircle2 className="size-4" />
                                <span>{t('store.unlockUpi', 'I Know This Store • Unlock UPI Payment', 'मैं इस दुकान को जानता हूँ • UPI पेमेंट चालू करें')}</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="font-bold text-stone-700 flex items-center gap-1">
                                  <Sparkles className="size-3 text-emerald-600" />
                                  {t('store.scanAndPay', 'Scan & Pay with Any App', 'किसी भी ऐप से स्कैन करके भुगतान करें')}
                                </span>
                                <div className="flex items-center gap-1 font-bold text-[9px]">
                                  <span className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-stone-800 shadow-2xs">
                                    GPay
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-purple-700 shadow-2xs">
                                    PhonePe
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-blue-700 shadow-2xs">
                                    Paytm
                                  </span>
                                </div>
                              </div>

                              {/* Dynamic QR Code Card */}
                              {(dynamicQrCodeUrl || dynamicQrMarkup) && (
                                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                                  <div className="relative group shrink-0">
                                    {dynamicQrCodeUrl ? (
                                      <img
                                        src={dynamicQrCodeUrl}
                                        alt="Shop UPI QR Code"
                                        className="size-32 rounded-lg border border-stone-200 bg-white p-1 object-contain shadow-2xs"
                                      />
                                    ) : (
                                      // Safe to inline: markup is generated entirely by
                                      // our local encoder — no user-controlled attributes.
                                      <div
                                        role="img"
                                        aria-label="Shop UPI QR Code"
                                        className="size-32 rounded-lg border border-stone-200 bg-white p-1 shadow-2xs"
                                        dangerouslySetInnerHTML={{ __html: dynamicQrMarkup }}
                                      />
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow">
                                      <QrCode className="size-3" />
                                    </div>
                                  </div>
                                  <div className="text-center sm:text-left space-y-1 flex-1 min-w-0">
                                    <p className="text-xs font-bold text-stone-900">
                                      {t('store.instantUpi', 'Instant UPI QR Payment', 'तुरंत UPI QR भुगतान')}
                                    </p>
                                    <p className="text-[11px] text-stone-500 leading-tight">
                                      {t('store.scanAppsPrompt', 'Scan using PhonePe, Google Pay, Paytm, or BHIM:', 'PhonePe, Google Pay, Paytm या BHIM से स्कैन करें:')}
                                    </p>
                                    <p className="text-sm font-black text-emerald-700">
                                      {currencySymbol}{grandTotal.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* UPI ID Row with 1-Tap Copy */}
                              {effectiveUpiId && (
                                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200 text-xs">
                                  <div className="min-w-0 flex-1 pr-2">
                                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                      {t('store.merchantUpiId', 'Merchant UPI ID', 'दुकानदार का UPI ID')}
                                    </p>
                                    <p className="font-mono font-bold text-stone-800 truncate select-all text-xs">
                                      {effectiveUpiId}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleCopyUpiId}
                                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer"
                                  >
                                    {copiedUpi ? (
                                      <>
                                        <Check className="size-3 text-emerald-600" />
                                        <span className="text-emerald-700">{t('store.copied', 'Copied!', 'कॉपी हो गया!')}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="size-3" />
                                        <span>{t('store.copy', 'Copy', 'कॉपी')}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* Mobile 1-Tap Pay Button */}
                              {upiUri && (
                                <a
                                  href={upiUri}
                                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition cursor-pointer"
                                >
                                  <Smartphone className="size-4" />
                                  <span>
                                    {t('store.tapToOpenUpi', 'Tap to Open UPI App', 'UPI ऐप में खोलें')} ({currencySymbol}{grandTotal.toFixed(2)})
                                  </span>
                                </a>
                              )}

                              <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[10px] text-stone-500">
                                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                  <ShieldCheck className="size-3" />
                                  {t('store.verifiedOrder', 'Merchant Verified for this Order', 'इस ऑर्डर के लिए सत्यापित मर्चेंट')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setUpiTrustConfirmed(false)}
                                  className="text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
                                >
                                  {t('store.reverify', 'Re-verify safety', 'सुरक्षा जांचें')}
                                </button>
                              </div>
                            </>
                          )}

                          {/* Optional UTR / Reference Input */}
                          <div>
                            <label className="text-[10px] font-bold text-stone-600 block mb-1">
                              {t('store.utrLabel', 'UPI Reference / UTR Number (Optional after payment)', 'UPI रेफरेंस / UTR नंबर (पेमेंट के बाद, 12 अंक)')}
                            </label>
                            <input
                              type="text"
                              value={utrNumber}
                              onChange={(e) =>
                                setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))
                              }
                              placeholder={t('store.utrPlaceholder', 'e.g. 4289xxxxxxxx (12 digits)', 'उदा. 4289xxxxxxxx (12 अंक)')}
                              maxLength={18}
                              className="w-full text-xs font-mono bg-white border border-stone-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                            <p className="text-[9.5px] text-stone-400 mt-1">
                              {t('store.utrHelp', 'Helps verify and dispatch your order immediately.', 'इससे दुकानदार तुरंत आपका पेमेंट सत्यापित कर ऑर्डर भेज सकेगा।')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center gap-2">
                      <Store className="size-4 text-stone-500 shrink-0" />
                      <span>{t('store.codNotice', 'Payment will be collected at counter or upon delivery (Cash / COD).', 'भुगतान डिलीवरी के समय या काउंटर पर नकद लिया जाएगा।')}</span>
                    </div>
                  )}
                </div>

                {/* 5. Promo Code & Itemized Bill Card */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-4 space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Tag className="size-3.5 text-emerald-600" />
                    {t('store.offersBill', 'Offers & Bill Breakdown', 'ऑफ़र्स और बिल का विवरण')}
                  </span>

                  {/* Promo Code Input */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="size-3.5 absolute left-3 top-2.5 text-stone-400" />
                        <input
                          type="text"
                          placeholder={t('store.promoPlaceholder', 'Promo code (e.g. WELCOME10)', 'प्रोमो कोड (उदा. WELCOME10)')}
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          className="w-full pl-8.5 pr-2 py-2 rounded-xl bg-stone-50/80 border border-stone-200 text-xs uppercase font-bold text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shrink-0 transition active:scale-95 cursor-pointer"
                      >
                        {t('store.apply', 'Apply', 'लागू करें')}
                      </button>
                    </div>

                    {appliedDiscount && (
                      <div className="flex justify-between items-center text-[11px] text-emerald-700 font-bold mt-1.5 px-1">
                        <span>
                          ✓ Code {appliedDiscount.code} applied ({appliedDiscount.label || t('store.discount', 'Discount', 'छूट')})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedDiscount(null);
                            setPromoCodeInput('');
                          }}
                          className="text-stone-400 hover:text-stone-700 underline text-[10px] cursor-pointer"
                        >
                          {t('store.remove', 'Remove', 'हटाएं')}
                        </button>
                      </div>
                    )}
                    {promoError && (
                      <p className="text-[10px] text-red-600 font-bold mt-1 px-1">{promoError}</p>
                    )}
                  </div>

                  {/* Bill Details */}
                  <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-stone-500 font-medium">
                      <span>{t('store.itemTotal', 'Item Total', 'सामान का योग')} ({totalItems} {totalItems === 1 ? t('store.itemSingle', 'item', 'सामान') : t('store.itemsCount', 'items', 'सामान')})</span>
                      <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 font-bold">
                        <span>{t('store.discount', 'Discount', 'छूट')} ({appliedDiscount?.code})</span>
                        <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {taxAmount > 0 && (
                      <div className="flex justify-between items-center text-stone-500 font-medium">
                        <span>{taxName} ({taxRate}%)</span>
                        <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {serviceChargeAmount > 0 && (
                      <div className="flex justify-between items-center text-stone-500 font-medium">
                        <span>{t('store.serviceCharge', 'Service Charge', 'सर्विस चार्ज')} ({serviceChargeRate}%)</span>
                        <span>{currencySymbol}{serviceChargeAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-stone-200 font-black text-sm text-stone-900">
                      <span>{t('store.grandTotal', 'Grand Total', 'कुल देय राशि')}</span>
                      <span className="text-emerald-700">{currencySymbol}{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Fixed Sticky Bottom Bar (Safe-Area Aware) ────────────── */}
              <footer className="shrink-0 bg-white border-t border-stone-200/90 px-4 py-3 sm:py-3.5 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] z-20 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {t('store.totalPayable', 'Total Payable', 'कुल देय राशि')}
                  </p>
                  <p className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                    {currencySymbol}{grandTotal.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-stone-500 font-medium truncate">
                    {totalItems} {totalItems === 1 ? t('store.itemSingle', 'item', 'सामान') : t('store.itemsCount', 'items', 'सामान')} • {orderType === 'DELIVERY' ? t('store.delivery', 'Delivery', 'होम डिलीवरी') : t('store.takeout', 'Pickup', 'पिकअप')}
                  </p>
                </div>

                <div className="flex-1 max-w-xs">
                  {paymentMode === 'ONLINE_UPI' && hasOnlinePayment ? (
                    <button
                      type="button"
                      onClick={() => handleCheckout('UPI')}
                      disabled={isSubmitting || cartItems.length === 0}
                      className="w-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t('store.submitting', 'Submitting...', 'ऑर्डर भेजा जा रहा है...')}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          <span>{t('store.placeOrderPay', 'Place Order & Pay', 'ऑर्डर करें और भुगतान करें')}</span>
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckout('COD')}
                      disabled={isSubmitting || cartItems.length === 0}
                      className="w-full bg-stone-900 hover:bg-black text-white py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t('store.submitting', 'Submitting...', 'ऑर्डर भेजा जा रहा है...')}</span>
                        </>
                      ) : (
                        <>
                          <Store className="size-4" />
                          <span>{t('store.placeOrderCash', 'Place Order • Cash', 'ऑर्डर करें • नकद')}</span>
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </footer>
            </div>
          </div>
        )}

        {/* Order Confirmed / Live UPI Detection Dialog */}
        {orderSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
            {orderSuccess.paymentMethod === 'UPI' && orderSuccess.paymentStatus !== 'PAID' ? (
              <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 text-center shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ⚡ Direct UPI Payment
                    </span>
                    <h3 className="text-base font-black text-stone-900 mt-1">
                      Order #{orderSuccess.orderNumber}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Amount Payable</p>
                    <p className="text-lg font-black text-emerald-700">
                      {currencySymbol}{(orderSuccess.total ?? grandTotal).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Radar Active Pulse indicator */}
                <div className="my-3 py-2.5 px-3 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <div>
                      <p className="text-xs font-bold text-amber-950">
                        {t('store.checkingBank', 'Checking store soundbox & bank...', 'स्टोर साउंडबॉक्स / बैंक से मिलान हो रहा है...')}
                      </p>
                      <p className="text-[10px] text-amber-800">
                        {t('store.autoDetectMsg', 'Screen will auto-confirm once your payment is detected', 'पेमेंट होते ही यह स्क्रीन अपने आप कन्फर्म हो जाएगी')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dynamic Vector QR */}
                {(() => {
                  const upiTarget = effectiveUpiId;
                  const liveUpiUri = upiTarget
                    ? `upi://pay?pa=${encodeURIComponent(upiTarget)}&pn=${encodeURIComponent(businessName)}&am=${(orderSuccess.total ?? grandTotal).toFixed(2)}&tn=${encodeURIComponent(`Order #${orderSuccess.orderNumber}`)}&cu=INR`
                    : '';
                  const vectorQr = liveUpiUri ? (qrSvgMarkup(liveUpiUri) ?? '') : '';

                  return (
                    <div className="space-y-3">
                      {vectorQr ? (
                        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center">
                          <p className="text-xs font-bold text-stone-800 mb-2">
                            {t('store.scanWithAnyUpi', 'Scan with any UPI App to Pay', 'किसी भी UPI ऐप से स्कैन करके भुगतान करें')}
                          </p>
                          <div
                            className="size-40 rounded-xl bg-white p-2 shadow-xs border border-stone-200"
                            dangerouslySetInnerHTML={{ __html: vectorQr }}
                          />
                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono font-bold text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                            <span>UPI: {upiTarget}</span>
                          </div>
                        </div>
                      ) : null}

                      {/* 1-Tap Mobile UPI Switcher */}
                      {liveUpiUri && (
                        <div className="space-y-1.5">
                          <p className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wide">
                            {t('store.tapToPayApp', 'Or 1-Tap Pay via App:', 'या ऐप से 1-टैप में भुगतान करें:')}
                          </p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: 'GPay', color: 'text-stone-900 border-stone-300 bg-white' },
                              { label: 'PhonePe', color: 'text-purple-700 border-purple-200 bg-purple-50/50' },
                              { label: 'Paytm', color: 'text-blue-700 border-blue-200 bg-blue-50/50' },
                              { label: 'BHIM', color: 'text-emerald-700 border-emerald-200 bg-emerald-50/50' },
                            ].map((app) => (
                              <a
                                key={app.label}
                                href={liveUpiUri}
                                className={`py-2 px-1 text-center rounded-xl border text-[11px] font-black transition active:scale-95 flex flex-col items-center justify-center ${app.color}`}
                              >
                                <Smartphone className="size-3.5 mb-0.5" />
                                <span>{app.label}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Optional UTR Input Form */}
                <div className="mt-3.5 pt-3 border-t border-stone-100 text-left">
                  <p className="text-[10.5px] font-bold text-stone-700 mb-1">
                    {t('store.haveUtrReceipt', 'Have 12-digit UTR from payment receipt?', 'क्या आपके पास रसीद का 12-अंकों का UTR नंबर है?')}
                  </p>
                  {modalUtrSubmitted ? (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span>{t('store.utrSubmittedAlert', 'UTR submitted! Auto-matching against store device.', 'UTR दर्ज हो गया! दुकानदार के डिवाइस से मिलान किया जा रहा है।')}</span>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!modalUtrInput.trim() || isSubmittingModalUtr) return;
                        setIsSubmittingModalUtr(true);
                        try {
                          await fetch('/api/public/store/order', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              orderId: orderSuccess.orderId,
                              trackingToken: orderSuccess.trackingToken,
                              utrNumber: modalUtrInput.trim(),
                              paymentStatus: 'DETECTION_PENDING',
                            }),
                          });
                          setModalUtrSubmitted(true);
                        } catch {}
                        setIsSubmittingModalUtr(false);
                      }}
                      className="flex gap-1.5"
                    >
                      <input
                        type="text"
                        value={modalUtrInput}
                        onChange={(e) => setModalUtrInput(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                        placeholder={t('store.utrPlaceholder', 'e.g. 4289xxxxxxxx', 'उदा. 4289xxxxxxxx')}
                        maxLength={18}
                        className="flex-1 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        disabled={!modalUtrInput.trim() || isSubmittingModalUtr}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        {isSubmittingModalUtr ? '...' : t('store.verifyBtn', 'Verify', 'सत्यापित करें')}
                      </button>
                    </form>
                  )}
                </div>

                {/* Secondary Actions */}
                <div className="mt-4 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                  <a
                    href={orderSuccess.trackingUrl}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>{t('store.trackLiveOrder', '🔥 Track Live Order & Virtual Queue', '🔥 लाइव ऑर्डर और कतार ट्रैक करें')}</span>
                    <ArrowRight className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSuccess(null);
                      setCart({});
                      closeCart();
                    }}
                    className="text-xs font-semibold text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {t('store.payLater', 'Pay Later', 'बाद में भुगतान करें')}
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmed Celebration Modal */
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-stone-900">{t('store.orderConfirmed', 'Order Confirmed!', 'ऑर्डर सफलतापूर्वक दर्ज हो गया!')}</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Order #{orderSuccess.orderNumber} {t('store.orderReceivedMsg', 'has been received. Keep this link to check its status.', 'प्राप्त हो गया है। स्थिति जांचने के लिए यह लिंक सुरक्षित रखें।')}
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-800">
                  {orderSuccess.paymentMethod === 'UPI' ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      <span>{t('store.paymentVerifiedUpi', 'Payment Verified: Direct UPI', 'भुगतान सत्यापित: सीधा UPI')}</span>
                    </>
                  ) : (
                    <>
                      <Store className="size-3.5 text-stone-600" />
                      <span>{t('store.paymentModeCounter', 'Payment Mode: Pay at Counter', 'पेमेंट: काउंटर पर नकद')}</span>
                    </>
                  )}
                </div>

                <div className="mt-5 space-y-2">
                  <a
                    href={orderSuccess.trackingUrl}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
                  >
                    <Clock className="h-4 w-4" />
                    <span>{t('store.trackLiveOrder', '🔥 Track Live Order & Virtual Queue', '🔥 लाइव ऑर्डर और कतार ट्रैक करें')}</span>
                  </a>

                  {orderSuccess.waUrl && (
                    <a
                      href={orderSuccess.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                      <span>{t('store.openInWhatsApp', 'Open in WhatsApp', 'व्हाट्सएप में खोलें')}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOrderSuccess(null);
                      setCart({});
                      closeCart();
                    }}
                    className="w-full text-stone-400 hover:text-stone-600 py-2 text-xs font-semibold cursor-pointer"
                  >
                    {t('store.continueShopping', 'Back to Menu', 'दुकान पर वापस जाएं')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOS Customer App Modal ────────────────────────────────────── */}
        {customerAppModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-slide-up flex flex-col">
              {/* Modal Header */}
              <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white text-center">
                <button
                  type="button"
                  onClick={() => setCustomerAppModalOpen(false)}
                  className="absolute right-4 top-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner border border-white/20">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-lg font-black tracking-tight">BOS Customer App</h2>
                <p className="text-xs text-emerald-100 mt-1 max-w-xs mx-auto">
                  Instant mobile ordering, favorites &amp; live WhatsApp tracking for {businessName}
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 text-xs text-stone-600">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70">
                    <span className="text-base mb-1 block">⚡</span>
                    <p className="font-bold text-stone-900 text-xs">Instant QR Order</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Scan store standee or table to view catalog &amp; order</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70">
                    <span className="text-base mb-1 block">📍</span>
                    <p className="font-bold text-stone-900 text-xs">Live Tracking</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Real-time status &amp; virtual queue notifications on WhatsApp</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70">
                    <span className="text-base mb-1 block">💳</span>
                    <p className="font-bold text-stone-900 text-xs">Direct UPI</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">100% direct payment to store owner with zero middleman</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70">
                    <span className="text-base mb-1 block">❤️</span>
                    <p className="font-bold text-stone-900 text-xs">Saved Favorites</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Bookmark your favorite local shops for 1-tap reordering</p>
                  </div>
                </div>

                {/* QR Code / Mobile Deep Link Section */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-xl border border-emerald-200 shadow-2xs shrink-0">
                    {/* Safe to inline: markup is generated entirely by our local
                        encoder from the store URL — no user-controlled attributes. */}
                    <div
                      className="w-16 h-16 rounded"
                      dangerouslySetInnerHTML={{
                        __html:
                          qrSvgMarkup(
                            typeof window !== 'undefined'
                              ? window.location.href
                              : 'https://bos.fieseros.com'
                          ) ?? '',
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-emerald-950 text-xs">Scan with phone camera</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                      Instant mobile store app. Add to your phone&apos;s home screen for 1-tap ordering.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
                      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                        window.location.href = `boscustomer://store/${businessId}`;
                      } else if (navigator.clipboard) {
                        void navigator.clipboard.writeText(currentUrl);
                        alert('Store link copied! Paste on your phone or WhatsApp to open.');
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Open in App or Copy Store Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerAppModalOpen(false)}
                    className="w-full py-2 text-stone-400 hover:text-stone-600 font-semibold text-xs transition cursor-pointer"
                  >
                    Continue Shopping in Browser
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Customer Sign In / Phone Verification Modal ─────────────────── */}
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-slide-up flex flex-col">
              <div className="relative bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white text-center">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="absolute right-4 top-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner border border-white/20">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-black tracking-tight">Customer Sign In &amp; Orders</h3>
                <p className="text-xs text-emerald-100 mt-1 max-w-xs mx-auto">
                  Enter your mobile number to view past orders, track deliveries, and speed up checkout.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="p-5 space-y-4">
                {authError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <ShieldAlert className="size-4 shrink-0 text-rose-500" />
                    <span>{authError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition overflow-hidden">
                    <span className="px-3 text-xs font-bold text-stone-500 border-r border-stone-200 bg-stone-100/60 py-2.5">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={authPhoneInput}
                      onChange={(e) => {
                        setAuthPhoneInput(e.target.value);
                        setAuthError('');
                      }}
                      placeholder="98765 43210"
                      maxLength={10}
                      autoFocus
                      required
                      className="w-full px-3 py-2.5 text-xs sm:text-sm font-bold text-stone-900 bg-transparent focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">We&apos;ll retrieve any orders placed with this number.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Your Name <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={authNameInput}
                    onChange={(e) => setAuthNameInput(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-semibold text-stone-900 transition focus:outline-none"
                  />
                </div>

                <div className="pt-1 space-y-2">
                  <button
                    type="submit"
                    disabled={authLoading || !authPhoneInput.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
                  >
                    {authLoading ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Continue &amp; View Orders</span>
                        <ArrowRight className="size-3.5" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(false)}
                    className="w-full py-2 text-stone-400 hover:text-stone-600 font-semibold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Customer Orders & Account Sheet ─────────────────────────────── */}
        {showOrdersSheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md h-full bg-stone-50 shadow-2xl flex flex-col border-l border-stone-200 animate-slide-left overflow-hidden">
              {/* Sheet Header */}
              <div className="bg-white px-5 py-4 border-b border-stone-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                    {(customerName || customerPhone || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-stone-900 truncate">
                      {customerName || 'My Orders'}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-medium">
                      📱 +91 {customerPhone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrdersSheet(false)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Account Quick Actions Bar */}
              <div className="bg-white/80 border-b border-stone-200/80 px-5 py-2.5 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">
                  {customerOrders.length} order{customerOrders.length === 1 ? '' : 's'} recorded
                </span>
                <button
                  type="button"
                  onClick={handleResetCustomer}
                  className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 px-2 py-1 rounded-lg transition cursor-pointer"
                  title="Sign out of this phone number"
                >
                  <LogOut className="size-3.5" />
                  <span>Switch Phone</span>
                </button>
              </div>

              {/* Sheet Content: Order History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {authLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-stone-400 gap-3">
                    <div className="size-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Loading orders...</span>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="text-center py-14 px-4 bg-white rounded-3xl border border-stone-200/80 my-4">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
                      <ShoppingBag className="size-6 text-stone-400" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-800">No Orders Yet</h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                      Any orders placed under +91 {customerPhone} will appear here for easy tracking and 1-tap reordering.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowOrdersSheet(false)}
                      className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
                    >
                      Browse Store Catalog
                    </button>
                  </div>
                ) : (
                  customerOrders.map((order: any) => {
                    const status = (order.status || 'NEW').toUpperCase();
                    const statusColor =
                      status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : status === 'CONFIRMED' || status === 'ACCEPTED'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : status === 'PREPARING' || status === 'READY'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : status === 'OUT_FOR_DELIVERY'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-stone-100 text-stone-800 border-stone-200';

                    const dateStr = order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recent';

                    const orderNum = order.orderNumber || (order.id ? order.id.slice(-6).toUpperCase() : 'ORDER');

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs space-y-3 transition hover:shadow-xs"
                      >
                        {/* Order Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-stone-900 tracking-tight">
                                #{orderNum}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${statusColor}`}
                              >
                                {status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                              {dateStr}
                            </p>
                          </div>
                          <span className="font-black text-sm text-stone-900">
                            {currencySymbol}
                            {Number(order.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Order Items Summary */}
                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <div className="bg-stone-50 rounded-xl p-2.5 text-[11px] text-stone-700 space-y-1">
                            {order.items.slice(0, 3).map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="truncate max-w-[200px]">
                                  {it.qty || 1}× {it.name || 'Item'}
                                </span>
                                {it.amount && (
                                  <span className="text-stone-500 font-semibold">
                                    {currencySymbol}{Number(it.amount).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <p className="text-[10px] text-stone-400 font-medium pt-0.5">
                                +{order.items.length - 3} more item{order.items.length - 3 > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Order Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                            >
                              <MapPin className="size-3 text-emerald-600" />
                              <span>Track Live</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleReorder(order)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <RotateCcw className="size-3 text-emerald-700" />
                            <span>1-Tap Reorder</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

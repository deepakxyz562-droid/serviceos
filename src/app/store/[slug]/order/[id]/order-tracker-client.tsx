'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bell,
  MessageCircle,
  Phone,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  MapPin,
  ArrowLeft,
  Volume2,
  Sparkles,
  Calendar,
  AlertCircle,
  QrCode,
  Smartphone,
  Check,
  Send,
} from 'lucide-react';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  amount?: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryType?: string | null;
  deliveryAddress?: string | null;
  deliveryDate?: string | null;
  notes?: string | null;
  total: number;
  createdAt: string;
  items: OrderItem[];
  businessName: string;
  businessPhone?: string;
}

interface QueueData {
  ordersAhead: number;
  estimatedWaitMinutes: number;
  counterNumber?: string;
}

interface OrderTrackerClientProps {
  slug: string;
  orderId: string;
  initialOrder: OrderData;
  initialQueue: QueueData;
  currencySymbol?: string;
  upiId?: string;
}

export function OrderTrackerClient({
  slug,
  orderId,
  initialOrder,
  initialQueue,
  currencySymbol = '₹',
  upiId = '',
}: OrderTrackerClientProps) {
  const [order, setOrder] = useState<OrderData>(initialOrder);
  const [queue, setQueue] = useState<QueueData>(initialQueue);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hasPlayedChime, setHasPlayedChime] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSuccess, setUtrSuccess] = useState(false);
  const previousStatusRef = useRef(initialOrder.status);

  // Play pleasant acoustic chime using Web Audio API
  const playReadyChime = () => {
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

      // 3-tone cheerful ascending chime: C5 (523), E5 (659), G5 (784)
      playTone(523.25, 0.0, 0.35);
      playTone(659.25, 0.18, 0.35);
      playTone(783.99, 0.36, 0.6);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Request browser push/desktop notifications
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotificationsEnabled(true);
        new Notification(`Order #${order.orderNumber} updates active`, {
          body: `We'll alert you right here when your order is ready for pickup!`,
          icon: '/favicon.ico',
        });
      }
    }
  };

  // Poll order status every 3.5 seconds
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/public/store/order?orderId=${encodeURIComponent(orderId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.order) {
          const newStatus = data.order.status;

          // If status transitioned to READY, trigger alert!
          if (
            newStatus === 'READY' &&
            previousStatusRef.current !== 'READY' &&
            !hasPlayedChime
          ) {
            playReadyChime();
            setHasPlayedChime(true);

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`🎉 Order #${data.order.orderNumber} is READY!`, {
                body: `Please collect your food from ${data.queue?.counterNumber || 'Counter 1'}.`,
              });
            }
          }

          previousStatusRef.current = newStatus;
          setOrder(data.order);
          if (data.queue) setQueue(data.queue);
          setLastRefreshed(new Date());
        }
      } catch {
        // ignore network hiccups
      }
    };

    const interval = setInterval(pollStatus, 3500);
    return () => clearInterval(interval);
  }, [orderId, hasPlayedChime]);

  const isDineIn = order.deliveryType === 'dine_in' || !!order.deliveryAddress?.includes('Table #');
  const isTakeout = order.deliveryType === 'takeout';
  const isDelivery = order.deliveryType === 'delivery';

  // Compute active step index: 0=Received, 1=Preparing, 2=Ready, 3=Completed
  const getStepIndex = () => {
    switch (order.status) {
      case 'PENDING':
      case 'CONFIRMED':
        return 0;
      case 'PREPARING':
        return 1;
      case 'READY':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex();

  const upiUri = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(order.businessName)}&am=${order.total.toFixed(2)}&tn=${encodeURIComponent(`Order #${order.orderNumber}`)}&cu=INR`
    : '';

  const qrCodeUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}`
    : '';

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim() || submittingUtr) return;
    setSubmittingUtr(true);
    try {
      const res = await fetch('/api/public/store/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          utrNumber: utrInput.trim(),
        }),
      });
      if (res.ok) {
        setUtrSuccess(true);
        setUtrInput('');
      }
    } catch (err) {
      console.error('Failed to submit UTR', err);
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanBizPhone = (order.businessPhone || '').replace(/\D/g, '');
    const msg = `Hi ${order.businessName}, checking on my order #${order.orderNumber}.`;
    const url = cleanBizPhone
      ? `https://wa.me/${cleanBizPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center text-stone-900 font-sans pb-16">
      <div className="w-full max-w-md bg-white min-h-screen shadow-md flex flex-col">
        {/* Header Bar */}
        <div className="bg-stone-900 text-white p-5 pt-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/store/${slug}`}
              className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Menu</span>
            </Link>

            <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Updates
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">
                {order.businessName}
              </p>
              <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
                Order #{order.orderNumber}
              </h1>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400 block">Total</span>
              <span className="text-lg font-black text-emerald-400">
                {currencySymbol}{order.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-4 space-y-4 -mt-2 flex-1">
          {/* READY CELEBRATION HERO BANNER */}
          {order.status === 'READY' && (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center font-black shadow-md shrink-0 animate-bounce">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-0.5">
                    <Sparkles className="h-3 w-3" /> Ready for Collection
                  </div>
                  <h2 className="text-xl font-black">Your food is READY!</h2>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                <div>
                  <span className="text-emerald-100 block text-[11px]">Pick up from:</span>
                  <span className="font-black text-sm">
                    {isDineIn ? (order.deliveryAddress || 'Your Table') : (queue.counterNumber || 'Counter 1')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={playReadyChime}
                  className="px-3 py-1.5 rounded-xl bg-white text-emerald-700 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Chime
                </button>
              </div>
            </div>
          )}

          {/* VIRTUAL QUEUE CARD (For Roadside cart, Food stall, Cafe & Restaurants) */}
          {order.status !== 'READY' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                    🔥 Live Virtual Queue
                  </span>
                  <h3 className="text-2xl font-black text-amber-950 mt-1.5">
                    {queue.ordersAhead === 0 ? 'Next in Line!' : `${queue.ordersAhead} orders ahead`}
                  </h3>
                </div>
                <div className="text-right bg-white/80 backdrop-blur-xs px-3 py-2 rounded-2xl border border-amber-200/60">
                  <span className="text-[10px] text-amber-700 font-semibold block">Est. Wait</span>
                  <span className="text-base font-black text-amber-900 flex items-center gap-1 justify-end">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    ~{queue.estimatedWaitMinutes} min
                  </span>
                </div>
              </div>

              <p className="text-xs text-amber-800/80 mt-2.5 leading-relaxed">
                Your order is queued in our kitchen. You don't need to stand in line — feel free to sit down, we will alert you the moment it is ready!
              </p>

              {/* Notification opt-in button */}
              {typeof window !== 'undefined' && 'Notification' in window && !notificationsEnabled && (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="mt-3 w-full bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Bell className="h-3.5 w-3.5 text-amber-600" />
                  <span>Notify Me When Ready (Sound & Alert)</span>
                </button>
              )}
            </div>
          )}

          {/* PAYMENT STATUS & DIRECT UPI CARD */}
          {order.paymentStatus === 'PAID' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Payment Verified
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    Paid {currencySymbol}{order.total.toFixed(2)} via {order.paymentMethod || 'UPI'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                PAID ✓
              </span>
            </div>
          ) : (
            <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Payment Pending
                  </span>
                  <h3 className="text-sm font-black text-stone-900 mt-1">
                    Amount Due: {currencySymbol}{order.total.toFixed(2)}
                  </h3>
                </div>
                <span className="text-xs text-stone-400 font-mono">
                  {order.paymentMethod === 'cash' ? 'Pay at Counter' : 'Direct UPI'}
                </span>
              </div>

              {upiId && (
                <div className="space-y-3 pt-1">
                  <a
                    href={upiUri}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Pay {currencySymbol}{order.total.toFixed(2)} with any UPI App</span>
                  </a>

                  {qrCodeUrl && (
                    <div className="bg-stone-50 border border-stone-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                      <p className="text-[11px] text-stone-600 font-medium mb-2">
                        Or scan to pay directly to vendor ({upiId})
                      </p>
                      <img
                        src={qrCodeUrl}
                        alt="Vendor UPI QR Code"
                        className="w-36 h-36 rounded-xl border border-stone-200 shadow-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* UTR Submission Box */}
              <div className="pt-2 border-t border-stone-100">
                <p className="text-[11px] font-bold text-stone-800 mb-1">
                  Already paid via UPI?
                </p>
                <p className="text-[10px] text-stone-500 mb-2">
                  Enter your 12-digit UPI Reference / UTR number for faster verification:
                </p>

                {utrSuccess ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>UTR submitted! Stall owner will verify and mark paid.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitUtr} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 428198765432"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      maxLength={16}
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!utrInput.trim() || submittingUtr}
                      className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{submittingUtr ? 'Saving...' : 'Submit'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* STATUS STEPPER */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-3xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-4">
              Live Progress
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {/* Step 1: Received */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep >= 0
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  ✓
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">Order Received</h5>
                  <p className="text-[11px] text-stone-500">
                    Order confirmed and sent to kitchen printer/KDS.
                  </p>
                </div>
              </div>

              {/* Step 2: Preparing */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep >= 1
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : currentStep === 0
                      ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-100'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {currentStep >= 1 ? '✓' : '2'}
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    Preparing Food
                    {currentStep === 1 && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded-md">
                        In Progress
                      </span>
                    )}
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    Chef is crafting your items fresh on the grill/stove.
                  </p>
                </div>
              </div>

              {/* Step 3: Ready */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep >= 2
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-bounce'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {currentStep >= 2 ? '✓' : '3'}
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">
                    Ready for {isDineIn ? 'Serving' : 'Pickup'}
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    {isDineIn
                      ? `Delivering hot to ${order.deliveryAddress || 'your table'}.`
                      : `Hot and packaged at ${queue.counterNumber || 'Counter 1'}.`}
                  </p>
                </div>
              </div>

              {/* Step 4: Completed */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep >= 3
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {currentStep >= 3 ? '✓' : '4'}
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">Completed</h5>
                  <p className="text-[11px] text-stone-500">Order fulfilled. Enjoy your meal!</p>
                </div>
              </div>
            </div>
          </div>

          {/* ORDER TYPE & TIMING CARD */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-stone-100">
              <span className="text-stone-500 font-medium">Order Type</span>
              <span className="font-bold flex items-center gap-1.5 text-stone-900">
                {isDineIn && <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />}
                {isTakeout && <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />}
                {isDelivery && <Truck className="h-3.5 w-3.5 text-purple-600" />}
                {isDineIn ? `Dine-In (${order.deliveryAddress || 'Table'})` : isTakeout ? 'Stall Pickup' : 'Delivery'}
              </span>
            </div>

            {order.deliveryDate && (
              <div className="flex items-center justify-between text-xs pb-3 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Scheduled Time</span>
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  {order.deliveryDate}
                </span>
              </div>
            )}

            {order.deliveryAddress && !isDineIn && (
              <div className="flex items-start justify-between text-xs pb-3 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Address</span>
                <span className="font-medium text-stone-800 text-right max-w-[200px] flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  {order.deliveryAddress}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Payment Status</span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.paymentStatus || 'UNPAID'} ({order.paymentMethod || 'COD'})
              </span>
            </div>
          </div>

          {/* ITEMIZED ORDER SUMMARY */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-3">
              Items Ordered ({order.items.reduce((s, i) => s + (i.qty || 1), 0)})
            </h4>

            <div className="divide-y divide-stone-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-800 font-bold flex items-center justify-center text-[11px]">
                      {item.qty}×
                    </span>
                    <span className="font-semibold text-stone-900">{item.name}</span>
                  </div>
                  <span className="font-bold text-stone-900">
                    {currencySymbol}
                    {((item.price || 0) * (item.qty || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="mt-3 p-2.5 bg-stone-50 rounded-xl text-[11px] text-stone-600 border border-stone-200/60">
                <span className="font-bold text-stone-700 block mb-0.5">Special Instructions:</span>
                {order.notes}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-dashed border-stone-200 flex items-center justify-between text-sm font-black text-stone-900">
              <span>Total Amount</span>
              <span className="text-base text-emerald-700">
                {currencySymbol}{order.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* WHATSAPP & ACTIONS */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Ask Shop on WhatsApp</span>
            </button>

            {order.businessPhone && (
              <a
                href={`tel:${order.businessPhone.replace(/\D/g, '')}`}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call {order.businessName}</span>
              </a>
            )}
          </div>
        </div>

        {/* Footer timestamp */}
        <div className="p-4 text-center text-[10px] text-stone-400">
          Last checked: {lastRefreshed.toLocaleTimeString()} • Powered by Commerce OS
        </div>
      </div>
    </div>
  );
}

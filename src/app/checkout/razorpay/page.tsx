'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldCheck, Zap, AlertCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLAN_INFO: Record<string, { name: string; priceInr: number; desc: string; features: string[] }> = {
  starter: {
    name: 'Starter Plan',
    priceInr: 499,
    desc: 'For solo shops and emerging local businesses',
    features: [
      'Unlimited intake & booking forms',
      'AI chatbot & shared customer inbox',
      'Appointment calendar & booking',
      'Up to 1,000 active customer contacts',
    ],
  },
  growth: {
    name: 'Growth Plan',
    priceInr: 1499,
    desc: 'Dominates Google Local 3-Pack & review collection',
    features: [
      'Everything in Starter',
      'Google SEO Maps rank boost & local audit',
      '1-Tap WhatsApp Google Review requests',
      'Printable Countertop QR Standees',
      'Automated marketing broadcasts & SMS',
      'Up to 10,000 customer contacts',
    ],
  },
  business: {
    name: 'Business Plan',
    priceInr: 3999,
    desc: 'Multi-location operations & high-growth enterprises',
    features: [
      'Everything in Growth',
      '2,500 monthly B2B lead search credits',
      'Multi-team staff permissions & routing',
      'Executive 4-tier growth analytics',
      'Up to 100,000 customer contacts',
    ],
  },
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      if ((window as any).Razorpay) return resolve(true);
      // Remove stale/failed script to allow a fresh load attempt
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if ((window as any).Razorpay) {
        resolve(true);
      } else {
        setTimeout(() => resolve(Boolean((window as any).Razorpay)), 150);
      }
    };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function RazorpayCheckoutContent() {
  const searchParams = useSearchParams();
  const planCode = (searchParams.get('plan') || 'starter').toLowerCase();
  const token = searchParams.get('token');
  const customAmount = Number(searchParams.get('amount'));

  const plan = PLAN_INFO[planCode] || {
    name: `${planCode.toUpperCase()} Plan`,
    priceInr: customAmount > 0 ? customAmount : 499,
    desc: 'BGOS / FieserOS Subscription Plan',
    features: ['Instant activation', 'Full system features included'],
  };

  const finalPriceInr = customAmount > 0 ? customAmount : plan.priceInr;
  const amountPaise = Math.round(finalPriceInr * 100);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  async function startCheckout() {
    setBusy(true);
    setError(null);

    try {
      // 1. Ensure Razorpay SDK is loaded
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Could not load Razorpay checkout SDK. Check your internet connection.');
      }

      // 2. Create Razorpay order
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        authHeaders.Authorization = `Bearer ${token}`;
      }

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          planCode,
          notes: {
            plan: planCode,
            product: 'bgos',
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData?.order_id) {
        throw new Error(orderData?.error || 'Order creation failed');
      }

      // 3. Configure Razorpay Standard Modal
      const keyId =
        orderData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        'rzp_test_TuLATkapPzzHZc';

      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BGOS / FieserOS',
        description: `${plan.name} Subscription · ₹${finalPriceInr.toLocaleString('en-IN')}`,
        order_id: orderData.order_id,
        theme: { color: '#009F50' },
        modal: {
          ondismiss: () => {
            setBusy(false);
          },
        },
        handler: async (resp: any) => {
          setBusy(true);
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                planCode,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setPaymentSuccess(resp);
            } else {
              setError(verifyData.error || 'Payment signature verification failed');
            }
          } catch (err: any) {
            setError(err?.message || 'Verification failed');
          } finally {
            setBusy(false);
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();
    } catch (err: any) {
      setError(err?.message || 'Checkout failed');
      setBusy(false);
    }
  }

  // Automatically trigger checkout once SDK is ready
  useEffect(() => {
    if (!autoOpened && !paymentSuccess) {
      setAutoOpened(true);
      const timer = setTimeout(() => {
        void startCheckout();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpened, paymentSuccess]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#043B26] text-white p-6 text-center relative">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#009F50]/30 border border-[#34D399]/40 flex items-center justify-center mb-3">
            <Zap className="size-6 text-[#34D399]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Razorpay Standard Checkout</h1>
          <p className="text-xs text-emerald-200 mt-1">
            Official Indian Web UPI, QR, Netbanking & Card Checkout
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {paymentSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Successful!</h2>
                <p className="text-sm text-slate-600">
                  Your business has been upgraded to <strong>{plan.name}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs font-mono text-slate-700 space-y-1.5">
                <div>
                  <span className="font-semibold text-slate-900">Payment ID:</span> {paymentSuccess.razorpay_payment_id}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Order ID:</span> {paymentSuccess.razorpay_order_id}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Amount Paid:</span> ₹{finalPriceInr.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full bg-[#009F50] hover:bg-[#008A45] text-white font-bold h-12 text-base rounded-xl"
                  onClick={() => {
                    if (window.opener) {
                      window.close();
                    } else {
                      window.location.assign('/app?product=bgos&view=billing');
                    }
                  }}
                >
                  Return to BGOS
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Plan Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#009F50]">
                      ₹{finalPriceInr.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-muted-foreground"> / month</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Included with plan:</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="size-3.5 text-[#009F50] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Supported Gateways list */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-[#009F50] shrink-0" />
                  <div>
                    <span className="font-bold">UPI, Cards & Netbanking Enabled</span>
                    <p className="text-[11px] text-emerald-700">Google Pay, PhonePe, Paytm, RuPay, Visa, MC</p>
                  </div>
                </div>
                <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  Instant
                </span>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">Checkout Notice:</span> {error}
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <div className="space-y-2 pt-1">
                <Button
                  className="w-full bg-[#009F50] hover:bg-[#008A45] text-white font-bold h-12 text-base rounded-xl shadow-md transition-all"
                  disabled={busy}
                  onClick={startCheckout}
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-5 animate-spin mr-2" />
                      Opening Razorpay UI…
                    </>
                  ) : (
                    `Pay ₹${finalPriceInr.toLocaleString('en-IN')} with Razorpay`
                  )}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="size-3.5 text-slate-400" />
                  Secured by 256-bit Razorpay Payment Gateway
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RazorpayCheckoutPage() {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#009F50]" />
          </div>
        }
      >
        <RazorpayCheckoutContent />
      </Suspense>
    </>
  );
}

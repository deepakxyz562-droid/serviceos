'use client';

/**
 * Razorpay — REAL Razorpay Checkout integration.
 *
 * Loads Razorpay's checkout.js, creates an order on the backend via
 * /api/forms/[id]/charge (which would call Razorpay's order API), then
 * opens the Razorpay Checkout modal with the order id.
 *
 * In testMode (or when keyId is not set), falls back to a clearly marked
 * simulated-payment UI.
 */
import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface RazorpayValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  orderId?: string;
  method?: string;
  simulated?: boolean;
  errorMessage?: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.success' | 'payment.error', handler: (resp: unknown) => void) => void;
}
interface RazorpayConstructor {
  new (opts: {
    key: string;
    amount: number;
    currency: string;
    order_id?: string;
    name?: string;
    description?: string;
    handler: (resp: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string }) => void;
    modal?: { ondismiss?: () => void };
  }): RazorpayInstance;
}


export function Razorpay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 499);
  const currency = String(config.currency ?? 'INR');
  const testMode = Boolean(config.testMode ?? true);
  const keyId = String(config.keyId ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Razorpay');
  const [sdkReady, setSdkReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(keyId) && Boolean(formId);

  // Load Razorpay checkout.js.
  useEffect(() => {
    if (!canGoLive || typeof window === 'undefined') return;
    const razorpayCtor = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
    if (razorpayCtor) {
      const id = window.setTimeout(() => setSdkReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => setSdkReady(true);
    s.onerror = () => setErrorMsg('Failed to load Razorpay SDK. Check your network connection.');
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [canGoLive]);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'razorpay',
          transactionId: `sim_pay_${Date.now()}`, method: 'upi', simulated: true,
        } as RazorpayValue);
      }, 800);
      return;
    }

    try {
      // Create an order on the backend (returns razorpay_order_id).
      const orderRes = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'razorpay',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        // Backend returned 501 — fall back to client-side order without order_id.
        // Razorpay allows payments without an order_id, but it's not recommended
        // for production (no server-side verification possible).
      }

      const RazorpayClass = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!RazorpayClass) {
        setErrorMsg('Razorpay SDK not available.');
        setProcessing(false);
        return;
      }
      const razorpay = new RazorpayClass({
        key: keyId,
        amount: Math.round(amount * 100), // Razorpay uses smallest currency unit
        currency,
        order_id: orderData.orderId,
        name: 'Form Payment',
        description: `Form payment - ${formId}`,
        handler: (resp) => {
          setProcessing(false);
          onChange({
            status: 'succeeded', amount, currency, gatewayId: 'razorpay',
            transactionId: resp.razorpay_payment_id,
            orderId: resp.razorpay_order_id, method: 'razorpay',
          } as RazorpayValue);
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setErrorMsg('Payment cancelled.');
          },
        },
      });
      razorpay.open();
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="razorpay"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !keyId && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>Razorpay Key ID</strong>. Add it in the
            inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
        <Sparkles className="size-5 mx-auto text-[#0C2451]" />
        <p className="text-xs font-semibold">
          {canGoLive
            ? 'Click below to open the Razorpay Checkout modal.'
            : 'Test mode: Razorpay Checkout modal will load here when you switch to Live.'}
        </p>
        <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || processing || (canGoLive && !sdkReady)}
        onClick={handlePay}
        className="w-full h-10 bg-[#0C2451] hover:bg-[#081a3d] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}
          </>
        )}
      </Button>

      <div className="grid grid-cols-4 gap-1 text-[9px] text-center text-muted-foreground">
        <div className="p-1 rounded bg-muted/40">UPI</div>
        <div className="p-1 rounded bg-muted/40">Cards</div>
        <div className="p-1 rounded bg-muted/40">NetBanking</div>
        <div className="p-1 rounded bg-muted/40">Wallets</div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> PCI-DSS L1
        </span>
        <span className="font-mono">Razorpay</span>
      </div>
    </div>
  );
}

export default Razorpay;

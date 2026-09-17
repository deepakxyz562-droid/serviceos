'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface PayPalValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  orderId?: string;
  payerId?: string;
}

declare global { interface Window { paypal?: { Buttons: (cfg: unknown) => { render: (el: HTMLElement) => Promise<void> } } } }

export function PayPal({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'PayPal');
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (testMode || typeof window === 'undefined') return;
    if (window.paypal) {
      const id = window.setTimeout(() => setSdkReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=test&currency=${currency}`;
    s.async = true;
    s.onload = () => setSdkReady(true);
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [testMode, currency]);

  const [processing, setProcessing] = useState(false);
  const fallback = testMode || !sdkReady;

  const handlePay = () => {
    if (disabled || fallback) return;
    setProcessing(true);
    const orderId = `PAYID-${Math.random().toString(36).slice(2, 14).toUpperCase()}`;
    setTimeout(() => {
      setProcessing(false);
      const next: PayPalValue = {
        status: 'succeeded', amount, currency, gatewayId: 'paypal_complete',
        orderId, payerId: `payer_${Math.random().toString(36).slice(2, 10)}`,
      };
      onChange(next);
    }, 900);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      {fallback ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Sparkles className="size-5 mx-auto text-[#003087]" />
          <p className="text-xs font-semibold">Test mode: PayPal Smart Buttons will load here in production.</p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      ) : (
        <Button type="button" disabled={disabled || processing} onClick={handlePay}
          className="w-full h-11 bg-[#FFC439] hover:bg-[#F4B400] text-[#003087] font-black text-xs rounded-xl gap-2">
          {processing ? <Loader2 className="size-4 animate-spin" /> : <span>Pay with PayPal — {amount.toFixed(2)} {currency}</span>}
        </Button>
      )}
      <div className="text-center text-[10px] text-muted-foreground">
        Or split into 4 interest-free payments of <strong>{(amount / 4).toFixed(2)} {currency}</strong> with Pay Later.
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Buyer Protection</span>
        <span className="font-mono">PayPal Secure</span>
      </div>
    </div>
  );
}

export default PayPal;

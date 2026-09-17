'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface RazorpayValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  method?: string;
}

export function Razorpay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 499);
  const currency = String(config.currency ?? 'INR');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Razorpay');
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    if (disabled) return;
    setProcessing(true);
    const tx = `pay_${Math.random().toString(36).slice(2, 14)}`;
    setTimeout(() => {
      setProcessing(false);
      const next: RazorpayValue = {
        status: 'succeeded', amount, currency, gatewayId: 'razorpay',
        transactionId: tx, method: 'upi',
      };
      onChange(next);
    }, 800);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#0C2451] text-white text-[10px] font-black flex items-center justify-center">R</div>
        <span className="text-xs font-bold">Razorpay Checkout</span>
      </div>
      {testMode ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Sparkles className="size-5 mx-auto text-[#0C2451]" />
          <p className="text-xs font-semibold">Test mode: Razorpay Checkout modal will load here in production.</p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      ) : null}
      <Button type="button" disabled={disabled || processing} onClick={handlePay}
        className="w-full h-10 bg-[#0C2451] hover:bg-[#081a3d] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}
      </Button>
      <div className="grid grid-cols-4 gap-1 text-[9px] text-center text-muted-foreground">
        <div className="p-1 rounded bg-muted/40">UPI</div>
        <div className="p-1 rounded bg-muted/40">Cards</div>
        <div className="p-1 rounded bg-muted/40">NetBanking</div>
        <div className="p-1 rounded bg-muted/40">Wallets</div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> PCI-DSS L1</span>
        <span className="font-mono">Razorpay</span>
      </div>
    </div>
  );
}

export default Razorpay;

'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface GooglePayValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function GooglePay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Google Pay');
  const [available, setAvailable] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // In production, this would call `PaymentsClient.isReadyToPay()`.
    const id = window.setTimeout(() => setAvailable(!testMode), 0);
    return () => window.clearTimeout(id);
  }, [testMode]);

  const handlePay = () => {
    if (disabled || !available) return;
    setProcessing(true);
    const tx = `gpay_${Math.random().toString(36).slice(2, 12)}`;
    setTimeout(() => {
      setProcessing(false);
      const next: GooglePayValue = {
        status: 'succeeded', amount, currency, gatewayId: 'google_pay', transactionId: tx,
      };
      onChange(next);
    }, 700);
  };

  if (!available) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1" aria-label={label}>
        <Sparkles className="size-5 mx-auto text-blue-600" />
        <p className="text-xs font-semibold">Test mode: Google Pay will load here in production on supported devices.</p>
        <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label={label}>
      <Button type="button" disabled={disabled || processing} onClick={handlePay}
        className="w-full h-11 bg-white hover:bg-slate-50 text-slate-900 border border-border font-semibold text-xs rounded-xl gap-2 shadow-xs">
        {processing ? <Loader2 className="size-4 animate-spin" /> : (
          <>
            <span className="font-black text-sm text-blue-600">G</span>
            <span className="font-bold text-red-500">o</span>
            <span className="font-bold text-yellow-500">o</span>
            <span className="font-black text-blue-600">g</span>
            <span className="font-bold text-green-600">l</span>
            <span className="font-bold text-red-500">e</span>
            <span className="ml-1">Pay {amount.toFixed(2)} {currency}</span>
          </>
        )}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Tokenized card</span>
        <span className="font-mono">Google Pay</span>
      </div>
    </div>
  );
}

export default GooglePay;

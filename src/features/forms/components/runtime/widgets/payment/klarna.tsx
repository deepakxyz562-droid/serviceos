'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface KlarnaValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function Klarna({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Klarna');
  const [processing, setProcessing] = useState(false);
  const fallback = testMode;

  const handlePay = () => {
    if (disabled || fallback) return;
    setProcessing(true);
    const tx = `klarna_${Math.random().toString(36).slice(2, 14)}`;
    setTimeout(() => {
      setProcessing(false);
      const next: KlarnaValue = {
        status: 'succeeded', amount, currency, gatewayId: 'klarna', transactionId: tx,
      };
      onChange(next);
    }, 800);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="p-3 rounded-xl bg-[#FFA8CD]/20 border border-[#FFA8CD]">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-2">
          <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> 4 Interest-Free Payments</span>
          <span className="text-[#171A20] font-black">{(amount / 4).toFixed(2)} {currency} / 2 weeks</span>
        </div>
      </div>
      {fallback && (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center">
          <Sparkles className="size-4 mx-auto text-[#FFA8CD]" />
          <p className="text-xs font-semibold mt-1">Test mode: Klarna widget will load here in production.</p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      )}
      <Button type="button" disabled={disabled || processing || fallback} onClick={handlePay}
        className="w-full h-10 bg-[#171A20] hover:bg-black text-[#FFA8CD] font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <>Pay with Klarna ({amount.toFixed(2)} {currency})</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Soft credit check</span>
        <span className="font-mono">Klarna</span>
      </div>
    </div>
  );
}

export default Klarna;

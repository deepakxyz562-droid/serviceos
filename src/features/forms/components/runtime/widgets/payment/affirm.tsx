'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface AffirmValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function Affirm({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 299);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Affirm');
  const [processing, setProcessing] = useState(false);
  const fallback = testMode;

  const monthly = (amount / 4).toFixed(2);

  const handlePay = () => {
    if (disabled || fallback) return;
    setProcessing(true);
    const tx = `affirm_${Math.random().toString(36).slice(2, 14)}`;
    setTimeout(() => {
      setProcessing(false);
      const next: AffirmValue = {
        status: 'succeeded', amount, currency, gatewayId: 'affirm', transactionId: tx,
      };
      onChange(next);
    }, 800);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="p-3 rounded-xl bg-[#0FA0EA]/10 border border-[#0FA0EA]/40">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
          <span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-[#0FA0EA]" /> Pay over time with Affirm</span>
          <span className="text-[#0FA0EA] font-black">as low as {monthly} {currency}/mo</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Soft credit check • No late fees • No prepayment penalties</p>
      </div>
      {fallback && (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center">
          <Sparkles className="size-4 mx-auto text-[#0FA0EA]" />
          <p className="text-xs font-semibold mt-1">Test mode: Affirm widget will load here in production.</p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      )}
      <Button type="button" disabled={disabled || processing || fallback} onClick={handlePay}
        className="w-full h-10 bg-[#0FA0EA] hover:bg-[#0c8bc7] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <>Checkout with Affirm</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Transparent terms</span>
        <span className="font-mono">Affirm</span>
      </div>
    </div>
  );
}

export default Affirm;

'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Sparkles, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface ApplePayValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

function isAppleDevice() {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent) &&
    (window as unknown as { ApplePaySession?: unknown }).ApplePaySession !== undefined;
}

export function ApplePay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Apple Pay');
  const [available, setAvailable] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setAvailable(isAppleDevice() && !testMode), 0);
    return () => window.clearTimeout(id);
  }, [testMode]);

  const handlePay = () => {
    if (disabled || !available) return;
    setProcessing(true);
    const tx = `applepay_${Math.random().toString(36).slice(2, 12)}`;
    setTimeout(() => {
      setProcessing(false);
      const next: ApplePayValue = {
        status: 'succeeded', amount, currency, gatewayId: 'apple_pay', transactionId: tx,
      };
      onChange(next);
    }, 700);
  };

  if (!available) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1" aria-label={label}>
        <Sparkles className="size-5 mx-auto text-slate-700 dark:text-slate-300" />
        <p className="text-xs font-semibold">Test mode: Apple Pay will appear on supported Apple devices in production.</p>
        <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label={label}>
      <Button type="button" disabled={disabled || processing} onClick={handlePay}
        className="w-full h-12 bg-black hover:bg-neutral-900 text-white font-semibold text-sm rounded-xl gap-2">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <><Apple className="size-5" /> Pay {amount.toFixed(2)} {currency}</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Touch ID / Face ID</span>
        <span className="font-mono">Apple Pay</span>
      </div>
    </div>
  );
}

export default ApplePay;

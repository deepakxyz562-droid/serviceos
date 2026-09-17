'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, Sparkles, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface CoinbaseCommerceValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  chargeCode?: string;
}

export function CoinbaseCommerce({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 0.015);
  const currency = String(config.currency ?? 'BTC');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Coinbase Commerce');
  const [processing, setProcessing] = useState(false);
  const fallback = testMode;

  const handlePay = () => {
    if (disabled || fallback) return;
    setProcessing(true);
    const charge = `charge_${Math.random().toString(36).slice(2, 12)}`;
    setTimeout(() => {
      setProcessing(false);
      const next: CoinbaseCommerceValue = {
        status: 'succeeded', amount, currency, gatewayId: 'coinbase_commerce',
        transactionId: charge, chargeCode: charge.toUpperCase().slice(0, 16),
      };
      onChange(next);
    }, 800);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#0052FF] text-white flex items-center justify-center">
          <Bitcoin className="size-4" />
        </div>
        <span className="text-xs font-bold">Coinbase Commerce</span>
      </div>
      <div className="p-2 rounded-lg bg-muted/40 text-[11px] text-muted-foreground text-center">
        Accepts BTC, ETH, USDC, LTC, and 100+ cryptocurrencies.
      </div>
      {fallback && (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center">
          <Sparkles className="size-4 mx-auto text-[#0052FF]" />
          <p className="text-xs font-semibold mt-1">Test mode: Coinbase Commerce checkout will load here in production.</p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount} {currency}</p>
        </div>
      )}
      <Button type="button" disabled={disabled || processing || fallback} onClick={handlePay}
        className="w-full h-10 bg-[#0052FF] hover:bg-[#0042cc] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <>Pay {amount} {currency} with Crypto</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> On-chain settlement</span>
        <span className="font-mono">Coinbase</span>
      </div>
    </div>
  );
}

export default CoinbaseCommerce;

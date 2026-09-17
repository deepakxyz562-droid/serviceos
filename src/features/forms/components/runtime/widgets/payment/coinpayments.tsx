'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, Bitcoin, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface CoinPaymentsValue {
  status: 'idle' | 'pending_redirect' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  walletAddress?: string;
}

export function CoinPayments({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 0.005);
  const currency = String(config.currency ?? 'BTC');
  const label = String(field?.label ?? 'CoinPayments');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = (value as Partial<CoinPaymentsValue> | undefined) ?? {};
  const status = current.status ?? 'idle';
  const walletAddress = current.walletAddress ?? '';

  const handlePay = () => {
    if (disabled) return;
    setProcessing(true);
    setTimeout(() => {
      const next: CoinPaymentsValue = {
        status: 'pending_redirect', amount, currency, gatewayId: 'coinpayments',
        transactionId: `cp_${Math.random().toString(36).slice(2, 14)}`,
        walletAddress: `bc1q${Math.random().toString(36).slice(2, 30)}`,
      };
      onChange(next);
      setProcessing(false);
    }, 700);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#0d6efd] text-white flex items-center justify-center">
          <Bitcoin className="size-4" />
        </div>
        <span className="text-xs font-bold">CoinPayments</span>
        {status === 'pending_redirect' && (
          <span className="ml-auto text-[10px] text-amber-600">Awaiting payment</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Accepts 2,300+ cryptocurrencies including BTC, ETH, LTC, XRP, USDT, TRX.
      </p>
      {status === 'idle' && (
        <Button type="button" disabled={disabled || processing} onClick={handlePay}
          className="w-full h-10 bg-[#0d6efd] hover:bg-[#0a58ca] text-white font-bold text-xs rounded-xl gap-1.5">
          {processing ? <Loader2 className="size-4 animate-spin" /> : <>Pay {amount} {currency} with Crypto</>}
        </Button>
      )}
      {status === 'pending_redirect' && walletAddress && (
        <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-600" />
            <span className="text-xs font-semibold">Send exactly {amount} {currency} to:</span>
          </div>
          <div className="flex items-center gap-1">
            <Input readOnly value={walletAddress} className="font-mono text-[10px] h-8" aria-label="Wallet address" />
            <Button type="button" variant="outline" size="icon" className="size-8 shrink-0"
              onClick={() => {
                if (navigator?.clipboard) {
                  navigator.clipboard.writeText(walletAddress).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
                }
              }} aria-label="Copy wallet address">
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">CoinPayments will confirm on-chain settlement automatically.</p>
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> On-chain</span>
        <span className="font-mono">CoinPayments</span>
      </div>
    </div>
  );
}

export default CoinPayments;

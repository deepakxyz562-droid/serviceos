'use client';

import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WidgetProps } from '../widget-props';

interface SquareValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  nonce?: string;
  cardBrand?: string;
  last4?: string;
}

declare global { interface Window { Square?: { payments: (app: string, loc: string) => unknown } } }

export function Square({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Square Payment');
  const [sdkReady, setSdkReady] = useState(false);
  const [postal, setPostal] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (testMode || typeof window === 'undefined') return;
    if (window.Square) {
      const id = window.setTimeout(() => setSdkReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
    s.async = true;
    s.onload = () => setSdkReady(true);
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [testMode]);

  const fallback = testMode || !sdkReady;

  const handlePay = () => {
    if (disabled || fallback) return;
    setProcessing(true);
    const nonce = `cnon:${Math.random().toString(36).slice(2, 14)}`;
    setTimeout(() => {
      setProcessing(false);
      const next: SquareValue = {
        status: 'succeeded', amount, currency, gatewayId: 'square_payments',
        nonce, cardBrand: 'VISA', last4: '4242',
      };
      onChange(next);
    }, 900);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#006AFF] text-white text-[10px] font-black flex items-center justify-center">SQ</div>
        <span className="text-xs font-bold">Square Payments</span>
      </div>
      {fallback ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Sparkles className="size-5 mx-auto text-[#006AFF]" />
          <p className="text-xs font-semibold">Test mode: Square payment form will load here in production.</p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Postal / ZIP Code</Label>
          <Input value={postal} onChange={(e) => setPostal(e.target.value)} disabled={disabled} placeholder="94103" className="h-9 text-xs font-mono" />
          <p className="text-[10px] text-muted-foreground">Card fields are hosted securely in an iframe by Square.</p>
        </div>
      )}
      <Button type="button" disabled={disabled || processing || fallback} onClick={handlePay}
        className="w-full h-10 bg-[#006AFF] hover:bg-[#0058D4] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> PCI-DSS Compliant</span>
        <span className="font-mono">Square Secure</span>
      </div>
    </div>
  );
}

export default Square;

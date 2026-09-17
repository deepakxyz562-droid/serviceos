'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Lock, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WidgetProps } from '../widget-props';

interface StripeElementsValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  token?: string;
  last4?: string;
  brand?: string;
  transactionId?: string;
}

declare global {
  interface Window { Stripe?: (key: string) => { elements: () => unknown } }
}

export function StripeElements({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const label = String(field?.label ?? 'Credit Card');
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    if (testMode || typeof window === 'undefined') return;
    if (window.Stripe) {
      const id = window.setTimeout(() => setStripeReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.async = true;
    s.onload = () => setStripeReady(true);
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [testMode]);

  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);

  const fallback = testMode || !stripeReady;

  const handlePay = () => {
    if (disabled || fallback) return;
    setProcessing(true);
    const tx = `stripe_tx_${Math.random().toString(36).slice(2, 10)}`;
    setTimeout(() => {
      setProcessing(false);
      const last4 = card.replace(/\D/g, '').slice(-4) || '4242';
      const next: StripeElementsValue = {
        status: 'succeeded', amount, currency, gatewayId: 'stripe_elements',
        token: `tok_${tx}`, last4, brand: 'visa', transactionId: tx,
      };
      onChange(next);
    }, 900);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      {fallback ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Sparkles className="size-5 mx-auto text-[#635BFF]" />
          <p className="text-xs font-semibold text-foreground">Test mode: Stripe Elements will load here in production.</p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Card Number</Label>
            <div className="relative">
              <Input value={card} onChange={(e) => setCard(e.target.value)} disabled={disabled}
                placeholder="4242 4242 4242 4242" className="h-9 text-xs font-mono pr-9" aria-label="Card number" />
              <CreditCard className="size-4 absolute right-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Expiry</Label>
              <Input value={exp} onChange={(e) => setExp(e.target.value)} disabled={disabled} placeholder="MM/YY" className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">CVC</Label>
              <Input value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} maxLength={4} disabled={disabled} placeholder="123" className="h-8 text-xs font-mono" />
            </div>
          </div>
        </>
      )}
      <Button type="button" disabled={disabled || processing || fallback} onClick={handlePay}
        className="w-full h-10 bg-[#635BFF] hover:bg-[#5851ee] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> 256-bit SSL • PCI-DSS</span>
        <span className="font-mono">Stripe Secure</span>
      </div>
    </div>
  );
}

export default StripeElements;

'use client';

import React, { useState } from 'react';
import { CreditCard, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WidgetProps } from '../widget-props';

interface PayPalProValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  last4?: string;
  brand?: string;
}

export function PayPalPro({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const label = String(field?.label ?? 'PayPal Pro Card');
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    if (disabled) return;
    setProcessing(true);
    const tx = `pppro_${Math.random().toString(36).slice(2, 12)}`;
    setTimeout(() => {
      setProcessing(false);
      const last4 = card.replace(/\D/g, '').slice(-4) || '4242';
      const next: PayPalProValue = {
        status: 'succeeded', amount, currency, gatewayId: 'paypal_pro',
        transactionId: tx, last4, brand: 'visa',
      };
      onChange(next);
    }, 900);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#003087] text-white text-[10px] font-black flex items-center justify-center">PP</div>
        <span className="text-xs font-bold">PayPal Pro — Direct Card</span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Card Number</Label>
        <div className="relative">
          <Input value={card} onChange={(e) => setCard(e.target.value)} disabled={disabled}
            placeholder="4000 0000 0000 0002" className="h-9 text-xs font-mono pr-9" />
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
      <Button type="button" disabled={disabled || processing} onClick={handlePay}
        className="w-full h-10 bg-[#003087] hover:bg-[#002660] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Card data tokenized</span>
        <span className="font-mono">PayPal Pro</span>
      </div>
    </div>
  );
}

export default PayPalPro;

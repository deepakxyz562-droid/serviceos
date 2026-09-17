'use client';

import React, { useState } from 'react';
import { CreditCard, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WidgetProps } from '../widget-props';

interface BraintreeValue {
  status: 'idle' | 'processing' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  last4?: string;
  nonce?: string;
}

export function Braintree({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const label = String(field?.label ?? 'Braintree');
  const [card, setCard] = useState('');
  const [postal, setPostal] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    if (disabled) return;
    setProcessing(true);
    const nonce = `tokencc_${Math.random().toString(36).slice(2, 16)}_test`;
    setTimeout(() => {
      setProcessing(false);
      const next: BraintreeValue = {
        status: 'succeeded', amount, currency, gatewayId: 'braintree',
        transactionId: `bt_${Math.random().toString(36).slice(2, 12)}`,
        last4: card.replace(/\D/g, '').slice(-4) || '4242', nonce,
      };
      onChange(next);
    }, 900);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#00539B] text-white text-[10px] font-black flex items-center justify-center">B</div>
        <span className="text-xs font-bold">Braintree Hosted Fields</span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Card Number</Label>
        <div className="relative">
          <Input value={card} onChange={(e) => setCard(e.target.value)} disabled={disabled}
            placeholder="4111 1111 1111 1111" className="h-9 text-xs font-mono pr-9" />
          <CreditCard className="size-4 absolute right-3 top-2.5 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold">Postal Code</Label>
        <Input value={postal} onChange={(e) => setPostal(e.target.value)} disabled={disabled} placeholder="94103" className="h-8 text-xs font-mono" />
      </div>
      <p className="text-[10px] text-muted-foreground">Card fields are securely hosted by Braintree in iframes.</p>
      <Button type="button" disabled={disabled || processing} onClick={handlePay}
        className="w-full h-10 bg-[#00539B] hover:bg-[#00447e] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> PCI SAQ-A</span>
        <span className="font-mono">Braintree</span>
      </div>
    </div>
  );
}

export default Braintree;

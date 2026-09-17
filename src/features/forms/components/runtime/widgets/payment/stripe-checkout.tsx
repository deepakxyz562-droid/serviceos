'use client';

import React, { useState } from 'react';
import { ExternalLink, Lock, ShieldCheck, Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { WidgetProps } from '../widget-props';

interface StripeCheckoutValue {
  status: 'idle' | 'pending_redirect' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function StripeCheckout({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const label = String(field?.label ?? 'Pay with Stripe Checkout');
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleConfirm = () => {
    setProcessing(true);
    setTimeout(() => {
      const next: StripeCheckoutValue = {
        status: 'pending_redirect', amount, currency, gatewayId: 'stripe_checkout',
        transactionId: `stripe_co_${Math.random().toString(36).slice(2, 10)}`,
      };
      onChange(next);
      setProcessing(false);
      setOpen(false);
    }, 700);
  };

  const currentValue = value as StripeCheckoutValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
        <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[#635BFF] mb-2">
          <Lock className="size-4 text-white" />
        </div>
        <p className="text-xs font-semibold">Stripe Hosted Checkout</p>
        <p className="text-[11px] text-muted-foreground">Secure redirect to Stripe&apos;s optimized payment page.</p>
      </div>
      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          Checkout session created — Ref: {currentValue?.transactionId}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" disabled={disabled} className="w-full h-10 bg-[#635BFF] hover:bg-[#5851ee] text-white font-bold text-xs gap-1.5">
            <ShoppingCart className="size-4" /> Pay {amount.toFixed(2)} {currency} with Stripe
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Redirect to Stripe Checkout?</DialogTitle>
            <DialogDescription className="text-xs">
              You will be redirected to Stripe&apos;s secure hosted page to complete your payment of <strong>{amount.toFixed(2)} {currency}</strong>. You may be returned here automatically after the transaction.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={processing} className="text-xs">Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={processing} className="bg-[#635BFF] hover:bg-[#5851ee] text-white text-xs gap-1">
              {processing ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />} Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> SSL Encrypted</span>
        <span className="font-mono">Stripe Hosted</span>
      </div>
    </div>
  );
}

export default StripeCheckout;

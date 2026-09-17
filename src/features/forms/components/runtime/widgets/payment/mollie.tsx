'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { WidgetProps } from '../widget-props';

interface MollieValue {
  status: 'idle' | 'pending_redirect' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function Mollie({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'EUR');
  const label = String(field?.label ?? 'Mollie');
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleConfirm = () => {
    setProcessing(true);
    setTimeout(() => {
      const next: MollieValue = {
        status: 'pending_redirect', amount, currency, gatewayId: 'mollie',
        transactionId: `moll_${Math.random().toString(36).slice(2, 14)}`,
      };
      onChange(next);
      setProcessing(false);
      setOpen(false);
    }, 700);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center">M</div>
        <span className="text-xs font-bold">Mollie</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Redirects to Mollie&apos;s checkout. Supports iDEAL, Bancontact, SEPA, cards, and more.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" disabled={disabled}
            className="w-full h-10 bg-[#1A1A1A] hover:bg-black text-white font-bold text-xs rounded-xl gap-1.5">
            Pay {amount.toFixed(2)} {currency} with Mollie
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Redirect to Mollie?</DialogTitle>
            <DialogDescription className="text-xs">
              You will be redirected to Mollie&apos;s secure checkout page to complete your payment of <strong>{amount.toFixed(2)} {currency}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={processing} className="text-xs">Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={processing} className="bg-[#1A1A1A] hover:bg-black text-white text-xs gap-1">
              {processing ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />} Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> SSL Encrypted</span>
        <span className="font-mono">Mollie</span>
      </div>
    </div>
  );
}

export default Mollie;

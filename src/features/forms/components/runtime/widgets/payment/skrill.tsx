'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { WidgetProps } from '../widget-props';

interface SkrillValue {
  status: 'idle' | 'pending_redirect' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function Skrill({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 29);
  const currency = String(config.currency ?? 'EUR');
  const label = String(field?.label ?? 'Skrill');
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const current = (value as Partial<SkrillValue> | undefined) ?? {};
  const status = current.status ?? 'idle';

  const handleConfirm = () => {
    setProcessing(true);
    setTimeout(() => {
      const next: SkrillValue = {
        status: 'pending_redirect', amount, currency, gatewayId: 'skrill',
        transactionId: `skr_${Math.random().toString(36).slice(2, 14)}`,
      };
      onChange(next);
      setProcessing(false);
      setOpen(false);
    }, 700);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#862165] text-white flex items-center justify-center">
          <Wallet className="size-4" />
        </div>
        <span className="text-xs font-bold">Skrill</span>
        {status === 'pending_redirect' && (
          <span className="ml-auto text-[10px] text-amber-600">Pending redirect</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Digital wallet supporting 40+ currencies and instant transfers worldwide.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" disabled={disabled}
            className="w-full h-10 bg-[#862165] hover:bg-[#6f1a52] text-white font-bold text-xs rounded-xl gap-1.5">
            Pay {amount.toFixed(2)} {currency} with Skrill
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Redirect to Skrill?</DialogTitle>
            <DialogDescription className="text-xs">
              You will be redirected to Skrill to complete payment of <strong>{amount.toFixed(2)} {currency}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={processing} className="text-xs">Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={processing} className="bg-[#862165] hover:bg-[#6f1a52] text-white text-xs gap-1">
              {processing ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />} Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Wallet</span>
        <span className="font-mono">Skrill</span>
      </div>
    </div>
  );
}

export default Skrill;

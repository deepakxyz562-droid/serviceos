'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { WidgetProps } from '../widget-props';

interface AfterpayValue {
  status: 'idle' | 'pending_redirect' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function Afterpay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'USD');
  const label = String(field?.label ?? 'Afterpay');
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleConfirm = () => {
    setProcessing(true);
    setTimeout(() => {
      const next: AfterpayValue = {
        status: 'pending_redirect', amount, currency, gatewayId: 'afterpay',
        transactionId: `ap_${Math.random().toString(36).slice(2, 14)}`,
      };
      onChange(next);
      setProcessing(false);
      setOpen(false);
    }, 700);
  };

  const installment = (amount / 4).toFixed(2);

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="p-3 bg-[#B2FCE4]/30 border border-[#B2FCE4] rounded-xl">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-2">
          <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> 4 Payments, Interest-Free</span>
          <span className="text-[#00A870] font-black">{installment} {currency} / 2 wks</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 font-semibold text-emerald-800 dark:text-emerald-300">
            Today<br />{installment}
          </div>
          <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground">2 Wks<br />{installment}</div>
          <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground">4 Wks<br />{installment}</div>
          <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground">6 Wks<br />{installment}</div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" disabled={disabled}
            className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-[#B2FCE4] font-bold text-xs rounded-xl gap-1.5">
            Pay with Afterpay / Clearpay
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Redirect to Afterpay?</DialogTitle>
            <DialogDescription className="text-xs">
              You will be redirected to Afterpay to approve 4 interest-free payments of <strong>{installment} {currency}</strong> (total {amount.toFixed(2)} {currency}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={processing} className="text-xs">Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={processing} className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1">
              {processing ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />} Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> 0% interest</span>
        <span className="font-mono">Afterpay</span>
      </div>
    </div>
  );
}

export default Afterpay;

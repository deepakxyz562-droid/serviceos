'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { WidgetProps } from '../widget-props';

interface MercadoPagoValue {
  status: 'idle' | 'pending_redirect' | 'succeeded';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
}

export function MercadoPago({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 149);
  const currency = String(config.currency ?? 'MXN');
  const label = String(field?.label ?? 'Mercado Pago');
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const current = (value as Partial<MercadoPagoValue> | undefined) ?? {};
  const status = current.status ?? 'idle';

  const handleConfirm = () => {
    setProcessing(true);
    setTimeout(() => {
      const next: MercadoPagoValue = {
        status: 'pending_redirect', amount, currency, gatewayId: 'mercado_pago',
        transactionId: `mp_${Math.random().toString(36).slice(2, 14)}`,
      };
      onChange(next);
      setProcessing(false);
      setOpen(false);
    }, 700);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-md bg-[#009ee3] text-white flex items-center justify-center">
          <CreditCard className="size-4" />
        </div>
        <span className="text-xs font-bold">Mercado Pago</span>
        {status === 'pending_redirect' && (
          <span className="ml-auto text-[10px] text-amber-600">Pending redirect</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Latam wallet &amp; processor — cards, Pix, OXXO, PSE and installment payments.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" disabled={disabled}
            className="w-full h-10 bg-[#009ee3] hover:bg-[#0089c2] text-white font-bold text-xs rounded-xl gap-1.5">
            Pagar {amount.toFixed(2)} {currency} con Mercado Pago
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Redirect to Mercado Pago?</DialogTitle>
            <DialogDescription className="text-xs">
              You will be redirected to Mercado Pago to complete payment of <strong>{amount.toFixed(2)} {currency}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={processing} className="text-xs">Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={processing} className="bg-[#009ee3] hover:bg-[#0089c2] text-white text-xs gap-1">
              {processing ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />} Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Latam</span>
        <span className="font-mono">MercadoPago</span>
      </div>
    </div>
  );
}

export default MercadoPago;

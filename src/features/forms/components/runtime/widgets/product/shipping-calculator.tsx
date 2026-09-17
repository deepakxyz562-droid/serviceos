'use client';

import React, { useMemo, useState } from 'react';
import { Truck, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { WidgetProps } from '../widget-props';

interface ShippingCalculatorValue {
  method: string;
  itemCount: number;
  flatRate: number;
  perItemRate: number;
  shipping: number;
  total: number;
  currency: string;
}

interface ShippingConfig {
  currency?: string;
  flatRate?: number;
  perItemRate?: number;
  subtotal?: number;
  itemCount?: number;
  methods?: string[];
  freeShippingThreshold?: number;
}

export function ShippingCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as ShippingConfig;
  const currency = String(cfg.currency ?? 'USD');
  const label = String(field?.label ?? 'Shipping Calculator');

  const existing = value as ShippingCalculatorValue | undefined;
  const [method, setMethod] = useState<string>(existing?.method || 'standard');
  const [itemCount, setItemCount] = useState<number>(existing?.itemCount ?? Number(cfg.itemCount ?? 1));
  const [subtotal, setSubtotal] = useState<number>(existing?.total ?? Number(cfg.subtotal ?? 0));
  const flatRate = Number(cfg.flatRate ?? 5.99);
  const perItemRate = Number(cfg.perItemRate ?? 1.5);
  const methods = cfg.methods || ['standard', 'express', 'overnight'];
  const freeThreshold = Number(cfg.freeShippingThreshold ?? 0);

  const { shipping, total, freeApplied } = useMemo(() => {
    let s: number;
    if (freeThreshold > 0 && subtotal >= freeThreshold) {
      s = 0;
    } else if (method === 'express') {
      s = +(flatRate * 2 + perItemRate * itemCount).toFixed(2);
    } else if (method === 'overnight') {
      s = +(flatRate * 4 + perItemRate * itemCount).toFixed(2);
    } else {
      s = +(flatRate + perItemRate * itemCount).toFixed(2);
    }
    return { shipping: s, total: +(subtotal + s).toFixed(2), freeApplied: s === 0 && freeThreshold > 0 && subtotal >= freeThreshold };
  }, [method, itemCount, subtotal, flatRate, perItemRate, freeThreshold]);

  React.useEffect(() => {
    const next: ShippingCalculatorValue = {
      method, itemCount, flatRate, perItemRate, shipping, total, currency,
    };
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, itemCount, shipping, total, currency, flatRate, perItemRate]);

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-1.5">
        <Truck className="size-4 text-blue-600" />
        <span className="text-xs font-bold">Shipping Calculator</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">Shipping Method</Label>
          <Select value={method} onValueChange={setMethod} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {methods.map((m) => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">Items</Label>
          <Input type="number" min={1} value={itemCount} onChange={(e) => setItemCount(Math.max(1, Number(e.target.value) || 1))} disabled={disabled} className="h-8 text-xs font-mono" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold">Subtotal ({currency})</Label>
        <Input type="number" min={0} value={subtotal} onChange={(e) => setSubtotal(Number(e.target.value) || 0)} disabled={disabled} className="h-8 text-xs font-mono" />
      </div>
      {freeThreshold > 0 && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Package className="size-3" /> Free shipping on orders over {freeThreshold.toFixed(2)} {currency}.
          {freeApplied && <span className="text-emerald-600 font-semibold"> — Applied!</span>}
        </p>
      )}
      <Separator />
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-mono font-bold text-foreground">{freeApplied ? 'FREE' : `${shipping.toFixed(2)} ${currency}`}</span></div>
        <div className="flex justify-between pt-1 border-t border-border/60"><span className="font-bold">Grand Total</span><span className="font-black text-emerald-600 dark:text-emerald-400">{total.toFixed(2)} {currency}</span></div>
      </div>
    </div>
  );
}

export default ShippingCalculator;

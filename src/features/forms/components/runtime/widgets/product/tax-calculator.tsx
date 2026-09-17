'use client';

import React, { useMemo, useState } from 'react';
import { Percent, Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { WidgetProps } from '../widget-props';

interface TaxCalculatorValue {
  subtotal: number;
  rate: number;
  rateType: 'percent' | 'flat';
  tax: number;
  total: number;
  currency: string;
  region?: string;
}

interface TaxConfig {
  currency?: string;
  rate?: number;
  rateType?: 'percent' | 'flat';
  subtotal?: number;
  region?: string;
  regionOptions?: string[];
}

export function TaxCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as TaxConfig;
  const currency = String(cfg.currency ?? 'USD');
  const label = String(field?.label ?? 'Tax Calculator');

  const existing = value as TaxCalculatorValue | undefined;
  const [subtotal, setSubtotal] = useState<number>(existing?.subtotal ?? Number(cfg.subtotal ?? 0));
  const [rate, setRate] = useState<number>(existing?.rate ?? Number(cfg.rate ?? 8.5));
  const [rateType, setRateType] = useState<'percent' | 'flat'>(existing?.rateType || cfg.rateType || 'percent');
  const [region, setRegion] = useState<string>(existing?.region || cfg.region || '');

  const regionOptions = cfg.regionOptions || ['US-CA', 'US-NY', 'US-TX', 'EU-DE', 'EU-FR', 'IN-GST', 'UK-VAT'];

  const { tax, total } = useMemo(() => {
    const t = rateType === 'percent' ? +(subtotal * rate / 100).toFixed(2) : Math.min(rate, subtotal);
    return { tax: t, total: +(subtotal - t).toFixed(2) };
  }, [subtotal, rate, rateType]);

  React.useEffect(() => {
    const next: TaxCalculatorValue = {
      subtotal, rate, rateType, tax, total, currency, region: region || undefined,
    };
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, rate, rateType, region, tax, total, currency]);

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-1.5">
        <Calculator className="size-4 text-blue-600" />
        <span className="text-xs font-bold">Tax Calculator</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">Subtotal ({currency})</Label>
          <Input type="number" min={0} value={subtotal} onChange={(e) => setSubtotal(Number(e.target.value) || 0)} disabled={disabled} className="h-8 text-xs font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">Region</Label>
          <Select value={region} onValueChange={setRegion} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              {regionOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">Rate Type</Label>
          <Select value={rateType} onValueChange={(v) => setRateType(v as 'percent' | 'flat')} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent (%)</SelectItem>
              <SelectItem value="flat">Flat amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">{rateType === 'percent' ? 'Rate (%)' : `Amount (${currency})`}</Label>
          <Input type="number" min={0} value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} disabled={disabled} className="h-8 text-xs font-mono" />
        </div>
      </div>
      <Separator />
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Percent className="size-3" /> Tax</span><span className="font-mono font-bold text-foreground">{tax.toFixed(2)} {currency}</span></div>
        <div className="flex justify-between pt-1 border-t border-border/60"><span className="font-bold">Total</span><span className="font-black text-emerald-600 dark:text-emerald-400">{total.toFixed(2)} {currency}</span></div>
      </div>
    </div>
  );
}

export default TaxCalculator;

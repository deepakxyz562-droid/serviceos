'use client';

import React from 'react';
import { ReceiptText, DollarSign, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WidgetProps, num, str } from '../widget-props';

interface ClosingCostLine {
  label: string;
  pct: number; // percentage of price
  amount: number;
  isFlat?: boolean; // when true, `pct` is treated as a flat dollar amount
}

interface ClosingCostValue {
  price: number;
  currency: string;
  lines: ClosingCostLine[];
  total: number;
  grandTotal: number; // price + closing costs
}

interface ClosingCostConfig {
  currency?: string;
  price?: number;
  defaultLines?: Array<{ label: string; pct: number; isFlat?: boolean }>;
}

const DEFAULT_LINES = [
  { label: 'Loan origination fee', pct: 1.0 },
  { label: 'Title insurance', pct: 0.5 },
  { label: 'Appraisal fee', pct: 0, isFlat: true, amount: 500 },
  { label: 'Recording fee', pct: 0, isFlat: true, amount: 125 },
  { label: 'Transfer tax', pct: 0.75 },
];

function computeLine(line: { label: string; pct: number; isFlat?: boolean; amount?: number }, price: number): ClosingCostLine {
  const isFlat = !!line.isFlat;
  const amount = isFlat ? (line.amount ?? line.pct ?? 0) : (price * (line.pct ?? 0)) / 100;
  return { label: line.label, pct: line.pct ?? 0, amount: +amount.toFixed(2), isFlat };
}

export function ClosingCostEstimator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Closing cost estimator');
  const cfg = config as unknown as ClosingCostConfig;
  const currency = str(cfg.currency, 'USD');
  const defaultPrice = num(cfg.price, 300000);

  const v: ClosingCostValue = value && typeof value === 'object'
    ? (value as ClosingCostValue)
    : (() => {
        const lines = (cfg.defaultLines && cfg.defaultLines.length ? cfg.defaultLines : DEFAULT_LINES)
          .map((l) => computeLine(l, defaultPrice));
        const total = +lines.reduce((s, l) => s + l.amount, 0).toFixed(2);
        return { price: defaultPrice, currency, lines, total, grandTotal: +(defaultPrice + total).toFixed(2) };
      })();

  const recompute = (price: number, lines: ClosingCostLine[]): ClosingCostValue => {
    const total = +lines.reduce((s, l) => s + l.amount, 0).toFixed(2);
    return { price, currency, lines, total, grandTotal: +(price + total).toFixed(2) };
  };

  const patchPrice = (price: number) => {
    const lines = v.lines.map((l) => {
      if (l.isFlat) return l;
      return { ...l, amount: +((price * l.pct) / 100).toFixed(2) };
    });
    onChange(recompute(price, lines));
  };

  const updateLine = (idx: number, patch: Partial<ClosingCostLine>) => {
    const lines = v.lines.map((l, i) => {
      if (i !== idx) return l;
      const merged = { ...l, ...patch };
      const price = v.price;
      if (merged.isFlat) {
        merged.amount = +(patch.pct ?? l.pct ?? 0).toFixed(2);
      } else {
        merged.amount = +((price * (merged.pct ?? 0)) / 100).toFixed(2);
      }
      return merged;
    });
    onChange(recompute(v.price, lines));
  };

  const addLine = () => {
    const lines = [...v.lines, { label: 'New fee', pct: 0, amount: 0, isFlat: false }];
    onChange(recompute(v.price, lines));
  };

  const removeLine = (idx: number) => {
    const lines = v.lines.filter((_, i) => i !== idx);
    onChange(recompute(v.price, lines));
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <ReceiptText className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Closing cost estimator</span>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
          <DollarSign className="size-3" /> Purchase price
        </Label>
        <Input
          type="number" min={0} step={1000} value={v.price}
          disabled={disabled}
          onChange={(e) => patchPrice(Math.max(0, Number(e.target.value) || 0))}
          className="text-xs h-9"
          aria-label="Purchase price"
        />
      </div>

      <div className="space-y-1.5">
        {v.lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1 items-center">
            <Input
              value={line.label}
              onChange={(e) => updateLine(idx, { label: e.target.value })}
              disabled={disabled}
              className="col-span-5 h-8 text-xs"
              aria-label="Line label"
            />
            <Input
              type="number" min={0} step={line.isFlat ? 25 : 0.1} value={line.pct}
              onChange={(e) => updateLine(idx, { pct: Number(e.target.value) || 0 })}
              disabled={disabled}
              className="col-span-2 h-8 text-xs text-right"
              aria-label={line.isFlat ? 'Flat amount' : 'Percentage of price'}
            />
            <span className="col-span-1 text-[9px] text-muted-foreground text-center">
              {line.isFlat ? '$' : '%'}
            </span>
            <span className="col-span-3 text-right text-xs font-mono pr-1">
              {line.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <Button
              type="button" variant="ghost" size="sm"
              disabled={disabled}
              onClick={() => removeLine(idx)}
              className="col-span-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
              aria-label="Remove line"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={disabled} className="text-xs gap-1 h-7">
        <Plus className="size-3" /> Add fee
      </Button>

      <Separator />

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Closing costs total</span>
          <span className="font-mono">{v.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-border/60">
          <span className="font-bold">Cash to close</span>
          <span className="font-black text-emerald-600 dark:text-emerald-400">
            {v.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </span>
        </div>
      </div>

      <Badge variant="outline" className="text-[9px] gap-1">
        {((v.total / Math.max(1, v.price)) * 100).toFixed(2)}% of price
      </Badge>
    </div>
  );
}

export default ClosingCostEstimator;

'use client';

import React, { useMemo, useState } from 'react';
import { Palette, Ruler, CheckCircle2, ChevronRight, ChevronLeft, RotateCcw, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface ConfiguratorValue {
  productId?: string;
  color?: string;
  size?: string;
  options?: Record<string, string>;
  qty?: number;
  unitPrice?: number;
  totalPrice?: number;
  currency?: string;
}

const DEFAULT_COLORS = [
  { label: 'Midnight', value: 'midnight', hex: '#1e293b' },
  { label: 'Sage', value: 'sage', hex: '#84a98c' },
  { label: 'Sand', value: 'sand', hex: '#e7d8b6' },
];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const DEFAULT_OPTIONS: Array<{ name: string; choices: string[] }> = [
  { name: 'Material', choices: ['Cotton', 'Recycled Poly', 'Wool Blend'] },
  { name: 'Finish', choices: ['Matte', 'Gloss'] },
];

export function ProductConfigurator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Product configurator');
  const currency = str(config.currency, 'USD');
  const basePrice = num(config.basePrice, 79);
  const colors = useMemo(() => {
    const raw = config.colors;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((c, i) => ({
        label: str((c as Record<string, unknown>).label, `Color ${i + 1}`),
        value: str((c as Record<string, unknown>).value, `c${i + 1}`),
        hex: str((c as Record<string, unknown>).hex, '#888'),
      }));
    }
    return DEFAULT_COLORS;
  }, [config.colors]);
  const sizes = Array.isArray(config.sizes) && config.sizes.length
    ? (config.sizes as string[]) : DEFAULT_SIZES;
  const optionGroups = Array.isArray(config.options) && config.options.length
    ? (config.options as Array<{ name: string; choices: string[] }>) : DEFAULT_OPTIONS;

  const v: ConfiguratorValue = value && typeof value === 'object' ? (value as ConfiguratorValue) : {};
  const step = v.color ? (v.size ? (optionGroups.length ? 3 : 2) : 1) : 0;

  const priceMap = (group: string, choice: string) => num(
    (config.optionPricing as Record<string, Record<string, number>>)?.[group]?.[choice], 0,
  );

  const computePrice = (color: string | undefined, size: string | undefined, opts: Record<string, string> | undefined) => {
    let p = basePrice;
    if (color) p += num((config.colorPricing as Record<string, number>)?.[color], 0);
    if (size) p += num((config.sizePricing as Record<string, number>)?.[size], 0);
    if (opts) for (const g of Object.keys(opts)) p += priceMap(g, opts[g]);
    return +p.toFixed(2);
  };

  const patch = (p: Partial<ConfiguratorValue>) => {
    const next = { ...v, ...p };
    next.unitPrice = computePrice(next.color, next.size, next.options);
    next.qty = next.qty ?? 1;
    next.totalPrice = +((next.unitPrice) * next.qty).toFixed(2);
    next.currency = currency;
    next.productId = str(config.productId, 'prod-config');
    onChange(next);
  };

  const setOpt = (group: string, choice: string) => {
    patch({ options: { ...(v.options ?? {}), [group]: choice } });
  };

  const reset = () => onChange({});

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="size-4 text-primary" />
          <span className="text-xs font-bold">Configure</span>
          <Badge variant="outline" className="text-[9px]">Step {Math.min(step + 1, 3)}/3</Badge>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={reset} disabled={disabled}>
          <RotateCcw className="size-3" /> Reset
        </Button>
      </div>

      {/* step 1: color */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5">Color</p>
        <div className="flex gap-2 flex-wrap">
          {colors.map((c) => {
            const chosen = v.color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                disabled={disabled}
                onClick={() => patch({ color: c.value })}
                aria-label={`Choose ${c.label}`}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border p-1.5 w-14 transition-colors',
                  chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <span className="size-6 rounded-full border border-black/10" style={{ background: c.hex }} />
                <span className="text-[9px]">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* step 2: size */}
      {v.color && (
        <div>
          <p className="text-[11px] font-semibold mb-1.5 flex items-center gap-1">
            <Ruler className="size-3" /> Size
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {sizes.map((s) => {
              const chosen = v.size === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => patch({ size: s })}
                  className={cn(
                    'h-8 min-w-9 px-2 rounded-md border text-xs font-medium transition-colors',
                    chosen ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
                  )}
                  aria-label={`Size ${s}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* step 3: options */}
      {v.size && optionGroups.map((g) => (
        <div key={g.name}>
          <p className="text-[11px] font-semibold mb-1.5">{g.name}</p>
          <div className="flex gap-1.5 flex-wrap">
            {g.choices.map((ch) => {
              const chosen = v.options?.[g.name] === ch;
              const addOn = priceMap(g.name, ch);
              return (
                <button
                  key={ch}
                  type="button"
                  disabled={disabled}
                  onClick={() => setOpt(g.name, ch)}
                  className={cn(
                    'h-7 px-2.5 rounded-md border text-[11px] transition-colors flex items-center gap-1',
                    chosen ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
                  )}
                  aria-label={`${g.name} ${ch}`}
                >
                  {ch}
                  {addOn > 0 && <span className="text-[9px] text-muted-foreground">+{addOn}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* summary */}
      {v.color && v.size && (
        <div className="rounded-lg border border-emerald-300/70 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="size-3.5" /> Configuration ready
            </span>
            <span className="font-black text-emerald-700 dark:text-emerald-400">
              {(v.unitPrice ?? 0).toFixed(2)} {currency}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] flex-1 gap-1"
              disabled={disabled}
              onClick={() => onChange({ ...v, qty: Math.max(1, (v.qty ?? 1) - 1) })}
              aria-label="Decrease quantity"
            >
              <ChevronLeft className="size-3" /> Qty {(v.qty ?? 1) - 1}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-[11px] flex-1 gap-1"
              disabled={disabled}
              onClick={() => onChange({ ...v, qty: (v.qty ?? 1) + 1 })}
              aria-label="Add to cart"
            >
              <ShoppingCart className="size-3" /> Add ({v.qty ?? 1}) · <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductConfigurator;

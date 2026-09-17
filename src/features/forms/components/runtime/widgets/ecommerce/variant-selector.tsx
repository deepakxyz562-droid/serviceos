'use client';

import React, { useMemo } from 'react';
import { Shirt, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface VariantMatrix {
  [color: string]: {
    [size: string]: { sku: string; stock: number; priceDelta?: number };
  };
}

interface VariantValue {
  productId?: string;
  color?: string;
  size?: string;
  sku?: string;
  stock?: number;
  unitPrice?: number;
  available?: boolean;
  currency?: string;
}

const DEFAULT_COLORS = [
  { label: 'Black', value: 'black', hex: '#111' },
  { label: 'White', value: 'white', hex: '#f8f8f8' },
  { label: 'Navy', value: 'navy', hex: '#1e3a5f' },
];
const DEFAULT_SIZES = ['S', 'M', 'L', 'XL'];

export function VariantSelector({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Variant selector');
  const currency = str(config.currency, 'USD');
  const basePrice = num(config.basePrice, 49);

  const colors = useMemo(() => {
    const raw = config.colors;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((c, i) => ({
        label: str((c as Record<string, unknown>).label, `Color ${i + 1}`),
        value: str((c as Record<string, unknown>).value, `c${i + 1}`),
        hex: str((c as Record<string, unknown>).hex, '#999'),
      }));
    }
    return DEFAULT_COLORS;
  }, [config.colors]);

  const sizes = Array.isArray(config.sizes) && config.sizes.length
    ? (config.sizes as string[]) : DEFAULT_SIZES;

  const matrix: VariantMatrix = useMemo(() => {
    if (config.matrix && typeof config.matrix === 'object') return config.matrix as VariantMatrix;
    const out: VariantMatrix = {};
    for (const c of colors) {
      out[c.value] = {};
      for (const s of sizes) {
        out[c.value][s] = {
          sku: `${c.value}-${s}`.toUpperCase(),
          stock: Math.floor(Math.random() * 6) + 2,
          priceDelta: 0,
        };
      }
    }
    // Randomly disable one variant for demo.
    if (colors[0] && sizes[0]) out[colors[0].value][sizes[0].value].stock = 0;
    return out;
  }, [config.matrix, colors, sizes]);

  const v: VariantValue = value && typeof value === 'object' ? (value as VariantValue) : {};
  const showStock = bool(config.showStock, true);

  const cell = v.color && v.size ? matrix[v.color]?.[v.size] : undefined;
  const outOfStock = cell ? cell.stock <= 0 : false;
  const unitPrice = +(basePrice + (cell?.priceDelta ?? 0)).toFixed(2);

  const pick = (color: string, size: string) => {
    if (disabled) return;
    const c = matrix[color]?.[size];
    if (!c || c.stock <= 0) return;
    onChange({
      productId: str(config.productId, 'prod-variant'),
      color,
      size,
      sku: c.sku,
      stock: c.stock,
      unitPrice,
      available: true,
      currency,
    });
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Shirt className="size-4 text-primary" />
        <span className="text-xs font-bold">Select Variant</span>
      </div>

      {/* Color picker */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5">
          Color {v.color && <span className="text-muted-foreground font-normal">— {colors.find((c) => c.value === v.color)?.label}</span>}
        </p>
        <div className="flex gap-2 flex-wrap">
          {colors.map((c) => {
            const chosen = v.color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...v, color: c.value, size: undefined })}
                aria-label={`Color ${c.label}`}
                className={cn(
                  'size-9 rounded-full border-2 flex items-center justify-center transition-all',
                  chosen ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-muted-foreground',
                )}
                style={{ background: c.hex }}
              >
                {chosen && <CheckMark />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size matrix */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5">
          Size {v.size && <span className="text-muted-foreground font-normal">— {v.size}</span>}
        </p>
        {!v.color ? (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="size-3" /> Pick a color first.
          </p>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(sizes.length, 5)}, minmax(0, 1fr))` }}>
            {sizes.map((s) => {
              const c = matrix[v.color!]?.[s];
              const oos = !c || c.stock <= 0;
              const chosen = v.size === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled || oos}
                  onClick={() => pick(v.color!, s)}
                  aria-label={`Size ${s}`}
                  className={cn(
                    'h-9 rounded-md border text-xs font-medium transition-colors relative',
                    chosen ? 'border-primary bg-primary text-primary-foreground' :
                    oos ? 'border-dashed border-border bg-muted/40 text-muted-foreground/60 line-through cursor-not-allowed' :
                    'border-border hover:bg-muted',
                  )}
                >
                  {s}
                  {showStock && c && !oos && c.stock <= 3 && (
                    <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white rounded-full px-1">
                      {c.stock}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected summary */}
      {v.sku && (
        <div className="rounded-lg border border-emerald-300/70 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-2 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono">{v.sku}</span>
            <Badge variant="secondary" className="text-[9px] gap-1">
              Stock: {v.stock}
            </Badge>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
            <span className="font-semibold">Unit price</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400">{unitPrice.toFixed(2)} {currency}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default VariantSelector;

'use client';

import React, { useState } from 'react';
import { Minus, Plus, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface ProductItem {
  productName: string;
  qty: number;
  price: number;
  imageUrl?: string;
  description?: string;
}

interface MultipleProductsValue { items: ProductItem[]; total: number }

interface MultipleProductsConfig {
  currency?: string;
  products?: Array<{ name?: string; price?: number; imageUrl?: string; description?: string }>;
}

export function MultipleProducts({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as MultipleProductsConfig;
  const currency = String(cfg.currency ?? 'USD');
  const label = String(field?.label ?? 'Products');

  const seed: ProductItem[] = (cfg.products || [
    { name: 'Product A', price: 19.99 },
    { name: 'Product B', price: 24.99 },
    { name: 'Product C', price: 14.99 },
  ]).map((p, i) => ({
    productName: p.name || `Product ${i + 1}`,
    price: Number(p.price ?? 9.99),
    qty: 0,
    imageUrl: p.imageUrl,
    description: p.description,
  }));

  const [items, setItems] = useState<ProductItem[]>(() => {
    const existing = (value as MultipleProductsValue | undefined)?.items;
    if (existing && existing.length === seed.length) {
      return seed.map((s, i) => ({ ...s, qty: existing[i]?.qty ?? 0 }));
    }
    return seed;
  });

  const setQty = (idx: number, delta: number) => {
    if (disabled) return;
    const next = [...items];
    next[idx] = { ...next[idx], qty: Math.max(0, next[idx].qty + delta) };
    setItems(next);
    const total = next.reduce((sum, it) => sum + it.price * it.qty, 0);
    onChange({ items: next, total });
  };

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const anySelected = items.some((i) => i.qty > 0);

  return (
    <div className="space-y-2" aria-label={label}>
      <div className="grid grid-cols-1 gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-2.5 shadow-xs">
            <div className="size-12 rounded-md bg-muted/60 shrink-0 overflow-hidden flex items-center justify-center">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.productName} className="size-full object-cover" />
              ) : (
                <ShoppingCart className="size-4 text-muted-foreground/60" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground line-clamp-1">{item.productName}</p>
              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                {item.price.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
              </p>
            </div>
            <div className="flex items-center border border-border rounded-md overflow-hidden shrink-0">
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={disabled} onClick={() => setQty(idx, -1)} aria-label="Decrease">
                <Minus className="size-3" />
              </Button>
              <span className="w-6 h-7 text-xs text-center leading-7 border-x border-border bg-background">{item.qty}</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={disabled} onClick={() => setQty(idx, 1)} aria-label="Increase">
                <Plus className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
        <span className="text-xs font-semibold text-muted-foreground">Total</span>
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
          {total.toFixed(2)} {currency}
        </span>
      </div>
      {anySelected && (
        <div className="text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="size-3" /> Selection saved to form state.
        </div>
      )}
    </div>
  );
}

export default MultipleProducts;

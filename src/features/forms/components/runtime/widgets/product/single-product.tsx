'use client';

import React, { useState } from 'react';
import { Minus, Plus, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WidgetProps } from '../widget-props';

interface SingleProductValue {
  productName: string;
  qty: number;
  price: number;
  total: number;
}

interface ProductConfig {
  productName?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
  maxQty?: number;
}

export function SingleProduct({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as ProductConfig;
  const name = cfg.productName || 'Sample Product';
  const price = Number(cfg.price ?? 29.99);
  const currency = String(cfg.currency ?? 'USD');
  const maxQty = Number(cfg.maxQty ?? 99);
  const label = String(field?.label ?? name);
  const initial = (value as SingleProductValue | undefined)?.qty ?? 1;
  const [qty, setQty] = useState(initial);
  const [added, setAdded] = useState(false);

  const total = (price * qty).toFixed(2);

  const handleQty = (delta: number) => {
    if (disabled) return;
    const next = Math.max(1, Math.min(maxQty, qty + delta));
    setQty(next);
    setAdded(false);
  };

  const handleAdd = () => {
    if (disabled) return;
    const next: SingleProductValue = { productName: name, qty, price, total: price * qty };
    onChange(next);
    setAdded(true);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs" aria-label={label}>
      <div className="flex gap-3 p-3">
        <div className="size-20 rounded-lg bg-muted/60 shrink-0 overflow-hidden flex items-center justify-center">
          {cfg.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.imageUrl} alt={name} className="size-full object-cover" />
          ) : (
            <ShoppingCart className="size-7 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-foreground line-clamp-1">{name}</p>
            <Badge variant="secondary" className="text-[9px] h-4 px-1">In Stock</Badge>
          </div>
          {cfg.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{cfg.description}</p>}
          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {price.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-border/60 bg-muted/20">
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={disabled} onClick={() => handleQty(-1)} aria-label="Decrease quantity">
            <Minus className="size-3.5" />
          </Button>
          <input
            type="number"
            value={qty}
            onChange={(e) => {
              const v = Math.max(1, Math.min(maxQty, Number(e.target.value) || 1));
              setQty(v); setAdded(false);
            }}
            disabled={disabled}
            className="w-10 h-8 text-xs text-center border-x border-border bg-background outline-none"
            aria-label="Quantity"
          />
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={disabled} onClick={() => handleQty(1)} aria-label="Increase quantity">
            <Plus className="size-3.5" />
          </Button>
        </div>
        <Button type="button" size="sm" disabled={disabled} onClick={handleAdd}
          className="flex-1 h-8 text-xs gap-1.5">
          {added ? <><CheckCircle2 className="size-3.5" /> Added — {total} {currency}</> : <><ShoppingCart className="size-3.5" /> Add — {total} {currency}</>}
        </Button>
      </div>
    </div>
  );
}

export default SingleProduct;

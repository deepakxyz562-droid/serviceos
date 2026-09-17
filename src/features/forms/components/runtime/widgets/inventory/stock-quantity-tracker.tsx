'use client';

import React, { useMemo, useState } from 'react';
import { Minus, Plus, ShoppingCart, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface StockItem {
  name: string;
  qty: number;
  price: number;
  stock: number;
  sku?: string;
}

interface TrackerValue {
  items: StockItem[];
  total: number;
}

interface TrackerConfig {
  currency?: string;
  products?: Array<{ name?: string; price?: number; stock?: number; sku?: string }>;
}

export function StockQuantityTracker({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as TrackerConfig;
  const currency = str(cfg.currency, 'USD');
  const ariaLabel = str(field?.label, 'Stock tracker');

  const seed: StockItem[] = useMemo(() => {
    const list = cfg.products && cfg.products.length > 0 ? cfg.products : [
      { name: 'Widget Alpha', price: 19.99, stock: 24 },
      { name: 'Widget Bravo', price: 24.99, stock: 8 },
      { name: 'Widget Charlie', price: 9.99, stock: 0 },
    ];
    return list.map((p, i) => ({
      name: str(p.name, `Item ${i + 1}`),
      price: num(p.price, 0),
      stock: num(p.stock, 0),
      sku: p.sku ? String(p.sku) : undefined,
    }));
  }, [cfg.products]);

  const [items, setItems] = useState<StockItem[]>(() => {
    const existing = (value as TrackerValue | undefined)?.items;
    if (existing && existing.length === seed.length) {
      return seed.map((s, i) => ({ ...s, qty: existing[i]?.qty ?? 0 }));
    }
    return seed.map((s) => ({ ...s, qty: 0 }));
  });

  const setQty = (idx: number, delta: number) => {
    if (disabled) return;
    const next = [...items];
    const target = next[idx];
    const max = target.stock;
    const newQty = Math.max(0, Math.min(max, target.qty + delta));
    next[idx] = { ...target, qty: newQty };
    setItems(next);
    const total = next.reduce((sum, it) => sum + it.price * it.qty, 0);
    onChange({ items: next, total });
  };

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const totalPicked = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="grid gap-1.5">
        {items.map((item, idx) => {
          const soldOut = item.stock <= 0;
          const low = !soldOut && item.stock <= 5;
          return (
            <div
              key={idx}
              className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground line-clamp-1">{item.name}</p>
                {item.sku && <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant={soldOut ? 'destructive' : low ? 'secondary' : 'outline'}
                    className="h-4 px-1 text-[9px] gap-0.5"
                  >
                    <Boxes className="size-2.5" />
                    {soldOut ? 'Sold out' : `${item.stock - item.qty} left`}
                  </Badge>
                  {item.price > 0 && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {item.price.toFixed(2)} {currency}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center border border-border rounded-md overflow-hidden shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={disabled || items[idx].qty <= 0}
                  onClick={() => setQty(idx, -1)}
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-6 h-7 text-xs text-center leading-7 border-x border-border bg-background">
                  {item.qty}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={disabled || items[idx].qty >= item.stock}
                  onClick={() => setQty(idx, 1)}
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ShoppingCart className="size-3.5" />
          {totalPicked} item{totalPicked === 1 ? '' : 's'} · Total
        </span>
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
          {total.toFixed(2)} {currency}
        </span>
      </div>
    </div>
  );
}

export default StockQuantityTracker;

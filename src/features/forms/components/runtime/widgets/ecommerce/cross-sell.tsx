'use client';

import React, { useState } from 'react';
import { Plus, Check, X, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface CrossSellProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  imageEmoji?: string;
  reason?: string;
}

interface CrossSellValue {
  addedIds: string[];
  total: number;
  items: Array<{ id: string; name: string; price: number }>;
  currency: string;
  timestamp: string;
}

const DEFAULT_PRODUCTS: CrossSellProduct[] = [
  { id: 'cs-1', name: 'Matching Scarf', price: 14.99, originalPrice: 19.99, rating: 4.5, imageEmoji: '🧣', reason: 'Pairs with your jacket' },
  { id: 'cs-2', name: 'Leather Care Kit', price: 12, rating: 4.8, imageEmoji: '🧴', reason: 'Keeps it new' },
  { id: 'cs-3', name: 'Gift Box', price: 4.5, rating: 4.2, imageEmoji: '📦', reason: 'Ready to gift' },
];

export function CrossSell({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Cross-sell suggestions');
  const currency = str(config.currency, 'USD');
  const title = str(config.title, 'Frequently bought together');
  const maxDisplay = num(config.maxDisplay, 4);
  const compact = bool(config.compact, false);

  const products: CrossSellProduct[] = (() => {
    const raw = config.products;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((p, i) => ({
        id: str((p as Record<string, unknown>).id, `cs-${i + 1}`),
        name: str((p as Record<string, unknown>).name, `Item ${i + 1}`),
        price: num((p as Record<string, unknown>).price, 0),
        originalPrice: (p as Record<string, unknown>).originalPrice != null ? num((p as Record<string, unknown>).originalPrice, 0) : undefined,
        rating: (p as Record<string, unknown>).rating != null ? num((p as Record<string, unknown>).rating, 0) : undefined,
        imageEmoji: str((p as Record<string, unknown>).imageEmoji, '🛍️'),
        reason: str((p as Record<string, unknown>).reason, ''),
      }));
    }
    return DEFAULT_PRODUCTS;
  })().slice(0, maxDisplay);

  const existing: CrossSellValue | undefined = value && typeof value === 'object' ? (value as CrossSellValue) : undefined;
  const [added, setAdded] = useState<string[]>(existing?.addedIds ?? []);

  const toggle = (id: string) => {
    if (disabled) return;
    setAdded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAddAll = () => {
    if (disabled) return;
    const items = products.filter((p) => added.includes(p.id)).map((p) => ({ id: p.id, name: p.name, price: p.price }));
    const total = items.reduce((acc, i) => acc + i.price, 0);
    const out: CrossSellValue = {
      addedIds: added,
      total: +total.toFixed(2),
      items,
      currency,
      timestamp: new Date().toISOString(),
    };
    onChange(out);
  };

  const addedTotal = added.reduce((acc, id) => acc + (products.find((p) => p.id === id)?.price ?? 0), 0);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Package className="size-4 text-indigo-600" />
        <span className="text-xs font-bold">{title}</span>
      </div>

      <ul className={cn('space-y-1.5', compact && 'grid grid-cols-2 gap-1.5')}>
        {products.map((p) => {
          const chosen = added.includes(p.id);
          const discount = p.originalPrice && p.originalPrice > p.price;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(p.id)}
                aria-pressed={chosen}
                aria-label={`${chosen ? 'Remove' : 'Add'} ${p.name}`}
                className={cn(
                  'w-full text-left rounded-lg border p-2 flex items-center gap-2 transition-colors',
                  chosen ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-border hover:bg-muted',
                )}
              >
                <span className="text-xl shrink-0">{p.imageEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  {p.reason && <p className="text-[10px] text-muted-foreground truncate">{p.reason}</p>}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{p.price.toFixed(2)} {currency}</span>
                    {discount && <span className="text-[10px] text-muted-foreground line-through">{p.originalPrice!.toFixed(2)}</span>}
                    {p.rating !== undefined && (
                      <span className="text-[9px] text-amber-500">★ {p.rating}</span>
                    )}
                  </div>
                </div>
                <span className={cn(
                  'size-6 rounded-md flex items-center justify-center shrink-0 border',
                  chosen ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-muted-foreground/40',
                )}>
                  {chosen ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {added.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60">
          <div>
            <span className="text-[10px] text-muted-foreground">Selected subtotal</span>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{addedTotal.toFixed(2)} {currency}</p>
          </div>
          <Button type="button" size="sm" className="h-8 text-xs gap-1" onClick={handleAddAll} disabled={disabled}>
            <ShoppingCart className="size-3.5" /> Add {added.length} to cart
          </Button>
        </div>
      )}

      {existing && existing.addedIds.length > 0 && added.length === 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground rounded-md bg-muted/40 p-1.5">
          <Check className="size-3 text-emerald-600" />
          <span>Last added: {existing.items.map((i) => i.name).join(', ')}</span>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="h-5 ml-auto text-[9px] px-1" onClick={() => { setAdded(existing.addedIds); }}>
              <X className="size-3" /> Undo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CrossSell;

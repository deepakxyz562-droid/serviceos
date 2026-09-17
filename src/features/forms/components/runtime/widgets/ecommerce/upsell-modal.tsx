'use client';

import React, { useState } from 'react';
import { Sparkles, Plus, X, CheckCircle2, Tag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface UpsellProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
}

interface UpsellValue {
  acceptedIds: string[];
  declined: boolean;
  addedValue: number;
  currency: string;
  timestamp?: string;
}

const DEFAULT_UPSELLS: UpsellProduct[] = [
  { id: 'ext-warranty', name: 'Extended Warranty (2yr)', price: 29, originalPrice: 49, description: 'Covers accidental damage & defects.' },
  { id: 'gift-wrap', name: 'Premium Gift Wrap', price: 5.99, description: 'Recyclable paper + handwritten note.' },
  { id: 'fast-setup', name: 'Priority Setup', price: 19, description: 'Skip the queue — install in 24h.' },
];

export function UpsellModal({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Upsell');
  const currency = str(config.currency, 'USD');
  const autoOpen = bool(config.autoOpen, true);
  const title = str(config.title, 'Wait! Add these to your order');

  const products: UpsellProduct[] = (() => {
    const raw = config.products;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((p, i) => ({
        id: str((p as Record<string, unknown>).id, `upsell-${i + 1}`),
        name: str((p as Record<string, unknown>).name, `Item ${i + 1}`),
        price: num((p as Record<string, unknown>).price, 0),
        originalPrice: (p as Record<string, unknown>).originalPrice != null
          ? num((p as Record<string, unknown>).originalPrice, 0) : undefined,
        description: str((p as Record<string, unknown>).description, ''),
      }));
    }
    return DEFAULT_UPSELLS;
  })();

  const existing: UpsellValue | undefined = value && typeof value === 'object' ? (value as UpsellValue) : undefined;
  const [open, setOpen] = useState<boolean>(autoOpen && !existing);
  const [accepted, setAccepted] = useState<string[]>(existing?.acceptedIds ?? []);

  const toggle = (id: string) => {
    if (disabled) return;
    setAccepted((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const totalPrice = accepted.reduce((acc, id) => {
    const p = products.find((x) => x.id === id);
    return acc + (p?.price ?? 0);
  }, 0);

  const handleConfirm = () => {
    const out: UpsellValue = {
      acceptedIds: accepted,
      declined: false,
      addedValue: +totalPrice.toFixed(2),
      currency,
      timestamp: new Date().toISOString(),
    };
    onChange(out);
    setOpen(false);
  };

  const handleDecline = () => {
    const out: UpsellValue = { acceptedIds: [], declined: true, addedValue: 0, currency, timestamp: new Date().toISOString() };
    onChange(out);
    setOpen(false);
  };

  if (!open && existing) {
    return (
      <div className="rounded-lg border border-emerald-300/60 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs" aria-label={ariaLabel}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            {existing.declined ? 'No thanks — continued' : `+${existing.addedValue.toFixed(2)} ${currency} added`}
          </span>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setOpen(true)}>
              Re-open
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)} variant="outline" className="h-9 text-xs gap-1.5 w-full" aria-label={ariaLabel}>
        <Sparkles className="size-4 text-amber-500" /> View offers
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2.5" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">{title}</span>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleDecline} aria-label="Close" disabled={disabled}>
          <X className="size-3.5" />
        </Button>
      </div>

      <ul className="space-y-1.5">
        {products.map((p) => {
          const chosen = accepted.includes(p.id);
          const discount = p.originalPrice && p.originalPrice > p.price;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(p.id)}
                aria-pressed={chosen}
                className={cn(
                  'w-full text-left rounded-lg border p-2 flex items-start gap-2 transition-colors',
                  chosen ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40' : 'border-border bg-white dark:bg-card hover:bg-muted',
                )}
              >
                <span className={cn(
                  'mt-0.5 size-4 rounded border-2 flex items-center justify-center shrink-0',
                  chosen ? 'border-amber-600 bg-amber-600 text-white' : 'border-muted-foreground/40',
                )}>
                  {chosen && <CheckCircle2 className="size-3" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{p.name}</p>
                  {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{p.price.toFixed(2)} {currency}</span>
                    {discount && (
                      <span className="text-[10px] text-muted-foreground line-through">{p.originalPrice!.toFixed(2)}</span>
                    )}
                    {discount && (
                      <Badge variant="outline" className="text-[8px] gap-0.5 text-emerald-700 border-emerald-300">
                        <Tag className="size-2" /> Save {(p.originalPrice! - p.price).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Plus className={cn('size-3.5 mt-1 shrink-0', chosen ? 'text-amber-600 rotate-45' : 'text-muted-foreground')} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-1.5 pt-1 border-t border-amber-200 dark:border-amber-800/60">
        <Button type="button" variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={handleDecline} disabled={disabled}>
          No thanks
        </Button>
        <Button type="button" size="sm" className="h-8 flex-[2] text-xs gap-1 bg-amber-600 hover:bg-amber-700" onClick={handleConfirm} disabled={disabled}>
          <TrendingUp className="size-3.5" />
          Add {accepted.length > 0 ? `(${accepted.length}) · +${totalPrice.toFixed(2)} ${currency}` : ''}
        </Button>
      </div>
    </div>
  );
}

export default UpsellModal;

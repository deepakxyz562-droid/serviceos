'use client';

import React, { useMemo } from 'react';
import { ShoppingCart, Trash2, Tag, Truck, BadgePercent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WidgetProps, str, num, bool } from '../widget-props';

interface CartItem {
  productId: string;
  name: string;
  variant?: string;
  qty: number;
  unitPrice: number;
}

interface CartSummaryValue {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

export function CartSummary({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Cart summary');
  const currency = str(config.currency, 'USD');
  const showZeroState = bool(config.showZeroState, true);

  const items = useMemo<CartItem[]>(() => {
    const raw = config.items;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((i) => ({
        productId: str((i as Record<string, unknown>).productId, 'pid'),
        name: str((i as Record<string, unknown>).name, 'Item'),
        variant: str((i as Record<string, unknown>).variant, ''),
        qty: num((i as Record<string, unknown>).qty, 1),
        unitPrice: num((i as Record<string, unknown>).unitPrice, 0),
      }));
    }
    // Fall back to a sample cart if none provided.
    return [
      { productId: 'p1', name: 'Organic Tee', variant: 'Black / M', qty: 2, unitPrice: 29 },
      { productId: 'p2', name: 'Canvas Tote', variant: 'Natural', qty: 1, unitPrice: 18 },
    ];
  }, [config.items]);

  const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0), [items]);
  const discountRate = num(config.discountPercent, 0);
  const discount = +(subtotal * discountRate / 100).toFixed(2);
  const freeThreshold = num(config.freeShippingThreshold, 0);
  const shippingBase = num(config.shippingBase, 5.99);
  const shipping = freeThreshold > 0 && subtotal - discount >= freeThreshold ? 0 : subtotal > 0 ? shippingBase : 0;
  const taxRate = num(config.taxRate, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = +(taxable * taxRate / 100).toFixed(2);
  const total = +(subtotal - discount + shipping + tax).toFixed(2);

  const out: CartSummaryValue = {
    items, subtotal: +subtotal.toFixed(2), discount, shipping, tax, total, currency,
  };
  React.useEffect(() => {
    onChange(out);
  }, [subtotal, discount, shipping, tax, total, currency]);

  const fmt = (n: number) => `${n.toFixed(2)} ${currency}`;
  const v: Partial<CartSummaryValue> = value && typeof value === 'object' ? (value as CartSummaryValue) : {};

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <ShoppingCart className="size-4 text-primary" />
        <span className="text-xs font-bold">Cart Summary</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{items.length} item(s)</Badge>
      </div>

      {items.length === 0 && showZeroState ? (
        <p className="text-[11px] text-muted-foreground p-3 rounded-md border border-dashed border-border text-center">
          Your cart is empty.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-40 overflow-auto pr-1">
          {items.map((it, idx) => (
            <li key={`${it.productId}-${idx}`} className="flex items-start gap-2 text-xs">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{it.name}</p>
                {it.variant && <p className="text-[10px] text-muted-foreground">{it.variant}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {it.qty} × {fmt(it.unitPrice)}
                </p>
              </div>
              <span className="font-mono font-semibold">{fmt(it.qty * it.unitPrice)}</span>
            </li>
          ))}
        </ul>
      )}

      <Separator />

      <div className="space-y-1 text-xs">
        <Row label="Subtotal" value={fmt(subtotal)} icon={<BadgePercent className="size-3" />} />
        {discount > 0 && <Row label={`Discount (${discountRate}%)`} value={`−${fmt(discount)}`} tone="emerald" icon={<Tag className="size-3" />} />}
        <Row label="Shipping" value={shipping === 0 ? 'FREE' : fmt(shipping)} tone={shipping === 0 ? 'emerald' : 'default'} icon={<Truck className="size-3" />} />
        {taxRate > 0 && <Row label={`Tax (${taxRate}%)`} value={fmt(tax)} />}
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <span className="font-bold">Total</span>
          <span className="font-black text-emerald-700 dark:text-emerald-400">{fmt(total)}</span>
        </div>
      </div>

      {freeThreshold > 0 && subtotal < freeThreshold && (
        <p className="text-[10px] text-muted-foreground">
          Add {fmt(freeThreshold - subtotal)} more for free shipping.
        </p>
      )}

      {disabled && <p className="text-[10px] text-amber-600 flex items-center gap-1"><Trash2 className="size-3" /> Read-only</p>}
    </div>
  );
}

function Row({ label, value, tone = 'default', icon }: { label: string; value: string; tone?: 'default' | 'emerald'; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`flex items-center gap-1 ${tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
        {icon}{label}
      </span>
      <span className={`font-mono font-semibold ${tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{value}</span>
    </div>
  );
}

export default CartSummary;

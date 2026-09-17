'use client';

import React, { useState } from 'react';
import { Utensils, Users, Truck, CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, num, bool } from '../widget-props';

interface MenuItem {
  name: string;
  qty: number;
  unitPrice: number;
}

interface CateringValue {
  menu: MenuItem[];
  guestCount: number;
  dietary: { vegetarian: number; vegan: number; glutenFree: number; halal: number };
  deliveryDate?: string;
  deliveryAddress?: string;
  notes?: string;
  photos: string[];
}

export function EventCateringOrder({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Event catering order');

  const [v, setV] = useState<CateringValue>(() => {
    const existing = value && typeof value === 'object' ? (value as CateringValue) : null;
    return {
      menu: existing?.menu ?? [],
      guestCount: existing?.guestCount ?? num(config.guestCount, 0),
      dietary: existing?.dietary ?? { vegetarian: 0, vegan: 0, glutenFree: 0, halal: 0 },
      deliveryDate: existing?.deliveryDate ?? str(config.deliveryDate, ''),
      deliveryAddress: existing?.deliveryAddress ?? '',
      notes: existing?.notes ?? '',
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<CateringValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };

  const addMenuItem = () => emit({ menu: [...v.menu, { name: '', qty: 1, unitPrice: 0 }] });
  const updateMenuItem = (idx: number, patch: Partial<MenuItem>) => {
    const menu = v.menu.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    emit({ menu });
  };
  const removeMenuItem = (idx: number) => emit({ menu: v.menu.filter((_, i) => i !== idx) });
  const setDietary = (key: keyof CateringValue['dietary'], val: number) => {
    emit({ dietary: { ...v.dietary, [key]: Math.max(0, val) } });
  };

  const total = v.menu.reduce((s, m) => s + m.qty * m.unitPrice, 0);
  const perGuest = v.guestCount > 0 ? total / v.guestCount : 0;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Utensils className="size-4 text-amber-600" />
        <span className="text-xs font-semibold">Catering Order</span>
        <Badge variant="outline" className="ml-auto text-[9px] flex items-center gap-1">
          <Users className="size-2.5" /> {v.guestCount} guests
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Users className="size-3" /> Guests
          </label>
          <Input
            type="number"
            min={0}
            value={v.guestCount}
            onChange={(e) => emit({ guestCount: Math.max(0, Number(e.target.value)) })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Guest count"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <CalendarClock className="size-3" /> Delivery date
          </label>
          <Input
            type="datetime-local"
            value={v.deliveryDate}
            onChange={(e) => emit({ deliveryDate: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Delivery date"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <Truck className="size-3" /> Delivery address
        </label>
        <Input
          value={v.deliveryAddress}
          onChange={(e) => emit({ deliveryAddress: e.target.value })}
          disabled={disabled}
          placeholder="Street, city, postcode"
          className="h-8 text-xs"
          aria-label="Delivery address"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-muted-foreground">Menu items</label>
          {!disabled && (
            <button type="button" onClick={addMenuItem} className="text-[10px] text-amber-600 hover:underline">+ Add item</button>
          )}
        </div>
        <ul className="space-y-1">
          {v.menu.map((m, idx) => (
            <li key={idx} className="grid grid-cols-[1fr_50px_70px_24px] gap-1 items-center">
              <Input value={m.name} onChange={(e) => updateMenuItem(idx, { name: e.target.value })} disabled={disabled} placeholder="Item" className="h-7 text-[10px]" aria-label={`Menu item ${idx + 1}`} />
              <Input type="number" min={1} value={m.qty} onChange={(e) => updateMenuItem(idx, { qty: Math.max(1, Number(e.target.value)) })} disabled={disabled} className="h-7 text-[10px]" aria-label={`Qty ${idx + 1}`} />
              <Input type="number" min={0} step="0.01" value={m.unitPrice} onChange={(e) => updateMenuItem(idx, { unitPrice: Math.max(0, Number(e.target.value)) })} disabled={disabled} className="h-7 text-[10px]" aria-label={`Price ${idx + 1}`} />
              {!disabled && <button type="button" onClick={() => removeMenuItem(idx)} className="text-rose-500 text-xs" aria-label="Remove">×</button>}
            </li>
          ))}
          {v.menu.length === 0 && <li className="text-[10px] text-muted-foreground italic">No menu items yet.</li>}
        </ul>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Dietary requirements</label>
        <div className="grid grid-cols-4 gap-1">
          {(['vegetarian', 'vegan', 'glutenFree', 'halal'] as const).map((k) => (
            <div key={k}>
              <p className="text-[9px] text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
              <Input
                type="number"
                min={0}
                value={v.dietary[k]}
                onChange={(e) => setDietary(k, Number(e.target.value))}
                disabled={disabled}
                className="h-7 text-[10px]"
                aria-label={k}
              />
            </div>
          ))}
        </div>
      </div>

      <Textarea
        value={v.notes}
        onChange={(e) => emit({ notes: e.target.value })}
        disabled={disabled}
        placeholder="Allergens, contactless, setup notes…"
        className="text-xs min-h-[48px]"
        aria-label="Notes"
      />

      <div className="rounded-md bg-muted/40 p-2 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Total · per guest</span>
        <span className="font-mono font-bold text-foreground">
          ${total.toFixed(2)} <span className="text-muted-foreground font-normal">(${perGuest.toFixed(2)}/g)</span>
        </span>
      </div>
    </div>
  );
}

export default EventCateringOrder;

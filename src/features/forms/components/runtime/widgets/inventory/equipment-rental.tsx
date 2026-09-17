'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { Wrench, CalendarCheck, Minus, Plus, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface RentalValue {
  item?: string;
  qty?: number;
  startDate?: string;
  endDate?: string;
  deposit?: number;
  total?: number;
}

interface RentalItem {
  name: string;
  dailyRate: number;
  stock: number;
  deposit: number;
}

export function EquipmentRental({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Equipment rental');
  const currency = str(config.currency, 'USD');
  const items = useMemo<RentalItem[]>(() => {
    const raw = config.items;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((r, i) => ({
        name: str((r as Record<string, unknown>).name, `Item ${i + 1}`),
        dailyRate: num((r as Record<string, unknown>).dailyRate, 0),
        stock: num((r as Record<string, unknown>).stock, 0),
        deposit: num((r as Record<string, unknown>).deposit, 0),
      }));
    }
    return [
      { name: 'Drone (Pro)', dailyRate: 89, stock: 3, deposit: 250 },
      { name: 'Projector (4K)', dailyRate: 49, stock: 8, deposit: 100 },
      { name: 'Sound System', dailyRate: 75, stock: 5, deposit: 200 },
    ];
  }, [config.items]);

  const v: RentalValue = value && typeof value === 'object' ? (value as RentalValue) : {};
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const startDate = v.startDate ? parseISO(v.startDate) : undefined;
  const endDate = v.endDate ? parseISO(v.endDate) : undefined;
  const days = startDate && endDate ? Math.max(1, differenceInCalendarDays(endDate, startDate) + 1) : 0;
  const selectedItem = items.find((i) => i.name === v.item);
  const subtotal = selectedItem && v.qty && days ? selectedItem.dailyRate * v.qty * days : 0;
  const deposit = selectedItem ? selectedItem.deposit * (v.qty ?? 1) : 0;
  const total = subtotal + deposit;

  const patch = (p: Partial<RentalValue>) => {
    const next = { ...v, ...p };
    const si = items.find((i) => i.name === next.item);
    if (si && next.startDate && next.endDate && next.qty) {
      const sd = parseISO(next.startDate);
      const ed = parseISO(next.endDate);
      const d = Math.max(1, differenceInCalendarDays(ed, sd) + 1);
      const sub = si.dailyRate * next.qty * d;
      next.deposit = si.deposit * next.qty;
      next.total = sub + next.deposit;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Equipment</label>
        <div className="grid gap-1.5">
          {items.map((item) => {
            const chosen = v.item === item.name;
            return (
              <button
                key={item.name}
                type="button"
                disabled={disabled}
                onClick={() => patch({ item: item.name, qty: 1 })}
                aria-label={`Select ${item.name}`}
                className={cn(
                  'rounded-lg border p-2 text-left transition-colors flex items-center gap-2',
                  chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <Wrench className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.dailyRate.toFixed(2)} {currency}/day · {item.stock} in stock · dep {item.deposit}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {v.item && (
        <>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Quantity</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={disabled || (v.qty ?? 1) <= 1}
                onClick={() => patch({ qty: Math.max(1, (v.qty ?? 1) - 1) })}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3" />
              </Button>
              <Input
                type="number"
                min={1}
                max={selectedItem?.stock}
                value={v.qty ?? 1}
                onChange={(e) => patch({ qty: Math.max(1, Math.min(selectedItem?.stock ?? 1, Number(e.target.value) || 1)) })}
                disabled={disabled}
                className="text-center"
                aria-label="Quantity"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={disabled || (v.qty ?? 1) >= (selectedItem?.stock ?? 1)}
                onClick={() => patch({ qty: Math.min(selectedItem?.stock ?? 1, (v.qty ?? 1) + 1) })}
                aria-label="Increase quantity"
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Start</label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start text-xs h-9">
                    <CalendarCheck className="size-3.5 mr-1" />
                    {startDate && isValid(startDate) ? format(startDate, 'MMM d, yyyy') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      if (d) patch({ startDate: format(d, 'yyyy-MM-dd') });
                      setStartOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">End</label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start text-xs h-9">
                    <CalendarCheck className="size-3.5 mr-1" />
                    {endDate && isValid(endDate) ? format(endDate, 'MMM d, yyyy') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    disabled={(d) => (startDate ? d < startDate : false)}
                    onSelect={(d) => {
                      if (d) patch({ endDate: format(d, 'yyyy-MM-dd') });
                      setEndOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {days > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/40 p-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{days} day(s) × {v.qty} unit(s)</span>
                <span className="font-semibold">{subtotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="size-3" /> Deposit</span>
                <span className="font-semibold">{deposit.toFixed(2)} {currency}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-1 mt-1">
                <span className="font-bold">Total</span>
                <Badge className="font-black">{total.toFixed(2)} {currency}</Badge>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EquipmentRental;

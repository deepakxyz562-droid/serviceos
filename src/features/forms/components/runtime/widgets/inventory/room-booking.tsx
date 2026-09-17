'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { Bed, Users, CalendarCheck, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface RoomValue {
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  nights?: number;
  total?: number;
}

interface RoomCfg {
  name: string;
  nightlyRate: number;
  capacity: number;
}

export function RoomBooking({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Room booking');
  const currency = str(config.currency, 'USD');
  const rooms = useMemo<RoomCfg[]>(() => {
    const raw = config.rooms;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((r, i) => ({
        name: str((r as Record<string, unknown>).name, `Room ${i + 1}`),
        nightlyRate: num((r as Record<string, unknown>).nightlyRate, 0),
        capacity: num((r as Record<string, unknown>).capacity, 2),
      }));
    }
    return [
      { name: 'Standard Queen', nightlyRate: 109, capacity: 2 },
      { name: 'Deluxe King', nightlyRate: 159, capacity: 2 },
      { name: 'Family Suite', nightlyRate: 229, capacity: 4 },
    ];
  }, [config.rooms]);

  const v: RoomValue = value && typeof value === 'object' ? (value as RoomValue) : {};
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const checkIn = v.checkIn ? parseISO(v.checkIn) : undefined;
  const checkOut = v.checkOut ? parseISO(v.checkOut) : undefined;
  const nights = checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : 0;
  const selected = rooms.find((r) => r.name === v.roomType);
  const total = selected && nights ? selected.nightlyRate * nights : 0;

  const patch = (p: Partial<RoomValue>) => {
    const next = { ...v, ...p };
    const r = rooms.find((x) => x.name === next.roomType);
    const ci = next.checkIn ? parseISO(next.checkIn) : undefined;
    const co = next.checkOut ? parseISO(next.checkOut) : undefined;
    if (r && ci && co) {
      next.nights = Math.max(1, differenceInCalendarDays(co, ci));
      next.total = r.nightlyRate * next.nights;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Room type</label>
        <div className="grid gap-1.5">
          {rooms.map((r) => {
            const chosen = v.roomType === r.name;
            return (
              <button
                key={r.name}
                type="button"
                disabled={disabled}
                onClick={() => patch({ roomType: r.name })}
                aria-label={`Select ${r.name}`}
                className={cn(
                  'rounded-lg border p-2 text-left transition-colors flex items-center gap-2',
                  chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <Bed className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.nightlyRate.toFixed(2)} {currency}/night · sleeps {r.capacity}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {v.roomType && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Check-in</label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start text-xs h-9">
                    <CalendarCheck className="size-3.5 mr-1" />
                    {checkIn && isValid(checkIn) ? format(checkIn, 'MMM d') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(d) => {
                      if (d) patch({ checkIn: format(d, 'yyyy-MM-dd') });
                      setStartOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Check-out</label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start text-xs h-9">
                    <CalendarCheck className="size-3.5 mr-1" />
                    {checkOut && isValid(checkOut) ? format(checkOut, 'MMM d') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    disabled={(d) => (checkIn ? d <= checkIn : false)}
                    onSelect={(d) => {
                      if (d) patch({ checkOut: format(d, 'yyyy-MM-dd') });
                      setEndOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="size-3.5" /> Guests
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={disabled || (v.guests ?? 1) <= 1}
                onClick={() => patch({ guests: Math.max(1, (v.guests ?? 1) - 1) })}
                aria-label="Fewer guests"
              >
                <Minus className="size-3" />
              </Button>
              <Input
                type="number"
                min={1}
                max={selected?.capacity ?? 4}
                value={v.guests ?? 1}
                onChange={(e) =>
                  patch({ guests: Math.max(1, Math.min(selected?.capacity ?? 4, Number(e.target.value) || 1)) })
                }
                disabled={disabled}
                className="text-center"
                aria-label="Number of guests"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={disabled || (v.guests ?? 1) >= (selected?.capacity ?? 4)}
                onClick={() => patch({ guests: Math.min(selected?.capacity ?? 4, (v.guests ?? 1) + 1) })}
                aria-label="More guests"
              >
                <Plus className="size-3" />
              </Button>
            </div>
            {selected && (v.guests ?? 1) > selected.capacity && (
              <p className="text-[10px] text-amber-600 mt-1">Exceeds room capacity ({selected.capacity}).</p>
            )}
          </div>

          {nights > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/40 p-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{nights} night(s) × {selected?.nightlyRate.toFixed(2)} {currency}</span>
                <span className="font-semibold">{total.toFixed(2)} {currency}</span>
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

export default RoomBooking;

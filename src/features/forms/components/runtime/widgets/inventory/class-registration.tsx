'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { Users, GraduationCap, CalendarCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface RegistrationValue {
  classId?: string;
  className?: string;
  date?: string;
  seats?: number;
  unitPrice?: number;
  total?: number;
  attendeeName?: string;
  attendeeEmail?: string;
}

interface ClassCfg {
  id: string;
  name: string;
  date: string;
  capacity: number;
  booked: number;
  price: number;
}

export function ClassRegistration({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Class registration');
  const currency = str(config.currency, 'USD');
  const classes = useMemo<ClassCfg[]>(() => {
    const raw = config.classes;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((c, i) => ({
        id: String((c as Record<string, unknown>).id ?? `class-${i + 1}`),
        name: str((c as Record<string, unknown>).name, `Class ${i + 1}`),
        date: str((c as Record<string, unknown>).date, format(new Date(), 'yyyy-MM-dd')),
        capacity: num((c as Record<string, unknown>).capacity, 10),
        booked: num((c as Record<string, unknown>).booked, 0),
        price: num((c as Record<string, unknown>).price, 0),
      }));
    }
    return [
      { id: 'c1', name: 'Yoga Flow', date: format(new Date(), 'yyyy-MM-dd'), capacity: 12, booked: 8, price: 25 },
      { id: 'c2', name: 'Watercolor 101', date: format(new Date(), 'yyyy-MM-dd'), capacity: 10, booked: 4, price: 40 },
      { id: 'c3', name: 'Power Tools 101', date: format(new Date(), 'yyyy-MM-dd'), capacity: 8, booked: 8, price: 60 },
    ];
  }, [config.classes]);

  const v: RegistrationValue = value && typeof value === 'object' ? (value as RegistrationValue) : {};
  const [open, setOpen] = useState(false);
  const selected = classes.find((c) => c.id === v.classId);
  const seatsAvailable = selected ? Math.max(0, selected.capacity - selected.booked) : 0;
  const isFull = selected ? seatsAvailable <= 0 : false;
  const total = selected && v.seats ? selected.price * v.seats : 0;

  const patch = (p: Partial<RegistrationValue>) => {
    const next = { ...v, ...p };
    if (next.classId) {
      const cls = classes.find((c) => c.id === next.classId);
      if (cls) {
        next.className = cls.name;
        next.unitPrice = cls.price;
        next.date = cls.date;
        next.total = cls.price * (next.seats ?? 1);
      }
    }
    onChange(next);
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class</label>
        <div className="grid gap-1.5">
          {classes.map((c) => {
            const chosen = v.classId === c.id;
            const remaining = Math.max(0, c.capacity - c.booked);
            const full = remaining <= 0;
            const cls = parseISO(c.date);
            return (
              <button
                key={c.id}
                type="button"
                disabled={disabled || full}
                onClick={() => patch({ classId: c.id, seats: 1 })}
                aria-label={`Select ${c.name}${full ? ' (full)' : ''}`}
                className={cn(
                  'rounded-lg border p-2 text-left transition-colors flex items-center gap-2',
                  chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                  full && 'opacity-60 cursor-not-allowed',
                )}
              >
                <GraduationCap className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs font-semibold flex items-center gap-1">
                    {c.name}
                    {full && <Badge variant="destructive" className="h-4 px-1 text-[9px]">Full</Badge>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isValid(cls) && format(cls, 'EEE, MMM d')} · {c.price.toFixed(2)} {currency}
                  </p>
                </div>
                <Badge variant={full ? 'destructive' : remaining <= 3 ? 'secondary' : 'outline'} className="text-[9px] h-4">
                  {remaining}/{c.capacity}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <>
          {isFull ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="size-4" /> Class is full — please join the waitlist.
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="size-3.5" /> Seats
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={disabled || (v.seats ?? 1) <= 1}
                    onClick={() => patch({ seats: Math.max(1, (v.seats ?? 1) - 1) })}
                    aria-label="Fewer seats"
                  >
                    –
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={seatsAvailable}
                    value={v.seats ?? 1}
                    onChange={(e) => patch({ seats: Math.max(1, Math.min(seatsAvailable, Number(e.target.value) || 1)) })}
                    disabled={disabled}
                    className="text-center"
                    aria-label="Number of seats"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={disabled || (v.seats ?? 1) >= seatsAvailable}
                    onClick={() => patch({ seats: Math.min(seatsAvailable, (v.seats ?? 1) + 1) })}
                    aria-label="More seats"
                  >
                    +
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{seatsAvailable} seat(s) available</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Attendee name"
                  value={v.attendeeName ?? ''}
                  onChange={(e) => patch({ attendeeName: e.target.value })}
                  disabled={disabled}
                  aria-label="Attendee name"
                />
                <Input
                  type="email"
                  placeholder="Attendee email"
                  value={v.attendeeEmail ?? ''}
                  onChange={(e) => patch({ attendeeEmail: e.target.value })}
                  disabled={disabled}
                  aria-label="Attendee email"
                />
              </div>

              {total > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/40 p-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-emerald-600" /> Total
                  </span>
                  <Badge className="font-black">{total.toFixed(2)} {currency}</Badge>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ClassRegistration;

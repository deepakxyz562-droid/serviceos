'use client';

import React from 'react';
import { format, parseISO, isValid, addDays, addWeeks, addMonths } from 'date-fns';
import { Repeat, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RecurringValue {
  startDate?: string;
  frequency?: Frequency;
  interval?: number;
  endDate?: string;
  count?: number;
}

const FREQUENCIES: { label: string; value: Frequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export function RecurringDate({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: RecurringValue = value && typeof value === 'object' ? (value as RecurringValue) : {};
  const ariaLabel = str(field?.label, 'Recurring date');
  const [open, setOpen] = React.useState(false);

  const set = (patch: Partial<RecurringValue>) => onChange({ startDate: '', frequency: 'weekly', interval: 1, ...obj, ...patch });

  const startDate = obj.startDate ? parseISO(obj.startDate) : undefined;
  const validStart = startDate && isValid(startDate) ? startDate : undefined;

  // Compute next 3 occurrences for preview
  const occurrences = React.useMemo(() => {
    if (!validStart) return [];
    const interval = Math.max(1, num(obj.interval, 1));
    const freq = (obj.frequency || 'weekly') as Frequency;
    const next: Date[] = [validStart];
    let d = validStart;
    const add: Record<Frequency, (date: Date, n: number) => Date> = {
      daily: addDays,
      weekly: addWeeks,
      monthly: addMonths,
      yearly: (date, n) => addMonths(date, n * 12),
    };
    for (let i = 0; i < 3; i++) {
      d = add[freq](d, interval);
      next.push(d);
    }
    return next;
  }, [validStart, obj.interval, obj.frequency]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-label={`${ariaLabel} start date`}
              className={cn('justify-start font-normal', !validStart && 'text-muted-foreground')}
            >
              <CalendarIcon className="size-4 mr-1.5" />
              {validStart ? format(validStart, 'MMM d, yyyy') : 'Start'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={validStart}
              onSelect={(d) => {
                if (d) set({ startDate: format(d, 'yyyy-MM-dd') });
                setOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select
          value={obj.frequency || 'weekly'}
          onValueChange={(v) => set({ frequency: v as Frequency })}
          disabled={disabled}
        >
          <SelectTrigger aria-label={`${ariaLabel} frequency`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Repeat className="size-4 text-muted-foreground shrink-0" />
          <span className="text-xs">every</span>
          <input
            type="number"
            min={1}
            max={365}
            value={obj.interval ?? 1}
            onChange={(e) => set({ interval: Math.max(1, Number(e.target.value) || 1) })}
            disabled={disabled}
            aria-label={`${ariaLabel} interval`}
            className="w-14 h-9 rounded-md border border-input bg-background px-2 text-sm text-center shadow-xs"
          />
          <span className="text-xs text-muted-foreground">
            {(obj.frequency || 'weekly').replace('ly', '')}{obj.interval === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {occurrences.length > 0 && (
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">Next occurrences</p>
          <div className="flex flex-wrap gap-1.5">
            {occurrences.map((d, i) => (
              <span key={i} className="text-xs font-mono bg-background rounded px-1.5 py-0.5 border border-border">
                {format(d, 'MMM d, yyyy')}
              </span>
            ))}
            <span className="text-xs text-muted-foreground self-center">…</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurringDate;

'use client';

import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WidgetProps } from '../widget-props';

interface DateDiffState {
  date1: string;
  date2: string;
}

function diff(a: Date, b: Date) {
  const earlier = a < b ? a : b;
  const later = a < b ? b : a;
  const totalDays = Math.floor((later.getTime() - earlier.getTime()) / 86400000);
  let years = later.getFullYear() - earlier.getFullYear();
  let months = later.getMonth() - earlier.getMonth();
  let days = later.getDate() - earlier.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;
  return { years, months, days, totalDays, totalWeeks, totalMonths };
}

export function DateDifference({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = (value as DateDiffState) || {};
  const today = new Date().toISOString().slice(0, 10);
  const state: DateDiffState = {
    date1: initial.date1 || today,
    date2: initial.date2 || '',
  };

  const result = useMemo(() => {
    if (!state.date1 || !state.date2) return null;
    const a = new Date(state.date1);
    const b = new Date(state.date2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    return diff(a, b);
  }, [state.date1, state.date2]);

  function update(patch: Partial<DateDiffState>) {
    const next = { ...state, ...patch };
    const a = new Date(next.date1);
    const b = new Date(next.date2);
    const computed =
      next.date1 && next.date2 && !isNaN(a.getTime()) && !isNaN(b.getTime()) ? diff(a, b) : null;
    onChange({ ...next, _diff: computed });
  }

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'Date difference')}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">From</Label>
          <Input
            type="date"
            value={state.date1}
            disabled={disabled}
            onChange={(e) => update({ date1: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">To</Label>
          <Input
            type="date"
            value={state.date2}
            disabled={disabled}
            onChange={(e) => update({ date2: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
      </div>
      <div className="rounded-xl bg-muted/40 border border-border/70 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
          <CalendarDays className="size-4 text-emerald-600" />
          <span>Difference</span>
        </div>
        {result ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Years" value={result.years} />
            <Stat label="Months (total)" value={result.totalMonths} />
            <Stat label="Weeks (total)" value={result.totalWeeks} />
            <Stat label="Days (total)" value={result.totalDays} />
          </div>
        ) : (
          <div className="text-base font-black text-muted-foreground text-center">—</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-lg border border-border/50 p-2">
      <div className="text-base font-black text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default DateDifference;

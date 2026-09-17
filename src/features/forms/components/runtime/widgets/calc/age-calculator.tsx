'use client';

import React, { useMemo } from 'react';
import { Cake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WidgetProps } from '../widget-props';

interface AgeState {
  birthdate: string;
  targetDate: string;
}

function computeAge(birth: Date, target: Date) {
  if (birth > target) return { years: 0, months: 0, days: 0, totalDays: 0 };
  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalDays = Math.floor((target.getTime() - birth.getTime()) / 86400000);
  return { years, months, days, totalDays };
}

export function AgeCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = (value as AgeState) || {};
  const today = new Date().toISOString().slice(0, 10);
  const state: AgeState = {
    birthdate: initial.birthdate || '',
    targetDate: initial.targetDate || today,
  };

  const age = useMemo(() => {
    if (!state.birthdate) return null;
    const b = new Date(state.birthdate);
    const t = new Date(state.targetDate || today);
    if (isNaN(b.getTime()) || isNaN(t.getTime())) return null;
    return computeAge(b, t);
  }, [state.birthdate, state.targetDate, today]);

  function update(patch: Partial<AgeState>) {
    const next = { ...state, ...patch };
    const b = new Date(next.birthdate);
    const t = new Date(next.targetDate || today);
    const computed =
      next.birthdate && !isNaN(b.getTime()) && !isNaN(t.getTime()) ? computeAge(b, t) : null;
    onChange({ ...next, _age: computed });
  }

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'Age calculator')}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Birth Date</Label>
          <Input
            type="date"
            value={state.birthdate}
            disabled={disabled}
            onChange={(e) => update({ birthdate: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Age at Date</Label>
          <Input
            type="date"
            value={state.targetDate}
            disabled={disabled}
            onChange={(e) => update({ targetDate: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
      </div>
      <div className="rounded-xl bg-muted/40 border border-border/70 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Cake className="size-4 text-emerald-600" />
          <span>Age</span>
        </div>
        <div className="text-right">
          {age ? (
            <>
              <div className="text-base font-black text-foreground">
                {age.years} yrs {age.months} mo {age.days} days
              </div>
              <div className="text-[10px] text-muted-foreground">{age.totalDays.toLocaleString()} total days</div>
            </>
          ) : (
            <div className="text-base font-black text-muted-foreground">—</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgeCalculator;

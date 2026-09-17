'use client';

import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WidgetProps } from '../widget-props';

interface BmiState {
  heightCm: number;
  weightKg: number;
  unitSystem: 'metric' | 'imperial';
}

function classify(bmi: number): { label: string; color: string } {
  if (bmi <= 0) return { label: '-', color: 'text-muted-foreground' };
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' };
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-600' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600' };
  return { label: 'Obese', color: 'text-red-600' };
}

export function BmiCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = (value as BmiState) || {};
  const state: BmiState = {
    heightCm: Number(initial.heightCm) || 0,
    weightKg: Number(initial.weightKg) || 0,
    unitSystem: (initial.unitSystem as 'metric' | 'imperial') || (config.unitSystem as 'metric' | 'imperial') || 'metric',
  };

  const bmi = useMemo(() => {
    if (state.heightCm <= 0 || state.weightKg <= 0) return 0;
    const m = state.heightCm / 100;
    return state.weightKg / (m * m);
  }, [state.heightCm, state.weightKg]);

  const cat = classify(bmi);

  function update(patch: Partial<BmiState>) {
    const next = { ...state, ...patch };
    const m = next.heightCm > 0 ? next.heightCm / 100 : 0;
    const computedBmi = m > 0 && next.weightKg > 0 ? next.weightKg / (m * m) : 0;
    onChange({ ...next, _bmi: Math.round(computedBmi * 10) / 10 });
  }

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'BMI calculator')}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            {state.unitSystem === 'metric' ? 'Height (cm)' : 'Height (in)'}
          </Label>
          <Input
            type="number"
            value={state.heightCm || ''}
            disabled={disabled}
            onChange={(e) => update({ heightCm: Number(e.target.value) || 0 })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            {state.unitSystem === 'metric' ? 'Weight (kg)' : 'Weight (lb)'}
          </Label>
          <Input
            type="number"
            value={state.weightKg || ''}
            disabled={disabled}
            onChange={(e) => update({ weightKg: Number(e.target.value) || 0 })}
            className="h-9 text-xs"
          />
        </div>
      </div>
      <div className="rounded-xl bg-muted/40 border border-border/70 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Activity className="size-4 text-emerald-600" />
          <span>BMI</span>
        </div>
        <div className="text-right">
          <div className={`text-base font-black ${cat.color}`}>
            {bmi > 0 ? bmi.toFixed(1) : '—'}
          </div>
          <div className={`text-[10px] font-semibold ${cat.color}`}>{cat.label}</div>
        </div>
      </div>
    </div>
  );
}

export default BmiCalculator;

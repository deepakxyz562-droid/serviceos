'use client';

import React, { useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WidgetProps } from '../widget-props';

interface LoanEmiState {
  principal: number;
  rate: number; // annual %
  term: number; // months
}

function computeEmi(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return isFinite(emi) ? emi : 0;
}

export function LoanEmiCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = (value as LoanEmiState) || { principal: 0, rate: 0, term: 12 };
  const state: LoanEmiState = {
    principal: Number(initial.principal) || 0,
    rate: Number(initial.rate) || 0,
    term: Number(initial.term) || 12,
  };

  const currency = (config.currency as string) || '$';

  const emi = useMemo(() => computeEmi(state.principal, state.rate, state.term), [
    state.principal,
    state.rate,
    state.term,
  ]);

  const totalPayment = emi * state.term;
  const totalInterest = totalPayment - state.principal;

  function update(patch: Partial<LoanEmiState>) {
    onChange({ ...state, ...patch, _emi: computeEmi(patch.principal ?? state.principal, patch.rate ?? state.rate, patch.term ?? state.term) });
  }

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'Loan EMI calculator')}>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Principal</Label>
          <Input
            type="number"
            value={state.principal || ''}
            disabled={disabled}
            onChange={(e) => update({ principal: Number(e.target.value) || 0 })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Rate (% / yr)</Label>
          <Input
            type="number"
            value={state.rate || ''}
            disabled={disabled}
            onChange={(e) => update({ rate: Number(e.target.value) || 0 })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Term (mo)</Label>
          <Input
            type="number"
            value={state.term || ''}
            disabled={disabled}
            onChange={(e) => update({ term: Number(e.target.value) || 0 })}
            className="h-9 text-xs"
          />
        </div>
      </div>
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Calculator className="size-4" />
          <span>Monthly EMI</span>
        </div>
        <div className="text-right">
          <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
            {currency}
            {emi.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Total interest: {currency}
            {totalInterest.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoanEmiCalculator;

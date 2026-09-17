'use client';

import React, { useState } from 'react';
import { Heart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface DonationValue {
  amount: number;
  currency: string;
  frequency?: 'one_time' | 'monthly';
}

interface DonationConfig {
  currency?: string;
  suggestedAmounts?: number[];
  allowCustom?: boolean;
  allowMonthly?: boolean;
  preset?: number;
}

export function Donation({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as DonationConfig;
  const currency = String(cfg.currency ?? 'USD');
  const suggestions = (cfg.suggestedAmounts || [10, 25, 50, 100]) as number[];
  const allowCustom = cfg.allowCustom !== false;
  const allowMonthly = cfg.allowMonthly !== false;
  const label = String(field?.label ?? 'Donation');

  const existing = value as DonationValue | undefined;
  const [amount, setAmount] = useState<number | ''>(existing?.amount ?? cfg.preset ?? '');
  const [monthly, setMonthly] = useState<boolean>(existing?.frequency === 'monthly');
  const [customMode, setCustomMode] = useState(false);

  const emit = (amt: number, freq: 'one_time' | 'monthly') => {
    if (disabled) return;
    const next: DonationValue = { amount: amt, currency, frequency: freq };
    onChange(next);
  };

  const pickPreset = (amt: number) => {
    if (disabled) return;
    setAmount(amt); setCustomMode(false);
    emit(amt, monthly ? 'monthly' : 'one_time');
  };

  const toggleMonthly = () => {
    if (disabled) return;
    const next = !monthly;
    setMonthly(next);
    if (typeof amount === 'number') emit(amount, next ? 'monthly' : 'one_time');
  };

  const submitCustom = () => {
    if (disabled || amount === '' || amount <= 0) return;
    emit(amount, monthly ? 'monthly' : 'one_time');
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-1.5">
        <Heart className="size-4 text-red-500 fill-red-500" />
        <span className="text-xs font-bold">Make a Donation</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {suggestions.map((amt) => {
          const active = amount === amt && !customMode;
          return (
            <button
              key={amt}
              type="button"
              disabled={disabled}
              onClick={() => pickPreset(amt)}
              className={`h-9 rounded-lg border text-xs font-bold transition-all ${active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'border-border bg-muted/30 text-foreground'}`}
              aria-label={`Donate ${amt} ${currency}`}
            >
              {amt}
            </button>
          );
        })}
      </div>
      {allowCustom && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground">
              {currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
            </span>
            <Input
              type="number"
              min={1}
              value={customMode ? amount : ''}
              disabled={disabled}
              onFocus={() => setCustomMode(true)}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Custom amount"
              className="h-9 text-xs pl-6"
              aria-label="Custom donation amount"
            />
          </div>
          <Button type="button" disabled={disabled} onClick={submitCustom} className="h-9 text-xs gap-1">
            <CheckCircle2 className="size-3.5" /> Give
          </Button>
        </div>
      )}
      {allowMonthly && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={monthly} onChange={toggleMonthly} disabled={disabled} className="size-3.5" />
          Make this a monthly recurring donation
        </label>
      )}
      {typeof amount === 'number' && amount > 0 && !customMode && (
        <div className="text-center text-[11px] text-emerald-700 dark:text-emerald-300">
          You&apos;re donating <strong>{amount.toFixed(2)} {currency}</strong>{monthly ? ' / month' : ''}.
        </div>
      )}
    </div>
  );
}

export default Donation;

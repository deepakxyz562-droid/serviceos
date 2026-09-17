'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, num } from '../widget-props';

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD $' },
  { code: 'EUR', symbol: '€', label: 'EUR €' },
  { code: 'GBP', symbol: '£', label: 'GBP £' },
  { code: 'JPY', symbol: '¥', label: 'JPY ¥' },
  { code: 'INR', symbol: '₹', label: 'INR ₹' },
  { code: 'CAD', symbol: 'C$', label: 'CAD C$' },
  { code: 'AUD', symbol: 'A$', label: 'AUD A$' },
  { code: 'BRL', symbol: 'R$', label: 'BRL R$' },
  { code: 'MXN', symbol: '$', label: 'MXN $' },
];

interface AmountValue {
  currency?: string;
  amount?: string | number;
}

export function CurrencyAmount({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: AmountValue =
    value && typeof value === 'object' ? (value as AmountValue) : { amount: typeof value === 'string' || typeof value === 'number' ? value : '' };

  const defaultCurrency = str(config.currency, 'USD');
  const currency = obj.currency || defaultCurrency;
  const meta = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  const decimals = Math.max(0, Math.min(4, num(config.decimals, 2)));
  const ariaLabel = str(field?.label, 'Amount');

  const update = (patch: Partial<AmountValue>) => onChange({ currency, amount: obj.amount ?? '', ...patch });

  return (
    <div className="flex items-stretch gap-1.5">
      <Select value={currency} onValueChange={(c) => update({ currency: c })} disabled={disabled}>
        <SelectTrigger className="w-[110px] shrink-0 font-mono text-xs" aria-label={`${ariaLabel} currency`}>
          <SelectValue>{meta.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code} className="text-xs font-mono">
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">{meta.symbol}</span>
        <Input
          type="number"
          inputMode="decimal"
          value={obj.amount ?? ''}
          onChange={(e) => update({ amount: e.target.value })}
          placeholder="0.00"
          step={decimals > 0 ? 1 / Math.pow(10, decimals) : 1}
          disabled={disabled}
          aria-label={ariaLabel}
          className="pl-7 font-mono"
        />
      </div>
    </div>
  );
}

export default CurrencyAmount;

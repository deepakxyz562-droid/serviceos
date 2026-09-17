'use client';

import React, { useState } from 'react';
import { DollarSign, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';
import { cn } from '@/lib/utils';

interface CurrencySelectorValue {
  action: 'currency_change';
  currency: string;
  timestamp: string;
}

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', label: 'Mexican Peso', symbol: '$' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
];

export function CurrencySelector({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Currency');
  const defaultCode = str(config.defaultCurrency, 'USD');
  const existing = (value as Partial<CurrencySelectorValue> | undefined) ?? {};
  const [selected, setSelected] = useState<string>(existing.currency ?? defaultCode);
  const [open, setOpen] = useState(false);

  const choose = (code: string) => {
    if (disabled) return;
    setSelected(code);
    setOpen(false);
    const next: CurrencySelectorValue = { action: 'currency_change', currency: code, timestamp: new Date().toISOString() };
    onChange(next);
  };

  const current = CURRENCIES.find((c) => c.code === selected) ?? CURRENCIES[0];

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 mb-1">
        <DollarSign className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">{ariaLabel}</span>
      </div>
      <div className="relative">
        <Button type="button" variant="outline" disabled={disabled}
          onClick={() => setOpen(!open)}
          className="w-full h-9 justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-primary">{current.symbol}</span>
            {current.code}
          </span>
          <span className="text-[10px] text-muted-foreground">{current.label}</span>
        </Button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-md max-h-60 overflow-y-auto p-1">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                disabled={disabled}
                onClick={() => choose(c.code)}
                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition',
                  selected === c.code ? 'bg-primary/10 text-primary font-semibold' : '')}
              >
                <span className="font-bold w-6 text-center">{c.symbol}</span>
                <span className="flex-1 text-left">{c.code}</span>
                <span className="text-[10px] text-muted-foreground">{c.label}</span>
                {selected === c.code && <Check className="size-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrencySelector;

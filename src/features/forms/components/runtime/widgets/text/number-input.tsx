'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

function formatThousands(n: number, decimals: number): string {
  const fixed = decimals > 0 ? n.toFixed(decimals) : String(n);
  const [intPart, decPart] = fixed.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${withSep}.${decPart}` : withSep;
}

export function NumberInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const rawNum = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : NaN;
  const decimals = Math.max(0, Math.min(6, num(config.decimals, 0)));
  const thousandsSep = bool(config.thousandsSep, false);

  // Show formatted display value when focused-out, raw number while editing.
  const [editing, setEditing] = React.useState(false);
  const display = Number.isFinite(rawNum)
    ? thousandsSep
      ? formatThousands(rawNum, decimals)
      : decimals > 0
        ? rawNum.toFixed(decimals)
        : String(rawNum)
    : '';

  const min = config.min != null ? num(config.min, -Infinity) : undefined;
  const max = config.max != null ? num(config.max, Infinity) : undefined;
  const step = num(config.step, decimals > 0 ? 1 / Math.pow(10, decimals) : 1);
  const ariaLabel = str(field?.label, 'Number');
  const placeholder = str(config.placeholder, '0');

  const commit = (s: string) => {
    const cleaned = s.replace(/,/g, '');
    const n = cleaned === '' ? NaN : Number(cleaned);
    onChange(Number.isFinite(n) ? n : '');
  };

  return (
    <Input
      type={editing ? 'number' : 'text'}
      inputMode="decimal"
      value={editing ? (Number.isFinite(rawNum) ? String(rawNum) : '') : display}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onFocus={() => setEditing(true)}
      onBlur={(e) => {
        setEditing(false);
        commit(e.target.value);
      }}
      onChange={(e) => commit(e.target.value)}
    />
  );
}

export default NumberInput;

'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/**
 * Australian Tax File Number: 9 digits, mod-11 checksum with weights
 * [1, 4, 3, 7, 5, 8, 6, 9, 10] — sum % 11 must equal 0.
 */
const WEIGHTS = [1, 4, 3, 7, 5, 8, 6, 9, 10];

function cleanTfn(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 9);
}

function formatTfn(num: string): string {
  if (num.length <= 3) return num;
  if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
  return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`;
}

function validateTfn(num: string): boolean {
  if (!/^\d{9}$/.test(num)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(num[i], 10) * WEIGHTS[i];
  return sum % 11 === 0;
}

export function AustraliaTfn({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'Tax File Number');
  const placeholder = str(config.placeholder, '123 456 782');

  const cleaned = cleanTfn(initial);
  const formatted = formatTfn(cleaned);
  const isValid = cleaned === '' ? null : validateTfn(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanTfn(v));
    setTouched(true);
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="relative">
        <Input
          value={formatted}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={showErr}
          inputMode="numeric"
          className="font-mono pr-9"
        />
        {isValid === true && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      {showErr && <p className="text-[11px] text-red-500">Invalid TFN (9 digits, checksum failed).</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">Valid Tax File Number.</p>}
    </div>
  );
}

export default AustraliaTfn;

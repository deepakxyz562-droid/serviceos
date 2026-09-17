'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Japanese My Number: 12 digits with mod-11 check digit (last digit). */
function cleanMyNumber(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 12);
}

function validateMyNumber(num: string): boolean {
  if (!/^\d{12}$/.test(num)) return false;
  // ISO/IEC 7064 MOD 11-2: weights 6..2 descending over first 11 digits
  const weights = [6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += parseInt(num[i], 10) * weights[i];
  const rem = sum % 11;
  const check = rem <= 1 ? 0 : 11 - rem;
  return parseInt(num[11], 10) === check;
}

export function JapanMyNumber({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'My Number');
  const placeholder = str(config.placeholder, '123456789012');

  const cleaned = cleanMyNumber(initial);
  const isValid = cleaned === '' ? null : validateMyNumber(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanMyNumber(v));
    setTouched(true);
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="relative">
        <Input
          value={cleaned}
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
      {showErr && <p className="text-[11px] text-red-500">マイナンバーが無効です (12桁 + チェックディジット)。</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">マイナンバー有効。</p>}
    </div>
  );
}

export default JapanMyNumber;

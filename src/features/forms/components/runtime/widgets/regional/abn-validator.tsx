'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/** Validate Australian Business Number (11-digit). */
function validateAbn(digits: string): boolean {
  if (digits.length !== 11) return false;
  const nums = digits.split('').map(Number);
  // Subtract 1 from the leading digit.
  nums[0] -= 1;
  const sum = nums.reduce((acc, n, i) => acc + n * WEIGHTS[i], 0);
  return sum % 89 === 0;
}

function normalize(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

export function AbnValidator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'ABN');
  const placeholder = str(config.placeholder, '51 824 753 556');

  const digits = normalize(initial);
  const isValid = validateAbn(digits);
  const showErr = touched && digits.length > 0 && !isValid;

  function commit(v: string) {
    onChange(normalize(v));
    setTouched(true);
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="relative">
        <Input
          value={digits}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={showErr}
          inputMode="numeric"
          className="font-mono pr-9"
          maxLength={11}
        />
        {digits.length === 11 && isValid && (
          <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
        )}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      <div className="text-[10px] text-muted-foreground">{digits.length}/11 digits</div>
      {showErr && <p className="text-[11px] text-red-500">Invalid ABN (checksum mismatch).</p>}
    </div>
  );
}

export default AbnValidator;

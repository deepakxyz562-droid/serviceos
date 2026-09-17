'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Format 6 raw digits into XXX-XXX. */
function formatBsb(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/**
 * APCA-style structural validation: BSB must be exactly 6 digits.
 * The first two digits correspond to the bank/branch prefix; the
 * APCA-maintained prefix ranges broadly cover 01-12, 21-76 (we keep
 * it permissive — structural check only here).
 */
function validateBsb(formatted: string): boolean {
  const digits = formatted.replace(/\D/g, '');
  if (digits.length !== 6) return false;
  const prefix = parseInt(digits.slice(0, 2), 10);
  if (prefix < 1 || (prefix >= 13 && prefix <= 20) || prefix > 76) return false;
  return true;
}

export function AustraliaBsbCheckerV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'BSB');
  const placeholder = str(config.placeholder, '000-000');

  const formatted = formatBsb(initial);
  const isValid = formatted === '' ? null : validateBsb(formatted);

  function commit(v: string) {
    onChange(formatBsb(v));
    setTouched(true);
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          value={formatted}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={touched && isValid === false}
          inputMode="numeric"
          className="font-mono pr-9"
        />
        {isValid === true && (
          <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
        )}
        {isValid === false && (
          <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />
        )}
      </div>
      {touched && isValid === false && (
        <p className="text-[11px] text-red-500">Enter a valid 6-digit BSB (XXX-XXX).</p>
      )}
    </div>
  );
}

export default AustraliaBsbCheckerV2;

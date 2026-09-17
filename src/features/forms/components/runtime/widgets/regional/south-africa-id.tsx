'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** South African ID number: 13 digits — YYMMDD SSSS C A Z. */
function cleanId(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 13);
}

function validateSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  // Date sanity (YYMMDD) — accept 00-99 year, month 01-12, day 01-31
  const mm = parseInt(id.slice(2, 4), 10);
  const dd = parseInt(id.slice(4, 6), 10);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  // Citizenship flag (11th digit) must be 0 (citizen) or 1 (permanent resident)
  if (id[10] !== '0' && id[10] !== '1') return false;
  // Luhn check over all 13 digits
  let sum = 0;
  let alt = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let d = parseInt(id[i], 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function SouthAfricaId({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'South African ID number');
  const placeholder = str(config.placeholder, '9001015000080');

  const cleaned = cleanId(initial);
  const isValid = cleaned === '' ? null : validateSaId(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanId(v));
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
      {showErr && <p className="text-[11px] text-red-500">Invalid SA ID (13 digits, Luhn check failed).</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">Valid SA ID number.</p>}
    </div>
  );
}

export default SouthAfricaId;

'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** UK National Insurance Number: 2 prefix letters + 6 digits + 1 suffix letter. */
const INVALID_PREFIXES = new Set(['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ']);

function cleanNino(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
}

function formatNino(s: string): string {
  if (s.length <= 2) return s;
  if (s.length <= 8) return `${s.slice(0, 2)} ${s.slice(2)}`;
  return `${s.slice(0, 2)} ${s.slice(2, 8)} ${s.slice(8)}`;
}

function validateNino(s: string): boolean {
  if (!/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[ABCD]$/.test(s)) return false;
  if (INVALID_PREFIXES.has(s.slice(0, 2))) return false;
  if (s[0] === 'D' || s[0] === 'F' || s[0] === 'I' || s[0] === 'Q' || s[0] === 'U' || s[0] === 'V') return false;
  if (s[1] === 'O') return false;
  return true;
}

export function UkNino({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'National Insurance Number');
  const placeholder = str(config.placeholder, 'QQ 12 34 56 C');

  const cleaned = cleanNino(initial);
  const formatted = formatNino(cleaned);
  const isValid = cleaned === '' ? null : validateNino(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanNino(v));
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
          className="font-mono uppercase pr-9"
        />
        {isValid === true && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      {showErr && <p className="text-[11px] text-red-500">Invalid NINO (format: 2 letters + 6 digits + ABCD).</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">Valid NINO.</p>}
    </div>
  );
}

export default UkNino;

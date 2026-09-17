'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Korean Resident Registration Number: YYMMDD-SXXXXXC (13 digits). */
function cleanRrn(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 13);
}

function formatRrn(num: string): string {
  if (num.length <= 6) return num;
  return `${num.slice(0, 6)}-${num.slice(6)}`;
}

function validateRrn(rrn: string): boolean {
  const digits = rrn.replace(/-/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  // Gender/century digit (7th) must be 1-4 or 9,0 for foreign residents
  const g = parseInt(digits[6], 10);
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 0].includes(g)) return false;
  // Date sanity
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  // Luhn-like weights: 2,3,4,5,6,7,8,9,2,3,4,5 (12 weights)
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i], 10) * weights[i];
  const check = (11 - (sum % 11)) % 10;
  return check === parseInt(digits[12], 10);
}

export function KoreaResidentNumber({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'Resident Registration Number');
  const placeholder = str(config.placeholder, 'YYMMDD-1XXXXXX');

  const cleaned = cleanRrn(initial);
  const formatted = formatRrn(cleaned);
  const isValid = cleaned === '' ? null : validateRrn(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanRrn(v));
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
      {showErr && <p className="text-[11px] text-red-500">주민등록번호가 유효하지 않습니다.</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">주민등록번호 유효.</p>}
    </div>
  );
}

export default KoreaResidentNumber;

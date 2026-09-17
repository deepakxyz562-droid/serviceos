'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/**
 * French INSEE / NIR Social Security Number: 15 digits.
 * Format: S YYMMDD DDD KK CC C (sex, DOB, dept, town, serial, key, country)
 * Last 2 digits = Luhn-like key: 97 − (97 mod first 13 digits as big int).
 */
function cleanInsee(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 15);
}

function formatInsee(num: string): string {
  if (num.length <= 1) return num;
  if (num.length <= 3) return `${num.slice(0, 1)} ${num.slice(1)}`;
  if (num.length <= 5) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3)}`;
  if (num.length <= 7) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
  if (num.length <= 10) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7)}`;
  if (num.length <= 13) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 10)} ${num.slice(10)}`;
  return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 10)} ${num.slice(10, 13)} ${num.slice(13)}`;
}

function mod97(numStr: string): number {
  // big-num mod 97 via chunked division
  let rem = 0;
  for (let i = 0; i < numStr.length; i++) {
    rem = (rem * 10 + parseInt(numStr[i], 10)) % 97;
  }
  return rem;
}

function validateInsee(num: string): boolean {
  if (!/^\d{15}$/.test(num)) return false;
  const sex = parseInt(num[0], 10);
  if (sex !== 1 && sex !== 2 && sex !== 3 && sex !== 4 && sex !== 7 && sex !== 8) return false;
  const mm = parseInt(num.slice(3, 5), 10);
  if (mm < 1 || mm > 12 && mm !== 20 && mm !== 30 && mm !== 40 && mm !== 50) return false;
  const key = parseInt(num.slice(13, 15), 10);
  // Cormorant exception for Corsica (2A/2B) handled loosely here
  const base = num.slice(0, 13).replace(/2A/i, '19').replace(/2B/i, '18');
  if (!/^\d{13}$/.test(base)) return false;
  const expected = 97 - mod97(base);
  return expected === key;
}

export function FranceInsee({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'Numéro de sécurité sociale');
  const placeholder = str(config.placeholder, '1 88 04 75 113 012 22');

  const cleaned = cleanInsee(initial);
  const formatted = formatInsee(cleaned);
  const isValid = cleaned === '' ? null : validateInsee(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanInsee(v));
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
      {showErr && <p className="text-[11px] text-red-500">Numéro INSEE invalide (15 chiffres, clé incorrecte).</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">Numéro INSEE valide.</p>}
    </div>
  );
}

export default FranceInsee;

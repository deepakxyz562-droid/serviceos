'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/**
 * German Steueridentifikationsnummer: 11 digits.
 * Rule: 11 digits, first digit ≠ 0, last digit is mod-10 check digit over the
 * transformed product-sum (official BMF spec).
 */
function cleanSteuer(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

function validateSteuer(num: string): boolean {
  if (!/^\d{11}$/.test(num)) return false;
  if (num[0] === '0') return false;
  // BMF algorithm
  let product = 10;
  for (let i = 0; i < 10; i++) {
    const sum = (parseInt(num[i], 10) + product) % 10;
    const s = sum === 0 ? 10 : sum;
    product = (s * 2) % 11;
  }
  const check = (11 - product) % 10;
  return check === parseInt(num[10], 10);
}

export function GermanyTaxId({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'Steuer-ID');
  const placeholder = str(config.placeholder, '47511089015');

  const cleaned = cleanSteuer(initial);
  const isValid = cleaned === '' ? null : validateSteuer(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanSteuer(v));
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
      {showErr && <p className="text-[11px] text-red-500">Ungültige Steuer-ID (11 Ziffern, Prüfziffer falsch).</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">Gültige Steuer-ID.</p>}
    </div>
  );
}

export default GermanyTaxId;

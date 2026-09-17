'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Format Mexican RFC: 4 letters + 6 digits (YYMMDD) + 3-char homoclave. */
function formatRfc(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
  return cleaned;
}

function validateRfc(rfc: string): boolean {
  // Generic (non-moral) RFC: AAAA######XXX (4 letters + 6 digits + 3 alphanumeric)
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) return false;
  // Date sanity: month 01-12, day 01-31
  const dateStart = rfc.length === 13 ? 4 : 3;
  const yy = parseInt(rfc.slice(dateStart, dateStart + 2), 10);
  const mm = parseInt(rfc.slice(dateStart + 2, dateStart + 4), 10);
  const dd = parseInt(rfc.slice(dateStart + 4, dateStart + 6), 10);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  void yy;
  return true;
}

export function MexicoRfc({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'RFC');
  const placeholder = str(config.placeholder, 'AAAA000000XXX');

  const formatted = formatRfc(initial);
  const isValid = formatted === '' ? null : validateRfc(formatted);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(formatRfc(v));
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
      {showErr && <p className="text-[11px] text-red-500">RFC inválido (requiere 4 letras, 6 dígitos, 3 homoclave).</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">RFC válido.</p>}
    </div>
  );
}

export default MexicoRfc;

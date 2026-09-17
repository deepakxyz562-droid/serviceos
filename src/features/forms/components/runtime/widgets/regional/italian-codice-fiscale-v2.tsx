'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

const ODD_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const EVEN_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Compute the Italian codice fiscale check character. */
function computeCheckChar(s15: string): string | null {
  if (s15.length !== 15) return null;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const ch = s15[i].toUpperCase();
    const set = i % 2 === 0 ? ODD_SET : EVEN_SET;
    const idx = set.indexOf(ch);
    if (idx < 0) return null;
    sum += idx;
  }
  return String.fromCharCode((sum % 26) + 65);
}

function normalize(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

export function ItalianCodiceFiscaleV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'Codice Fiscale');
  const placeholder = str(config.placeholder, 'RSSMRA85M01H501Z');

  const normalized = normalize(initial);
  const expected = normalized.length === 16 ? computeCheckChar(normalized.slice(0, 15)) : null;
  const isValid =
    normalized.length === 16 && expected !== null && normalized[15] === expected
      ? true
      : normalized.length === 0
        ? null
        : false;

  function commit(v: string) {
    onChange(normalize(v));
    setTouched(true);
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          value={normalized}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={touched && isValid === false}
          className="font-mono uppercase pr-9"
          maxLength={16}
        />
        {isValid === true && (
          <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
        )}
        {isValid === false && (
          <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">{normalized.length}/16 chars</div>
      {touched && isValid === false && (
        <p className="text-[11px] text-red-500">Invalid Codice Fiscale (checksum mismatch).</p>
      )}
    </div>
  );
}

export default ItalianCodiceFiscaleV2;

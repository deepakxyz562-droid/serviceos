'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/**
 * Singapore NRIC/FIN: 1 prefix letter (S/T/F/G/M) + 7 digits + 1 check letter.
 * Uses mod-11 with weights [2,7,6,5,4,3,2], mapped to letters per prefix set.
 */
const PREFIXES = new Set(['S', 'T', 'F', 'G', 'M']);
const WEIGHTS = [2, 7, 6, 5, 4, 3, 2];
const CHECK_FOR_ST = ['J', 'Z', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
const CHECK_FOR_FGM = ['X', 'W', 'U', 'T', 'R', 'Q', 'P', 'N', 'M', 'L', 'K'];

function cleanNric(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
}

function validateNric(nric: string): boolean {
  if (!/^[STFGM]\d{7}[A-Z]$/.test(nric)) return false;
  const prefix = nric[0];
  const digits = nric.slice(1, 8);
  let sum = 4; // offset for M prefixes
  if (prefix === 'T' || prefix === 'G') sum = 4;
  else sum = 0;
  for (let i = 0; i < 7; i++) sum += parseInt(digits[i], 10) * WEIGHTS[i];
  const check = sum % 11;
  const map = (prefix === 'S' || prefix === 'T') ? CHECK_FOR_ST : CHECK_FOR_FGM;
  return nric[8] === map[check];
}

export function SingaporeNric({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'NRIC / FIN');
  const placeholder = str(config.placeholder, 'S1234567A');

  const cleaned = cleanNric(initial);
  const isValid = cleaned === '' ? null : validateNric(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanNric(v));
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
          className="font-mono uppercase pr-9"
        />
        {isValid === true && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      {showErr && <p className="text-[11px] text-red-500">Invalid NRIC/FIN (check letter mismatch).</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">Valid NRIC/FIN.</p>}
    </div>
  );
}

export default SingaporeNric;

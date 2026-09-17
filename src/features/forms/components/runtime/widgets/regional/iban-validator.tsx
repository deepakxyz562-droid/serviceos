'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

// Country → expected IBAN length (subset of common countries).
const COUNTRY_LENGTHS: Record<string, number> = {
  AL: 28, AD: 24, AT: 20, BE: 16, BA: 20, BG: 22, HR: 21, CY: 28, CZ: 24,
  DK: 18, EE: 20, FI: 18, FR: 27, DE: 22, GI: 23, GR: 27, HU: 28, IS: 26,
  IE: 22, IT: 27, LV: 21, LI: 21, LT: 20, LU: 20, MK: 19, MT: 31, MC: 27,
  NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SM: 27, RS: 22, SK: 24, SI: 19,
  ES: 24, SE: 24, CH: 21, GB: 22, TR: 26, AE: 23, SA: 24,
};

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '');
}

function charValue(ch: string): number {
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48;
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 55;
  return -1;
}

/** IBAN checksum: move first 4 chars to end, replace letters with digits, mod 97 = 1. */
function validateIban(iban: string): { ok: boolean; reason?: string } {
  if (iban.length < 5) return { ok: false, reason: 'Too short.' };
  const cc = iban.slice(0, 2);
  const expectedLen = COUNTRY_LENGTHS[cc];
  if (!expectedLen) return { ok: false, reason: `Unsupported country code: ${cc}` };
  if (iban.length !== expectedLen) return { ok: false, reason: `${cc} IBAN must be ${expectedLen} chars.` };
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let digits = '';
  for (const ch of rearranged) {
    const v = charValue(ch);
    if (v < 0) return { ok: false, reason: 'Invalid character in IBAN.' };
    digits += v.toString();
  }
  // Modulo 97 on the big decimal string.
  let rem = 0;
  for (const ch of digits) {
    rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1 ? { ok: true } : { ok: false, reason: 'Checksum failed.' };
}

export function IbanValidator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'IBAN');
  const placeholder = str(config.placeholder, 'DE89 3704 0044 0532 0130 00');

  const normalized = normalize(initial);
  const result = normalized.length === 0 ? null : validateIban(normalized);

  function commit(v: string) {
    onChange(normalize(v));
    setTouched(true);
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="relative">
        <Input
          value={normalized}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={touched && result && !result.ok}
          className="font-mono uppercase pr-9"
        />
        {result?.ok && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
        {touched && result && !result.ok && (
          <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />
        )}
      </div>
      {touched && result && !result.ok && <p className="text-[11px] text-red-500">{result.reason}</p>}
      {result?.ok && <p className="text-[11px] text-emerald-600">Valid IBAN ({normalized.slice(0, 2)}).</p>}
    </div>
  );
}

export default IbanValidator;

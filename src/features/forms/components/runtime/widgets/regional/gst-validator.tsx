'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Indian GST checksum: take first 14 chars, compute weighted sum with
 * weights [1, 2] alternating, mod 36, derive check char.
 * GSTIN format: 2-digit state code + 10-char PAN + 1 entity char + 'Z' + 1 check char.
 */
function computeCheckChar(s14: string): string | null {
  if (s14.length !== 14) return null;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const ch = s14[i].toUpperCase();
    const idx = GST_CHARS.indexOf(ch);
    if (idx < 0) return null;
    const factor = i % 2 === 0 ? 1 : 2;
    sum += Math.floor((idx * factor) / 36) + ((idx * factor) % 36);
  }
  const checkIdx = (36 - (sum % 36)) % 36;
  return GST_CHARS[checkIdx];
}

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
}

export function GstValidator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'GSTIN');
  const placeholder = str(config.placeholder, '22AAAAA0000A1Z5');

  const normalized = normalize(initial);
  const expected = normalized.length === 15 ? computeCheckChar(normalized.slice(0, 14)) : null;
  const validStruct = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/.test(normalized);
  const isValid =
    normalized.length === 15 && validStruct && expected !== null && normalized[14] === expected;

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
          aria-invalid={touched && !isValid}
          className="font-mono uppercase pr-9"
          maxLength={15}
        />
        {isValid && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
        {touched && !isValid && normalized.length > 0 && (
          <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">{normalized.length}/15 chars</div>
      {touched && !isValid && normalized.length > 0 && (
        <p className="text-[11px] text-red-500">Invalid GSTIN (checksum or pattern mismatch).</p>
      )}
    </div>
  );
}

export default GstValidator;

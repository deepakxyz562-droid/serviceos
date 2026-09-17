'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

type ValidationRule = 'none' | 'email' | 'url' | 'alphanumeric' | 'alpha';

const validators: Record<ValidationRule, (v: string) => boolean> = {
  none: () => true,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  url: (v) => /^https?:\/\/.+\..+/.test(v),
  alphanumeric: (v) => /^[a-z0-9]+$/i.test(v),
  alpha: (v) => /^[a-z]+$/i.test(v),
};

/** Applies an input mask like "AAA-999": A = letter, 9 = digit, * = any. */
function applyMask(value: string, mask: string): string {
  let out = '';
  let vi = 0;
  for (let mi = 0; mi < mask.length && vi < value.length; mi++) {
    const m = mask[mi];
    const ch = value[vi];
    if (m === 'A') {
      if (/[a-z]/i.test(ch)) out += ch.toUpperCase();
      else break;
    } else if (m === '9') {
      if (/\d/.test(ch)) out += ch;
      else break;
    } else if (m === '*') {
      out += ch;
    } else {
      if (ch === m) out += ch;
      else out += m;
      continue;
    }
    vi++;
  }
  return out;
}

export function ShortText({ value, onChange, config, disabled, field }: WidgetProps) {
  const val = str(value, '');
  const placeholder = str(config.placeholder, str(field?.placeholder, 'Enter text...'));
  const maxLength = num(config.maxLength, 0);
  const mask = str(config.mask, '');
  const validation = str(config.validation, 'none') as ValidationRule;

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = e.target.value;
    if (mask) next = applyMask(next, mask);
    if (maxLength > 0) next = next.slice(0, maxLength);
    onChange(next);
  };

  const valid = validation === 'none' || val === '' || validators[validation]?.(val);
  const ariaLabel = str(field?.label, 'Short text');

  return (
    <Input
      value={val}
      onChange={handle}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength > 0 ? maxLength : undefined}
      aria-label={ariaLabel}
      aria-invalid={!valid}
    />
  );
}

export default ShortText;

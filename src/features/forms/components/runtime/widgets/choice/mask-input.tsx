'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str } from '../widget-props';

/**
 * Pattern mask: '#' OR '9' = digit, 'A' = letter, '*' = any char, others = literal.
 * Settings write masks using '9' for digits (e.g. "(999) 999-9999");
 * legacy runtime used '#'. Accept both placeholders so saved forms work.
 */
function applyPattern(input: string, pattern: string): string {
  let out = '';
  let pi = 0;
  for (let i = 0; i < input.length && pi < pattern.length; i++) {
    const ch = input[i];
    const p = pattern[pi];
    if (p === '#' || p === '9') {
      if (/\d/.test(ch)) {
        out += ch;
        pi++;
      }
    } else if (p === 'A') {
      if (/[a-z]/i.test(ch)) {
        out += ch.toUpperCase();
        pi++;
      }
    } else if (p === '*') {
      out += ch;
      pi++;
    } else {
      out += p;
      pi++;
      i--; // re-evaluate this char against next pattern slot
    }
  }
  return out;
}

export function MaskInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const pattern = str(config.mask, '');
  const placeholder = str(config.placeholder, pattern.replace(/[A#9*]/g, '0'));
  const ariaLabel = str(field?.label, 'Masked input');
  const val = str(value, '');

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!pattern) {
      onChange(e.target.value);
      return;
    }
    onChange(applyPattern(e.target.value, pattern));
  };

  const isNumeric = pattern && /[9#]/.test(pattern) && !pattern.includes('A');

  return (
    <Input
      value={val}
      onChange={handle}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      inputMode={isNumeric ? 'numeric' : 'text'}
    />
  );
}

export default MaskInput;

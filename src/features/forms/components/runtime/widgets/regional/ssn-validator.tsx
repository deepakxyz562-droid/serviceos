'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Format 9 raw digits into XXX-XX-XXXX. */
function formatSsn(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Validate US SSN by area/group/series rules (post-2011 randomization is
 * permissive: area 000, 666, 900-999 are still invalid; group 00 invalid;
 * serial 0000 invalid).
 */
function validateSsn(formatted: string): boolean {
  const m = /^(\d{3})-(\d{2})-(\d{4})$/.exec(formatted);
  if (!m) return false;
  const area = parseInt(m[1], 10);
  const group = parseInt(m[2], 10);
  const serial = parseInt(m[3], 10);
  if (area === 0 || area === 666 || area >= 900) return false;
  if (group === 0) return false;
  if (serial === 0) return false;
  return true;
}

export function SsnValidator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'SSN');
  const placeholder = str(config.placeholder, '000-00-0000');

  const formatted = formatSsn(initial);
  const isValid = formatted === '' ? null : validateSsn(formatted);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(formatSsn(v));
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
        {isValid === true && (
          <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
        )}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      {showErr && <p className="text-[11px] text-red-500">Invalid SSN (area/group/series rules).</p>}
      <p className="text-[10px] text-muted-foreground">
        Not stored — for formatting demo only.
      </p>
    </div>
  );
}

export default SsnValidator;

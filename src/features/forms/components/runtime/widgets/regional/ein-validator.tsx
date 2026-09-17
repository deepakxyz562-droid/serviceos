'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Format 9 raw digits into XX-XXXXXXX (EIN). */
function formatEin(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/**
 * Validate US EIN: 2-digit prefix + 7-digit serial. The IRS prefix list
 * changes; here we validate structurally + the prefix must be a known
 * campus prefix (subset).
 */
const VALID_PREFIXES = new Set([
  '01', '02', '03', '04', '05', '06', '10', '11', '12', '13', '14', '15', '16',
  '20', '21', '22', '23', '24', '25', '26', '27', '30', '31', '32', '33', '34',
  '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47',
  '48', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61',
  '62', '63', '64', '65', '66', '67', '68', '71', '72', '73', '74', '75', '76',
  '77', '80', '81', '82', '83', '84', '85', '86', '87', '88', '90', '91', '92',
  '93', '94', '95', '98', '99',
]);

function validateEin(formatted: string): boolean {
  const m = /^(\d{2})-(\d{7})$/.exec(formatted);
  if (!m) return false;
  if (!VALID_PREFIXES.has(m[1])) return false;
  if (m[2] === '0000000') return false;
  return true;
}

export function EinValidator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'EIN');
  const placeholder = str(config.placeholder, '00-0000000');

  const formatted = formatEin(initial);
  const isValid = formatted === '' ? null : validateEin(formatted);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(formatEin(v));
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
      {showErr && <p className="text-[11px] text-red-500">Invalid EIN (unknown prefix or malformed).</p>}
    </div>
  );
}

export default EinValidator;

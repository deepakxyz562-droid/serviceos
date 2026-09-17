'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Chinese 2nd-gen ID card: 17 digits + 1 check digit (0-9 or X). */
function cleanId(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 18);
}

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_MAP = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

function validateChinaId(id: string): boolean {
  if (!/^\d{17}[0-9X]$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(id[i], 10) * WEIGHTS[i];
  const expected = CHECK_MAP[sum % 11];
  return id[17] === expected;
}

export function ChinaIdCard({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'Chinese ID card');
  const placeholder = str(config.placeholder, '11010119900307727X');

  const cleaned = cleanId(initial);
  const isValid = cleaned === '' ? null : validateChinaId(cleaned);
  const showErr = touched && isValid === false;

  function commit(v: string) {
    onChange(cleanId(v));
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
          className="font-mono uppercase pr-9"
        />
        {isValid === true && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      {showErr && <p className="text-[11px] text-red-500">无效的身份证号 (校验位不匹配)。</p>}
      {isValid === true && <p className="text-[11px] text-emerald-600">身份证号有效。</p>}
    </div>
  );
}

export default ChinaIdCard;

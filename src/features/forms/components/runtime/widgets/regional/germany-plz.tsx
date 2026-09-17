'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Map of first-digit → broad postal region. */
const REGIONS: Record<string, string> = {
  '0': 'DD, BE, BB (Berlin, Brandenburg)',
  '1': 'BB, BE, MV (Berlin area)',
  '2': 'HH, HB, NI, SH, MV (North)',
  '3': 'HE, NI, NW, HE (Central)',
  '4': 'NW, RP, SL, HE (West)',
  '5': 'NW, RP, HE, SL (Rhineland)',
  '6': 'HE, RP, BW, BY, SL (South-Central)',
  '7': 'BW, BY (South-West)',
  '8': 'BY, BW (Bavaria)',
  '9': 'BY, BW, HE, TH (South-East)',
};

function normalize(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 5);
}

export function GermanyPlz({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'PLZ');
  const placeholder = str(config.placeholder, '00000');

  const digits = normalize(initial);
  const isValid = digits.length === 5;
  const region = digits.length > 0 ? REGIONS[digits[0]] : null;
  const showErr = touched && !isValid;

  function commit(v: string) {
    onChange(normalize(v));
    setTouched(true);
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="relative">
        <Input
          value={digits}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={showErr}
          inputMode="numeric"
          className="font-mono pr-9"
          maxLength={5}
        />
        {isValid && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      {showErr && <p className="text-[11px] text-red-500">PLZ must be exactly 5 digits.</p>}
      {isValid && region && (
        <p className="text-[11px] text-muted-foreground">
          Region: <span className="font-medium text-foreground">{region}</span>
        </p>
      )}
    </div>
  );
}

export default GermanyPlz;

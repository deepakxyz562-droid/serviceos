'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

interface VatRule {
  country: string;
  pattern: RegExp;
  label: string;
}

// Subset of EU VAT formats — basic structural check.
const RULES: VatRule[] = [
  { country: 'AT', label: 'Austria', pattern: /^ATU[0-9]{8}$/ },
  { country: 'BE', label: 'Belgium', pattern: /^BE0[0-9]{9}$/ },
  { country: 'BG', label: 'Bulgaria', pattern: /^BG[0-9]{9,10}$/ },
  { country: 'HR', label: 'Croatia', pattern: /^HR[0-9]{11}$/ },
  { country: 'CY', label: 'Cyprus', pattern: /^CY[0-9]{8}[A-Z]$/ },
  { country: 'CZ', label: 'Czechia', pattern: /^CZ[0-9]{8,10}$/ },
  { country: 'DK', label: 'Denmark', pattern: /^DK[0-9]{8}$/ },
  { country: 'EE', label: 'Estonia', pattern: /^EE[0-9]{9}$/ },
  { country: 'FI', label: 'Finland', pattern: /^FI[0-9]{8}$/ },
  { country: 'FR', label: 'France', pattern: /^FR[A-Z0-9]{2}[0-9]{9}$/ },
  { country: 'DE', label: 'Germany', pattern: /^DE[0-9]{9}$/ },
  { country: 'GR', label: 'Greece', pattern: /^EL[0-9]{9}$/ },
  { country: 'HU', label: 'Hungary', pattern: /^HU[0-9]{8}$/ },
  { country: 'IE', label: 'Ireland', pattern: /^IE[A-Z0-9+*]{7}[A-Z]$/ },
  { country: 'IT', label: 'Italy', pattern: /^IT[0-9]{11}$/ },
  { country: 'LV', label: 'Latvia', pattern: /^LV[0-9]{11}$/ },
  { country: 'LT', label: 'Lithuania', pattern: /^LT([0-9]{9}|[0-9]{12})$/ },
  { country: 'LU', label: 'Luxembourg', pattern: /^LU[0-9]{8}$/ },
  { country: 'MT', label: 'Malta', pattern: /^MT[0-9]{8}$/ },
  { country: 'NL', label: 'Netherlands', pattern: /^NL[0-9]{9}B[0-9]{2}$/ },
  { country: 'PL', label: 'Poland', pattern: /^PL[0-9]{10}$/ },
  { country: 'PT', label: 'Portugal', pattern: /^PT[0-9]{9}$/ },
  { country: 'RO', label: 'Romania', pattern: /^RO[0-9]{2,10}$/ },
  { country: 'SK', label: 'Slovakia', pattern: /^SK[0-9]{10}$/ },
  { country: 'SI', label: 'Slovenia', pattern: /^SI[0-9]{8}$/ },
  { country: 'ES', label: 'Spain', pattern: /^ES[A-Z][0-9]{7}[A-Z0-9]$/ },
  { country: 'SE', label: 'Sweden', pattern: /^SE[0-9]{10}01$/ },
];

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
}

export function VatValidator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const ariaLabel = str(field?.label, 'VAT number');
  const placeholder = str(config.placeholder, 'DE123456789');

  const normalized = normalize(initial);
  const rule = RULES.find((r) => r.pattern.test(normalized)) || null;
  const isValid = normalized.length === 0 ? null : !!rule;
  const showErr = touched && isValid === false;

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
          aria-invalid={showErr}
          className="font-mono uppercase pr-9"
        />
        {isValid === true && (
          <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
        )}
        {showErr && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
      </div>
      {showErr && <p className="text-[11px] text-red-500">Unknown or malformed VAT number format.</p>}
      {rule && (
        <p className="text-[11px] text-muted-foreground">
          Matched: <span className="font-medium text-foreground">{rule.label}</span> ({rule.country})
        </p>
      )}
    </div>
  );
}

export default VatValidator;

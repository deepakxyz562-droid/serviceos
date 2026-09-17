'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str } from '../widget-props';

interface Place {
  code: string;
  label: string;
}

const PROVINCES: Place[] = [
  { code: 'AB', label: 'Alberta' },
  { code: 'BC', label: 'British Columbia' },
  { code: 'MB', label: 'Manitoba' },
  { code: 'NB', label: 'New Brunswick' },
  { code: 'NL', label: 'Newfoundland and Labrador' },
  { code: 'NS', label: 'Nova Scotia' },
  { code: 'ON', label: 'Ontario' },
  { code: 'PE', label: 'Prince Edward Island' },
  { code: 'QC', label: 'Quebec' },
  { code: 'SK', label: 'Saskatchewan' },
];

const TERRITORIES: Place[] = [
  { code: 'NT', label: 'Northwest Territories' },
  { code: 'NU', label: 'Nunavut' },
  { code: 'YT', label: 'Yukon' },
];

export function CanadaProvinces({ value, onChange, disabled, field }: WidgetProps) {
  const valStr = typeof value === 'string' ? value : '';
  const ariaLabel = str(field?.label, 'Canadian province or territory');

  return (
    <Select value={valStr} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder="Select province or territory…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Provinces (10)</SelectLabel>
          {PROVINCES.map((p) => (
            <SelectItem key={p.code} value={p.code}>
              {p.label} ({p.code})
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Territories (3)</SelectLabel>
          {TERRITORIES.map((t) => (
            <SelectItem key={t.code} value={t.code}>
              {t.label} ({t.code})
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default CanadaProvinces;

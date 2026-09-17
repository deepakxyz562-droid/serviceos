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

// 28 states + 8 Union Territories (post J&K reorganization 2019 + Dadra & Nagar Haveli and Daman & Diu merger).
const STATES: Place[] = [
  { code: 'AN', label: 'Andhra Pradesh' },
  { code: 'AR', label: 'Arunachal Pradesh' },
  { code: 'AS', label: 'Assam' },
  { code: 'BR', label: 'Bihar' },
  { code: 'CT', label: 'Chhattisgarh' },
  { code: 'GA', label: 'Goa' },
  { code: 'GJ', label: 'Gujarat' },
  { code: 'HR', label: 'Haryana' },
  { code: 'HP', label: 'Himachal Pradesh' },
  { code: 'JH', label: 'Jharkhand' },
  { code: 'KA', label: 'Karnataka' },
  { code: 'KL', label: 'Kerala' },
  { code: 'MP', label: 'Madhya Pradesh' },
  { code: 'MH', label: 'Maharashtra' },
  { code: 'MN', label: 'Manipur' },
  { code: 'ML', label: 'Meghalaya' },
  { code: 'MZ', label: 'Mizoram' },
  { code: 'NL', label: 'Nagaland' },
  { code: 'OR', label: 'Odisha' },
  { code: 'PB', label: 'Punjab' },
  { code: 'RJ', label: 'Rajasthan' },
  { code: 'SK', label: 'Sikkim' },
  { code: 'TN', label: 'Tamil Nadu' },
  { code: 'TG', label: 'Telangana' },
  { code: 'TR', label: 'Tripura' },
  { code: 'UP', label: 'Uttar Pradesh' },
  { code: 'UT', label: 'Uttarakhand' },
  { code: 'WB', label: 'West Bengal' },
];

const UTS: Place[] = [
  { code: 'AN-UT', label: 'Andaman and Nicobar Islands' },
  { code: 'CH-UT', label: 'Chandigarh' },
  { code: 'DH-UT', label: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: 'DL', label: 'Delhi (NCT)' },
  { code: 'JK-UT', label: 'Jammu and Kashmir' },
  { code: 'LD-UT', label: 'Ladakh' },
  { code: 'LK-UT', label: 'Lakshadweep' },
  { code: 'PY-UT', label: 'Puducherry' },
];

export function IndiaStatesDropdown({ value, onChange, disabled, field }: WidgetProps) {
  const valStr = typeof value === 'string' ? value : '';
  const ariaLabel = str(field?.label, 'India state / UT');

  return (
    <Select value={valStr} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder="Select state or union territory…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>States (28)</SelectLabel>
          {STATES.map((s) => (
            <SelectItem key={s.code} value={s.code}>
              {s.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Union Territories (8)</SelectLabel>
          {UTS.map((u) => (
            <SelectItem key={u.code} value={u.code}>
              {u.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default IndiaStatesDropdown;

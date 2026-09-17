'use client';

import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str } from '../widget-props';

interface State {
  code: string;
  name: string;
}

const STATES: State[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

export function UsStatePicker({ value, onChange, config, disabled, field }: WidgetProps) {
  const allowSearch = str(config.mode, 'select') === 'search';
  const [query, setQuery] = useState('');
  const valStr = typeof value === 'string' ? value : '';
  const ariaLabel = str(field?.label, 'US state');

  const filtered = useMemo(() => {
    if (!query) return STATES;
    const q = query.toLowerCase();
    return STATES.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [query]);

  if (allowSearch) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search state…"
          disabled={disabled}
          aria-label={`${ariaLabel} (search)`}
          className="h-9"
        />
        <Select value={valStr} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger aria-label={ariaLabel} className="w-full">
            <SelectValue placeholder="Select state…" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {filtered.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
              {filtered.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No match</div>}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Select value={valStr} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder="Select state…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {STATES.map((s) => (
            <SelectItem key={s.code} value={s.code}>
              {s.name} ({s.code})
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default UsStatePicker;

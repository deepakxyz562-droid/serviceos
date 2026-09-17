'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, bool } from '../widget-props';

interface AddressValue {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AE', name: 'United Arab Emirates' },
];

export function Address({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: AddressValue = value && typeof value === 'object' ? (value as AddressValue) : {};
  const defaultCountry = str(config.countryDefault, 'US');
  const stateMode = str(config.stateMode, 'dropdown');
  const ariaLabel = str(field?.label, 'Address');

  const country = obj.country || defaultCountry;
  const set = (patch: Partial<AddressValue>) => onChange({ line1: '', city: '', postalCode: '', country: defaultCountry, ...obj, ...patch });

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={obj.line1 || ''}
          onChange={(e) => set({ line1: e.target.value })}
          placeholder="Street address"
          disabled={disabled}
          aria-label={`${ariaLabel} line 1`}
          className="pl-9"
        />
      </div>
      <Input
        value={obj.line2 || ''}
        onChange={(e) => set({ line2: e.target.value })}
        placeholder="Apartment, suite, etc. (optional)"
        disabled={disabled}
        aria-label={`${ariaLabel} line 2`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          value={obj.city || ''}
          onChange={(e) => set({ city: e.target.value })}
          placeholder="City"
          disabled={disabled}
          aria-label={`${ariaLabel} city`}
        />
        <Input
          value={obj.postalCode || ''}
          onChange={(e) => set({ postalCode: e.target.value })}
          placeholder="Postal / ZIP code"
          disabled={disabled}
          aria-label={`${ariaLabel} postal code`}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {stateMode === 'dropdown' && country === 'US' ? (
          <Select value={obj.state || ''} onValueChange={(v) => set({ state: v })} disabled={disabled}>
            <SelectTrigger aria-label={`${ariaLabel} state`}>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={obj.state || ''}
            onChange={(e) => set({ state: e.target.value })}
            placeholder="State / Province"
            disabled={disabled}
            aria-label={`${ariaLabel} state`}
          />
        )}
        <Select value={country} onValueChange={(v) => set({ country: v })} disabled={disabled}>
          <SelectTrigger aria-label={`${ariaLabel} country`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default Address;

'use client';

import React from 'react';
import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, bool } from '../widget-props';

interface NameValue {
  first?: string;
  middle?: string;
  last?: string;
  prefix?: string;
  suffix?: string;
}

const PREFIXES = ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const SUFFIXES = ['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'PhD', 'MD'];

export function FullName({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: NameValue = value && typeof value === 'object' ? (value as NameValue) : {};
  // Settings write `middleName`/`prefix`/`suffix`; legacy runtime read
  // `includeMiddle`/`includePrefix`/`includeSuffix`. Read settings keys first
  // and fall back to legacy keys for backward compatibility.
  const includeMiddle = bool(config.middleName ?? config.includeMiddle, true);
  const includePrefix = bool(config.prefix ?? config.includePrefix, false);
  const includeSuffix = bool(config.suffix ?? config.includeSuffix, false);
  const ariaLabel = str(field?.label, 'Full name');

  const set = (patch: Partial<NameValue>) => onChange({ first: '', last: '', ...obj, ...patch });

  return (
    <div className="space-y-2">
      {includePrefix && (
        <select
          value={obj.prefix || ''}
          onChange={(e) => set({ prefix: e.target.value })}
          disabled={disabled}
          aria-label={`${ariaLabel} prefix`}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
        >
          {PREFIXES.map((p) => (
            <option key={p} value={p}>
              {p || 'Prefix'}
            </option>
          ))}
        </select>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="relative">
          <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={obj.first || ''}
            onChange={(e) => set({ first: e.target.value })}
            placeholder="First name"
            disabled={disabled}
            aria-label={`${ariaLabel} first name`}
            className="pl-9"
          />
        </div>
        <Input
          value={obj.last || ''}
          onChange={(e) => set({ last: e.target.value })}
          placeholder="Last name"
          disabled={disabled}
          aria-label={`${ariaLabel} last name`}
        />
      </div>
      {includeMiddle && (
        <Input
          value={obj.middle || ''}
          onChange={(e) => set({ middle: e.target.value })}
          placeholder="Middle name"
          disabled={disabled}
          aria-label={`${ariaLabel} middle name`}
        />
      )}
      {includeSuffix && (
        <select
          value={obj.suffix || ''}
          onChange={(e) => set({ suffix: e.target.value })}
          disabled={disabled}
          aria-label={`${ariaLabel} suffix`}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
        >
          {SUFFIXES.map((s) => (
            <option key={s} value={s}>
              {s || 'Suffix'}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default FullName;

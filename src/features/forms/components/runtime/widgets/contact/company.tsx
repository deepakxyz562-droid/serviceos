'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, bool } from '../widget-props';

interface CompanyValue {
  name?: string;
  size?: string;
  industry?: string;
  title?: string;
  website?: string;
}

const SIZES = [
  { label: '1-10 employees', value: '1-10' },
  { label: '11-50 employees', value: '11-50' },
  { label: '51-200 employees', value: '51-200' },
  { label: '201-500 employees', value: '201-500' },
  { label: '501-1000 employees', value: '501-1000' },
  { label: '1000+ employees', value: '1000+' },
];

const INDUSTRIES = [
  'Technology / Software',
  'Healthcare',
  'Finance / Banking',
  'Education',
  'Manufacturing',
  'Retail / E-commerce',
  'Construction',
  'Hospitality',
  'Transportation / Logistics',
  'Real Estate',
  'Media / Marketing',
  'Government',
  'Non-profit',
  'Other',
];

export function Company({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: CompanyValue = value && typeof value === 'object' ? (value as CompanyValue) : {};
  const includeSize = bool(config.includeSize, true);
  const includeIndustry = bool(config.includeIndustry, true);
  const includeTitle = bool(config.includeTitle, false);
  const includeWebsite = bool(config.includeWebsite, false);
  const ariaLabel = str(field?.label, 'Company');

  const set = (patch: Partial<CompanyValue>) => onChange({ name: '', ...obj, ...patch });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Building2 className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={obj.name || ''}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Company name"
          disabled={disabled}
          aria-label={`${ariaLabel} name`}
          className="pl-9"
        />
      </div>
      {includeTitle && (
        <Input
          value={obj.title || ''}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Your job title"
          disabled={disabled}
          aria-label={`${ariaLabel} job title`}
        />
      )}
      {includeWebsite && (
        <Input
          type="url"
          value={obj.website || ''}
          onChange={(e) => set({ website: e.target.value })}
          placeholder="https://company.com"
          disabled={disabled}
          aria-label={`${ariaLabel} website`}
        />
      )}
      {includeSize && (
        <Select value={obj.size || ''} onValueChange={(v) => set({ size: v })} disabled={disabled}>
          <SelectTrigger aria-label={`${ariaLabel} size`}>
            <SelectValue placeholder="Company size" />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {includeIndustry && (
        <Select value={obj.industry || ''} onValueChange={(v) => set({ industry: v })} disabled={disabled}>
          <SelectTrigger aria-label={`${ariaLabel} industry`}>
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default Company;

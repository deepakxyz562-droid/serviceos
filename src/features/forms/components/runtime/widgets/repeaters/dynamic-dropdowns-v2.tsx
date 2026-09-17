'use client';

import React, { useMemo, useState } from 'react';
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

interface Tree {
  [make: string]: { [model: string]: string[] };
}

// Inline dataset (sample car makes → models → years).
const DATA: Tree = {
  Toyota: {
    Corolla: ['2020', '2021', '2022', '2023'],
    Camry: ['2019', '2020', '2021', '2022', '2023'],
    RAV4: ['2020', '2021', '2022', '2023'],
    Hilux: ['2018', '2019', '2020', '2021'],
  },
  Honda: {
    Civic: ['2019', '2020', '2021', '2022', '2023'],
    Accord: ['2018', '2019', '2020', '2021'],
    CRV: ['2020', '2021', '2022', '2023'],
  },
  Ford: {
    Focus: ['2017', '2018', '2019', '2020'],
    Mustang: ['2018', '2019', '2020', '2021', '2022'],
    F150: ['2019', '2020', '2021', '2022', '2023'],
  },
  Tesla: {
    Model3: ['2018', '2019', '2020', '2021', '2022', '2023'],
    ModelS: ['2018', '2019', '2020', '2021', '2022'],
    ModelY: ['2020', '2021', '2022', '2023'],
  },
};

interface CascadeValue {
  make?: string;
  model?: string;
  year?: string;
}

export function DynamicDropdownsV2({ value, onChange, disabled, field }: WidgetProps) {
  const v: CascadeValue = (value as CascadeValue) || {};
  const [touched, setTouched] = useState(false);
  const ariaLabel = str(field?.label, 'Vehicle');

  const models = useMemo(() => (v.make ? Object.keys(DATA[v.make] || {}) : []), [v.make]);
  const years = useMemo(() => (v.make && v.model ? DATA[v.make][v.model] || [] : []), [v.make, v.model]);

  function pickMake(make: string) {
    onChange({ make, model: '', year: '' });
    setTouched(true);
  }
  function pickModel(model: string) {
    onChange({ ...v, model, year: '' });
  }
  function pickYear(year: string) {
    onChange({ ...v, year });
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Select value={v.make || ''} onValueChange={pickMake} disabled={disabled}>
        <SelectTrigger aria-label={`${ariaLabel}: make`} className="w-full">
          <SelectValue placeholder="Make…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Make</SelectLabel>
            {Object.keys(DATA).map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select value={v.model || ''} onValueChange={pickModel} disabled={disabled || !v.make}>
        <SelectTrigger aria-label={`${ariaLabel}: model`} className="w-full">
          <SelectValue placeholder={v.make ? 'Model…' : 'Pick a make first'} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Model</SelectLabel>
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select value={v.year || ''} onValueChange={pickYear} disabled={disabled || !v.model}>
        <SelectTrigger aria-label={`${ariaLabel}: year`} className="w-full">
          <SelectValue placeholder={v.model ? 'Year…' : 'Pick a model first'} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Year</SelectLabel>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {touched && v.make && v.model && v.year && (
        <p className="text-[11px] text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{v.year} {v.make} {v.model}</span>
        </p>
      )}
    </div>
  );
}

export default DynamicDropdownsV2;

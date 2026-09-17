'use client';

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { WidgetProps, normalizeOptions, str, bool } from '../widget-props';

const COL_CLASS: Record<string, string> = {
  '1': 'grid grid-cols-1 gap-2',
  '2': 'grid grid-cols-2 gap-2',
  '3': 'grid grid-cols-3 gap-2',
  inline: 'flex flex-wrap gap-3',
};

export function SingleChoice({ value, onChange, config, disabled, field }: WidgetProps) {
  const options = normalizeOptions(config.options);
  const allowOther = bool(config.allowOther, false);
  const columns = str(config.columns, '1');
  const ariaLabel = str(field?.label, 'Single choice');
  const valStr = typeof value === 'string' ? value : '';
  const isOther = allowOther && valStr && !options.some((o) => o.value === valStr);
  const [otherText, setOtherText] = React.useState(isOther ? valStr : '');

  const commit = (v: string, other = '') => {
    setOtherText(other);
    onChange(v);
  };

  return (
    <div className="space-y-2">
      <RadioGroup
        value={isOther ? '__other__' : valStr}
        onValueChange={(v) => commit(v === '__other__' ? otherText || '' : v)}
        disabled={disabled}
        className={COL_CLASS[columns] || COL_CLASS['1']}
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem value={opt.value} id={`sc-${opt.value}`} disabled={disabled} />
            <Label htmlFor={`sc-${opt.value}`} className="text-sm font-normal cursor-pointer">
              {opt.label}
            </Label>
          </div>
        ))}
        {allowOther && (
          <div className="flex items-center gap-2">
            <RadioGroupItem value="__other__" id="sc-other" disabled={disabled} />
            <Label htmlFor="sc-other" className="text-sm font-normal cursor-pointer">
              Other
            </Label>
          </div>
        )}
      </RadioGroup>
      {isOther && (
        <Input
          value={otherText}
          onChange={(e) => commit(e.target.value, e.target.value)}
          disabled={disabled}
          placeholder="Please specify..."
          aria-label={`${ariaLabel} (other)`}
        />
      )}
    </div>
  );
}

export default SingleChoice;

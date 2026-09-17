'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { WidgetProps, normalizeOptions, str, bool, num } from '../widget-props';

const COL_CLASS: Record<string, string> = {
  '1': 'grid grid-cols-1 gap-2',
  '2': 'grid grid-cols-2 gap-2',
  '3': 'grid grid-cols-3 gap-2',
  inline: 'flex flex-wrap gap-4',
};

export function MultipleChoice({ value, onChange, config, disabled, field }: WidgetProps) {
  const options = normalizeOptions(config.options);
  const allowOther = bool(config.allowOther, false);
  const minSelect = Math.max(0, num(config.minSelect, 0));
  const maxSelect = Math.max(0, num(config.maxSelect, 0));
  const columns = str(config.columns, '1');
  const ariaLabel = str(field?.label, 'Multiple choice');

  const selected: string[] = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
  const otherValue = '__other__';
  const otherSelected = selected.includes(otherValue);
  const [otherText, setOtherText] = React.useState('');

  const toggle = (v: string) => {
    const has = selected.includes(v);
    let next: string[];
    if (has) {
      if (selected.length - 1 < minSelect) return; // honor min
      next = selected.filter((s) => s !== v);
    } else {
      if (maxSelect > 0 && selected.length + 1 > maxSelect) return; // honor max
      next = [...selected, v];
    }
    onChange(next);
  };

  const otherTextUpdate = (txt: string) => {
    setOtherText(txt);
    if (otherSelected) {
      onChange([...selected.filter((s) => s !== otherValue), txt].filter(Boolean));
    }
  };

  return (
    <div className="space-y-2">
      <div className={COL_CLASS[columns] || COL_CLASS['1']} aria-label={ariaLabel} role="group">
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                id={`mc-${opt.value}`}
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => toggle(opt.value)}
              />
              <Label htmlFor={`mc-${opt.value}`} className="text-sm font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          );
        })}
        {allowOther && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="mc-other"
              checked={otherSelected}
              disabled={disabled}
              onCheckedChange={() => toggle(otherValue)}
            />
            <Label htmlFor="mc-other" className="text-sm font-normal cursor-pointer">
              Other
            </Label>
          </div>
        )}
      </div>
      {otherSelected && (
        <Input
          value={otherText}
          onChange={(e) => otherTextUpdate(e.target.value)}
          disabled={disabled}
          placeholder="Please specify..."
          aria-label={`${ariaLabel} (other)`}
        />
      )}
      {(minSelect > 0 || maxSelect > 0) && (
        <p className="text-[11px] text-muted-foreground">
          {minSelect > 0 && `Min ${minSelect} `}
          {maxSelect > 0 && `Max ${maxSelect} `}
          selected: {selected.length}
        </p>
      )}
    </div>
  );
}

export default MultipleChoice;

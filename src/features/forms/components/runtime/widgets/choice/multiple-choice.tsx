'use client';

import React, { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { WidgetProps, normalizeOptions, str, bool, num } from '../widget-props';

/** Deterministic shuffle for randomize option — stable across SSR/CSR. */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const COL_CLASS: Record<string, string> = {
  '1': 'grid grid-cols-1 gap-2.5',
  '2': 'grid grid-cols-1 sm:grid-cols-2 gap-2.5',
  '3': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5',
  '4': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5',
  inline: 'flex flex-wrap gap-4',
};

const DEFAULT_SAMPLE_OPTIONS = [
  'Type option 1',
  'Type option 2',
  'Type option 3',
  'Type option 4',
];

export function MultipleChoice({ value, onChange, config, disabled, field }: WidgetProps) {
  const rawOptions = config.options || (field as any)?.options;
  const baseOptions = normalizeOptions(
    Array.isArray(rawOptions) && rawOptions.length > 0
      ? rawOptions
      : DEFAULT_SAMPLE_OPTIONS
  );
  const allowOther = bool(config.allowOther, false);
  const otherPlaceholder = str(config.otherText, 'Other');
  const selectAllOption = bool(config.selectAllOption, false);
  const allowNone = bool(config.allowNone, false);
  const randomize = bool(config.randomize, false);
  const minSelect = Math.max(0, num(config.minSelect, 0));
  const maxSelect = Math.max(0, num(config.maxSelect, 0));
  const columns = str(config.columns, '1');
  const ariaLabel = str(field?.label, 'Multiple choice');
  const fieldId = str(field?.id, 'multiple_choice');

  // Shuffle options when randomize is enabled — stable seed prevents hydration mismatch.
  const options = useMemo(() => {
    if (randomize) return seededShuffle(baseOptions, fieldId);
    return baseOptions;
  }, [baseOptions, randomize, fieldId]);

  const selected: string[] = Array.isArray(value)
    ? value.map(String)
    : value
      ? [String(value)]
      : [];

  const otherValue = '__other__';
  const noneValue = '__none__';
  const otherSelected = selected.includes(otherValue);
  const noneSelected = selected.includes(noneValue);
  const [otherText, setOtherText] = React.useState('');

  const allOptionValues = options.map((o) => o.value);
  const isAllSelected =
    options.length > 0 && options.every((o) => selected.includes(o.value));

  const toggle = (v: string) => {
    // If "None" was selected, deselect it when any regular option is clicked
    const cleanSelected = selected.filter((s) => s !== noneValue);
    const has = cleanSelected.includes(v);
    let next: string[];
    if (has) {
      if (cleanSelected.length - 1 < minSelect) return; // honor min
      next = cleanSelected.filter((s) => s !== v);
    } else {
      if (maxSelect > 0 && cleanSelected.length + 1 > maxSelect) return; // honor max
      next = [...cleanSelected, v];
    }
    onChange(next);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(allOptionValues);
    }
  };

  const toggleNone = () => {
    if (noneSelected) {
      onChange([]);
    } else {
      // "None of the above" deselects everything else
      onChange([noneValue]);
    }
  };

  const otherTextUpdate = (txt: string) => {
    setOtherText(txt);
    if (otherSelected) {
      onChange([
        ...selected.filter((s) => s !== otherValue && s !== noneValue),
        txt || otherValue,
      ]);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {selectAllOption && (
        <div className="flex items-center gap-2.5 pb-2 mb-1 border-b border-border/60">
          <Checkbox
            id={`mc-select-all-${field?.id || 'all'}`}
            checked={isAllSelected}
            disabled={disabled}
            onCheckedChange={toggleSelectAll}
            className="rounded-md"
          />
          <Label
            htmlFor={`mc-select-all-${field?.id || 'all'}`}
            className="text-xs font-bold text-foreground cursor-pointer select-none"
          >
            Select All
          </Label>
        </div>
      )}

      <div className={COL_CLASS[columns] || COL_CLASS['1']} aria-label={ariaLabel} role="group">
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <div
              key={opt.value}
              className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors"
            >
              <Checkbox
                id={`mc-${opt.value}`}
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => toggle(opt.value)}
                className="rounded-md"
              />
              <Label htmlFor={`mc-${opt.value}`} className="text-xs font-medium text-foreground cursor-pointer flex-1">
                {opt.label}
              </Label>
            </div>
          );
        })}

        {allowOther && (
          <div className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors">
            <Checkbox
              id="mc-other"
              checked={otherSelected}
              disabled={disabled}
              onCheckedChange={() => {
                if (otherSelected) {
                  onChange(selected.filter((s) => s !== otherValue && s !== otherText));
                } else {
                  onChange([...selected.filter((s) => s !== noneValue), otherValue]);
                }
              }}
              className="rounded-md"
            />
            <Label htmlFor="mc-other" className="text-xs font-medium text-foreground cursor-pointer flex-1">
              {otherPlaceholder}
            </Label>
          </div>
        )}

        {allowNone && (
          <div className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors">
            <Checkbox
              id="mc-none"
              checked={noneSelected}
              disabled={disabled}
              onCheckedChange={toggleNone}
              className="rounded-md"
            />
            <Label htmlFor="mc-none" className="text-xs font-medium text-muted-foreground italic cursor-pointer flex-1">
              None of the above
            </Label>
          </div>
        )}
      </div>

      {otherSelected && (
        <Input
          value={otherText}
          onChange={(e) => otherTextUpdate(e.target.value)}
          disabled={disabled}
          placeholder="Please specify other..."
          className="h-8 text-xs bg-background mt-1"
          aria-label={`${ariaLabel} (other)`}
        />
      )}

      {(minSelect > 0 || maxSelect > 0) && (
        <p className="text-[10px] text-muted-foreground">
          {minSelect > 0 && `Min ${minSelect} `}
          {maxSelect > 0 && `Max ${maxSelect} `}
          selected: {selected.length}
        </p>
      )}
    </div>
  );
}

export default MultipleChoice;

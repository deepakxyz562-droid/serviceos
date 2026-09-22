'use client';

import React, { useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { WidgetProps, normalizeOptions, str, bool } from '../widget-props';

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
  '1': 'grid grid-cols-1 gap-2',
  '2': 'grid grid-cols-1 sm:grid-cols-2 gap-2',
  '3': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2',
  '4': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2',
  inline: 'flex flex-wrap gap-3',
};

export function SingleChoice({ value, onChange, config, disabled, field }: WidgetProps) {
  // Fall back to field.options when config.options is undefined (basic choice fields
  // added via Basic palette tab don't have widgetConfig.options — they have field.options).
  const rawOptions = config.options || (field as any)?.options;
  const baseOptions = normalizeOptions(rawOptions);
  const allowOther = bool(config.allowOther, false);
  const allowNone = bool(config.allowNone, false);
  const otherPlaceholder = str(config.otherText, 'Other');
  const randomize = bool(config.randomize, false);
  const columns = str(config.columns, '1');
  const ariaLabel = str(field?.label, 'Single choice');
  const fieldId = str(field?.id, 'single_choice');

  // Shuffle options when randomize is enabled — stable seed prevents hydration mismatch.
  const options = useMemo(() => {
    if (randomize) return seededShuffle(baseOptions, fieldId);
    return baseOptions;
  }, [baseOptions, randomize, fieldId]);

  const valStr = typeof value === 'string' ? value : '';
  const isNone = allowNone && valStr === '__none__';
  const isOther = allowOther && valStr && valStr !== '__none__' && !options.some((o) => o.value === valStr);
  const [otherText, setOtherText] = React.useState(isOther ? valStr : '');

  const commit = (v: string, other = '') => {
    setOtherText(other);
    onChange(v);
  };

  return (
    <div className="space-y-2">
      <RadioGroup
        value={isNone ? '__none__' : isOther ? '__other__' : valStr}
        onValueChange={(v) => {
          if (v === '__none__') commit('__none__');
          else if (v === '__other__') commit(otherText || '');
          else commit(v);
        }}
        disabled={disabled}
        className={COL_CLASS[columns] || COL_CLASS['1']}
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem value={opt.value} id={`sc-${fieldId}-${opt.value}`} disabled={disabled} />
            <Label htmlFor={`sc-${fieldId}-${opt.value}`} className="text-sm font-normal cursor-pointer">
              {opt.label}
            </Label>
          </div>
        ))}
        {allowNone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RadioGroupItem value="__none__" id={`sc-${fieldId}-none`} disabled={disabled} />
            <Label htmlFor={`sc-${fieldId}-none`} className="text-sm font-normal italic cursor-pointer">
              None of the above
            </Label>
          </div>
        )}
        {allowOther && (
          <div className="flex items-center gap-2">
            <RadioGroupItem value="__other__" id={`sc-${fieldId}-other`} disabled={disabled} />
            <Label htmlFor={`sc-${fieldId}-other`} className="text-sm font-normal cursor-pointer">
              {otherPlaceholder}
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

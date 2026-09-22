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
  '2': 'grid grid-cols-2 gap-2',
  '3': 'grid grid-cols-3 gap-2',
  inline: 'flex flex-wrap gap-3',
};

export function SingleChoice({ value, onChange, config, disabled, field }: WidgetProps) {
  // Fall back to field.options when config.options is undefined (basic choice fields
  // added via Basic palette tab don't have widgetConfig.options — they have field.options).
  const rawOptions = config.options || (field as any)?.options;
  const baseOptions = normalizeOptions(rawOptions);
  const allowOther = bool(config.allowOther, false);
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

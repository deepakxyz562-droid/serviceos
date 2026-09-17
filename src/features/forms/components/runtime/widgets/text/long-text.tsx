'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, num, bool } from '../widget-props';

export function LongText({ value, onChange, config, disabled, field }: WidgetProps) {
  const val = str(value, '');
  const placeholder = str(config.placeholder, str(field?.placeholder, 'Enter detailed response...'));
  const rows = Math.max(2, Math.min(20, num(config.rows, 4)));
  const maxLength = num(config.maxLength, 0);
  const showCounter = bool(config.showCounter, false);
  const ariaLabel = str(field?.label, 'Long text');

  const handle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let next = e.target.value;
    if (maxLength > 0) next = next.slice(0, maxLength);
    onChange(next);
  };

  return (
    <div className="space-y-1">
      <Textarea
        value={val}
        onChange={handle}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength > 0 ? maxLength : undefined}
        aria-label={ariaLabel}
      />
      {showCounter && (
        <div className="text-right text-[11px] text-muted-foreground font-mono">
          {val.length}
          {maxLength > 0 ? ` / ${maxLength}` : ''}
        </div>
      )}
    </div>
  );
}

export default LongText;

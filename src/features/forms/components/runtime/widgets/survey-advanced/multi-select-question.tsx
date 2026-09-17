'use client';

import React, { useMemo } from 'react';
import { WidgetProps, str, num, bool, normalizeOptions, NormalizedOption } from '../widget-props';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, Check } from 'lucide-react';

interface MultiValue {
  selected: string[];
}

export function MultiSelectQuestion({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Multi-select question');
  const showSelectAll = bool(config.showSelectAll, false);
  const minRequired = Math.max(0, num(config.min, 0));
  const maxAllowed = Math.max(0, num(config.max, 0));
  const layout = str(config.layout, 'list'); // list | grid

  const options: NormalizedOption[] = useMemo(() => normalizeOptions(config.options), [config.options]);

  const v: MultiValue = value && typeof value === 'object' && Array.isArray((value as MultiValue).selected)
    ? (value as MultiValue)
    : { selected: [] };
  const selected: string[] = v.selected.filter((id) => options.some((o) => o.value === id));

  const emit = (next: string[]) => onChange({ selected: next });

  const toggle = (val: string) => {
    if (disabled) return;
    if (selected.includes(val)) {
      emit(selected.filter((x) => x !== val));
      return;
    }
    if (maxAllowed > 0 && selected.length >= maxAllowed) return;
    emit([...selected, val]);
  };

  const selectAll = () => {
    if (disabled) return;
    if (selected.length === options.length) {
      emit([]);
    } else {
      emit(options.map((o) => o.value));
    }
  };

  const allSelected = options.length > 0 && selected.length === options.length;
  const tooFew = minRequired > 0 && selected.length < minRequired;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      {showSelectAll && options.length > 1 && (
        <button
          type="button"
          disabled={disabled}
          onClick={selectAll}
          className="w-full flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
          aria-pressed={allSelected}
        >
          {allSelected ? <CheckSquare className="size-3.5 text-primary" /> : <Square className="size-3.5" />}
          {allSelected ? 'Deselect all' : 'Select all that apply'}
        </button>
      )}

      <div className={cn(layout === 'grid' ? 'grid grid-cols-2 gap-1.5' : 'space-y-1')}>
        {options.map((o) => {
          const isSel = selected.includes(o.value);
          const disabledHere = disabled || (!isSel && maxAllowed > 0 && selected.length >= maxAllowed);
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabledHere}
              onClick={() => toggle(o.value)}
              aria-pressed={isSel}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-left transition-all active:scale-[0.98]',
                isSel
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card hover:bg-muted text-foreground',
                disabledHere && !disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center size-4 rounded border transition-colors shrink-0',
                  isSel ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
                )}
              >
                {isSel && <Check className="size-3" />}
              </span>
              <span className="flex-1 truncate">{o.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {selected.length} selected
          {minRequired > 0 && ` · min ${minRequired}`}
          {maxAllowed > 0 && ` · max ${maxAllowed}`}
        </span>
        {tooFew && (
          <Badge variant="outline" className="text-[9px] h-4 text-amber-700 border-amber-300">
            {minRequired - selected.length} more needed
          </Badge>
        )}
      </div>
    </div>
  );
}

export default MultiSelectQuestion;

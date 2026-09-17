'use client';

import React, { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps, normalizeOptions, str } from '../widget-props';

export function TagCloudInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const options = normalizeOptions(config.options);
  const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
  const [filter, setFilter] = useState('');
  const ariaLabel = str(field?.label, 'Tag cloud');

  function toggle(v: string) {
    if (disabled) return;
    const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
    onChange(next);
  }

  function remove(v: string) {
    if (disabled) return;
    onChange(selected.filter((s) => s !== v));
  }

  // Assign each option a pseudo-random visual weight based on its index.
  const WEIGHTS = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];

  const filtered = options.filter(
    (o) =>
      !filter ||
      o.label.toLowerCase().includes(filter.toLowerCase()) ||
      o.value.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      {options.length > 6 && (
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={disabled}
          placeholder="Filter tags…"
          className="h-8 text-xs"
          aria-label={`${ariaLabel} filter`}
        />
      )}
      <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-muted/30 border border-border/60 min-h-16">
        {filtered.length === 0 && (
          <span className="text-[11px] text-muted-foreground">No tags.</span>
        )}
        {filtered.map((opt, i) => {
          const isSel = selected.includes(opt.value);
          const weight = WEIGHTS[i % WEIGHTS.length];
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              aria-pressed={isSel}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 font-medium transition-all ${weight} ${
                isSel
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background text-foreground/80 border border-border hover:border-primary/50 hover:bg-muted'
              } ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-105'}`}
            >
              <Tag className="size-3" />
              {opt.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium"
              >
                {opt?.label || v}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(v)}
                    className="rounded-full hover:bg-primary/20"
                    aria-label={`Remove ${v}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      {options.length === 0 && !disabled && (
        <Button type="button" variant="outline" size="sm" disabled className="text-xs h-7">
          <Plus className="size-3.5" /> Configure tags in field settings
        </Button>
      )}
    </div>
  );
}

export default TagCloudInput;

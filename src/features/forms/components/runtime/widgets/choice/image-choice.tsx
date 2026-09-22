'use client';

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { WidgetProps, normalizeOptions, str, bool } from '../widget-props';

interface ImageOption {
  label: string;
  value: string;
  image?: string;
}

function toImageOptions(raw: unknown): ImageOption[] {
  return normalizeOptions(raw).map((o) => {
    const source = Array.isArray(raw) ? raw.find((r) => (typeof r === 'object' && r && (r as any).value === o.value) || (typeof r === 'string' && r === o.value)) : null;
    const img = source && typeof source === 'object' ? (source as any).image : undefined;
    return { ...o, image: typeof img === 'string' ? img : undefined };
  });
}

export function ImageChoice({ value, onChange, config, disabled, field }: WidgetProps) {
  const rawOptions = config.options || (field as any)?.options || [
    { label: 'Option 1', value: 'opt_1' },
    { label: 'Option 2', value: 'opt_2' },
    { label: 'Option 3', value: 'opt_3' },
  ];
  const options = toImageOptions(rawOptions);
  const multiSelect = bool(config.multiSelect, false);
  const columns = str(config.columns, '3');
  const ariaLabel = str(field?.label, 'Image choice');

  const selected: string[] = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];

  const toggle = (v: string) => {
    if (multiSelect) {
      const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
      onChange(next);
    } else {
      onChange(selected.includes(v) ? '' : v);
    }
  };

  const colMap: Record<string, string> = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
  };

  return (
    <div className={`grid ${colMap[columns] || 'grid-cols-3'} gap-3`} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.value)}
            aria-pressed={checked}
            aria-label={`${ariaLabel}: ${opt.label}`}
            className={`group relative flex flex-col overflow-hidden rounded-lg border-2 bg-background transition-all ${
              checked ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-muted-foreground/40'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
              {opt.image ? (
                <img src={opt.image} alt={opt.label} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="p-2 text-center">
              <span className="text-xs font-medium leading-tight block">{opt.label}</span>
            </div>
            {checked && (
              <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ImageChoice;

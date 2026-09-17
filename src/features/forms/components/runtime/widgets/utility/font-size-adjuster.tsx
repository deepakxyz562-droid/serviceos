'use client';

import React, { useState, useEffect } from 'react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';
import { cn } from '@/lib/utils';

interface FontSizeValue {
  action: 'font_size_change';
  size: 'small' | 'medium' | 'large';
  timestamp: string;
}

const SIZES: { id: 'small' | 'medium' | 'large'; label: string; px: number }[] = [
  { id: 'small', label: 'A', px: 14 },
  { id: 'medium', label: 'A', px: 16 },
  { id: 'large', label: 'A', px: 19 },
];

export function FontSizeAdjuster({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Font size');
  const existing = (value as Partial<FontSizeValue> | undefined) ?? {};
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(existing.size ?? 'medium');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const px = SIZES.find((s) => s.id === size)?.px ?? 16;
    document.documentElement.style.fontSize = `${px}px`;
  }, [size]);

  const apply = (next: 'small' | 'medium' | 'large') => {
    if (disabled) return;
    setSize(next);
    onChange({ action: 'font_size_change', size: next, timestamp: new Date().toISOString() } as FontSizeValue);
  };

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 mb-1">
        <Type className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">{ariaLabel}</span>
      </div>
      <div role="group" className="grid grid-cols-3 gap-1">
        {SIZES.map((s) => (
          <Button
            key={s.id}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => apply(s.id)}
            className={cn('h-9 text-xs gap-1', size === s.id ? 'border-primary text-primary bg-primary/5' : '')}
            aria-pressed={size === s.id}
            aria-label={`${s.id} font size`}
          >
            <span style={{ fontSize: `${s.px - 2}px` }}>{s.label}</span>
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Current: <span className="font-semibold">{SIZES.find((s) => s.id === size)?.px ?? 16}px</span>
      </p>
    </div>
  );
}

export default FontSizeAdjuster;

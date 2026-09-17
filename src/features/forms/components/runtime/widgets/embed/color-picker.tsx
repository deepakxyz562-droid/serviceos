'use client';

import React, { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { WidgetProps } from '../widget-props';

const DEFAULT_SWATCHES = [
  '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#06B6D4', '#A855F7', '#EAB308', '#22C55E', '#64748B',
  '#000000', '#FFFFFF', '#F43F5E',
];

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function normalizeHex(input: string): string {
  if (!input) return '#000000';
  if (HEX_RE.test(input)) return input;
  if (/^#?[0-9a-fA-F]{6}$/.test(input)) return `#${input.replace(/^#/, '')}`;
  if (/^#?[0-9a-fA-F]{3}$/.test(input)) return `#${input.replace(/^#/, '')}`;
  return '#000000';
}

export function ColorPicker({ value, onChange, config, disabled, field }: WidgetProps) {
  const presets = Array.isArray(config?.swatches) ? (config.swatches as string[]) : DEFAULT_SWATCHES;
  const showInput = Boolean(config?.allowCustom ?? true);
  const ariaLabel = String(field?.label ?? 'Color picker');

  const current = typeof value === 'string' ? value : '#0EA5E9';
  const [inputValue, setInputValue] = useState(current);

  useEffect(() => {
    setInputValue(current);
  }, [current]);

  const commit = (hex: string) => {
    const normalized = normalizeHex(hex);
    onChange(normalized);
    setInputValue(normalized);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Open color swatches"
              className="size-10 rounded-lg border border-border shadow-sm ring-1 ring-black/5 disabled:opacity-60"
              style={{ background: current }}
            >
              <span className="sr-only">{current}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="grid grid-cols-6 gap-1.5">
              {presets.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select ${color}`}
                  onClick={() => commit(color)}
                  className="size-7 rounded-md border border-black/10 relative flex items-center justify-center"
                  style={{ background: color }}
                >
                  {normalizeHex(color) === current && (
                    <Check className="size-3.5 text-white mix-blend-difference" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-2">
              <Palette className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{presets.length} swatches</span>
            </div>
          </PopoverContent>
        </Popover>
        {showInput && (
          <Input
            type="text"
            value={inputValue}
            disabled={disabled}
            aria-label="HEX color value"
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
            className="flex-1 font-mono text-xs uppercase"
            placeholder="#0EA5E9"
            maxLength={7}
          />
        )}
        <input
          type="color"
          value={current}
          aria-label="Native color input"
          disabled={disabled}
          onChange={(e) => commit(e.target.value)}
          className="size-10 cursor-pointer rounded-md border border-border bg-transparent p-0"
        />
      </div>
    </div>
  );
}

export default ColorPicker;

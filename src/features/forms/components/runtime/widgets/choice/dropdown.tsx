'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { WidgetProps, normalizeOptions, str, bool } from '../widget-props';

export function Dropdown({ value, onChange, config, disabled, field }: WidgetProps) {
  const options = normalizeOptions(config.options);
  const allowOther = bool(config.allowOther, false);
  const multiSelect = bool(config.multiSelect, false);
  const placeholder = str(config.placeholder, 'Select...');
  const ariaLabel = str(field?.label, 'Dropdown');

  if (multiSelect) {
    const selected: string[] = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
      onChange(next);
    };
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => toggle(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  checked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted'
                }`}
                aria-pressed={checked}
                aria-label={`${ariaLabel}: ${opt.label}`}
              >
                <Checkbox checked={checked} className="size-3.5 pointer-events-none" />
                {opt.label}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {options.find((o) => o.value === s)?.label || s}
                {!disabled && (
                  <button type="button" onClick={() => toggle(s)} aria-label={`Remove ${s}`}>
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single-select using Select
  const [otherText, setOtherText] = React.useState('');
  const valStr = typeof value === 'string' ? value : '';
  const isOther = allowOther && valStr && !options.some((o) => o.value === valStr);

  const commit = (v: string, other = '') => {
    setOtherText(other);
    onChange(v);
  };

  return (
    <div className="space-y-2">
      <Select
        value={isOther ? '__other__' : valStr}
        onValueChange={(v) => commit(v === '__other__' ? otherText || '' : v)}
        disabled={disabled}
      >
        <SelectTrigger aria-label={ariaLabel} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
            {allowOther && <SelectItem value="__other__">Other…</SelectItem>}
          </SelectGroup>
        </SelectContent>
      </Select>
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

export default Dropdown;

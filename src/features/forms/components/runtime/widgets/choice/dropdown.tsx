'use client';

import React, { useState, useMemo } from 'react';
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
import { X, ChevronDown, Search } from 'lucide-react';
import { WidgetProps, normalizeOptions, str, bool } from '../widget-props';

/**
 * Deterministic shuffle — uses a seed (field.id) so SSR and CSR produce the
 * same order (no hydration mismatch). Fisher-Yates with a seeded PRNG.
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
  const rng = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function Dropdown({ value, onChange, config, disabled, field }: WidgetProps) {
  // Fall back to field.options when config.options is undefined (basic choice fields
  // added via Basic palette tab don't have widgetConfig.options — they have field.options).
  const rawOptions = config.options || (field as any)?.options;
  const baseOptions = normalizeOptions(rawOptions);
  const allowOther = bool(config.allowOther, false);
  const multiSelect = bool(config.multiSelect, false);
  const searchEnabled = bool(config.searchEnabled, false);
  const randomize = bool(config.randomize, false);
  const placeholder = str(config.placeholder, 'Select...');
  const ariaLabel = str(field?.label, 'Dropdown');
  const fieldId = str(field?.id, 'dropdown');

  // Shuffle options when randomize is enabled — useMemo with fieldId as dep
  // so the order is stable across re-renders (deterministic seed).
  const options = useMemo(() => {
    if (randomize) return seededShuffle(baseOptions, fieldId);
    return baseOptions;
  }, [baseOptions, randomize, fieldId]);

  // Search state for multi-select chip mode AND single-select combobox mode.
  // MUST be declared at top level (not inside if blocks) to comply with
  // React's Rules of Hooks — toggling searchEnabled between renders must not
  // change the number of useState calls.
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const filteredOptions = searchEnabled && searchQuery
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  if (multiSelect) {
    const selected: string[] = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
      onChange(next);
    };
    return (
      <div className="space-y-2">
        {searchEnabled && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              placeholder="Search options..."
              className="h-8 text-xs pl-8 bg-background"
              aria-label={`${ariaLabel} (search)`}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {filteredOptions.map((opt) => {
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
          {filteredOptions.length === 0 && searchQuery && (
            <p className="text-xs text-muted-foreground italic">No matching options</p>
          )}
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

  // Single-select with search: render a custom combobox-style dropdown
  if (searchEnabled) {
    const filtered = searchQ
      ? options.filter((opt) => opt.label.toLowerCase().includes(searchQ.toLowerCase()))
      : options;
    const selectedLabel = options.find((o) => o.value === valStr)?.label || valStr || '';

    return (
      <div className="space-y-2">
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-muted/50 disabled:opacity-50"
            aria-label={ariaLabel}
          >
            <span className={selectedLabel ? '' : 'text-muted-foreground'}>
              {selectedLabel || placeholder}
            </span>
            <ChevronDown className="size-3.5 opacity-50" />
          </button>
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search..."
                    className="h-7 text-xs pl-7 border-0 focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      commit(opt.value);
                      setOpen(false);
                      setSearchQ('');
                    }}
                    className={`flex w-full items-center px-2 py-1.5 text-xs rounded hover:bg-muted text-left ${
                      valStr === opt.value ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {allowOther && (
                  <button
                    type="button"
                    onClick={() => {
                      commit('__other__');
                      setOpen(false);
                    }}
                    className="flex w-full items-center px-2 py-1.5 text-xs rounded hover:bg-muted text-left italic text-muted-foreground"
                  >
                    Other…
                  </button>
                )}
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-2 py-1.5">No matching options</p>
                )}
              </div>
            </div>
          )}
        </div>
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

  // Single-select without search: use the standard Select component
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

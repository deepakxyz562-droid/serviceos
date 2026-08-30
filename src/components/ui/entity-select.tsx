'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EntityOption {
  id: string;
  label: string;
  sublabel?: string;
}

export interface EntitySelectProps {
  /** Selected entity ID (controlled) */
  value: string | null | undefined;
  /** Called when the user selects an entity (ID) or clears it (null) */
  onChange: (id: string | null) => void;
  /** Pre-selected option to display as a chip (when the ID is known but not in search results) */
  initialOption?: EntityOption | null;
  /** Placeholder text */
  placeholder?: string;
  /** Debounced server-side search function. Receives the query string, returns options. */
  searchFn: (query: string) => Promise<EntityOption[]>;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Minimum characters before searching (default: 2) */
  minChars?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Optional className */
  className?: string;
  /** Optional: label for the clear button (a11y) */
  clearLabel?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Generic debounced entity selector with server-side search.
 *
 * This is the reusable combobox that replaces the "fetch all 500 customers
 * into a <select>" anti-pattern found in 6 of 7 CRM forms. The 7th (jobs-view)
 * already uses this exact pattern inline — this component extracts it so every
 * form can reuse it.
 *
 * BEHAVIOR:
 *   1. User types 2+ characters
 *   2. 300ms debounce fires
 *   3. searchFn(query) is called → returns up to 10 results
 *   4. Results show in a dropdown
 *   5. User selects one → onChange(id) is called
 *   6. Selected entity shows as a chip with a clear (×) button
 *
 * USAGE:
 *   <CustomerSelect value={customerId} onChange={setCustomerId} />
 *   <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
 *
 * Or use EntitySelect directly with a custom searchFn.
 */
export function EntitySelect({
  value,
  onChange,
  initialOption,
  placeholder = 'Search…',
  searchFn,
  debounceMs = 300,
  minChars = 2,
  disabled = false,
  className,
  clearLabel = 'Clear',
}: EntitySelectProps) {
  const [query, setQuery] = React.useState('');
  const [options, setOptions] = React.useState<EntityOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<EntityOption | null>(initialOption || null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync internal `selected` when the external `value` changes (e.g. form reset)
  React.useEffect(() => {
    if (value === null || value === undefined) {
      setSelected(null);
    } else if (initialOption && initialOption.id === value) {
      setSelected(initialOption);
    }
  }, [value, initialOption]);

  // Debounced search
  React.useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < minChars) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await searchFn(query.trim());
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, searchFn, debounceMs, minChars]);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (option: EntityOption) => {
    setSelected(option);
    onChange(option.id);
    setQuery('');
    setOptions([]);
    setOpen(false);
  };

  const handleClear = () => {
    setSelected(null);
    onChange(null);
    setQuery('');
    setOptions([]);
  };

  // ── Selected chip ──────────────────────────────────────────────────────────
  if (selected && !open) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm',
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{selected.label}</span>
          {selected.sublabel && (
            <span className="ml-2 text-muted-foreground">{selected.sublabel}</span>
          )}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={clearLabel}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  // ── Search input + dropdown ────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (selected) {
              // Allow re-search by clearing the current selection visually
              setOpen(true);
            }
          }}
          placeholder={selected ? selected.label : placeholder}
          disabled={disabled}
          className="pl-9 pr-8"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={clearLabel}
          >
            <X className="size-4" />
          </button>
        )}
        {!selected && (
          <ChevronsUpDown className="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground opacity-50" />
        )}
      </div>

      {open && query.trim().length >= minChars && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                  value === option.id && 'bg-accent/50'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{option.label}</span>
                  {option.sublabel && (
                    <span className="ml-2 text-muted-foreground">{option.sublabel}</span>
                  )}
                </span>
                {value === option.id && <Check className="size-4 shrink-0 text-emerald-600" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default EntitySelect;

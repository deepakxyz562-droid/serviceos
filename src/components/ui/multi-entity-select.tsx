'use client';

import * as React from 'react';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EntityOption {
  id: string;
  label: string;
  sublabel?: string;
}

export interface MultiEntitySelectProps {
  /** Selected entity IDs (controlled) */
  value: string[];
  /** Called when the selection changes (full new array) */
  onChange: (ids: string[]) => void;
  /** Pre-selected options to display as chips (for edit forms) */
  initialOptions?: EntityOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Debounced server-side search function */
  searchFn: (query: string) => Promise<EntityOption[]>;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Minimum characters before searching (default: 2) */
  minChars?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Optional className */
  className?: string;
  /** Optional: max height of the chips area in px (default: 120) */
  maxChipsHeight?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Multi-select variant of EntitySelect.
 *
 * Same debounced server-side search pattern, but supports selecting multiple
 * entities. Selected items appear as removable chips above the search input.
 *
 * Replaces the "fetch all 500 customers into a checkbox list" anti-pattern
 * in broadcast-view (1000 checkbox rows across create + edit forms).
 *
 * USAGE:
 *   <MultiCustomerSelect
 *     value={selectedCustomerIds}
 *     onChange={setSelectedCustomerIds}
 *   />
 */
export function MultiEntitySelect({
  value,
  onChange,
  initialOptions = [],
  placeholder = 'Search…',
  searchFn,
  debounceMs = 300,
  minChars = 2,
  disabled = false,
  className,
  maxChipsHeight = 120,
}: MultiEntitySelectProps) {
  const [query, setQuery] = React.useState('');
  const [options, setOptions] = React.useState<EntityOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  // Cache of selected options (id → label/sublabel) for chip display
  const [selectedMap, setSelectedMap] = React.useState<Map<string, EntityOption>>(
    () => new Map(initialOptions.map((o) => [o.id, o]))
  );
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync selectedMap when value changes (e.g. form reset, external updates)
  React.useEffect(() => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      // Remove entries no longer in value
      for (const id of next.keys()) {
        if (!value.includes(id)) next.delete(id);
      }
      // Add initialOptions for any new IDs
      for (const opt of initialOptions) {
        if (value.includes(opt.id) && !next.has(opt.id)) {
          next.set(opt.id, opt);
        }
      }
      return next;
    });
  }, [value, initialOptions]);

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
    if (!value.includes(option.id)) {
      onChange([...value, option.id]);
    }
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.set(option.id, option);
      return next;
    });
    setQuery('');
    setOptions([]);
    // Keep dropdown open for multi-select
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id));
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      {/* Selected chips */}
      {value.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 overflow-y-auto"
          style={{ maxHeight: `${maxChipsHeight}px` }}
        >
          {value.map((id) => {
            const opt = selectedMap.get(id);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span className="truncate max-w-[150px]">{opt?.label || id}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(id)}
                    className="rounded-sm p-0.5 hover:bg-muted"
                    aria-label={`Remove ${opt?.label || id}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Search input + dropdown */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
        />

        {open && query.trim().length >= minChars && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              options.map((option) => {
                const isSelected = value.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                      isSelected && 'opacity-50'
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{option.label}</span>
                      {option.sublabel && (
                        <span className="ml-2 text-muted-foreground">{option.sublabel}</span>
                      )}
                    </span>
                    {isSelected && <Check className="size-4 shrink-0 text-emerald-600" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiEntitySelect;

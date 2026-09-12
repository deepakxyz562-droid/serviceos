'use client';

import { useRef, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface CustomerPickerCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  properties?: any[];
}

export interface CustomerPickerProps {
  customers: CustomerPickerCustomer[];
  selectedCustomerId: string;
  onPick: (c: any) => void;
  onClear: () => void;
  onCreate: (nameQuery: string) => void;
  query: string;
  setQuery: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

export function CustomerPicker({
  customers,
  selectedCustomerId,
  onPick,
  onClear,
  onCreate,
  query,
  setQuery,
  open,
  setOpen,
}: CustomerPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = customers.find((c) => c.id === selectedCustomerId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) =>
        [c.name, c.phone || '', c.email || '', c.address || '']
          .some((f) => f.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [customers, query]);

  const handlePick = (c: CustomerPickerCustomer) => {
    onPick(c);
    setOpen(false);
    setQuery('');
  };

  // If a customer is selected, show a chip-style read-only view with an X to clear.
  if (selected) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 px-3 py-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-emerald-900 dark:text-emerald-300 truncate">{selected.name}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
            {selected.address ? `${selected.address} · ` : ''}
            {selected.email ? `${selected.email} · ` : ''}
            {selected.phone}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClear();
            inputRef.current?.focus();
          }}
          className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 shrink-0 -mt-0.5"
          aria-label="Clear selected customer"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder="Select a client"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching client found</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(c)}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-b border-border last:border-b-0 transition-colors"
            >
              <p className="font-medium text-sm text-foreground">{c.name}</p>
              {c.address && <p className="text-xs text-muted-foreground truncate">{c.address}</p>}
              <p className="text-xs text-muted-foreground truncate">
                {c.email ? `${c.email} · ` : ''}
                {c.phone}
              </p>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onCreate(query);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-medium text-sm flex items-center gap-2 border-t border-border"
          >
            <span className="flex items-center justify-center size-5 rounded-full bg-emerald-600 text-white">
              <Plus className="size-3.5" />
            </span>
            Create new client{query.trim() ? ` "${query.trim()}"` : ''}
          </button>
        </div>
      )}
    </div>
  );
}

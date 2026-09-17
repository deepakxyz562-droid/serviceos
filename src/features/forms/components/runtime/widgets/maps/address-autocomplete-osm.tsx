'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str } from '../widget-props';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * OpenStreetMap Nominatim address autocomplete. No API key needed.
 * Uses the public Nominatim endpoint (https://nominatim.openstreetmap.org/search).
 * Results debounced 350ms. Falls back to plain Input on fetch error.
 */
export function AddressAutocompleteOsm({ value, onChange, config, disabled, field }: WidgetProps) {
  const placeholder = str(config.placeholder, 'Start typing an address...');
  const ariaLabel = str(field?.label, 'Address autocomplete (OpenStreetMap)');
  const [query, setQuery] = useState(str(value, ''));
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setQuery(str(value, '')), [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const runSearch = async (q: string) => {
    if (!q || q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=' +
        encodeURIComponent(q);
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('network');
      const json: NominatimResult[] = await res.json();
      setResults(Array.isArray(json) ? json : []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    onChange(next);
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void runSearch(next), 350);
  };

  const pick = (r: NominatimResult) => {
    const label = r.display_name;
    setQuery(label);
    onChange({
      address: label,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      source: 'nominatim',
    });
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative" ref={boxRef}>
      <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className="pl-9"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
      )}
      {open && results.length > 0 && (
        <ul
          className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-md border bg-popover shadow-md"
          role="listbox"
        >
          {results.map((r) => (
            <li
              key={r.place_id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
            >
              <div className="flex items-start gap-2">
                <MapPin className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <span className="line-clamp-2">{r.display_name}</span>
              </div>
            </li>
          ))}
          <li className="px-3 py-1 text-[10px] text-muted-foreground border-t bg-muted/30 flex items-center gap-1">
            <ExternalLink className="size-3" />
            Data © OpenStreetMap contributors
          </li>
        </ul>
      )}
    </div>
  );
}

export default AddressAutocompleteOsm;

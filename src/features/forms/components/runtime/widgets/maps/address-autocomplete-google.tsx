'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Search, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str } from '../widget-props';

interface PlacePrediction {
  description: string;
  place_id: string;
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              req: { input: string },
              cb: (results: PlacePrediction[] | null, status: string) => void,
            ) => void;
          };
          Autocomplete: new (el: HTMLInputElement, opts: Record<string, unknown>) => unknown;
        };
      };
    };
  }
}

/**
 * Google Places address autocomplete.
 *
 * Loads the Google Maps JS API dynamically when `config.apiKey` is provided.
 * If `config.provider === 'managed'` or the API key is missing, renders a
 * friendly placeholder explaining the Fieseros managed proxy will power it in
 * production. Falls back to a plain Input if the script fails to load.
 */
export function AddressAutocompleteGoogle({ value, onChange, config, disabled, field }: WidgetProps) {
  const apiKey = str(config.apiKey, '');
  const provider = str(config.provider, '');
  const useManaged = provider === 'managed' || !apiKey;
  const placeholder = str(config.placeholder, 'Start typing an address...');
  const ariaLabel = str(field?.label, 'Address autocomplete');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(str(value, ''));
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    setQuery(str(value, ''));
  }, [value]);

  useEffect(() => {
    if (useManaged) return;
    if (typeof window === 'undefined') return;
    if (window.google?.maps?.places) return;
    const existing = document.getElementById('gmaps-places-script') as HTMLScriptElement | null;
    if (existing) return;
    const s = document.createElement('script');
    s.id = 'gmaps-places-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    s.async = true;
    s.defer = true;
    s.onerror = () => setScriptFailed(true);
    document.head.appendChild(s);
  }, [useManaged, apiKey]);

  const fetchSuggestions = async (input: string) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }
    const svc = window.google?.maps?.places?.AutocompleteService;
    if (!svc) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const service = new svc();
      service.getPlacePredictions({ input }, (results, status) => {
        setLoading(false);
        if (status === 'OK' && results) setSuggestions(results);
        else setSuggestions([]);
      });
    } catch {
      setLoading(false);
      setSuggestions([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    onChange(next);
    void fetchSuggestions(next);
  };

  const pick = (p: PlacePrediction) => {
    setQuery(p.description);
    onChange(p.description);
    setSuggestions([]);
  };

  if (useManaged) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm flex items-start gap-3" role="status">
        <Info className="size-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">{ariaLabel}</p>
          <p className="text-xs text-muted-foreground">
            Google Places autocomplete will be powered by the Fieseros managed proxy in production.
            Add a Google Maps API key in field settings, or switch the provider to <code>osm</code> for a free Nominatim alternative.
          </p>
        </div>
      </div>
    );
  }

  if (scriptFailed) {
    return (
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className="pl-9"
        autoComplete="off"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-autocomplete="list"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
      )}
      {suggestions.length > 0 && (
        <ul
          className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-md"
          role="listbox"
        >
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
            >
              <MapPin className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span className="line-clamp-2">{s.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressAutocompleteGoogle;

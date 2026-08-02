'use client';

/**
 * AddressAutocomplete
 * -------------------
 * A single-search address input backed by the OpenStreetMap Nominatim API.
 *
 * Calls go to our OWN server-side proxy at `/api/geocode/search?q=<query>`
 * rather than hitting `https://nominatim.openstreetmap.org/...` directly
 * from the browser. Browsers strip the `User-Agent` header (it's a
 * forbidden header in fetch/XHR), which violates Nominatim's usage policy
 * (they require an identifying User-Agent) and causes aggressive
 * rate-limiting (429s) or empty results — the dropdown never populated.
 * The proxy sets `User-Agent: Fieseros-Onboarding/1.0 (...)` server-side
 * and adds a 60-second in-memory cache to respect Nominatim's rate limit.
 *
 * Features:
 *   - Single search input with 300ms debounce.
 *   - Calls `/api/geocode/search?q={query}` (proxied to Nominatim
 *     `?format=json&addressdetails=1&limit=5`).
 *   - Renders a dropdown of results (display_name + type).
 *   - On select, parses the `address` object from the Nominatim response and
 *     calls `onChange` with `{ address, city, state, pincode, latitude, longitude }`.
 *   - Shows the selected address as a chip/summary with a clear "X" button.
 *   - Falls back to a 4-input manual form (toggle) when Nominatim fails or
 *     the user prefers to enter the address by hand.
 *   - 3-character minimum (matches the proxy's validation).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, MapPin, Search, X, Pencil } from 'lucide-react';

export interface AddressValue {
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressAutocompleteProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  type?: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

const EMPTY_VALUE: AddressValue = {
  address: '',
  city: '',
  state: '',
  pincode: '',
  latitude: null,
  longitude: null,
};

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Has the user already selected a valid address?
  const hasSelection =
    !!value.address || !!value.city || !!value.state || !!value.pincode;

  // ── Debounced search ────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Cancel any in-flight request.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `/api/geocode/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as NominatimResult[];
      setResults(Array.isArray(data) ? data : []);
      setOpen(true);
    } catch (err) {
      // AbortError is expected when a newer query supersedes an older one.
      if ((err as Error).name === 'AbortError') return;
      console.error('[AddressAutocomplete] Nominatim search failed:', err);
      setError('Could not reach the address lookup service. Try again or enter manually.');
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const onQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        runSearch(q);
      }, 300);
    },
    [runSearch],
  );

  // ── Select a result ──────────────────────────────────────────────────────
  const selectResult = useCallback(
    (r: NominatimResult) => {
      const a = r.address || {};
      // Build the street address: "house_number road" (Nominatim convention).
      const streetParts = [a.house_number, a.road].filter(Boolean);
      const street = streetParts.join(' ').trim();
      // City: prefer city, then town, then village, then municipality.
      const city = a.city || a.town || a.village || a.municipality || '';
      const state = a.state || a.region || '';
      const pincode = a.postcode || '';

      let lat: number | null = null;
      let lng: number | null = null;
      const parsedLat = parseFloat(r.lat);
      const parsedLon = parseFloat(r.lon);
      if (!isNaN(parsedLat)) lat = parsedLat;
      if (!isNaN(parsedLon)) lng = parsedLon;

      onChange({
        address: street || r.display_name.split(',')[0] || '',
        city,
        state,
        pincode,
        latitude: lat,
        longitude: lng,
      });
      setQuery('');
      setResults([]);
      setOpen(false);
      setError(null);
    },
    [onChange],
  );

  // ── Clear the selection ──────────────────────────────────────────────────
  const clearSelection = useCallback(() => {
    onChange({ ...EMPTY_VALUE });
    setQuery('');
    setResults([]);
    setOpen(false);
    setError(null);
  }, [onChange]);

  // ── Click outside closes the dropdown ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup any pending debounce / abort on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── Manual mode: 4-input form ─────────────────────────────────────────────
  if (manualMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Enter your address manually.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setManualMode(false)}
          >
            <Search className="h-3 w-3" />
            Use search
          </Button>
        </div>
        <Input
          placeholder="Street address"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          className="h-11"
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            placeholder="City"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className="h-11"
          />
          <Input
            placeholder="State"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            className="h-11"
          />
          <Input
            placeholder="Pincode"
            value={value.pincode}
            onChange={(e) => onChange({ ...value, pincode: e.target.value })}
            className="h-11"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: switch back to search to auto-fill coordinates from OpenStreetMap.
        </p>
      </div>
    );
  }

  // ── Search mode ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Selected chip — shown when an address is already chosen */}
      {hasSelection && !open && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20 px-3 py-2.5">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {value.address || 'Address selected'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {[value.city, value.state, value.pincode].filter(Boolean).join(', ') || 'No additional details'}
              </p>
              {value.latitude != null && value.longitude != null && (
                <Badge variant="outline" className="mt-1 text-[10px] gap-1 px-1.5 py-0">
                  <MapPin className="h-2.5 w-2.5" />
                  {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              aria-label="Edit address"
              title="Edit address"
              onClick={() => {
                // Pre-fill the search box with the existing address so the user
                // can quickly refine it.
                setQuery(value.address || `${value.city} ${value.state}`.trim());
                setOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              aria-label="Clear address"
              title="Clear address"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Search input */}
      {(!hasSelection || open) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            inputMode="search"
            placeholder="Search your business address…"
            value={query}
            onChange={onQueryChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="h-11 pl-9 pr-9"
            autoComplete="off"
            aria-label="Search address"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!loading && query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setResults([]);
                setOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Dropdown */}
          {open && results.length > 0 && (
            <div
              className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-72 overflow-y-auto"
              role="listbox"
            >
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-2 hover:bg-accent focus:bg-accent outline-none border-b border-border last:border-b-0"
                >
                  <p className="text-sm font-medium line-clamp-2">{r.display_name}</p>
                  {r.type && (
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {r.type.replace(/_/g, ' ')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error / fallback toggle */}
      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <a
              href="https://nominatim.openstreetmap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              OpenStreetMap Nominatim
            </a>
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 ml-auto"
          onClick={() => setManualMode(true)}
        >
          <Pencil className="h-3 w-3" />
          Enter manually
        </Button>
      </div>
    </div>
  );
}

export default AddressAutocomplete;

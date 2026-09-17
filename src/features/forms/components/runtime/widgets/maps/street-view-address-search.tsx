'use client';

import React, { useState } from 'react';
import { Binoculars, Loader2, MapPin, Search, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str } from '../widget-props';

interface StreetViewValue {
  address: string;
  lat: number;
  lng: number;
  streetViewUrl?: string;
  source: string;
}

/**
 * Street-view-address-search: free-text address search via Nominatim
 * (no key required) + placeholder panel for Google Street View embed.
 *
 * If `config.apiKey` is missing OR `config.provider === 'managed'`, the
 * Street View preview is replaced with a friendly notice explaining the
 * Fieseros managed proxy will power it in production. The OSM address
 * search itself always works.
 */
export function StreetViewAddressSearch({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Street view address search');
  const apiKey = str(config.apiKey, '');
  const provider = str(config.provider, '');
  const useManaged = provider === 'managed' || !apiKey;
  const placeholder = str(config.placeholder, 'Search an address...');
  const existing: StreetViewValue | null =
    value && typeof value === 'object' ? (value as StreetViewValue) : null;
  const [query, setQuery] = useState(existing?.address ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StreetViewValue | null>(existing);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async () => {
    if (!query.trim() || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`,
        { headers: { Accept: 'application/json' } },
      );
      const json = await res.json();
      if (Array.isArray(json) && json[0]) {
        const lat = parseFloat(json[0].lat);
        const lng = parseFloat(json[0].lon);
        const address = json[0].display_name ?? query;
        const out: StreetViewValue = {
          address,
          lat,
          lng,
          streetViewUrl: useManaged
            ? undefined
            : `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(apiKey)}&location=${lat},${lng}`,
          source: 'nominatim',
        };
        setResult(out);
        onChange(out);
      } else {
        setError('Address not found.');
      }
    } catch {
      setError('Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSearch())}
            placeholder={placeholder}
            disabled={disabled || loading}
            className="pl-9 text-xs"
            aria-label={`${ariaLabel} search`}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onSearch}
          disabled={disabled || loading || !query.trim()}
          className="text-xs shrink-0 gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          Search
        </Button>
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {result && (
        <div className="space-y-2">
          <div
            className="relative rounded-lg overflow-hidden border border-border/80 h-44 bg-gradient-to-br from-slate-200 via-sky-100 to-emerald-100 dark:from-slate-800 dark:via-sky-950 dark:to-emerald-900/40 flex items-center justify-center"
            aria-label="Street view preview"
          >
            {useManaged ? (
              <div className="p-4 text-center max-w-md mx-auto">
                <Info className="size-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs font-medium">Street View preview</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Google Street View will be embedded via the Fieseros managed proxy in production.
                  Add a Google Maps API key in field settings to enable it.
                </p>
              </div>
            ) : (
              // Note: in real production this would be an <iframe src={result.streetViewUrl}>.
              // We render the binoculars placeholder here so no external script loads in dev.
              <div className="p-4 text-center">
                <Binoculars className="size-8 mx-auto text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground mt-1">Street View embed ready</p>
              </div>
            )}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-background/80 text-[10px]">
              {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3" />
            <span className="truncate">{result.address}</span>
          </p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${result.lat}&mlon=${result.lng}#map=16/${result.lat}/${result.lng}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="size-3" /> View on OpenStreetMap
          </a>
        </div>
      )}
    </div>
  );
}

export default StreetViewAddressSearch;

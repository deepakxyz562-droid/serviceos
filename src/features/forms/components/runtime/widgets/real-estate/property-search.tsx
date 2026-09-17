'use client';

import React, { useState } from 'react';
import { Search, MapPin, Home, Loader2, AlertTriangle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface PropertyResult {
  address: string;
  apn?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  zoning?: string;
  yearBuilt?: number;
}

interface PropertySearchValue {
  query: string;
  results: PropertyResult[];
  selectedAddress?: string;
  searchedAt?: string;
}

export function PropertySearch({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Property search');
  const apiUrl = str(config.apiUrl, '');
  const placeholder = str(config.placeholder, 'Enter street address, city, ZIP');
  const useMock = bool(config.useMock, true);

  const v: PropertySearchValue = value && typeof value === 'object'
    ? (value as PropertySearchValue)
    : { query: '', results: [] };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    if (disabled || !v.query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (useMock || !apiUrl) {
        // Placeholder mock — in production, swap for fetch(apiUrl)
        await new Promise((r) => setTimeout(r, 500));
        const mock: PropertyResult[] = [
          {
            address: v.query,
            apn: '123-456-789',
            beds: 3,
            baths: 2,
            sqft: 1850,
            lotSize: 7200,
            zoning: 'R-1',
            yearBuilt: 1998,
          },
        ];
        onChange({ ...v, results: mock, searchedAt: new Date().toISOString() });
      } else {
        const res = await fetch(`${apiUrl}?q=${encodeURIComponent(v.query)}`);
        if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
        const data = (await res.json()) as { results?: PropertyResult[] };
        onChange({ ...v, results: data.results ?? [], searchedAt: new Date().toISOString() });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup error');
    } finally {
      setLoading(false);
    }
  };

  const select = (addr: string) => onChange({ ...v, selectedAddress: addr });

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Home className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Property lookup</span>
        {!apiUrl && (
          <Badge variant="outline" className="text-[9px] h-4 ml-auto">Mock mode</Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={v.query}
          onChange={(e) => onChange({ ...v, query: e.target.value })}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Property search query"
          className="text-xs h-9 flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || loading || !v.query.trim()}
          onClick={runSearch}
          className="text-xs h-9 gap-1"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          Search
        </Button>
      </div>

      {error && (
        <p className="text-[11px] text-red-600 flex items-center gap-1">
          <AlertTriangle className="size-3" /> {error}
        </p>
      )}

      {v.results.length > 0 && (
        <div className="space-y-1.5">
          {v.results.map((r, i) => {
            const chosen = v.selectedAddress === r.address;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => select(r.address)}
                aria-label={`Select ${r.address}`}
                className={cn(
                  'w-full text-left rounded-md border p-2 transition-colors',
                  chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{r.address}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {[r.beds && `${r.beds} bd`, r.baths && `${r.baths} ba`, r.sqft && `${r.sqft.toLocaleString()} ft²`, r.yearBuilt && `built ${r.yearBuilt}`]
                        .filter(Boolean).join(' · ')}
                    </p>
                    {r.apn && <p className="text-[9px] text-muted-foreground font-mono">APN: {r.apn}</p>}
                  </div>
                  {chosen && <Badge variant="secondary" className="text-[9px] h-4">Selected</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {v.searchedAt && v.results.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Building2 className="size-3" /> No results · searched {new Date(v.searchedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export default PropertySearch;

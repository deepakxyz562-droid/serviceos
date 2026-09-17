'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Compass, CheckCircle2, Loader2, Store, ExternalLink, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

interface Branch {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
}

interface RankedBranch extends Branch {
  distanceKm: number;
  drivingMinutes?: number;
}

interface NearestValue {
  origin: string;
  branch: RankedBranch;
  ranked: RankedBranch[];
}

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Downtown Service Hub', address: '100 Main St, New York, NY 10001', lat: 40.7128, lng: -74.006 },
  { id: 'b2', name: 'Westside Logistics Depot', address: '450 10th Ave, New York, NY 10018', lat: 40.7554, lng: -73.998 },
  { id: 'b3', name: 'Brooklyn Fast Depot', address: '200 Atlantic Ave, Brooklyn, NY 11201', lat: 40.6914, lng: -73.993 },
];

/**
 * Improved Nearest Location Finder v2.
 * - Uses Nominatim for free address geocoding (no API key).
 * - Uses OSRM for driving-time estimates (best-effort; falls back to Haversine).
 * - Returns ranked list + auto-selects closest branch.
 */
export function NearestLocationFinderV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Nearest location finder v2');
  const unit = str(config.unit, 'km') === 'miles' ? 'miles' : 'km';
  const branches: Branch[] = Array.isArray(config.branches) && config.branches.length > 0
    ? (config.branches as Branch[])
    : DEFAULT_BRANCHES;
  const maxResults = Math.min(10, Math.max(1, num(config.maxResults, 5)));

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState<RankedBranch[]>([]);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const existing: NearestValue | null =
    value && typeof value === 'object' ? (value as NearestValue) : null;

  useEffect(() => {
    if (existing) {
      setRanked(existing.ranked);
      setOriginLabel(existing.origin);
      setQuery(existing.origin);
    }
  }, [value]);

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const rank = async (lat: number, lng: number, label: string) => {
    const base: RankedBranch[] = branches
      .map((b): RankedBranch => ({ ...b, distanceKm: haversineKm(lat, lng, b.lat, b.lng) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Best-effort OSRM driving times for the closest 3 branches.
    const top = base.slice(0, 3);
    await Promise.all(
      top.map(async (b) => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${b.lng},${b.lat}?overview=false`;
          const res = await fetch(url);
          const json = await res.json();
          if (json?.routes?.[0]) b.drivingMinutes = Math.round(json.routes[0].duration / 60);
        } catch {
          /* ignore */
        }
      }),
    );

    const out = base.slice(0, maxResults);
    setRanked(out);
    setOriginLabel(label);
    setError(null);
    if (out[0]) onChange({ origin: label, branch: out[0], ranked: out });
  };

  const onGeocode = async () => {
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
        await rank(parseFloat(json[0].lat), parseFloat(json[0].lon), json[0].display_name || query);
      } else {
        setError('Address not found.');
      }
    } catch {
      setError('Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const onGps = () => {
    if (!navigator.geolocation || disabled) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await rank(pos.coords.latitude, pos.coords.longitude, 'My GPS location');
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('GPS unavailable.');
      },
      { timeout: 10000 },
    );
  };

  const fmt = (km: number) => (unit === 'miles' ? `${(km * 0.621371).toFixed(1)} mi` : `${km.toFixed(1)} km`);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onGeocode())}
            placeholder="Enter your address, ZIP, or city..."
            className="pl-9 text-xs"
            disabled={disabled || loading}
            aria-label={`${ariaLabel} search`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGeocode}
          disabled={disabled || loading || !query.trim()}
          className="text-xs shrink-0"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Find'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onGps}
          disabled={disabled || loading}
          className="text-xs shrink-0 gap-1.5"
        >
          <Navigation className="size-3.5 text-emerald-600" />
          <span className="hidden sm:inline">GPS</span>
        </Button>
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {originLabel && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Compass className="size-3" />
          Searching from: <span className="font-medium truncate">{originLabel}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ranked.map((b, idx) => {
          const selected = existing?.branch?.id === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onChange({ origin: originLabel ?? '', branch: b, ranked })}
              className={`text-left p-3 rounded-xl border transition-all relative ${
                selected
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                  : 'border-border/80 hover:border-emerald-300 bg-card hover:bg-muted/30'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {idx === 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-600 text-white">
                  Closest
                </span>
              )}
              <div className="flex items-start gap-2.5">
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    selected ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Store className="size-4" />
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <p className="text-xs font-bold truncate">{b.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{b.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <MapPin className="size-3" /> {fmt(b.distanceKm)}
                    </span>
                    {b.drivingMinutes != null && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Route className="size-3" /> ~{b.drivingMinutes} min drive
                      </span>
                    )}
                  </div>
                </div>
                {selected && <CheckCircle2 className="size-3.5 text-emerald-600 absolute top-2 right-2" />}
              </div>
            </button>
          );
        })}
      </div>

      {ranked.length > 0 && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ExternalLink className="size-3" /> Driving estimates via OSRM; data © OpenStreetMap
        </p>
      )}
    </div>
  );
}

export default NearestLocationFinderV2;

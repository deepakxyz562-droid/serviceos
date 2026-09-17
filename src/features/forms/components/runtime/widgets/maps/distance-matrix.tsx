'use client';

import React, { useState } from 'react';
import { Grid3x3, Loader2, MapPin, Navigation, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

interface DistanceMatrixValue {
  origins: string[];
  destinations: string[];
  rows: Array<{ origin: string; cells: Array<{ destination: string; distanceKm: number | null; durationMinutes: number | null }> }>;
  source: string;
}

interface Place { label: string; lat: number; lng: number }

/**
 * Distance-matrix: multiple origins × destinations using OSRM's
 * table API. Free, CORS-enabled, no API key. Falls back to Haversine
 * + 60km/h estimate when OSRM is unreachable.
 *
 * Inputs come from `config.origins` and `config.destinations` (string arrays)
 * or, if absent, from manual textarea entry.
 */
export function DistanceMatrix({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Distance matrix');
  const allowGps = bool(config.allowGps, false);
  const unit = str(config.unit, 'km') === 'miles' ? 'miles' : 'km';
  const configOrigins = Array.isArray(config.origins) ? (config.origins as string[]) : [];
  const configDestinations = Array.isArray(config.destinations) ? (config.destinations as string[]) : [];

  const [originsText, setOriginsText] = useState(configOrigins.join('\n'));
  const [destinationsText, setDestinationsText] = useState(configDestinations.join('\n'));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DistanceMatrixValue | null>(
    value && typeof value === 'object' ? (value as DistanceMatrixValue) : null,
  );
  const [error, setError] = useState<string | null>(null);

  const parseList = (text: string): string[] =>
    text.split('\n').map((l) => l.trim()).filter(Boolean);

  const geocode = async (q: string): Promise<Place | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: 'application/json' } },
      );
      const json = await res.json();
      if (Array.isArray(json) && json[0]) {
        return { label: q, lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
      }
    } catch {
      /* ignore */
    }
    return null;
  };

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

  const compute = async () => {
    if (disabled) return;
    const origins = parseList(originsText);
    const destinations = parseList(destinationsText);
    if (origins.length === 0 || destinations.length === 0) {
      setError('Add at least one origin and one destination.');
      return;
    }
    if (origins.length > 5 || destinations.length > 5) {
      setError('Up to 5 origins × 5 destinations supported for the free tier.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [os, ds] = await Promise.all([
        Promise.all(origins.map(geocode)),
        Promise.all(destinations.map(geocode)),
      ]);
      const validO = os.filter(Boolean) as Place[];
      const validD = ds.filter(Boolean) as Place[];
      if (validO.length === 0 || validD.length === 0) {
        setError('Could not geocode one or more places.');
        setLoading(false);
        return;
      }

      let source = 'haversine';
      let durations: number[][] | null = null;
      let distances: number[][] | null = null;
      try {
        const coords = [...validO.map((p) => `${p.lng},${p.lat}`), ...validD.map((p) => `${p.lng},${p.lat}`)].join(';');
        const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${validO
          .map((_, i) => i)
          .join(';')}&destinations=${validD.map((_, i) => i + validO.length).join(';')}&annotations=duration,distance`;
        const res = await fetch(url);
        const json = await res.json();
        if (json?.code === 'Ok' && json.durations && json.distances) {
          durations = json.durations;
          distances = json.distances;
          source = 'osrm';
        }
      } catch {
        /* fallback below */
      }

      const rows = validO.map((o, oi) => ({
        origin: o.label,
        cells: validD.map((d, di) => {
          let distKm: number | null = null;
          let durMin: number | null = null;
          if (distances && durations) {
            const distMeters = distances[oi]?.[di];
            const durSec = durations[oi]?.[di];
            if (typeof distMeters === 'number' && distMeters >= 0) distKm = distMeters / 1000;
            if (typeof durSec === 'number' && durSec >= 0) durMin = durSec / 60;
          }
          if (distKm == null || durMin == null) {
            const fallbackKm = haversineKm(o.lat, o.lng, d.lat, d.lng);
            distKm = fallbackKm;
            durMin = (fallbackKm / 60) * 60;
          }
          return {
            destination: d.label,
            distanceKm: Number(distKm.toFixed(2)),
            durationMinutes: Math.round(durMin),
          };
        }),
      }));

      const out: DistanceMatrixValue = {
        origins: validO.map((p) => p.label),
        destinations: validD.map((p) => p.label),
        rows,
        source,
      };
      setResult(out);
      onChange(out);
    } catch {
      setError('Matrix computation failed.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (km: number) => (unit === 'miles' ? `${(km * 0.621371).toFixed(1)} mi` : `${km.toFixed(1)} km`);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Origins</label>
          <textarea
            value={originsText}
            onChange={(e) => setOriginsText(e.target.value)}
            placeholder={'One per line\nNew York, NY\nBoston, MA'}
            disabled={disabled || loading}
            aria-label={`${ariaLabel} origins`}
            className="mt-1 w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Destinations</label>
          <textarea
            value={destinationsText}
            onChange={(e) => setDestinationsText(e.target.value)}
            placeholder={'One per line\nPhiladelphia, PA\nWashington, DC'}
            disabled={disabled || loading}
            aria-label={`${ariaLabel} destinations`}
            className="mt-1 w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={compute}
          disabled={disabled || loading}
          className="text-xs gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Grid3x3 className="size-3.5" />}
          Compute matrix
        </Button>
        {result && (
          <span className="text-[10px] text-muted-foreground">
            via {result.source}
          </span>
        )}
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {result && (
        <div className="overflow-x-auto rounded-md border bg-muted/30">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2 font-medium">
                  <div className="flex items-center gap-1">
                    <MapPin className="size-3" /> Origin
                    <ArrowRight className="size-3" /> Destination
                  </div>
                </th>
                {result.destinations.map((d) => (
                  <th key={d} className="text-right p-2 font-medium max-w-[120px] truncate" title={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.origin} className="border-t">
                  <td className="p-2 font-medium max-w-[160px] truncate" title={r.origin}>
                    <span className="flex items-center gap-1"><Navigation className="size-3 text-emerald-600" />{r.origin}</span>
                  </td>
                  {r.cells.map((c) => (
                    <td key={c.destination} className="text-right p-2 align-top">
                      <div className="font-mono">{fmt(c.distanceKm ?? 0)}</div>
                      <div className="text-[10px] text-muted-foreground">{c.durationMinutes ?? '—'} min</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">Max 5×5. Data via OSRM · geocoding via Nominatim.</p>
    </div>
  );
}

export default DistanceMatrix;

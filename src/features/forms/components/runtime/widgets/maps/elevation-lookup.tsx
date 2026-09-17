'use client';

import React, { useState } from 'react';
import { Mountain, Loader2, Navigation, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

interface ElevationValue {
  lat: number;
  lng: number;
  elevationMeters: number;
  source: string;
}

/**
 * Open-Meteo elevation lookup. Free, CORS-enabled, no API key.
 * Uses https://api.open-meteo.com/v1/elevation?latitude=..&longitude=..
 */
export function ElevationLookup({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Elevation lookup');
  const unit = str(config.unit, 'meters') === 'feet' ? 'feet' : 'meters';
  const allowGps = bool(config.allowGps, true);
  const existing: ElevationValue | null =
    value && typeof value === 'object' ? (value as ElevationValue) : null;
  const [lat, setLat] = useState<string>(existing ? String(existing.lat) : '');
  const [lng, setLng] = useState<string>(existing ? String(existing.lng) : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ElevationValue | null>(existing);
  const [error, setError] = useState<string | null>(null);

  const fmtElev = (m: number) =>
    unit === 'feet' ? `${Math.round(m * 3.28084)} ft` : `${Math.round(m)} m`;

  const lookup = async (la: number, ln: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${la}&longitude=${ln}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      const elev = Array.isArray(json?.elevation) ? json.elevation[0] : null;
      if (typeof elev !== 'number') throw new Error('no data');
      const out: ElevationValue = {
        lat: la,
        lng: ln,
        elevationMeters: elev,
        source: 'open-meteo',
      };
      setResult(out);
      onChange(out);
    } catch {
      setError('Could not fetch elevation. Try a different coordinate.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) void lookup(la, ln);
  };

  const onGps = () => {
    if (!navigator.geolocation || disabled) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLat(la.toFixed(6));
        setLng(ln.toFixed(6));
        void lookup(la, ln);
      },
      () => {
        setLoading(false);
        setError('Geolocation unavailable or denied.');
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          type="number"
          step="0.000001"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          disabled={disabled || loading}
          aria-label={`${ariaLabel} latitude`}
          className="text-xs"
        />
        <Input
          type="number"
          step="0.000001"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="Longitude"
          disabled={disabled || loading}
          aria-label={`${ariaLabel} longitude`}
          className="text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={disabled || loading || !lat || !lng}
          className="text-xs shrink-0 gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Mountain className="size-3.5" />}
          Lookup elevation
        </Button>
        {allowGps && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onGps}
            disabled={disabled || loading}
            className="text-xs shrink-0 gap-1.5"
          >
            <Navigation className="size-3.5 text-emerald-600" /> GPS
          </Button>
        )}
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {result && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs flex items-center gap-2">
          <Mountain className="size-4 text-emerald-600" />
          <div className="flex-1">
            <div className="font-semibold">{fmtElev(result.elevationMeters)}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="size-3" /> {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ElevationLookup;

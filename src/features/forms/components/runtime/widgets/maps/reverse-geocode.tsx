'use client';

import React, { useState } from 'react';
import { MapPin, Loader2, Navigation, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, bool } from '../widget-props';

interface ReverseGeoValue {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  source: string;
}

/**
 * Reverse geocode: lat/lng → human-readable address via OpenStreetMap
 * Nominatim. Free, CORS-enabled, no API key. Falls back to a friendly
 * message when geocoding fails or browser geolocation is unavailable.
 */
export function ReverseGeocode({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Reverse geocode');
  const allowGps = bool(config.allowGps, true);
  const existing: ReverseGeoValue | null =
    value && typeof value === 'object' ? (value as ReverseGeoValue) : null;
  const [lat, setLat] = useState(existing ? String(existing.lat) : '');
  const [lng, setLng] = useState(existing ? String(existing.lng) : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReverseGeoValue | null>(existing);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (la: number, ln: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${ln}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      const addr = json?.address ?? {};
      const out: ReverseGeoValue = {
        lat: la,
        lng: ln,
        address: json.display_name ?? '',
        city: addr.city ?? addr.town ?? addr.village ?? addr.hamlet,
        state: addr.state,
        postcode: addr.postcode,
        country: addr.country,
        source: 'nominatim',
      };
      setResult(out);
      onChange(out);
    } catch {
      setError('Could not reverse geocode those coordinates.');
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
          className="text-xs gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Reverse geocode
        </Button>
        {allowGps && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onGps}
            disabled={disabled || loading}
            className="text-xs gap-1.5"
          >
            <Navigation className="size-3.5 text-emerald-600" /> GPS
          </Button>
        )}
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {result && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <div className="flex items-start gap-2">
            <Building2 className="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="font-medium">{result.address || 'Address unavailable'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mt-1">
            {result.city && <p><span className="text-muted-foreground">City:</span> {result.city}</p>}
            {result.state && <p><span className="text-muted-foreground">State:</span> {result.state}</p>}
            {result.postcode && <p><span className="text-muted-foreground">Postcode:</span> {result.postcode}</p>}
            {result.country && <p><span className="text-muted-foreground">Country:</span> {result.country}</p>}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
            <MapPin className="size-3" /> {result.lat.toFixed(5)}, {result.lng.toFixed(5)} · via OpenStreetMap
          </p>
        </div>
      )}
    </div>
  );
}

export default ReverseGeocode;

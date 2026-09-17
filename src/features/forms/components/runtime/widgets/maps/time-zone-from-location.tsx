'use client';

import React, { useState } from 'react';
import { Clock, Globe, Loader2, MapPin, Navigation, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

interface TimeZoneValue {
  lat: number;
  lng: number;
  timeZoneId?: string;
  timeZoneName?: string;
  rawOffsetSeconds?: number;
  dstOffsetSeconds?: number;
  localTime?: string;
  source: string;
}

/**
 * Time-zone-from-location: given lat/lng, returns the timezone.
 *
 * If `config.apiKey` is missing OR `config.provider === 'managed'`, falls
 * back to a managed-proxy placeholder notice + tries the free endpoint
 * `/api/proxy/maps/timezone` (managed-proxy). If that also fails, renders
 * the friendly notice.
 */
export function TimeZoneFromLocation({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Time zone from location');
  const apiKey = str(config.apiKey, '');
  const provider = str(config.provider, '');
  const useManaged = provider === 'managed' || !apiKey;
  const allowGps = bool(config.allowGps, true);
  const existing: TimeZoneValue | null =
    value && typeof value === 'object' ? (value as TimeZoneValue) : null;
  const [lat, setLat] = useState(existing ? String(existing.lat) : '');
  const [lng, setLng] = useState(existing ? String(existing.lng) : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimeZoneValue | null>(existing);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (la: number, ln: number) => {
    setLoading(true);
    setError(null);
    try {
      const ts = Math.floor(Date.now() / 1000);
      let url: string;
      if (useManaged) {
        url = `/api/proxy/maps/timezone?lat=${la}&lng=${ln}&timestamp=${ts}`;
      } else {
        url = `https://maps.googleapis.com/maps/api/timezone/json?location=${la},${ln}&timestamp=${ts}&key=${encodeURIComponent(apiKey)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      if (json?.status && json.status !== 'OK') throw new Error(json.status);
      if (!json?.timeZoneId) throw new Error('no data');
      const out: TimeZoneValue = {
        lat: la,
        lng: ln,
        timeZoneId: json.timeZoneId,
        timeZoneName: json.timeZoneName,
        rawOffsetSeconds: json.rawOffset,
        dstOffsetSeconds: json.dstOffset,
        localTime: new Date(ts * 1000 + (json.dstOffset + json.rawOffset) * 1000).toLocaleString(),
        source: useManaged ? 'managed-proxy' : 'google',
      };
      setResult(out);
      onChange(out);
    } catch {
      setError(
        useManaged
          ? 'Time zone lookup is unavailable. The Fieseros managed proxy will provide this in production.'
          : 'Could not fetch time zone. Check your Google Time Zone API key.',
      );
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

  const fmtOffset = (sec?: number) => {
    if (sec == null) return '';
    const sign = sec >= 0 ? '+' : '-';
    const mins = Math.abs(sec) / 60;
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      {useManaged && (
        <div className="rounded-md border border-dashed p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <span>
            Time zone lookup will be powered by the Fieseros managed proxy in production.
            Add a Google Time Zone API key in field settings to call Google directly.
          </span>
        </div>
      )}
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
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
          Lookup time zone
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
          <p className="font-semibold flex items-center gap-1.5">
            <Globe className="size-4 text-primary" />
            {result.timeZoneId ?? 'Unknown'}
          </p>
          {result.timeZoneName && (
            <p className="text-[11px] text-muted-foreground">{result.timeZoneName}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] mt-1">
            <span>Offset: <span className="font-mono">{fmtOffset(result.dstOffsetSeconds ?? result.rawOffsetSeconds)}</span></span>
            {result.localTime && (
              <span className="flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground" /> {result.localTime}
              </span>
            )}
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3" /> {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeZoneFromLocation;

'use client';

import React, { useState } from 'react';
import { Globe, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str } from '../widget-props';

interface IpGeoValue {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  org?: string;
  timezone?: string;
  source: string;
}

/**
 * IP geolocation lookup via the free ipapi.co endpoint (no key required).
 * Renders the detected location in a small summary card. If the request
 * fails, displays a graceful message and lets the user retry.
 */
export function IpGeolocation({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'IP geolocation');
  const existing: IpGeoValue | null =
    value && typeof value === 'object' ? (value as IpGeoValue) : null;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IpGeoValue | null>(existing);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://ipapi.co/json/', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      if (json && json.error) throw new Error(json.reason || 'lookup failed');
      const out: IpGeoValue = { ...json, source: 'ipapi.co' };
      setResult(out);
      onChange(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not determine location from IP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={lookup}
        disabled={disabled || loading}
        className="gap-1.5 text-xs"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : result ? (
          <RefreshCw className="size-3.5" />
        ) : (
          <Globe className="size-3.5" />
        )}
        {result ? 'Re-detect location' : 'Detect my location via IP'}
      </Button>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {result && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold">
            <Globe className="size-3.5 text-primary" />
            {result.ip}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <Row label="City" value={result.city} />
            <Row label="Region" value={result.region} />
            <Row label="Country" value={result.country_name ? `${result.country_name} (${result.country_code ?? ''})`.trim() : undefined} />
            <Row label="Postal" value={result.postal} />
            <Row
              label="Coordinates"
              value={
                result.latitude != null && result.longitude != null
                  ? `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
                  : undefined
              }
            />
            <Row label="Timezone" value={result.timezone} />
            <Row label="ISP / Org" value={result.org} />
          </div>
          {result.latitude != null && result.longitude != null && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${result.latitude}&mlon=${result.longitude}#map=12/${result.latitude}/${result.longitude}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
            >
              <MapPin className="size-3" /> View on OpenStreetMap
            </a>
          )}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Powered by ipapi.co. Accuracy is approximate (city / region level).
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="truncate">
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium">{value}</span>
    </p>
  );
}

export default IpGeolocation;

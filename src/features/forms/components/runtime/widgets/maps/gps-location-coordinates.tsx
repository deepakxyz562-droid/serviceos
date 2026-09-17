'use client';

import React, { useState } from 'react';
import { Crosshair, Loader2, MapPin, Navigation, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str } from '../widget-props';

interface GpsValue {
  lat: number;
  lng: number;
  accuracyMeters: number;
  timestamp: number;
}

/**
 * GPS location coordinates: one-tap capture of lat/lng/accuracy.
 * Falls back to a friendly message when navigator.geolocation is missing.
 */
export function GpsLocationCoordinates({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'GPS coordinates');
  const captured: GpsValue | null =
    value && typeof value === 'object' ? (value as GpsValue) : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;

  const onCapture = () => {
    if (!supported || disabled) return;
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        const out: GpsValue = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          timestamp: Date.now(),
        };
        onChange(out);
      },
      (err) => {
        setLoading(false);
        setError(err.message || 'Could not retrieve GPS location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  if (!supported) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
        <MapPin className="size-4" />
        GPS is not available in this browser. Please use a text input for coordinates.
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onCapture}
        disabled={disabled || loading}
        className="gap-1.5 text-xs"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Crosshair className="size-3.5" />
        )}
        {captured ? 'Re-capture location' : 'Capture my location'}
      </Button>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {captured && (
        <div className="rounded-md border bg-emerald-50/60 dark:bg-emerald-950/30 p-3 space-y-1.5 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
            Location captured
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="flex items-center gap-1">
              <MapPin className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">Lat:</span>
              <span className="font-mono">{captured.lat.toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">Lng:</span>
              <span className="font-mono">{captured.lng.toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Navigation className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">Accuracy:</span>
              <span className="font-mono">±{Math.round(captured.accuracyMeters)} m</span>
            </div>
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${captured.lat}&mlon=${captured.lng}#map=16/${captured.lat}/${captured.lng}`}
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

export default GpsLocationCoordinates;

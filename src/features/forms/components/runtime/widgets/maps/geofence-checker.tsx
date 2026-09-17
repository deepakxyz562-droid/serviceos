'use client';

import React, { useState } from 'react';
import { MapPin, ShieldCheck, ShieldAlert, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

interface GeofenceResult {
  lat: number;
  lng: number;
  inside: boolean;
  distanceKm: number;
  fenceLabel?: string;
}

/**
 * Geofence checker: stores a fence (lat/lng + radiusKm) in config.
 * Captures user location (GPS or manual entry) and reports whether they are
 * inside the configured geofence. Pure Haversine math; no external API.
 */
export function GeofenceChecker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Geofence checker');
  const fenceLat = num(config.fenceLat, 40.7128);
  const fenceLng = num(config.fenceLng, -74.006);
  const radiusKm = num(config.radiusKm, 5);
  const fenceLabel = str(config.fenceLabel, 'Configured zone');
  const allowGps = bool(config.allowGps, true);
  const existing: GeofenceResult | null =
    value && typeof value === 'object' ? (value as GeofenceResult) : null;
  const [lat, setLat] = useState(existing ? String(existing.lat) : '');
  const [lng, setLng] = useState(existing ? String(existing.lng) : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeofenceResult | null>(existing);

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

  const evaluate = (la: number, ln: number) => {
    const dKm = haversineKm(la, ln, fenceLat, fenceLng);
    const out: GeofenceResult = {
      lat: la,
      lng: ln,
      inside: dKm <= radiusKm,
      distanceKm: Number(dKm.toFixed(3)),
      fenceLabel,
    };
    setResult(out);
    onChange(out);
  };

  const onCheck = () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) evaluate(la, ln);
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
        setLoading(false);
        evaluate(la, ln);
      },
      () => {
        setLoading(false);
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="rounded-md border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
        Fence: <span className="font-medium text-foreground">{fenceLabel}</span> — center{' '}
        {fenceLat.toFixed(4)}, {fenceLng.toFixed(4)}, radius {radiusKm} km
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          type="number"
          step="0.000001"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Your latitude"
          disabled={disabled || loading}
          aria-label={`${ariaLabel} latitude`}
          className="text-xs"
        />
        <Input
          type="number"
          step="0.000001"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="Your longitude"
          disabled={disabled || loading}
          aria-label={`${ariaLabel} longitude`}
          className="text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onCheck}
          disabled={disabled || loading || !lat || !lng}
          className="text-xs gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
          Check
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
      {result && (
        <div
          className={`rounded-md border p-3 text-xs flex items-center gap-2 ${
            result.inside
              ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-amber-300 bg-amber-50/60 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
          }`}
        >
          {result.inside ? (
            <ShieldCheck className="size-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="size-4 text-amber-600" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{result.inside ? 'Inside geofence' : 'Outside geofence'}</p>
            <p className="text-[10px] opacity-80 mt-0.5">
              {result.distanceKm} km from center — fence radius {radiusKm} km
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeofenceChecker;

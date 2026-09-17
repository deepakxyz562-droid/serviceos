'use client';

import React, { useState } from 'react';
import { Navigation, Car, Loader2, MapPin, ArrowRight, Clock, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

interface DistanceResult {
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Driving distance calculator using the public OSRM demo server.
 * Free, CORS-enabled, no API key. Uses Haversine fallback if OSRM fails.
 */
export function DrivingDistanceCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Driving distance calculator');
  const unit = str(config.unit, 'km') === 'miles' ? 'miles' : 'km';
  const profile = str(config.profile, 'driving'); // driving | cycling | foot
  const allowGps = bool(config.allowGps, true);
  const [origin, setOrigin] = useState(str((value as DistanceResult | null)?.origin, ''));
  const [destination, setDestination] = useState(str((value as DistanceResult | null)?.destination, ''));
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<DistanceResult | null>(
    value && typeof value === 'object' ? (value as DistanceResult) : null,
  );
  const [error, setError] = useState<string | null>(null);

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

  const geocode = async (q: string): Promise<{ lat: number; lon: number } | null> => {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(q);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const calc = async () => {
    if (!origin.trim() || !destination.trim() || disabled) return;
    setCalculating(true);
    setError(null);
    try {
      const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
      if (!o || !d) {
        setError('Could not geocode one or both addresses.');
        setCalculating(false);
        return;
      }
      let distKm = haversineKm(o.lat, o.lon, d.lat, d.lon);
      let durMin = (distKm / 60) * 60; // ~60km/h assumption
      try {
        const url = `https://router.project-osrm.org/route/v1/${profile}/${o.lon},${o.lat};${d.lon},${d.lat}?overview=false`;
        const res = await fetch(url);
        const json = await res.json();
        if (json?.routes?.[0]) {
          distKm = json.routes[0].distance / 1000;
          durMin = json.routes[0].duration / 60;
        }
      } catch {
        /* OSRM unavailable — fall back to haversine */
      }
      const out: DistanceResult = {
        origin,
        destination,
        distanceKm: Number(distKm.toFixed(2)),
        durationMinutes: Math.round(durMin),
      };
      setResult(out);
      onChange(out);
    } catch {
      setError('Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const useGpsForOrigin = () => {
    if (!navigator.geolocation || disabled) return;
    setCalculating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
        setCalculating(false);
      },
      () => setCalculating(false),
      { timeout: 10000 },
    );
  };

  const fmtDist = (km: number) => (unit === 'miles' ? `${(km * 0.621371).toFixed(2)} mi` : `${km.toFixed(2)} km`);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Origin address"
            disabled={disabled || calculating}
            className="pl-9 text-xs"
            aria-label={`${ariaLabel} origin`}
          />
        </div>
        {allowGps && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={useGpsForOrigin}
            disabled={disabled || calculating}
            className="text-xs shrink-0 gap-1"
            title="Use GPS for origin"
          >
            <Navigation className="size-3.5 text-emerald-600" /> GPS
          </Button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-rose-500" />
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination address"
            disabled={disabled || calculating}
            className="pl-9 text-xs"
            aria-label={`${ariaLabel} destination`}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={calc}
          disabled={disabled || calculating || !origin.trim() || !destination.trim()}
          className="text-xs shrink-0 gap-1.5"
        >
          {calculating ? <Loader2 className="size-3.5 animate-spin" /> : <Car className="size-3.5" />}
          Calculate
        </Button>
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {result && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <Route className="size-3.5 text-primary" />
            {result.origin} <ArrowRight className="size-3" /> {result.destination}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <Car className="size-3.5 text-muted-foreground" />
              {fmtDist(result.distanceKm)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-muted-foreground" />
              {result.durationMinutes} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DrivingDistanceCalculator;

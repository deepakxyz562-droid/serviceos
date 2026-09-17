'use client';

import React, { useState } from 'react';
import { MapPin, CheckCircle2, AlertTriangle, Loader2, Navigation, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

interface ServiceAreaResult {
  inArea: boolean;
  searchedAddress: string;
  matchedZone?: string;
  distanceKm?: number;
  notes?: string;
}

/**
 * Service Area Checker v2.
 * Uses Nominatim (free, CORS) for geocoding the user address, then Haversine
 * distance against one or more configured zones. If any zone's center is
 * within `radiusKm` (or the address's postcode matches `allowedPostcodes`),
 * the address is in service area.
 */
export function ServiceAreaCheckerV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Service area checker v2');
  const zoneListRaw = config.zones;
  type ZoneCfg = { label?: string; lat?: number; lng?: number; postcode?: string };
  const zones: ZoneCfg[] = Array.isArray(zoneListRaw)
    ? (zoneListRaw as ZoneCfg[])
    : [{ label: str(config.zoneLabel, 'Main zone'), lat: num(config.centerLat, 40.7128), lng: num(config.centerLng, -74.006), postcode: str(config.centerPostcode, '') }];
  const radiusKm = num(config.radiusKm, 25);
  const allowedPostcodes: string[] = Array.isArray(config.allowedPostcodes)
    ? (config.allowedPostcodes as string[])
    : [];
  const allowGps = bool(config.allowGps, true);

  const existing: ServiceAreaResult | null =
    value && typeof value === 'object' ? (value as ServiceAreaResult) : null;
  const [query, setQuery] = useState(existing?.searchedAddress ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ServiceAreaResult | null>(existing);
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

  const check = async (lat: number, lng: number, label: string, postcode?: string) => {
    let best: { zone: ZoneCfg; distKm: number } | null = null;
    for (const z of zones) {
      if (typeof z.lat === 'number' && typeof z.lng === 'number') {
        const d = haversineKm(lat, lng, z.lat, z.lng);
        if (!best || d < best.distKm) best = { zone: z, distKm: d };
      }
    }
    const matchedPostcode = allowedPostcodes.length > 0 && postcode
      ? allowedPostcodes.find((p) => p === postcode)
      : undefined;
    const insideByDistance = best ? best.distKm <= radiusKm : false;
    const inside = insideByDistance || !!matchedPostcode;

    const out: ServiceAreaResult = {
      inArea: inside,
      searchedAddress: label,
      matchedZone: best?.zone.label ?? (matchedPostcode ? `Postcode ${matchedPostcode}` : undefined),
      distanceKm: best ? Number(best.distKm.toFixed(1)) : undefined,
      notes: inside
        ? matchedPostcode
          ? 'Matched allowed postcode'
          : `Within ${radiusKm} km of service center`
        : best
          ? `${best.distKm.toFixed(1)} km from nearest zone (limit ${radiusKm} km)`
          : 'No configured zone could be matched',
    };
    setResult(out);
    onChange(out);
  };

  const onSearch = async () => {
    if (!query.trim() || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(query.trim())}`,
        { headers: { Accept: 'application/json' } },
      );
      const json = await res.json();
      if (Array.isArray(json) && json[0]) {
        await check(
          parseFloat(json[0].lat),
          parseFloat(json[0].lon),
          json[0].display_name ?? query,
          json[0].address?.postcode,
        );
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
        await check(pos.coords.latitude, pos.coords.longitude, 'My GPS location');
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('GPS unavailable.');
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSearch())}
            placeholder="Enter your address or ZIP..."
            className="pl-9 text-xs"
            disabled={disabled || loading}
            aria-label={`${ariaLabel} address`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSearch}
          disabled={disabled || loading || !query.trim()}
          className="text-xs shrink-0"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Check'}
        </Button>
        {allowGps && (
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
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Service radius: {radiusKm} km · {allowedPostcodes.length > 0 ? `${allowedPostcodes.length} allowed postcodes` : 'no postcode allowlist'} · {zones.length} zone(s)
      </p>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {result && (
        <div
          className={`rounded-md border p-3 text-xs flex items-start gap-2.5 ${
            result.inArea
              ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-amber-300 bg-amber-50/60 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
          }`}
        >
          {result.inArea ? (
            <CheckCircle2 className="size-4 mt-0.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" />
          )}
          <div className="space-y-0.5 flex-1">
            <p className="font-semibold">
              {result.inArea ? 'You are in our service area' : 'Outside service area'}
              {result.matchedZone && ` — ${result.matchedZone}`}
            </p>
            <p className="text-[11px] opacity-80 flex items-center gap-1">
              <Building2 className="size-3" />
              <span className="truncate">{result.searchedAddress}</span>
            </p>
            {result.distanceKm != null && (
              <p className="text-[11px] opacity-80">{result.distanceKm} km from nearest zone</p>
            )}
            {result.notes && <p className="text-[10px] opacity-70">{result.notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceAreaCheckerV2;

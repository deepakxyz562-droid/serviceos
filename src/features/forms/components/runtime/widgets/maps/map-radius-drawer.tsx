'use client';

import React, { useRef, useState } from 'react';
import { CircleDot, MapPin, Trash2, Crosshair, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

interface RadiusValue {
  center: { lat: number; lng: number };
  radiusKm: number;
}

/**
 * Map-radius-drawer: user picks a center (click / GPS / manual) and a radius
 * in km. The radius is rendered as an SVG circle on top of a CSS gradient
 * map placeholder (no Leaflet).
 */
export function MapRadiusDrawer({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map radius drawer');
  const centerLat = num(config.centerLat, 40.7128);
  const centerLng = num(config.centerLng, -74.006);
  const zoom = num(config.zoom, 12);
  const defaultRadiusKm = num(config.defaultRadiusKm, 2);
  const maxRadiusKm = num(config.maxRadiusKm, 100);

  const existing: RadiusValue | null =
    value && typeof value === 'object' ? (value as RadiusValue) : null;
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(existing?.center ?? null);
  const [radiusKm, setRadiusKm] = useState<number>(existing?.radiusKm ?? defaultRadiusKm);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const commit = (c: { lat: number; lng: number }, r: number) => {
    setCenter(c);
    setRadiusKm(r);
    onChange({ center: c, radiusKm: r });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const span = 360 / Math.pow(2, zoom);
    const lng = centerLng + (x - 0.5) * span;
    const lat = centerLat - (y - 0.5) * span * 0.5;
    commit({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }, radiusKm);
  };

  const useGps = () => {
    if (!navigator.geolocation || disabled) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        commit({ lat: pos.coords.latitude, lng: pos.coords.longitude }, radiusKm);
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 10000 },
    );
  };

  // Circle radius in viewBox units: 1000 = map width = span degrees
  const span = 360 / Math.pow(2, zoom);
  const radiusUnits = Math.min((radiusKm / 111) / span, 0.45) * 1000;

  const setRadiusSafe = (n: number) => {
    if (Number.isFinite(n)) {
      const r = Math.max(0.1, Math.min(maxRadiusKm, n));
      if (center) commit(center, r);
      else setRadiusKm(r);
    }
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div
        ref={containerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${ariaLabel} map; click to set center`}
        onClick={handleClick}
        className="relative w-full h-52 rounded-lg overflow-hidden border border-border/80 bg-gradient-to-br from-sky-100 via-emerald-50 to-emerald-100 dark:from-sky-950 dark:via-emerald-950/40 dark:to-emerald-900/40 cursor-crosshair select-none"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {center && (
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <circle
              cx={500}
              cy={300}
              r={radiusUnits}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="rgb(13, 148, 136)"
              strokeWidth={3}
              strokeDasharray="6 4"
            />
            <circle cx={500} cy={300} r={9} fill="rgb(13, 148, 136)" />
            <circle cx={500} cy={300} r={3} fill="white" />
          </svg>
        )}
        {!center && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1 pointer-events-none">
            <CircleDot className="size-6" />
            <span className="text-xs">Click the map or use GPS to set center</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] text-muted-foreground shrink-0">Radius (km):</label>
        <Input
          type="number"
          min={0.1}
          max={maxRadiusKm}
          step={0.1}
          value={radiusKm}
          onChange={(e) => setRadiusSafe(parseFloat(e.target.value))}
          disabled={disabled}
          aria-label={`${ariaLabel} radius km`}
          className="w-24 text-xs"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={useGps}
          disabled={disabled || loading}
          className="gap-1.5 text-xs"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5 text-emerald-600" />}
          GPS
        </Button>
        {center && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCenter(null);
              onChange(null);
            }}
            disabled={disabled}
            className="gap-1.5 text-xs"
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        )}
        {center && (
          <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3" />
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
        )}
      </div>
      {center && (
        <a
          href={`https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=${zoom}/${center.lat}/${center.lng}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <Crosshair className="size-3" /> Open center on OpenStreetMap
        </a>
      )}
    </div>
  );
}

export default MapRadiusDrawer;

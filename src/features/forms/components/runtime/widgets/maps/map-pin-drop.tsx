'use client';

import React, { useState } from 'react';
import { MapPin, Crosshair, Navigation, Loader2, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

interface PinValue {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Map-pin-drop: simple map placeholder where the user clicks to drop a pin.
 * The map uses a CSS gradient with a grid overlay; clicking maps the click
 * position to lat/lng around `config.centerLat/Lng` and `config.zoom`.
 */
export function MapPinDrop({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map pin drop');
  const centerLat = num(config.centerLat, 40.7128);
  const centerLng = num(config.centerLng, -74.006);
  const zoom = num(config.zoom, 13);
  const existing: PinValue | null =
    value && typeof value === 'object' ? (value as PinValue) : null;
  const [pin, setPin] = useState<PinValue | null>(existing);
  const [loading, setLoading] = useState(false);

  const commit = (la: number, ln: number, label?: string) => {
    const out: PinValue = { lat: la, lng: ln, label };
    setPin(out);
    onChange(out);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const span = 360 / Math.pow(2, zoom);
    const newLng = centerLng + (x - 0.5) * span;
    const newLat = centerLat - (y - 0.5) * span * 0.5;
    commit(Number(newLat.toFixed(6)), Number(newLng.toFixed(6)), 'Dropped pin');
  };

  const useGps = () => {
    if (!navigator.geolocation || disabled) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        commit(pos.coords.latitude, pos.coords.longitude, 'GPS pin');
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 10000 },
    );
  };

  const osmUrl = (la: number, ln: number) =>
    `https://www.openstreetmap.org/?mlat=${la}&mlon=${ln}#map=${zoom}/${la}/${ln}`;

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${ariaLabel} map; click to drop a pin`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            commit(centerLat, centerLng, 'Center pin');
          }
        }}
        className="relative rounded-lg overflow-hidden border border-border/80 h-48 cursor-crosshair select-none bg-gradient-to-br from-sky-100 via-emerald-50 to-emerald-100 dark:from-sky-950 dark:via-emerald-950/40 dark:to-emerald-900/40"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {pin ? (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
            <MapPin className="size-8 text-rose-600 drop-shadow" fill="currentColor" />
            <div className="mt-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow">
              {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1">
            <Plus className="size-6" />
            <span className="text-xs">Click anywhere on the map to drop a pin</span>
          </div>
        )}
        {disabled && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px]" aria-hidden />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={useGps}
          disabled={disabled || loading}
          className="gap-1.5 text-xs"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5 text-emerald-600" />}
          Use GPS
        </Button>
        {pin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPin(null);
              onChange(null);
            }}
            disabled={disabled}
            className="gap-1.5 text-xs"
          >
            <Crosshair className="size-3.5" /> Clear pin
          </Button>
        )}
        {pin && (
          <a
            href={osmUrl(pin.lat, pin.lng)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="size-3" /> Open in OpenStreetMap
          </a>
        )}
      </div>
    </div>
  );
}

export default MapPinDrop;

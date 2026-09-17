'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Loader2, Crosshair, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

interface PinValue {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Address-map-locator: a draggable pin on a CSS-gradient map placeholder.
 * Captures lat/lng via GPS button, manual entry, or by clicking on the map.
 * No Leaflet — uses a stylized placeholder + OSM link.
 */
export function AddressMapLocator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map locator');
  const initialCenterLat = num(config.centerLat, 40.7128);
  const initialCenterLng = num(config.centerLng, -74.006);
  const zoom = num(config.zoom, 13);

  const obj: PinValue | null =
    value && typeof value === 'object' ? (value as PinValue) : null;
  const [lat, setLat] = useState<number | null>(obj?.lat ?? null);
  const [lng, setLng] = useState<number | null>(obj?.lng ?? null);
  const [label, setLabel] = useState<string>(obj?.label ?? '');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commit = (nextLat: number, nextLng: number, nextLabel?: string) => {
    setLat(nextLat);
    setLng(nextLng);
    const payload: PinValue = {
      lat: nextLat,
      lng: nextLng,
      label: nextLabel ?? label,
    };
    onChange(payload);
  };

  const useGps = () => {
    if (!navigator.geolocation || disabled) {
      setError('Geolocation unavailable in this browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        commit(pos.coords.latitude, pos.coords.longitude, 'GPS location');
      },
      () => {
        setLoading(false);
        setError('Could not get GPS location.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Translate click position to lat/lng around the configured center.
    const span = 360 / Math.pow(2, zoom);
    const newLng = initialCenterLng + (x - 0.5) * span;
    const newLat = initialCenterLat - (y - 0.5) * span * 0.5;
    commit(Number(newLat.toFixed(6)), Number(newLng.toFixed(6)), 'Pinned on map');
  };

  const onManualSet = () => {
    if (lat != null && lng != null) commit(lat, lng, label || 'Manual location');
  };

  const osmUrl = (la: number, ln: number) =>
    `https://www.openstreetmap.org/?mlat=${la}&mlon=${ln}#map=${zoom}/${la}/${ln}`;

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-lg overflow-hidden border border-border/80 bg-gradient-to-br from-sky-100 via-emerald-50 to-emerald-100 dark:from-sky-950 dark:via-emerald-950/40 dark:to-emerald-900/40 h-56 cursor-crosshair select-none"
        onMouseDown={(e) => {
          if (disabled) return;
          setDragging(true);
          onMapClick(e);
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        role="button"
        aria-label={`${ariaLabel} map; click to drop a pin`}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            commit(initialCenterLat, initialCenterLng, 'Center pin');
          }
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {lat != null && lng != null ? (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
            <MapPin
              className={`size-8 text-rose-600 drop-shadow ${dragging ? 'scale-110' : ''} transition-transform`}
              fill="currentColor"
            />
            <div className="mt-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1">
            <Crosshair className="size-6" />
            <span className="text-xs">Click the map to drop a pin</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="number"
          step="0.000001"
          value={lat ?? ''}
          onChange={(e) => setLat(e.target.value === '' ? null : parseFloat(e.target.value))}
          placeholder="Latitude"
          disabled={disabled}
          aria-label={`${ariaLabel} latitude`}
          className="text-xs"
        />
        <Input
          type="number"
          step="0.000001"
          value={lng ?? ''}
          onChange={(e) => setLng(e.target.value === '' ? null : parseFloat(e.target.value))}
          placeholder="Longitude"
          disabled={disabled}
          aria-label={`${ariaLabel} longitude`}
          className="text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onManualSet}
          disabled={disabled || lat == null || lng == null}
          className="text-xs shrink-0"
        >
          Set
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={useGps}
          disabled={disabled || loading}
          className="text-xs shrink-0 gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}
          GPS
        </Button>
      </div>

      {label && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" /> {label}
        </p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {lat != null && lng != null && (
        <a
          href={osmUrl(lat, lng)}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="size-3" /> View on OpenStreetMap
        </a>
      )}
    </div>
  );
}

export default AddressMapLocator;

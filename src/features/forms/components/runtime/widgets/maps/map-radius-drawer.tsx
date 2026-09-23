'use client';

/**
 * Map Radius Drawer — real interactive Leaflet map for drawing a circle area.
 *
 * Uses react-leaflet + OpenStreetMap tiles. User clicks to set the center,
 * then adjusts the radius. The result is { lat, lng, radiusMeters }.
 */
import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { CircleDot, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
import 'leaflet/dist/leaflet.css';

interface RadiusValue { lat: number; lng: number; radiusMeters: number; }

function ClickHandler({ onClick, disabled }: { onClick: (lat: number, lng: number) => void; disabled: boolean }) {
  useMapEvents({ click(e) { if (!disabled) onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export function MapRadiusDrawer({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map Radius Drawer');
  const defaultLat = num(config.defaultLat, 39.8283);
  const defaultLng = num(config.defaultLng, -98.5795);
  const defaultZoom = num(config.defaultZoom, 4);
  const defaultRadius = num(config.defaultRadiusMeters, 1000);

  const current = (value as Partial<RadiusValue> | undefined) ?? {};
  const center: { lat: number; lng: number } = {
    lat: current.lat ?? defaultLat,
    lng: current.lng ?? defaultLng,
  };
  const radius = current.radiusMeters ?? defaultRadius;

  const handleMapClick = (lat: number, lng: number) => {
    onChange({ lat, lng, radiusMeters: radius });
  };

  const handleRadiusChange = (val: string) => {
    const r = parseFloat(val);
    if (!isNaN(r) && r > 0) {
      onChange({ lat: center.lat, lng: center.lng, radiusMeters: r });
    }
  };

  const handleGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusMeters: radius }),
      () => {},
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={defaultZoom}
          className="w-full h-[280px]"
          scrollWheelZoom={!disabled}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle center={[center.lat, center.lng]} radius={radius} pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.15 }} />
          <ClickHandler onClick={handleMapClick} disabled={disabled} />
        </MapContainer>
      </div>
      <div className="flex items-center gap-2">
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={handleGps} className="text-xs gap-1.5">
            <CircleDot className="size-3" /> GPS
          </Button>
        )}
        <label className="text-[10px] text-muted-foreground flex items-center gap-1">
          Radius:
          <Input
            type="number"
            value={radius}
            onChange={(e) => handleRadiusChange(e.target.value)}
            disabled={disabled}
            className="h-7 w-24 text-xs"
          />
          <span className="text-[10px]">m</span>
        </label>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">
          {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

export default MapRadiusDrawer;

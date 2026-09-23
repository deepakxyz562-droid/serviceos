'use client';

/**
 * Map Pin Drop — real interactive Leaflet map for dropping a single pin.
 *
 * Uses react-leaflet + OpenStreetMap tiles (no API key required).
 * User can click anywhere on the map to drop a pin, or use the GPS button
 * to center on their current location.
 */
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
import 'leaflet/dist/leaflet.css';

interface PinValue { lat: number; lng: number; }

function ClickHandler({ onClick, disabled }: { onClick: (lat: number, lng: number) => void; disabled: boolean }) {
  useMapEvents({ click(e) { if (!disabled) onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export function MapPinDrop({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map Pin Drop');
  const defaultLat = num(config.defaultLat, 39.8283);
  const defaultLng = num(config.defaultLng, -98.5795);
  const defaultZoom = num(config.defaultZoom, 4);
  const [loadingGps, setLoadingGps] = useState(false);

  const current = (value as Partial<PinValue> | undefined) ?? {};
  const pin: PinValue = {
    lat: current.lat ?? defaultLat,
    lng: current.lng ?? defaultLng,
  };

  const handleMapClick = (lat: number, lng: number) => {
    onChange({ lat, lng });
  };

  const handleGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingGps(false);
      },
      () => setLoadingGps(false),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={[pin.lat, pin.lng]}
          zoom={defaultZoom}
          className="w-full h-[280px]"
          scrollWheelZoom={!disabled}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[pin.lat, pin.lng]} draggable={!disabled} eventHandlers={{
            dragend: (e: any) => {
              const m = e.target as L.Marker;
              const ll = m.getLatLng();
              onChange({ lat: ll.lat, lng: ll.lng });
            },
          }} />
          <ClickHandler onClick={handleMapClick} disabled={disabled} />
        </MapContainer>
      </div>
      <div className="flex items-center gap-2">
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={handleGps} disabled={loadingGps} className="text-xs gap-1.5">
            {loadingGps ? <Loader2 className="size-3 animate-spin" /> : <Crosshair className="size-3" />} GPS
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground font-mono">
          {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

export default MapPinDrop;

'use client';

/**
 * Map Polygon Drawer — real interactive Leaflet map for drawing a polygon area.
 *
 * Uses react-leaflet + OpenStreetMap tiles. User clicks multiple points on
 * the map to form a polygon. The polygon vertices are stored as an array
 * of {lat, lng} points.
 */
import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Trash2, Undo2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
import 'leaflet/dist/leaflet.css';

interface Point { lat: number; lng: number; }

function ClickHandler({ onClick, disabled }: { onClick: (lat: number, lng: number) => void; disabled: boolean }) {
  useMapEvents({ click(e) { if (!disabled) onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export function MapPolygonDrawer({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map Polygon Drawer');
  const defaultLat = num(config.defaultLat, 39.8283);
  const defaultLng = num(config.defaultLng, -98.5795);
  const defaultZoom = num(config.defaultZoom, 4);

  const points: Point[] = Array.isArray(value) ? value : [];
  const [isDrawing, setIsDrawing] = useState(true);

  const handleMapClick = (lat: number, lng: number) => {
    if (!isDrawing) return;
    onChange([...points, { lat, lng }]);
  };

  const handleUndo = () => {
    onChange(points.slice(0, -1));
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleFinish = () => {
    setIsDrawing(false);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={[defaultLat, defaultLng]}
          zoom={defaultZoom}
          className="w-full h-[280px]"
          scrollWheelZoom={!disabled}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {points.length >= 2 && (
            <Polygon positions={points.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.2 }} />
          )}
          <ClickHandler onClick={handleMapClick} disabled={disabled || !isDrawing} />
        </MapContainer>
      </div>
      {!disabled && (
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={points.length === 0} className="text-xs gap-1">
            <Undo2 className="size-3" /> Undo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={points.length === 0} className="text-xs gap-1">
            <Trash2 className="size-3" /> Clear
          </Button>
          {isDrawing && points.length >= 3 && (
            <Button type="button" variant="default" size="sm" onClick={handleFinish} className="text-xs gap-1">
              <Check className="size-3" /> Done
            </Button>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{points.length} points</span>
        </div>
      )}
    </div>
  );
}

export default MapPolygonDrawer;

'use client';

import React, { useRef, useState } from 'react';
import { Hexagon, MapPin, Trash2, Undo2, Crosshair, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

interface Point {
  x: number;
  y: number;
}

interface PolygonValue {
  // Normalize relative coordinates [0..1] x [0..1]; transform via center+zoom at read time.
  points: Point[];
  center: { lat: number; lng: number };
  zoom: number;
}

/**
 * Map-polygon-drawer: a clickable canvas where the user drops vertices
 * to form a polygon. Uses a CSS gradient map placeholder + SVG overlay
 * (NO Leaflet). Stores normalized polygon points + map center.
 */
export function MapPolygonDrawer({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Map polygon drawer');
  const centerLat = num(config.centerLat, 40.7128);
  const centerLng = num(config.centerLng, -74.006);
  const zoom = num(config.zoom, 13);
  const maxPoints = Math.max(3, num(config.maxPoints, 30));

  const existing: PolygonValue | null =
    value && typeof value === 'object' ? (value as PolygonValue) : null;
  const [points, setPoints] = useState<Point[]>(existing?.points ?? []);
  const [closed, setClosed] = useState<boolean>(existing && existing.points.length >= 3 ? true : false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const commit = (next: Point[], isClosed: boolean) => {
    setPoints(next);
    setClosed(isClosed);
    onChange({ points: next, center: { lat: centerLat, lng: centerLng }, zoom });
  };

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || closed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (points.length >= maxPoints) return;
    commit([...points, { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) }], false);
  };

  const close = () => {
    if (points.length < 3 || disabled) return;
    commit(points, true);
  };

  const undo = () => {
    if (disabled || points.length === 0) return;
    commit(points.slice(0, -1), false);
  };

  const reset = () => {
    commit([], false);
  };

  // SVG polygon path
  const toPath = (pts: Point[], closePath: boolean) => {
    if (pts.length === 0) return '';
    const d = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 1000} ${p.y * 600}`)
      .join(' ');
    return closePath ? `${d} Z` : d;
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div
        ref={containerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${ariaLabel} canvas; click to add polygon vertices`}
        onClick={onMapClick}
        className="relative w-full h-56 rounded-lg overflow-hidden border border-border/80 bg-gradient-to-br from-sky-100 via-emerald-50 to-emerald-100 dark:from-sky-950 dark:via-emerald-950/40 dark:to-emerald-900/40 cursor-crosshair select-none"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {points.length > 1 && (
            <path
              d={toPath(points, closed)}
              fill={closed ? 'rgba(34, 197, 94, 0.25)' : 'none'}
              stroke="rgb(13, 148, 136)"
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x * 1000}
              cy={p.y * 600}
              r={8}
              fill={i === 0 ? 'rgb(13, 148, 136)' : 'white'}
              stroke="rgb(13, 148, 136)"
              strokeWidth={3}
            />
          ))}
        </svg>
        {points.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1 pointer-events-none">
            <Hexagon className="size-6" />
            <span className="text-xs">Click on the map to drop polygon vertices</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={disabled || points.length === 0}
          className="gap-1.5 text-xs"
        >
          <Undo2 className="size-3.5" /> Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={close}
          disabled={disabled || closed || points.length < 3}
          className="gap-1.5 text-xs"
        >
          <Check className="size-3.5" /> Close polygon
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={disabled || points.length === 0}
          className="gap-1.5 text-xs"
        >
          <Trash2 className="size-3.5" /> Clear
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" />
          {points.length} vertex{points.length === 1 ? '' : 'es'}
          {closed && <Check className="size-3 text-emerald-600" />}
        </span>
      </div>
      {points.length > 0 && !closed && points.length < 3 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Crosshair className="size-3" /> Add at least 3 vertices, then close.
        </p>
      )}
    </div>
  );
}

export default MapPolygonDrawer;

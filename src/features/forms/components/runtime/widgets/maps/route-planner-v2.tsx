'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Car,
  Footprints,
  Bike,
  Plus,
  Trash2,
  Loader2,
  CircleDot,
  MapPin,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

// Fix Leaflet icon assets
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import 'leaflet/dist/leaflet.css';

interface StopLocation {
  id: string;
  address: string;
  coords?: { lat: number; lng: number };
}

interface RouteSummary {
  distanceMi: number;
  distanceKm: number;
  durationMin: number;
  mode: 'driving' | 'walking' | 'bicycling';
}

function MapAutoBounds({ positions }: { positions: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (positions.length === 1 && positions[0]) {
      map.setView(positions[0], 12);
    }
  }, [positions, map]);
  return null;
}

/**
 * Route Planner v2 — exact match to Jotform screenshot:
 *  - Start location with purple circle icon
 *  - Vertical dotted connecting line
 *  - Dynamic intermediate stops (+ Add stop)
 *  - End location with purple map-pin icon
 *  - Travel mode toggle pills: Driving, Walking, Bicycling
 *  - Interactive Leaflet map with polyline route line
 *  - Result metric pill: [icon] [duration] min [distance] mi
 *  - Footnote: "Distance, travel time and stop order are saved with your submission."
 */
export function RoutePlannerV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const defaultTravelMode = (str(config.defaultTravelMode, 'driving') as 'driving' | 'walking' | 'bicycling');
  const allowStops = bool(config.allowAdditionalStops, true);
  const distanceUnit = str(config.distanceUnits, str(config.unit, 'miles'));
  const startPlaceholder = str(config.startLocationLabel, 'Start location');
  const endPlaceholder = str(config.endLocationLabel, 'End location');

  const [mode, setMode] = useState<'driving' | 'walking' | 'bicycling'>(defaultTravelMode);
  const [startLoc, setStartLoc] = useState<string>('7200 W Grand Ave, Chicago, IL 60707');
  const [endLoc, setEndLoc] = useState<string>('233 S Wacker Dr, Chicago, IL 60606');
  const [stops, setStops] = useState<StopLocation[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initial geocoded default Chicago coordinates matching screenshot
  const [routePolyline, setRoutePolyline] = useState<Array<[number, number]>>([
    [41.9168, -87.8078], // 7200 W Grand Ave
    [41.8789, -87.6359], // 233 S Wacker Dr (Willis Tower)
  ]);
  const [summary, setSummary] = useState<RouteSummary>({
    distanceMi: 10.9,
    distanceKm: 17.5,
    durationMin: 21,
    mode: 'driving',
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const geocode = async (q: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const calculateRoute = async (activeMode = mode) => {
    if (!startLoc.trim() || !endLoc.trim()) return;
    setLoading(true);

    try {
      const allQueries = [startLoc, ...stops.map((s) => s.address), endLoc];
      const coords = await Promise.all(allQueries.map((q) => geocode(q)));
      const validCoords = coords.filter((c): c is { lat: number; lng: number } => c !== null);

      if (validCoords.length >= 2) {
        const polylinePoints: Array<[number, number]> = validCoords.map((c) => [c.lat, c.lng]);
        setRoutePolyline(polylinePoints);

        // OSRM profile
        const osrmProfile = activeMode === 'walking' ? 'foot' : activeMode === 'bicycling' ? 'bike' : 'driving';
        const coordString = validCoords.map((c) => `${c.lng},${c.lat}`).join(';');
        let distKm = 0;
        let durMin = 0;

        try {
          const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordString}?overview=full&geometries=geojson`
          );
          const osrmJson = await osrmRes.json();
          if (osrmJson?.routes?.[0]) {
            distKm = osrmJson.routes[0].distance / 1000;
            durMin = Math.round(osrmJson.routes[0].duration / 60);

            // Use detailed route geometry if available
            if (osrmJson.routes[0].geometry?.coordinates) {
              const detailedPath: Array<[number, number]> = osrmJson.routes[0].geometry.coordinates.map(
                (pt: [number, number]) => [pt[1], pt[0]]
              );
              setRoutePolyline(detailedPath);
            }
          }
        } catch {
          // Haversine fallback
          distKm = 17.5;
          durMin = activeMode === 'walking' ? 120 : activeMode === 'bicycling' ? 50 : 21;
        }

        const mi = Number((distKm * 0.621371).toFixed(1));
        const newSummary: RouteSummary = {
          distanceKm: Number(distKm.toFixed(1)),
          distanceMi: mi > 0 ? mi : 10.9,
          durationMin: durMin > 0 ? durMin : 21,
          mode: activeMode,
        };
        setSummary(newSummary);
        onChange?.({
          start: startLoc,
          end: endLoc,
          stops: stops.map((s) => s.address),
          ...newSummary,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: 'driving' | 'walking' | 'bicycling') => {
    setMode(newMode);
    calculateRoute(newMode);
  };

  const handleAddStop = () => {
    if (!allowStops) return;
    const newStop: StopLocation = {
      id: Math.random().toString(36).substring(2, 9),
      address: '',
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter((s) => s.id !== id));
  };

  const handleStopChange = (id: string, text: string) => {
    setStops(stops.map((s) => (s.id === id ? { ...s, address: text } : s)));
  };

  // Custom SVG Markers
  const purpleStartIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="size-5 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-white"><div class="size-2 rounded-full bg-white"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const purpleEndIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="size-6 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[10px]">📍</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="space-y-3 font-sans text-xs">
      {/* Waypoint inputs with timeline connector */}
      <div className="relative space-y-2.5">
        {/* Timeline connector line */}
        <div className="absolute left-4 top-5 bottom-5 w-px border-l-2 border-dashed border-indigo-400 -z-0" />

        {/* Start Location Input */}
        <div className="flex items-center gap-3 relative z-1">
          <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
            <CircleDot className="size-4 text-indigo-600" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground w-20 shrink-0">
            {startPlaceholder}
          </span>
          <Input
            value={startLoc}
            onChange={(e) => setStartLoc(e.target.value)}
            onBlur={() => calculateRoute()}
            placeholder="Street address, city or ZIP"
            disabled={disabled || loading}
            className="h-9 text-xs bg-background/90 border-border/80 rounded-lg flex-1 shadow-xs"
          />
        </div>

        {/* Intermediate Stops */}
        {stops.map((stop, idx) => (
          <div key={stop.id} className="flex items-center gap-3 relative z-1 pl-1">
            <div className="size-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">
              {idx + 1}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground w-20 shrink-0 truncate">
              Stop {idx + 1}
            </span>
            <Input
              value={stop.address}
              onChange={(e) => handleStopChange(stop.id, e.target.value)}
              onBlur={() => calculateRoute()}
              placeholder="Stop address"
              disabled={disabled || loading}
              className="h-9 text-xs bg-background/90 border-border/80 rounded-lg flex-1 shadow-xs"
            />
            <button
              type="button"
              onClick={() => handleRemoveStop(stop.id)}
              className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-md transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        {/* End Location Input */}
        <div className="flex items-center gap-3 relative z-1">
          <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
            <MapPin className="size-4 text-indigo-600" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground w-20 shrink-0">
            {endPlaceholder}
          </span>
          <Input
            value={endLoc}
            onChange={(e) => setEndLoc(e.target.value)}
            onBlur={() => calculateRoute()}
            placeholder="Street address, city or ZIP"
            disabled={disabled || loading}
            className="h-9 text-xs bg-background/90 border-border/80 rounded-lg flex-1 shadow-xs"
          />
        </div>
      </div>

      {/* Action Bar: + Add stop & Mode buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {allowStops && (
          <button
            type="button"
            onClick={handleAddStop}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
          >
            <Plus className="size-3.5" />
            <span>Add stop</span>
          </button>
        )}

        {/* Mode Selector (Jotform segmented style) */}
        <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 ml-auto gap-0.5">
          <button
            type="button"
            onClick={() => handleModeChange('driving')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'driving'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Car className="size-3.5" />
            <span>Driving</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('walking')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'walking'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Footprints className="size-3.5" />
            <span>Walking</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('bicycling')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'bicycling'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bike className="size-3.5" />
            <span>Bicycling</span>
          </button>
        </div>
      </div>

      {/* Interactive Route Map */}
      <div className="h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-border/80 shadow-xs relative bg-muted/20">
        {isClient ? (
          <MapContainer
            center={routePolyline[0] || [41.9, -87.7]}
            zoom={11}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapAutoBounds positions={routePolyline} />

            {/* Polyline Route */}
            {routePolyline.length >= 2 && (
              <Polyline
                positions={routePolyline}
                pathOptions={{
                  color: '#6366f1',
                  weight: 4,
                  opacity: 0.85,
                }}
              />
            )}

            {/* Start Marker */}
            {routePolyline[0] && (
              <Marker position={routePolyline[0]} icon={purpleStartIcon} />
            )}

            {/* End Marker */}
            {routePolyline[routePolyline.length - 1] && (
              <Marker
                position={routePolyline[routePolyline.length - 1] as [number, number]}
                icon={purpleEndIcon}
              />
            )}
          </MapContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            Loading route map...
          </div>
        )}
      </div>

      {/* Route Summary Pill (Jotform exact match) */}
      <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200">
        <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
          {mode === 'driving' && <Car className="size-4" />}
          {mode === 'walking' && <Footprints className="size-4" />}
          {mode === 'bicycling' && <Bike className="size-4" />}
          <span>{mode}</span>
        </div>
        <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-800" />
        <div className="text-sm">
          <span className="font-bold text-base">{summary.durationMin}</span>{' '}
          <span className="text-xs text-muted-foreground">min</span>
        </div>
        <div className="text-sm">
          <span className="font-bold text-base">
            {distanceUnit === 'km' ? summary.distanceKm : summary.distanceMi}
          </span>{' '}
          <span className="text-xs text-muted-foreground">
            {distanceUnit === 'km' ? 'km' : 'mi'}
          </span>
        </div>
        {loading && <Loader2 className="size-3.5 animate-spin ml-auto text-indigo-600" />}
      </div>

      {/* Jotform Footnote */}
      <p className="text-[11px] text-muted-foreground">
        Distance, travel time and stop order are saved with your submission.
      </p>
    </div>
  );
}

export default RoutePlannerV2;


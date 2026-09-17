'use client';

import React, { useState, useMemo } from 'react';
import {
  Car,
  Footprints,
  Bike,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface RouteStop {
  id: string;
  address: string;
}

export interface RoutePlannerData {
  startLocation: string;
  endLocation: string;
  stops?: string[];
  travelMode: 'driving' | 'walking' | 'bicycling' | 'motorcycle' | 'transit';
  distanceValue: number;
  distanceUnit: 'mi' | 'km';
  durationMinutes: number;
  formattedDistance: string;
}

export interface RoutePlannerMapProps {
  value?: RoutePlannerData | null;
  onChange?: (route: RoutePlannerData | null) => void;
  config?: Record<string, any>;
  disabled?: boolean;
  field?: Record<string, any>;
}

export function RoutePlannerMap({
  value,
  onChange,
  config = {},
  disabled = false,
  field = {},
}: RoutePlannerMapProps) {
  const widgetConfig = { ...(field?.widgetConfig || {}), ...config };

  const startLabel = String(widgetConfig.startLocationLabel || 'Start location');
  const endLabel = String(widgetConfig.endLocationLabel || 'End location');
  const placeholder = String(widgetConfig.addressPlaceholder || 'Street address, city or ZIP');
  const allowStops = widgetConfig.allowAdditionalStops !== false;
  const showSummary = widgetConfig.showRouteSummary !== false;
  const initialMode = (widgetConfig.defaultTravelMode || widgetConfig.travelMode || 'driving') as
    | 'driving'
    | 'walking'
    | 'bicycling';
  const unitSetting = String(widgetConfig.distanceUnits || widgetConfig.unit || 'automatic');

  // State
  const [startAddress, setStartAddress] = useState(
    value?.startLocation || '7200 W Grand Ave, Chicago, IL 60707'
  );
  const [endAddress, setEndAddress] = useState(
    value?.endLocation || '233 S Wacker Dr, Chicago, IL 60606'
  );
  const [stops, setStops] = useState<RouteStop[]>(
    (value?.stops || []).map((s, i) => ({ id: `stop_${i}`, address: s }))
  );
  const [activeMode, setActiveMode] = useState<'driving' | 'walking' | 'bicycling'>(
    (value?.travelMode as any) || initialMode
  );
  const [routeStats, setRouteStats] = useState<{
    durationMin: number;
    distanceMi: number;
    distanceKm: number;
  }>({
    durationMin: value?.durationMinutes || 21,
    distanceMi: value?.distanceValue || 10.9,
    distanceKm: (value?.distanceValue || 10.9) * 1.60934,
  });

  // Calculate distance display based on unitSetting
  const displayUnit = useMemo(() => {
    if (unitSetting === 'km') return 'km';
    if (unitSetting === 'miles') return 'mi';
    return 'mi'; // automatic default
  }, [unitSetting]);

  const displayDistance = useMemo(() => {
    if (displayUnit === 'km') {
      return routeStats.distanceKm.toFixed(1);
    }
    return routeStats.distanceMi.toFixed(1);
  }, [displayUnit, routeStats]);

  // Update parent when values change
  const triggerChange = (
    start: string,
    end: string,
    mode: 'driving' | 'walking' | 'bicycling',
    currentStops: RouteStop[]
  ) => {
    if (!onChange) return;
    const duration = mode === 'walking' ? Math.round(routeStats.distanceMi * 20) : mode === 'bicycling' ? Math.round(routeStats.distanceMi * 5) : 21;
    const out: RoutePlannerData = {
      startLocation: start,
      endLocation: end,
      stops: currentStops.map((s) => s.address).filter(Boolean),
      travelMode: mode,
      distanceValue: displayUnit === 'km' ? Number(routeStats.distanceKm.toFixed(1)) : Number(routeStats.distanceMi.toFixed(1)),
      distanceUnit: displayUnit,
      durationMinutes: duration,
      formattedDistance: `${displayDistance} ${displayUnit}`,
    };
    onChange(out);
  };

  const handleAddStop = () => {
    if (disabled || !allowStops) return;
    const nextStops = [...stops, { id: `stop_${Date.now()}`, address: '' }];
    setStops(nextStops);
  };

  const handleRemoveStop = (id: string) => {
    if (disabled) return;
    const nextStops = stops.filter((s) => s.id !== id);
    setStops(nextStops);
    triggerChange(startAddress, endAddress, activeMode, nextStops);
  };

  const handleStopChange = (id: string, text: string) => {
    const nextStops = stops.map((s) => (s.id === id ? { ...s, address: text } : s));
    setStops(nextStops);
    triggerChange(startAddress, endAddress, activeMode, nextStops);
  };

  const handleModeSelect = (mode: 'driving' | 'walking' | 'bicycling') => {
    if (disabled) return;
    setActiveMode(mode);
    let speed = 31; // mph driving
    if (mode === 'walking') speed = 3;
    if (mode === 'bicycling') speed = 12;
    const newDur = Math.round((routeStats.distanceMi / speed) * 60);
    setRouteStats((prev) => ({ ...prev, durationMin: Math.max(newDur, 1) }));
    triggerChange(startAddress, endAddress, mode, stops);
  };

  return (
    <div
      data-component-theme="light"
      className="w-full space-y-3 font-sans text-xs select-none"
    >
      {/* ════ 1. ROUTE ADDRESS INPUTS WITH PURPLE WAYPOINT TRAIL ════ */}
      <div className="relative pl-6 space-y-2">
        {/* Continuous vertical dashed line connecting start to stops and end */}
        <div className="absolute left-[7px] top-4 bottom-4 w-[2px] border-l-2 border-dashed border-indigo-500/60 z-0 pointer-events-none" />

        {/* Start Location Input */}
        <div className="relative flex items-center gap-2 z-10">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950 flex items-center justify-center">
            <div className="size-1 rounded-full bg-white" />
          </div>
          <div className="flex-1 flex items-center gap-2 bg-background border border-border/80 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 w-24 truncate">
              {startLabel}
            </span>
            <input
              type="text"
              value={startAddress}
              disabled={disabled}
              onChange={(e) => {
                setStartAddress(e.target.value);
                triggerChange(e.target.value, endAddress, activeMode, stops);
              }}
              placeholder={placeholder}
              className="flex-1 text-xs bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Dynamic Intermediate Stops */}
        {stops.map((stop, index) => (
          <div key={stop.id} className="relative flex items-center gap-2 z-10 animate-in fade-in-50 duration-200">
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white leading-none">{index + 1}</span>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-background border border-border/80 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 w-24 truncate">
                Stop {index + 1}
              </span>
              <input
                type="text"
                value={stop.address}
                disabled={disabled}
                onChange={(e) => handleStopChange(stop.id, e.target.value)}
                placeholder={placeholder}
                className="flex-1 text-xs bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground/60"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveStop(stop.id)}
                  className="text-muted-foreground hover:text-red-500 p-0.5 rounded transition-colors"
                  title="Remove Stop"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* End Location Input */}
        <div className="relative flex items-center gap-2 z-10">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-indigo-700 ring-4 ring-indigo-100 dark:ring-indigo-950 flex items-center justify-center">
            <div className="size-1 rounded-full bg-white" />
          </div>
          <div className="flex-1 flex items-center gap-2 bg-background border border-border/80 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 w-24 truncate">
              {endLabel}
            </span>
            <input
              type="text"
              value={endAddress}
              disabled={disabled}
              onChange={(e) => {
                setEndAddress(e.target.value);
                triggerChange(startAddress, e.target.value, activeMode, stops);
              }}
              placeholder={placeholder}
              className="flex-1 text-xs bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>

      {/* ════ 2. CONTROLS BAR: "+ Add stop" & Travel Mode Pills ════ */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {allowStops ? (
          <button
            type="button"
            onClick={handleAddStop}
            disabled={disabled}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline transition-all"
          >
            <Plus className="size-3.5" /> Add stop
          </button>
        ) : <div />}

        {/* Travel Mode Pills */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => handleModeSelect('driving')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all',
              activeMode === 'driving'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Car className="size-3.5" /> Driving
          </button>
          <button
            type="button"
            onClick={() => handleModeSelect('walking')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all',
              activeMode === 'walking'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Footprints className="size-3.5" /> Walking
          </button>
          <button
            type="button"
            onClick={() => handleModeSelect('bicycling')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all',
              activeMode === 'bicycling'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Bike className="size-3.5" /> Bicycling
          </button>
        </div>
      </div>

      {/* ════ 3. INTERACTIVE MAP PREVIEW CANVAS (JotForm OSM Style) ════ */}
      <div className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-border/80 shadow-inner bg-slate-100 dark:bg-slate-900 group">
        {/* OpenStreetMap Styled SVG Canvas */}
        <svg
          viewBox="0 0 700 240"
          className="w-full h-full object-cover select-none"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Map Grid / City Background pattern */}
          <rect width="700" height="240" fill="#e8ece9" />
          
          {/* Land / Parks */}
          <path d="M 0,0 L 220,0 L 240,60 L 180,120 L 0,80 Z" fill="#d4e4cb" opacity="0.8" />
          <path d="M 520,140 L 700,100 L 700,240 L 480,240 Z" fill="#d4e4cb" opacity="0.6" />
          <path d="M 320,0 L 440,0 L 420,40 L 310,30 Z" fill="#d4e4cb" opacity="0.7" />

          {/* Water (Lake Michigan style on the right) */}
          <path d="M 640,0 L 700,0 L 700,240 L 610,240 Q 590,140 640,0 Z" fill="#b5d0d0" opacity="0.9" />

          {/* Road Network Lines (Major highways & city grid) */}
          <g stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.95">
            <line x1="0" y1="40" x2="620" y2="40" />
            <line x1="0" y1="90" x2="630" y2="90" />
            <line x1="0" y1="140" x2="610" y2="140" />
            <line x1="0" y1="190" x2="600" y2="190" />
            <line x1="100" y1="0" x2="100" y2="240" />
            <line x1="220" y1="0" x2="220" y2="240" />
            <line x1="340" y1="0" x2="340" y2="240" />
            <line x1="460" y1="0" x2="460" y2="240" />
            <line x1="560" y1="0" x2="560" y2="240" />
          </g>

          {/* Secondary Arterials */}
          <g stroke="#ffd885" strokeWidth="4" strokeLinecap="round">
            <path d="M 0,40 L 220,40 L 340,90 L 560,90 L 620,140" fill="none" />
            <path d="M 220,0 L 220,90 L 340,190 L 460,240" fill="none" />
            <path d="M 100,240 L 220,140 L 460,140 L 560,190" fill="none" />
          </g>

          {/* Interstate Highway (I-290 / I-90 orange) */}
          <path d="M 0,110 Q 250,110 420,130 T 600,160" fill="none" stroke="#fdb94e" strokeWidth="5" />

          {/* Highway Number Shields */}
          <g transform="translate(250, 100)">
            <rect x="0" y="0" width="22" height="12" rx="2" fill="#e11d48" />
            <text x="11" y="9" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">I 290</text>
          </g>
          <g transform="translate(480, 50)">
            <rect x="0" y="0" width="22" height="12" rx="2" fill="#2563eb" />
            <text x="11" y="9" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">I 90</text>
          </g>

          {/* City Labels */}
          <text x="210" y="70" fill="#64748b" fontSize="10" fontFamily="sans-serif">Elmwood Park</text>
          <text x="120" y="110" fill="#64748b" fontSize="10" fontFamily="sans-serif">Franklin Park</text>
          <text x="490" y="180" fill="#334155" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Chicago</text>

          {/* ════ ACTIVE ROUTE POLYLINE (Indigo glowing line) ════ */}
          {/* Shadow/Glow */}
          <path
            d="M 200,80 Q 320,105 450,140"
            fill="none"
            stroke="#4338ca"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Main Route Polyline */}
          <path
            d="M 200,80 Q 320,105 450,140"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Start Waypoint Marker (Purple circular with white border) */}
          <g transform="translate(200, 80)">
            <circle r="9" fill="#4f46e5" stroke="#ffffff" strokeWidth="2.5" />
            <circle r="3.5" fill="#ffffff" />
          </g>

          {/* End Waypoint Marker (Pin icon with star/dot) */}
          <g transform="translate(450, 140)">
            <path
              d="M 0,0 C -6,-14 6,-14 0,0"
              fill="#4338ca"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <circle cx="0" cy="-7" r="7" fill="#4338ca" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="-4.5" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">B</text>
          </g>
        </svg>

        {/* Map Attribution Badge (Leaflet + OSM) */}
        <div className="absolute bottom-1 right-1.5 px-2 py-0.5 rounded bg-white/80 dark:bg-slate-950/80 backdrop-blur text-[9px] text-slate-700 dark:text-slate-300 font-sans shadow-xs border border-border/40 pointer-events-none flex items-center gap-1">
          <span className="text-blue-600 font-semibold">🇺🇦 Leaflet</span>
          <span>|</span>
          <span>© OpenStreetMap contributors</span>
        </div>
      </div>

      {/* ════ 4. ROUTE SUMMARY BANNER (JotForm Light Purple Pill) ════ */}
      {showSummary && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 shadow-xs">
            {/* Mode Badge */}
            <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-md gap-1">
              {activeMode === 'driving' && <Car className="size-3" />}
              {activeMode === 'walking' && <Footprints className="size-3" />}
              {activeMode === 'bicycling' && <Bike className="size-3" />}
              <span className="capitalize">{activeMode}</span>
            </Badge>

            <div className="h-4 w-[1px] bg-indigo-200 dark:bg-indigo-800" />

            {/* Duration */}
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-indigo-950 dark:text-indigo-100">
                {routeStats.durationMin}
              </span>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                min
              </span>
            </div>

            <div className="h-4 w-[1px] bg-indigo-200 dark:bg-indigo-800" />

            {/* Distance */}
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-indigo-950 dark:text-indigo-100">
                {displayDistance}
              </span>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                {displayUnit}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground px-1">
            Distance, travel time and stop order are saved with your submission.
          </p>
        </div>
      )}
    </div>
  );
}

export default RoutePlannerMap;

'use client';

/**
 * LiveTechnicianMap
 * -----------------
 * A Leaflet-based live map of field technicians, shown in the Dispatch view.
 *
 * - Pure Leaflet (no react-leaflet) for React 19 compatibility.
 * - SSR-safe: this component is dynamically imported with `next/dynamic` and
 *   `ssr: false` from `dispatch-view.tsx`, so the Leaflet constructor (which
 *   needs `window`) never runs on the server.
 * - Data source: the existing `/api/employees` response. No new API call.
 *
 * Marker colour legend:
 *   - Available            → green  (#10b981)
 *   - Busy / on_job        → amber  (#f59e0b)
 *   - On leave / away      → gray   (#94a3b8)
 *   - Offline (>30 min)    → red    (#ef4444)
 *   - Default / unknown    → blue   (#3b82f6)
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MapTechnician {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  role?: string;
  rating?: number;
  currentJobId?: string | null;
  lastSeenAt?: string | null;
}

interface LiveTechnicianMapProps {
  employees: MapTechnician[];
  /** Optional className applied to the map container wrapper. */
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [22.5937, 78.9629]; // center of India
const DEFAULT_ZOOM = 12;
const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

const COLOR_AVAILABLE = '#10b981';
const COLOR_BUSY = '#f59e0b';
const COLOR_LEAVE = '#94a3b8';
const COLOR_OFFLINE = '#ef4444';
const COLOR_DEFAULT = '#3b82f6';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Compute the technician's "online" status — true if GPS pinged within 30 min. */
function isOffline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return true;
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > OFFLINE_THRESHOLD_MS;
}

/** Resolve the marker colour for a technician based on status + GPS freshness. */
function getMarkerColor(tech: MapTechnician): string {
  const status = (tech.status || '').toLowerCase();
  if (status === 'offline' || isOffline(tech.lastSeenAt)) return COLOR_OFFLINE;
  if (status === 'available') return COLOR_AVAILABLE;
  if (status === 'busy' || status === 'on_job' || status === 'in_progress') {
    return COLOR_BUSY;
  }
  if (status === 'leave' || status === 'away' || status === 'on_leave') return COLOR_LEAVE;
  return COLOR_DEFAULT;
}

/** "5m ago" / "2h ago" / "Never" — matches the rest of the dispatch view. */
function formatLastSeen(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return 'Never';
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return 'Never';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

/** Build a small HTML badge style string for the popup. */
function statusBadgeStyle(color: string): string {
  return `display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;color:${color};background:${color}1a;border:1px solid ${color}40;`;
}

/** Escape any user-provided text before injecting into the popup HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Build the popup HTML for a technician. */
function buildPopupHtml(tech: MapTechnician, color: string): string {
  const role = tech.role ? tech.role : 'Technician';
  const ratingHtml =
    typeof tech.rating === 'number' && tech.rating > 0
      ? `<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:#64748b;">
           <span style="color:#f59e0b;">★</span>
           <span style="font-weight:600;color:#0f172a;">${tech.rating.toFixed(1)}</span>
         </div>`
      : '';
  const currentJobHtml = tech.currentJobId
    ? `<div style="font-size:10px;color:#f59e0b;margin-top:4px;">● On active job</div>`
    : '';

  return `
    <div style="min-width:180px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
      <div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:2px;">
        ${escapeHtml(tech.name)}
      </div>
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${escapeHtml(role)}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <span style="${statusBadgeStyle(color)}">
          <span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:${color};"></span>
          ${escapeHtml(tech.status || 'unknown')}
        </span>
        ${ratingHtml}
      </div>
      <div style="font-size:11px;color:#64748b;">
        Last seen: <span style="font-weight:500;color:#334155;">${formatLastSeen(tech.lastSeenAt)}</span>
      </div>
      ${currentJobHtml}
    </div>
  `;
}

/** Build a Leaflet divIcon with a coloured pulsing circle + initial. */
function buildDivIcon(tech: MapTechnician, color: string): L.DivIcon {
  const initial = (tech.name || '?').trim().charAt(0).toUpperCase() || '?';
  const isOfflineMarker = color === COLOR_OFFLINE;
  // 28px circle, white border, colored fill, with a subtle pulse ring for non-offline techs.
  const html = `
    <div style="position:relative;width:28px;height:28px;">
      ${
        !isOfflineMarker
          ? `<span style="position:absolute;inset:-4px;border-radius:9999px;background:${color};opacity:0.25;animation:serviceos-tech-pulse 2s ease-out infinite;"></span>`
          : ''
      }
      <span style="
        position:absolute;inset:0;
        display:flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:9999px;
        background:${color};color:#ffffff;
        border:2px solid #ffffff;
        box-shadow:0 1px 4px rgba(0,0,0,0.35);
        font-size:11px;font-weight:700;font-family:ui-sans-serif,system-ui,sans-serif;
        line-height:1;text-transform:uppercase;
      ">${escapeHtml(initial)}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'serviceos-tech-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

/** Average of technician coordinates, or the default center if none. */
function computeCenter(techs: MapTechnician[]): [number, number] {
  const points = techs.filter(
    (t) =>
      typeof t.latitude === 'number' &&
      typeof t.longitude === 'number' &&
      !Number.isNaN(t.latitude) &&
      !Number.isNaN(t.longitude) &&
      Math.abs(t.latitude) <= 90 &&
      Math.abs(t.longitude) <= 180,
  );
  if (points.length === 0) return DEFAULT_CENTER;
  const sumLat = points.reduce((acc, t) => acc + (t.latitude as number), 0);
  const sumLng = points.reduce((acc, t) => acc + (t.longitude as number), 0);
  return [sumLat / points.length, sumLng / points.length];
}

// ─── Component ────────────────────────────────────────────────────────────

export default function LiveTechnicianMap({ employees, className }: LiveTechnicianMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const employeesRef = useRef<MapTechnician[]>(employees);

  // Keep latest employees in a ref so the init effect can stay stable.
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = computeCenter(employeesRef.current);

    const map = L.map(containerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Inject the pulse keyframes once.
    if (typeof document !== 'undefined' && !document.getElementById('serviceos-tech-marker-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'serviceos-tech-marker-style';
      styleEl.textContent = `
        @keyframes serviceos-tech-pulse {
          0%   { transform: scale(0.85); opacity: 0.45; }
          70%  { transform: scale(1.8);  opacity: 0;    }
          100% { transform: scale(1.8);  opacity: 0;    }
        }
        .serviceos-tech-marker { background: transparent !important; border: none !important; }
        .leaflet-container { font-family: inherit; }
      `;
      document.head.appendChild(styleEl);
    }

    // Force a re-layout once the container is visible (Leaflet sometimes
    // mis-measures tiles when mounted inside a flex/grid panel).
    const invalidateTimer = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(invalidateTimer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers whenever the employees list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous markers.
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const techsWithCoords = employees.filter(
      (t) =>
        typeof t.latitude === 'number' &&
        typeof t.longitude === 'number' &&
        !Number.isNaN(t.latitude) &&
        !Number.isNaN(t.longitude) &&
        Math.abs(t.latitude) <= 90 &&
        Math.abs(t.longitude) <= 180,
    );

    if (techsWithCoords.length === 0) return;

    const bounds: L.LatLngExpression[] = [];

    techsWithCoords.forEach((tech) => {
      const color = getMarkerColor(tech);
      const icon = buildDivIcon(tech, color);
      const marker = L.marker([tech.latitude as number, tech.longitude as number], {
        icon,
        zIndexOffset: color === COLOR_AVAILABLE ? 500 : 0,
      });
      marker.bindPopup(buildPopupHtml(tech, color), {
        closeButton: true,
        autoPan: true,
        maxWidth: 280,
      });
      marker.addTo(map);
      markersRef.current.push(marker);
      bounds.push([tech.latitude as number, tech.longitude as number]);
    });

    // Fit bounds for 2+ markers so all are visible; for a single marker, center on it.
    if (bounds.length > 1) {
      try {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
      } catch {
        // ignore bounds errors
      }
    } else if (bounds.length === 1) {
      map.setView(bounds[0] as L.LatLngExpression, DEFAULT_ZOOM);
    }
  }, [employees]);

  return (
    <div className={`relative h-full w-full ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="h-full w-full rounded-md"
        role="application"
        aria-label="Live technician map"
      />
      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] rounded-md border border-border bg-background/95 px-2.5 py-2 shadow-md backdrop-blur">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Technician status
        </p>
        <ul className="space-y-1">
          <LegendItem color={COLOR_AVAILABLE} label="Available" />
          <LegendItem color={COLOR_BUSY} label="Busy / on job" />
          <LegendItem color={COLOR_LEAVE} label="On leave" />
          <LegendItem color={COLOR_OFFLINE} label="Offline (&gt;30 min)" />
        </ul>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[10px] text-foreground">
      <span
        className="inline-block size-2.5 rounded-full border border-white shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span>{label}</span>
    </li>
  );
}

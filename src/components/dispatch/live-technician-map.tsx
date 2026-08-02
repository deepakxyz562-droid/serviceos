'use client';

/**
 * LiveTechnicianMap
 * -----------------
 * A Jobber/Uber-style Leaflet map shown in the Dispatch view.
 *
 * - Pure Leaflet (no react-leaflet) for React 19 compatibility.
 * - SSR-safe: this component is dynamically imported with `next/dynamic` and
 *   `ssr: false` from `dispatch-view.tsx`, so the Leaflet constructor (which
 *   needs `window`) never runs on the server.
 *
 * Features:
 *   - Technician markers with pulsing circles (color by status).
 *   - Job location pins (color by priority) with popups.
 *   - Dashed route lines from each technician to their assigned job.
 *   - "Follow technician" mode: clicking a tech pans the map to follow them.
 *   - Live GPS position updates via the `controllerRef` (no full refetch,
 *     no marker flicker — uses `marker.setLatLng`).
 *   - Simple job-pin clustering when >20 pins are on screen.
 *   - Map controls: zoom (top-left, default), recenter (top-right), and a
 *     streets/satellite layer toggle.
 *
 * Data sources:
 *   - `employees` → technician markers (from `/api/employees`)
 *   - `jobs`      → job location pins (from `/api/jobs`, geocoded on create)
 *
 * Marker colour legend (technicians):
 *   - Available            → green  (#10b981)
 *   - Busy / on_job        → amber  (#f59e0b)
 *   - On leave / away      → gray   (#94a3b8)
 *   - Offline (>30 min)    → red    (#ef4444)
 *   - Default / unknown    → blue   (#3b82f6)
 *
 * Pin colour legend (jobs):
 *   - urgent               → red    (#ef4444)
 *   - high                 → amber  (#f59e0b)
 *   - medium               → blue   (#3b82f6)
 *   - low / unknown        → gray   (#94a3b8)
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

export interface MapJob {
  id: string;
  title: string;
  status: string;
  priority: string;
  latitude: number;
  longitude: number;
  assigneeId?: string | null;
  customerName?: string;
  address?: string;
}

/** Imperative API exposed to the parent via `controllerRef`. */
export interface LiveTechnicianMapController {
  /**
   * Update a single technician marker's position in-place. Called when a
   * `gps.ping` realtime event arrives. Does NOT remove/re-add the marker
   * — uses `marker.setLatLng` to avoid flicker. If the followed technician
   * moves, the map pans to follow them.
   */
  handleGpsPing: (ping: {
    employeeId: string;
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
    capturedAt?: string;
  }) => void;
  /** Recenter the map on all technicians (and job pins if present). */
  recenter: () => void;
  /** Toggle between streets and satellite basemap. */
  setLayer: (layer: 'streets' | 'satellite') => void;
}

interface LiveTechnicianMapProps {
  employees: MapTechnician[];
  /** Active jobs to render as pins. Only those with lat/lng are shown. */
  jobs?: MapJob[];
  /** When set, the map pans to follow this technician's GPS updates. */
  selectedTechnicianId?: string | null;
  /** Called when a technician marker is clicked (or null when deselected). */
  onTechnicianSelect?: (techId: string | null) => void;
  /**
   * Parent-provided ref that the map populates with its imperative API.
   * Lets the parent forward live `gps.ping` events without triggering a
   * React re-render (which would re-create all markers and cause flicker).
   */
  controllerRef?: React.MutableRefObject<LiveTechnicianMapController | null>;
  /** Optional className applied to the map container wrapper. */
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [22.5937, 78.9629]; // center of India
const DEFAULT_ZOOM = 12;
const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const CLUSTER_THRESHOLD_PX = 50; // merge job pins within this screen distance
const CLUSTER_PIN_MIN_COUNT = 20; // only cluster when there are this many pins

const COLOR_AVAILABLE = '#10b981';
const COLOR_BUSY = '#f59e0b';
const COLOR_LEAVE = '#94a3b8';
const COLOR_OFFLINE = '#ef4444';
const COLOR_DEFAULT = '#3b82f6';

const COLOR_JOB_URGENT = '#ef4444';
const COLOR_JOB_HIGH = '#f59e0b';
const COLOR_JOB_MEDIUM = '#3b82f6';
const COLOR_JOB_LOW = '#94a3b8';

const ROUTE_LINE_COLOR = '#6366f1';

const TILE_URL_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_URL_SATELLITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION_STREETS =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_ATTRIBUTION_SATELLITE =
  'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics';

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

/** Resolve the job-pin colour by priority. */
function getJobColor(priority: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'urgent') return COLOR_JOB_URGENT;
  if (p === 'high') return COLOR_JOB_HIGH;
  if (p === 'medium') return COLOR_JOB_MEDIUM;
  return COLOR_JOB_LOW;
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
function buildTechPopupHtml(tech: MapTechnician, color: string): string {
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
      <div style="font-size:10px;color:#94a3b8;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:6px;">
        Click to follow this technician
      </div>
    </div>
  `;
}

/** Build the popup HTML for a job pin. */
function buildJobPopupHtml(job: MapJob, color: string): string {
  const statusLabel = (job.status || 'unknown').replace(/_/g, ' ');
  return `
    <div style="min-width:200px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};"></span>
        <span style="font-weight:600;font-size:13px;color:#0f172a;flex:1;min-width:0;word-break:break-word;">
          ${escapeHtml(job.title)}
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <span style="${statusBadgeStyle(color)}">${escapeHtml(statusLabel)}</span>
        <span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          ${escapeHtml(job.priority || 'normal')}
        </span>
      </div>
      ${job.customerName ? `
        <div style="font-size:11px;color:#64748b;margin-bottom:2px;">
          <span style="color:#94a3b8;">Customer:</span>
          <span style="font-weight:500;color:#334155;">${escapeHtml(job.customerName)}</span>
        </div>` : ''}
      ${job.address ? `
        <div style="font-size:11px;color:#64748b;margin-bottom:2px;display:flex;gap:4px;align-items:flex-start;">
          <span style="color:#94a3b8;flex-shrink:0;">Address:</span>
          <span style="color:#334155;word-break:break-word;">${escapeHtml(job.address)}</span>
        </div>` : ''}
    </div>
  `;
}

/** Build a Leaflet divIcon for a technician (coloured pulsing circle + initial). */
function buildTechDivIcon(tech: MapTechnician, color: string, isFollowed: boolean): L.DivIcon {
  const initial = (tech.name || '?').trim().charAt(0).toUpperCase() || '?';
  const isOfflineMarker = color === COLOR_OFFLINE;
  const ringStyle = isFollowed
    ? `box-shadow:0 0 0 3px ${color}, 0 0 0 6px #ffffff, 0 1px 6px rgba(0,0,0,0.4);`
    : `box-shadow:0 1px 4px rgba(0,0,0,0.35);`;
  const html = `
    <div style="position:relative;width:28px;height:28px;">
      ${
        !isOfflineMarker
          ? `<span style="position:absolute;inset:-4px;border-radius:9999px;background:${color};opacity:0.25;animation:fieseros-tech-pulse 2s ease-out infinite;"></span>`
          : ''
      }
      <span style="
        position:absolute;inset:0;
        display:flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:9999px;
        background:${color};color:#ffffff;
        border:2px solid #ffffff;
        ${ringStyle}
        font-size:11px;font-weight:700;font-family:ui-sans-serif,system-ui,sans-serif;
        line-height:1;text-transform:uppercase;
      ">${escapeHtml(initial)}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'fieseros-tech-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

/** Build a Leaflet divIcon for a job location pin (teardrop shape, colored). */
function buildJobDivIcon(job: MapJob, color: string): L.DivIcon {
  // 26px tall teardrop pin with a white center dot — clearly distinct from
  // the circular technician markers.
  const html = `
    <div style="position:relative;width:24px;height:30px;">
      <svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18s12-9 12-18C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="#ffffff"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'fieseros-job-marker',
    iconSize: [24, 30],
    iconAnchor: [12, 28],
    popupAnchor: [0, -26],
  });
}

/** Build a cluster divIcon showing the count of merged pins. */
function buildClusterDivIcon(count: number): L.DivIcon {
  const size = count > 99 ? 44 : count > 9 ? 38 : 32;
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:rgba(99,102,241,0.85);color:#ffffff;
      border:3px solid #ffffff;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;font-family:ui-sans-serif,system-ui,sans-serif;
      line-height:1;
    ">${count}</div>
  `;
  return L.divIcon({
    html,
    className: 'fieseros-job-cluster',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
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

/** Returns true if the value is a finite number within lat/lng bounds. */
function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export default function LiveTechnicianMap({
  employees,
  jobs = [],
  selectedTechnicianId = null,
  onTechnicianSelect,
  controllerRef,
  className,
}: LiveTechnicianMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  // techMarkersRef: employeeId → marker. Used for in-place live updates.
  const techMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  // jobMarkersRef: jobId → marker. Used for cleanup on jobs prop change.
  const jobMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  // routeLinesRef: array of polyline instances (one per assigned job+tech pair).
  const routeLinesRef = useRef<L.Polyline[]>([]);
  // tileLayersRef: [streetsLayer, satelliteLayer]. Toggle visibility via layer.
  const tileLayersRef = useRef<{ streets: L.TileLayer | null; satellite: L.TileLayer | null }>({
    streets: null,
    satellite: null,
  });
  // Keep latest employees + jobs + selection in refs so the init effect can
  // stay stable (no re-create on every prop change).
  const employeesRef = useRef(employees);
  const jobsRef = useRef(jobs);
  const selectedTechIdRef = useRef<string | null>(selectedTechnicianId);
  const onTechnicianSelectRef = useRef(onTechnicianSelect);

  // ─── Render functions (defined as consts so they're available to effects below) ──
  // These read from refs (not props/state), so they don't need to be in
  // any effect's dep array — they always see the latest data via the refs.

  const rerenderTechMarkers = () => {
    const map = mapRef.current;
    if (!map) return;

    // Remove markers for technicians that are no longer in the list.
    const currentIds = new Set(employeesRef.current.map((t) => t.id));
    techMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        techMarkersRef.current.delete(id);
      }
    });

    const techsWithCoords = employeesRef.current.filter((t) =>
      isValidCoord(t.latitude, t.longitude),
    );

    techsWithCoords.forEach((tech) => {
      const color = getMarkerColor(tech);
      const isFollowed = selectedTechIdRef.current === tech.id;
      const icon = buildTechDivIcon(tech, color, isFollowed);
      const existing = techMarkersRef.current.get(tech.id);
      if (existing) {
        // Update position + icon + popup content in place.
        existing.setLatLng([tech.latitude as number, tech.longitude as number]);
        existing.setIcon(icon);
        existing.setPopupContent(buildTechPopupHtml(tech, color));
        existing.setZIndexOffset(color === COLOR_AVAILABLE || isFollowed ? 500 : 0);
      } else {
        const marker = L.marker([tech.latitude as number, tech.longitude as number], {
          icon,
          zIndexOffset: color === COLOR_AVAILABLE || isFollowed ? 500 : 0,
        });
        marker.bindPopup(buildTechPopupHtml(tech, color), {
          closeButton: true,
          autoPan: true,
          maxWidth: 280,
        });
        marker.on('click', () => {
          const newSel =
            selectedTechIdRef.current === tech.id ? null : tech.id;
          onTechnicianSelectRef.current?.(newSel);
        });
        marker.addTo(map);
        techMarkersRef.current.set(tech.id, marker);
      }
    });

    // On the very first render, fit bounds to show all markers.
    if (techMarkersRef.current.size > 0 && routeLinesRef.current.length === 0) {
      const bounds: L.LatLngExpression[] = techsWithCoords.map(
        (t) => [t.latitude, t.longitude] as [number, number],
      );
      if (bounds.length > 1) {
        try {
          map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
        } catch {
          // ignore
        }
      } else if (bounds.length === 1) {
        map.setView(bounds[0], DEFAULT_ZOOM);
      }
    }
  };

  const rerenderJobMarkers = () => {
    const map = mapRef.current;
    if (!map) return;

    // Remove all existing job markers, then re-create. Job pins are cheap
    // (a handful per tenant usually) and the data changes infrequently.
    jobMarkersRef.current.forEach((m) => m.remove());
    jobMarkersRef.current.clear();

    const jobsWithCoords = jobsRef.current.filter((j) =>
      isValidCoord(j.latitude, j.longitude),
    );
    if (jobsWithCoords.length === 0) return;

    // Simple clustering: if there are > CLUSTER_PIN_MIN_COUNT pins, group
    // any that are within CLUSTER_THRESHOLD_PX of each other at the current
    // zoom level. A cluster is represented as a single circle marker with
    // the merged pin count.
    const shouldCluster = jobsWithCoords.length > CLUSTER_PIN_MIN_COUNT;
    const zoom = map.getZoom();
    const clusters: { lat: number; lng: number; jobs: MapJob[] }[] = [];
    const assigned = new Set<string>();

    if (shouldCluster) {
      jobsWithCoords.forEach((job) => {
        if (assigned.has(job.id)) return;
        const group: MapJob[] = [job];
        assigned.add(job.id);
        const centerPx = map.latLngToContainerPoint([job.latitude, job.longitude]);
        jobsWithCoords.forEach((other) => {
          if (assigned.has(other.id)) return;
          const otherPx = map.latLngToContainerPoint([other.latitude, other.longitude]);
          const dx = otherPx.x - centerPx.x;
          const dy = otherPx.y - centerPx.y;
          if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_THRESHOLD_PX) {
            group.push(other);
            assigned.add(other.id);
          }
        });
        if (group.length > 1) {
          // Centroid of the group.
          const lat = group.reduce((a, j) => a + j.latitude, 0) / group.length;
          const lng = group.reduce((a, j) => a + j.longitude, 0) / group.length;
          clusters.push({ lat, lng, jobs: group });
        } else {
          // Single pin — render normally below.
          assigned.delete(job.id);
        }
      });
    }

    // Render single (non-clustered) pins.
    jobsWithCoords.forEach((job) => {
      if (assigned.has(job.id)) return;
      const color = getJobColor(job.priority);
      const icon = buildJobDivIcon(job, color);
      const marker = L.marker([job.latitude, job.longitude], { icon });
      marker.bindPopup(buildJobPopupHtml(job, color), {
        closeButton: true,
        autoPan: true,
        maxWidth: 280,
      });
      marker.addTo(map);
      jobMarkersRef.current.set(job.id, marker);
    });

    // Render clusters.
    clusters.forEach((cluster, idx) => {
      const count = cluster.jobs.length;
      const icon = buildClusterDivIcon(count);
      const clusterId = `cluster-${idx}`;
      const marker = L.marker([cluster.lat, cluster.lng], { icon });
      const jobList = cluster.jobs
        .map(
          (j) =>
            `<li style="font-size:11px;color:#334155;padding:2px 0;border-bottom:1px solid #f1f5f9;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:${getJobColor(j.priority)};margin-right:6px;"></span>
              ${escapeHtml(j.title)}
              <span style="color:#94a3b8;font-size:10px;">— ${escapeHtml((j.priority || 'normal').toLowerCase())}</span>
            </li>`,
        )
        .join('');
      marker.bindPopup(
        `<div style="min-width:200px;font-family:ui-sans-serif,system-ui,sans-serif;">
          <div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:6px;">${count} jobs in this area</div>
          <ul style="list-style:none;padding:0;margin:0;max-height:200px;overflow-y:auto;">${jobList}</ul>
          <div style="font-size:10px;color:#94a3b8;margin-top:6px;">Zoom in to see individual pins</div>
        </div>`,
        { closeButton: true, autoPan: true, maxWidth: 280 },
      );
      marker.on('click', () => {
        // Zoom in on the cluster so individual pins appear.
        map.setView([cluster.lat, cluster.lng], Math.min(zoom + 2, 17), { animate: true });
      });
      marker.addTo(map);
      jobMarkersRef.current.set(clusterId, marker);
    });
  };

  const drawRouteLines = () => {
    const map = mapRef.current;
    if (!map) return;
    // Clear existing route lines.
    routeLinesRef.current.forEach((l) => l.remove());
    routeLinesRef.current = [];

    // For each job that has an assignee, find the technician's current
    // position and draw a dashed line from tech → job.
    const techById = new Map(
      employeesRef.current
        .filter((t) => isValidCoord(t.latitude, t.longitude))
        .map((t) => [t.id, t] as const),
    );

    jobsRef.current.forEach((job) => {
      if (!isValidCoord(job.latitude, job.longitude)) return;
      if (!job.assigneeId) return;
      const tech = techById.get(job.assigneeId);
      if (!tech) return;
      const techLat = tech.latitude as number;
      const techLng = tech.longitude as number;
      const line = L.polyline(
        [
          [techLat, techLng],
          [job.latitude, job.longitude],
        ],
        {
          color: ROUTE_LINE_COLOR,
          weight: 2,
          opacity: 0.6,
          dashArray: '8, 8',
          lineCap: 'round',
        },
      );
      line.addTo(map);
      routeLinesRef.current.push(line);
    });
  };

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  useEffect(() => {
    selectedTechIdRef.current = selectedTechnicianId;
    // If selection changed, refresh tech marker icons so the "followed"
    // ring updates, and pan to the selected technician if they exist.
    const sel = selectedTechnicianId;
    if (sel) {
      const tech = employeesRef.current.find((t) => t.id === sel);
      if (tech && isValidCoord(tech.latitude, tech.longitude) && mapRef.current) {
        try {
          mapRef.current.panTo([tech.latitude, tech.longitude], { animate: true });
        } catch {
          // ignore
        }
      }
    }
    // Re-render tech markers so the "followed" ring style updates.
    rerenderTechMarkers();
  }, [selectedTechnicianId]);
  useEffect(() => {
    onTechnicianSelectRef.current = onTechnicianSelect;
  }, [onTechnicianSelect]);

  // ─── Initialize the map once ───────────────────────────────────────────
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

    // Default basemap: OpenStreetMap streets.
    const streetsLayer = L.tileLayer(TILE_URL_STREETS, {
      attribution: TILE_ATTRIBUTION_STREETS,
      maxZoom: 19,
    }).addTo(map);
    tileLayersRef.current.streets = streetsLayer;

    // Pre-load satellite layer (not added to map until toggled on).
    const satelliteLayer = L.tileLayer(TILE_URL_SATELLITE, {
      attribution: TILE_ATTRIBUTION_SATELLITE,
      maxZoom: 19,
    });
    tileLayersRef.current.satellite = satelliteLayer;

    mapRef.current = map;

    // Inject pulse keyframes + custom marker styles once.
    if (typeof document !== 'undefined' && !document.getElementById('fieseros-tech-marker-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'fieseros-tech-marker-style';
      styleEl.textContent = `
        @keyframes fieseros-tech-pulse {
          0%   { transform: scale(0.85); opacity: 0.45; }
          70%  { transform: scale(1.8);  opacity: 0;    }
          100% { transform: scale(1.8);  opacity: 0;    }
        }
        .fieseros-tech-marker,
        .fieseros-job-marker,
        .fieseros-job-cluster { background: transparent !important; border: none !important; }
        .leaflet-container { font-family: inherit; }
        .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
        .leaflet-popup-content { margin: 10px 12px; }
      `;
      document.head.appendChild(styleEl);
    }

    // Clicking empty map area deselects the followed technician.
    map.on('click', () => {
      if (selectedTechIdRef.current && onTechnicianSelectRef.current) {
        onTechnicianSelectRef.current(null);
      }
    });

    // Force a re-layout once the container is visible (Leaflet sometimes
    // mis-measures tiles when mounted inside a flex/grid panel).
    const invalidateTimer = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    // Initial render of tech + job markers (deferred so the refs are set).
    rerenderTechMarkers();
    rerenderJobMarkers();
    drawRouteLines();

    return () => {
      clearTimeout(invalidateTimer);
      techMarkersRef.current.forEach((m) => m.remove());
      techMarkersRef.current.clear();
      jobMarkersRef.current.forEach((m) => m.remove());
      jobMarkersRef.current.clear();
      routeLinesRef.current.forEach((l) => l.remove());
      routeLinesRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Re-render technician markers when employees list changes ──────────
  useEffect(() => {
    rerenderTechMarkers();
    // Routes depend on technician positions too — redraw them.
    drawRouteLines();
  }, [employees]);

  // ─── Re-render job pins when jobs list changes ────────────────────────
  useEffect(() => {
    rerenderJobMarkers();
    drawRouteLines();
  }, [jobs]);

  // ─── Imperative controller (for live GPS updates + recenter) ──────────
  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      handleGpsPing: (ping) => {
        const map = mapRef.current;
        if (!map) return;
        const { employeeId, latitude, longitude } = ping;
        if (!isValidCoord(latitude, longitude)) return;

        let marker = techMarkersRef.current.get(employeeId);
        if (marker) {
          // In-place update — no flicker.
          marker.setLatLng([latitude, longitude]);
        } else {
          // Technician not yet on the map — create a new marker for them.
          const tech: MapTechnician = {
            id: employeeId,
            name: `Tech ${employeeId.slice(-4)}`,
            latitude,
            longitude,
            status: 'online',
            lastSeenAt: ping.capturedAt ?? new Date().toISOString(),
          };
          const color = getMarkerColor(tech);
          const icon = buildTechDivIcon(tech, color, selectedTechIdRef.current === employeeId);
          marker = L.marker([latitude, longitude], { icon, zIndexOffset: 500 });
          marker.bindPopup(buildTechPopupHtml(tech, color), {
            closeButton: true,
            autoPan: true,
            maxWidth: 280,
          });
          marker.on('click', () => {
            const newSel =
              selectedTechIdRef.current === employeeId ? null : employeeId;
            onTechnicianSelectRef.current?.(newSel);
          });
          marker.addTo(map);
          techMarkersRef.current.set(employeeId, marker);
        }

        // If this technician is the followed one, pan the map to follow.
        if (selectedTechIdRef.current === employeeId) {
          try {
            map.panTo([latitude, longitude], { animate: true });
          } catch {
            // ignore
          }
        }

        // Redraw route lines in case the tech's position affects them.
        drawRouteLines();
      },
      recenter: () => {
        const map = mapRef.current;
        if (!map) return;
        const techsWithCoords = employeesRef.current.filter((t) =>
          isValidCoord(t.latitude, t.longitude),
        );
        const jobsWithCoords = jobsRef.current.filter((j) =>
          isValidCoord(j.latitude, j.longitude),
        );
        const points: L.LatLngExpression[] = [
          ...techsWithCoords.map((t) => [t.latitude, t.longitude] as [number, number]),
          ...jobsWithCoords.map((j) => [j.latitude, j.longitude] as [number, number]),
        ];
        if (points.length > 1) {
          try {
            map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 });
          } catch {
            // ignore
          }
        } else if (points.length === 1) {
          map.setView(points[0], DEFAULT_ZOOM);
        } else {
          map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        }
      },
      setLayer: (layer) => {
        const map = mapRef.current;
        if (!map) return;
        const { streets, satellite } = tileLayersRef.current;
        if (layer === 'satellite') {
          if (streets && map.hasLayer(streets)) map.removeLayer(streets);
          if (satellite && !map.hasLayer(satellite)) satellite.addTo(map);
        } else {
          if (satellite && map.hasLayer(satellite)) map.removeLayer(satellite);
          if (streets && !map.hasLayer(streets)) streets.addTo(map);
        }
      },
    };
    return () => {
      controllerRef.current = null;
    };
  }, []);

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
          Legend
        </p>
        <ul className="space-y-1">
          <LegendItem color={COLOR_AVAILABLE} label="Available" />
          <LegendItem color={COLOR_BUSY} label="Busy / on job" />
          <LegendItem color={COLOR_LEAVE} label="On leave" />
          <LegendItem color={COLOR_OFFLINE} label="Offline (&gt;30 min)" />
          <li className="mt-1.5 pt-1.5 border-t border-border flex items-center gap-2 text-[10px] text-foreground">
            <span
              className="inline-block size-2.5 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: COLOR_JOB_URGENT }}
              aria-hidden
            />
            <span>Urgent job</span>
          </li>
          <li className="flex items-center gap-2 text-[10px] text-foreground">
            <span
              className="inline-block size-2.5 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: COLOR_JOB_HIGH }}
              aria-hidden
            />
            <span>High priority</span>
          </li>
          <li className="flex items-center gap-2 text-[10px] text-foreground">
            <span
              className="inline-block size-2.5 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: COLOR_JOB_MEDIUM }}
              aria-hidden
            />
            <span>Medium priority</span>
          </li>
        </ul>
      </div>

      {/* Following indicator */}
      {selectedTechnicianId && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-full border border-teal-200 bg-teal-50/95 px-3 py-1 shadow-md backdrop-blur dark:bg-teal-950/80 dark:border-teal-800">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-teal-700 dark:text-teal-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-teal-500" />
            </span>
            Following {employees.find((t) => t.id === selectedTechnicianId)?.name ?? 'technician'}
          </span>
        </div>
      )}
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

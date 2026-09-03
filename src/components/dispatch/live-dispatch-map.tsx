'use client';

/**
 * LiveDispatchMap (Phase D — Google Maps JS API)
 * ==============================================
 * Google Maps replacement for the legacy Leaflet LiveTechnicianMap.
 *
 * WHAT CHANGED (Leaflet → Google Maps):
 *   • Map: `google.maps.Map` with `mapId` (required for AdvancedMarkerElement).
 *     No satellite layer / map type control — the user dropped satellite.
 *   • Markers: `google.maps.marker.AdvancedMarkerElement` with custom HTML
 *     content (technician circle/initial + job pins). NOT the deprecated
 *     `google.maps.Marker`.
 *   • Job clustering: `@googlemaps/markerclusterer` (v2) instead of the
 *     pixel-distance heuristic in the old rerenderJobMarkers.
 *   • Polylines: `google.maps.Polyline` (solid breadcrumb + dashed remaining
 *     route via strokePattern).
 *   • Accuracy halo: `google.maps.Circle`.
 *   • Routing: POST `/api/maps/routes` (the Phase C Google Routes proxy),
 *     instead of the browser-side OSRM helper. The proxy keeps the server
 *     Google key off the client + caches server-side.
 *
 * WHAT IS PRESERVED EXACTLY from the Leaflet version:
 *   • All business-logic constants (ANIM_MIN_MS, ANIM_MAX_MS, STALE_MS,
 *     STALE_GAP_FACTOR, JUMP_KM, STATIONARY_M, OSRM_REFETCH_DISTANCE_M, etc).
 *   • `haversineMeters()` helper.
 *   • `easeOutCubic()` easing.
 *   • `AnimState` interface + `startGlide()` — the rAF-based marker
 *     interpolation. Only difference: `marker.position = new google.maps.LatLng`
 *     instead of `marker.setLatLng([lat,lng])`.
 *   • Auto-frame protection (`autoFramedJobIdsRef` — frame once per job
 *     lifecycle transition to 'travelling').
 *   • Per-marker signature idempotency guard (FIX A — skip icon rebuild when
 *     the visual signature hasn't changed).
 *   • Stale / jump / stationary snap rules.
 *   • Diagnostic `console.log('[dispatch-map] ...')` calls.
 *
 * PUBLIC API:
 *   • `MapTechnician`, `MapJob`, `TechTelemetry` — same interfaces.
 *   • `LiveTechnicianMapController` — WITHOUT `setLayer` (satellite dropped).
 *     The four remaining methods (`handleGpsPing`, `recenter`,
 *     `recenterOnTech`, `refreshMarkers`) have identical signatures so
 *     dispatch-view.tsx can swap to this component by changing only the
 *     dynamic import path + dropping the layer toggle.
 *
 * LOADING:
 *   The Google Maps JS API is loaded once via a `<script>` tag injected into
 *   `<head>` (the simplest reliable approach for client components). We then
 *   poll for `window.google.maps` to be available before initializing the
 *   map. A loading spinner is shown until ready. If
 *   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing, an error message is
 *   rendered instead of crashing.
 */

import { useEffect, useRef, useState } from 'react';
// MarkerClusterer is statically importable — the import itself has no side
// effects and doesn't reference google.maps until instantiated.
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { apiUrl } from '@/lib/api';

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
  team?: { id: string; name: string; color: string } | null;
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
  scheduledAt?: string;
}

/** Live telemetry for a technician, fed by gps.ping realtime events. */
export interface TechTelemetry {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  batteryLevel?: number | null;
  capturedAt: string;
}

/**
 * Imperative API exposed to the parent via `controllerRef`. NOTE: `setLayer`
 * is intentionally REMOVED — the user dropped the satellite basemap toggle.
 * The four remaining methods match the Leaflet version's signatures.
 */
export interface LiveTechnicianMapController {
  /**
   * Handle an incoming gps.ping. Interpolates the marker from its current
   * position to the new one over a timestamp-derived window, updates the
   * heading arrow, speed/battery/freshness badges, and accuracy halo.
   */
  handleGpsPing: (ping: {
    employeeId: string;
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    batteryLevel?: number | null;
    capturedAt?: string;
  }) => void;
  /** Recenter the map on all technicians (and job pins if present). */
  recenter: () => void;
  /**
   * Recenter/reframe the map on a SPECIFIC technician. Called by the
   * dispatcher's "Recenter" button — NOT on every GPS ping.
   *
   * Logic:
   *   - Tech has coords AND assigned job has coords → fitBounds([tech, job])
   *   - Only tech has coords → panTo(tech) at zoom 15
   *   - No coords → no-op
   */
  recenterOnTech: (employeeId: string) => void;
  /** Force a refresh of all marker icons (used when selection changes). */
  refreshMarkers: () => void;
}

interface LiveDispatchMapProps {
  employees: MapTechnician[];
  jobs?: MapJob[];
  selectedTechnicianId?: string | null;
  onTechnicianSelect?: (techId: string | null) => void;
  controllerRef?: React.MutableRefObject<LiveTechnicianMapController | null>;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_CENTER = { lat: 22.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 12;
const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000;

// ── Phase 2 interpolation constants (preserved EXACTLY) ──
const ANIM_MIN_MS = 600;            // floor for the glide window
const ANIM_MAX_MS = 2500;           // ceiling for the glide window
const STALE_MS = 60_000;            // ping older than this → snap, don't glide
const STALE_GAP_FACTOR = 3;         // interval > 3× previous → treat as stale
const JUMP_KM = 2.5;                 // > this distance from prev → GPS correction, snap
const STATIONARY_M = 8;             // < this movement → don't rotate heading (noisy)
const FRESH_LIVE_MS = 30_000;       // "live" badge while < 30s old
const LOW_BATTERY_PCT = 0.15;       // battery below this → red badge

// Phase D: refetch the road-following route when the tech has moved more
// than this many meters from the position the cached route started at.
// (Renamed from OSRM_REFETCH_DISTANCE_M but SAME VALUE — kept the OSRM_*
// alias for parity with the Leaflet file's constant block per the spec.)
const OSRM_REFETCH_DISTANCE_M = 100;

const COLOR_AVAILABLE = '#10b981';
const COLOR_BUSY = '#f59e0b';
const COLOR_LEAVE = '#94a3b8';
const COLOR_OFFLINE = '#ef4444';
const COLOR_DEFAULT = '#3b82f6';

const COLOR_JOB_URGENT = '#ef4444';
const COLOR_JOB_HIGH = '#f59e0b';
const COLOR_JOB_MEDIUM = '#3b82f6';
const COLOR_JOB_LOW = '#94a3b8';

const ROUTE_BREADCRUMB_COLOR = '#10b981';   // emerald — completed path actually driven
const ROUTE_REMAINING_COLOR = '#f59e0b';    // amber — remaining route (animated dashes)
const ROUTE_HISTORY_COLOR = '#94a3b8';      // slate-gray — historical completed routes
const ROUTE_REFRESH_ACTIVE_MS = 15_000;
const ROUTE_REFRESH_COMPLETED_MS = 60_000;

const ASSUMED_SPEED_KMH = 35;

// Accuracy circles only render when accuracy is in this range — too small = invisible,
// too large = unhelpful.
const ACCURACY_CIRCLE_MIN_RADIUS_M = 5;
const ACCURACY_CIRCLE_MAX_RADIUS_M = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────

function isOffline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return true;
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > OFFLINE_THRESHOLD_MS;
}

function getMarkerColor(tech: MapTechnician): string {
  const status = (tech.status || '').toLowerCase();
  if (status === 'offline' || isOffline(tech.lastSeenAt)) return COLOR_OFFLINE;
  if (status === 'available') return COLOR_AVAILABLE;
  if (
    status === 'busy' ||
    status === 'on_job' ||
    status === 'in_progress' ||
    status === 'en_route' ||
    status === 'traveling'
  ) {
    return COLOR_BUSY;
  }
  if (status === 'leave' || status === 'away' || status === 'on_leave') return COLOR_LEAVE;
  return COLOR_DEFAULT;
}

function getJobColor(priority: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'urgent') return COLOR_JOB_URGENT;
  if (p === 'high') return COLOR_JOB_HIGH;
  if (p === 'medium') return COLOR_JOB_MEDIUM;
  return COLOR_JOB_LOW;
}

/** Haversine distance in meters between two lat/lng points (preserved exactly). */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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

/** Freshness label for a telemetry ping: "live · 8s" or "stale · 9m". */
function freshnessLabel(capturedAt?: string | null): string {
  if (!capturedAt) return 'unknown';
  const ts = new Date(capturedAt).getTime();
  if (Number.isNaN(ts)) return 'unknown';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 0) return 'live';
  if (seconds < FRESH_LIVE_MS / 1000) return `live · ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `stale · ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `stale · ${hours}h`;
}

function statusBadgeStyle(color: string): string {
  return `display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;color:${color};background:${color}1a;border:1px solid ${color}40;`;
}

function escapeHtml(s?: string | null | unknown): string {
  if (s === null || s === undefined) return '';
  const str = typeof s === 'string' ? s : String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function extractLatLng(pos: unknown): { lat: number; lng: number } | null {
  if (!pos || typeof pos !== 'object') return null;
  const p = pos as Record<string, unknown>;
  const lat = typeof p.lat === 'function' ? p.lat() : typeof p.lat === 'number' ? p.lat : null;
  const lng = typeof p.lng === 'function' ? p.lng() : typeof p.lng === 'number' ? p.lng : null;
  if (lat !== null && lng !== null && isValidCoord(lat, lng)) {
    return { lat, lng };
  }
  return null;
}

function computeCenter(techs: MapTechnician[]): { lat: number; lng: number } {
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
  return { lat: sumLat / points.length, lng: sumLng / points.length };
}

/** Compute ETA in minutes from a tech's position to their assigned job. */
function computeEtaMinutes(
  techLat: number,
  techLng: number,
  jobs: MapJob[],
  currentJobId?: string | null,
): number | null {
  if (!currentJobId) return null;
  const job = jobs.find((j) => j.id === currentJobId);
  if (!job || !isValidCoord(job.latitude, job.longitude)) return null;
  const distM = haversineMeters(techLat, techLng, job.latitude, job.longitude);
  const distKm = distM / 1000;
  if (distKm < 0.15) return 0; // arrived (within 150m)
  return Math.max(1, Math.round((distKm / ASSUMED_SPEED_KMH) * 60));
}

// ─── Popup HTML builders (InfoWindow content) ─────────────────────────────

function buildTechPopupHtml(
  tech: MapTechnician,
  color: string,
  telemetry?: TechTelemetry | null,
): string {
  const role = tech.role ? tech.role : 'Technician';
  const teamHtml = tech.team
    ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Team: <span style="font-weight:600;color:${escapeHtml(tech.team.color)};">${escapeHtml(tech.team.name)}</span></div>`
    : '';
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

  let telemetryHtml = '';
  if (telemetry) {
    const speedKmh =
      typeof telemetry.speed === 'number' && telemetry.speed >= 0
        ? Math.round(telemetry.speed * 3.6)
        : null;
    const batteryPct =
      typeof telemetry.batteryLevel === 'number' && telemetry.batteryLevel >= 0
        ? Math.round(telemetry.batteryLevel * 100)
        : null;
    const batteryColor =
      batteryPct !== null && batteryPct <= LOW_BATTERY_PCT * 100 ? '#ef4444' : '#10b981';
    const rows: string[] = [];
    if (speedKmh !== null) {
      rows.push(
        `<span style="color:#94a3b8;">Speed</span><span style="font-weight:600;color:#0f172a;">${speedKmh} km/h</span>`,
      );
    }
    if (batteryPct !== null) {
      rows.push(
        `<span style="color:#94a3b8;">Battery</span><span style="font-weight:600;color:${batteryColor};">${batteryPct}%</span>`,
      );
    }
    rows.push(
      `<span style="color:#94a3b8;">GPS</span><span style="font-weight:600;color:#0f172a;">${freshnessLabel(telemetry.capturedAt)}</span>`,
    );
    telemetryHtml = `
      <div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:6px;display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:11px;">
        ${rows.map((r) => `<div style="display:contents;">${r}</div>`).join('')}
      </div>`;
  }

  return `
    <div style="min-width:200px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
      <div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:2px;">
        ${escapeHtml(tech.name)}
      </div>
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${escapeHtml(role)}</div>
      ${teamHtml}
      <div style="display:flex;align-items:center;gap:6px;margin:6px 0;">
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
      ${telemetryHtml}
      <div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:6px;">
        <button data-follow-tech-id="${escapeHtml(tech.id)}" style="
          width:100%;padding:6px 10px;border:none;border-radius:6px;
          background:#3b82f6;color:#fff;font-size:11px;font-weight:600;
          cursor:pointer;font-family:inherit;
        ">Follow this technician</button>
      </div>
    </div>
  `;
}

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

// ─── Marker DOM element builders (AdvancedMarkerElement.content) ──────────

const VEHICLE_VAN_SVG = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.23-4.11a1 1 0 0 0-.78-.37H14"/>
    <circle cx="7" cy="18" r="2"/>
    <circle cx="17" cy="18" r="2"/>
  </svg>`;

/**
 * Build the HTML content element for a technician AdvancedMarkerElement.
 * Mirrors the old buildTechDivIcon — same visual structure (pulse ring,
 * vehicle van SVG, heading arrow, speed/battery/ETA badges) but as a
 * plain DOM element instead of Leaflet's divIcon HTML string.
 */
function createTechMarkerElement(
  tech: MapTechnician,
  color: string,
  isFollowed: boolean,
  telemetry?: TechTelemetry | null,
  etaMinutes?: number | null,
): HTMLDivElement {
  const isOfflineMarker = color === COLOR_OFFLINE;
  const ringStyle = isFollowed
    ? `box-shadow:0 0 0 3px ${color}, 0 0 0 6px #ffffff, 0 1px 6px rgba(0,0,0,0.4);`
    : `box-shadow:0 1px 4px rgba(0,0,0,0.35);`;

  const speedKmh =
    telemetry && typeof telemetry.speed === 'number' && telemetry.speed >= 0
      ? telemetry.speed * 3.6
      : null;
  const hasHeading =
    telemetry &&
    typeof telemetry.heading === 'number' &&
    !Number.isNaN(telemetry.heading) &&
    telemetry.heading >= 0 &&
    telemetry.heading <= 360 &&
    (speedKmh === null || speedKmh > 2);

  const arrowHtml = hasHeading
    ? `<span style="
        position:absolute;top:-12px;left:50%;transform:translateX(-50%) rotate(${telemetry!.heading}deg);
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-bottom:8px solid ${color};filter:drop-shadow(0 1px 1px rgba(0,0,0,0.3));
      "></span>`
    : '';

  const speedBadgeHtml =
    hasHeading && speedKmh !== null && speedKmh > 2
      ? `<span style="
          position:absolute;bottom:-13px;left:50%;transform:translateX(-50%);
          background:#0f172a;color:#fff;font-size:8px;font-weight:700;
          padding:1px 4px;border-radius:4px;white-space:nowrap;line-height:1.1;
          font-family:ui-sans-serif,system-ui,sans-serif;
        ">${Math.round(speedKmh)}</span>`
      : '';

  const batteryPct =
    telemetry &&
    typeof telemetry.batteryLevel === 'number' &&
    telemetry.batteryLevel >= 0 &&
    telemetry.batteryLevel <= 1
      ? Math.round(telemetry.batteryLevel * 100)
      : null;
  const batteryColor =
    batteryPct === null
      ? '#64748b'
      : batteryPct > 50
        ? '#16a34a'
        : batteryPct >= 20
          ? '#f59e0b'
          : '#dc2626';
  const batteryBadgeHtml =
    batteryPct !== null
      ? `<span style="
          position:absolute;top:50%;right:-18px;transform:translateY(-50%);
          background:${batteryColor};color:#fff;font-size:7px;font-weight:700;
          padding:1px 3px;border-radius:3px;white-space:nowrap;line-height:1.1;
          font-family:ui-sans-serif,system-ui,sans-serif;
          box-shadow:0 1px 2px rgba(0,0,0,0.3);
        ">${batteryPct}%</span>`
      : '';

  const etaBadgeHtml =
    etaMinutes != null && etaMinutes !== Infinity && etaMinutes < 999
      ? `<span style="
          position:absolute;top:50%;left:-20px;transform:translateY(-50%);
          background:#0d9488;color:#fff;font-size:7px;font-weight:700;
          padding:1px 3px;border-radius:3px;white-space:nowrap;line-height:1.1;
          font-family:ui-sans-serif,system-ui,sans-serif;
          box-shadow:0 1px 2px rgba(0,0,0,0.3);
        ">${etaMinutes}m</span>`
      : '';

  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:relative;width:32px;height:32px;cursor:pointer;';
  wrapper.innerHTML = `
    ${arrowHtml}
    ${
      !isOfflineMarker
        ? `<span style="position:absolute;inset:-5px;border-radius:9999px;background:${color};opacity:0.3;animation:fieseros-tech-pulse 2s ease-out infinite;"></span>`
        : ''
    }
    <span style="
      position:absolute;inset:0;
      display:flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:9999px;
      background:${color};color:#ffffff;
      border:2.5px solid #ffffff;
      ${ringStyle}
    " title="${escapeHtml(tech.name)}">
      ${VEHICLE_VAN_SVG}
    </span>
    ${speedBadgeHtml}
    ${batteryBadgeHtml}
    ${etaBadgeHtml}
  `;
  return wrapper;
}

/** Build the HTML content for a job pin AdvancedMarkerElement. */
function createJobMarkerElement(job: MapJob, color: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:relative;width:24px;height:30px;cursor:pointer;';
  wrapper.innerHTML = `
    <svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18s12-9 12-18C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="#ffffff"/>
    </svg>
  `;
  return wrapper;
}

// ─── Per-marker animation state (preserved exactly) ───────────────────────
// Each entry tracks the marker's "displayed" (interpolated) position, the
// last ping, the previous interval, and the active rAF handle so we can
// cancel superseded glides.

interface AnimState {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  startAt: number; // epoch ms when the current glide started
  duration: number; // glide duration in ms
  rafId: number | null;
  lastPingAt: number | null; // epoch ms of the previous ping
  prevInterval: number | null; // ms between the previous two pings
  telemetry: TechTelemetry | null;
}

// ─── Route caches ─────────────────────────────────────────────────────────
// Per-job road-following route cache (replaces OSRM). Keyed by jobId so
// multiple jobs don't collide. The fromLat/fromLng record where the tech was
// when the route was fetched — used to decide whether the tech has moved far
// enough (> OSRM_REFETCH_DISTANCE_M) to justify a refetch.

interface RoadRouteCacheEntry {
  path: { lat: number; lng: number }[]; // road-following polyline points
  fromLat: number; // tech latitude when the route was fetched
  fromLng: number; // tech longitude when the route was fetched
}

interface PathPoint {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracy?: number | null;
}

interface RouteHistoryCacheEntry {
  activePath: PathPoint[];
  completedPaths: PathPoint[][];
  activeStartLat: number | null;
  activeStartLng: number | null;
  fetchedAt: number;
  status: 'in_progress' | 'completed' | 'none';
}

// ─── Google Maps JS API loader ─────────────────────────────────────────────

let googleMapsLoaderPromise: Promise<void> | null = null;

/**
 * Load the Google Maps JS API once via a script tag injected into <head>.
 * Returns a cached promise — subsequent callers await the same load.
 * Resolves once `google.maps.Map` and `google.maps.marker` are fully imported and ready.
 */
async function loadGoogleMapsApi(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps cannot be loaded server-side');
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — cannot load Google Maps JS API');
  }

  const win = window as unknown as { google?: { maps?: any } };
  if (win.google?.maps?.Map && typeof win.google.maps.Map === 'function') {
    return;
  }

  if (!googleMapsLoaderPromise) {
    googleMapsLoaderPromise = new Promise<void>((resolve, reject) => {
      const prior = document.getElementById('google-maps-js-api') as HTMLScriptElement | null;
      if (prior && (window as any).google?.maps) {
        resolve();
        return;
      }

      const params = new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        libraries: 'marker,geometry',
      });
      if (mapId) params.set('map_ids', mapId);

      const script = document.createElement('script');
      script.id = 'google-maps-js-api';
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => {
        googleMapsLoaderPromise = null;
        reject(new Error('Failed to load Google Maps JS API script'));
      };

      document.head.appendChild(script);
    });
  }

  await googleMapsLoaderPromise;

  if (!win.google?.maps) {
    throw new Error('Google Maps SDK loaded but google.maps namespace is missing');
  }

  // Import and bind maps, marker, and core libraries to ensure constructors exist on google.maps
  if (typeof win.google.maps.importLibrary === 'function') {
    try {
      const [mapsLib, markerLib, coreLib] = await Promise.all([
        win.google.maps.importLibrary('maps'),
        win.google.maps.importLibrary('marker'),
        win.google.maps.importLibrary('core').catch(() => null),
      ]);

      if (mapsLib && typeof mapsLib === 'object') {
        Object.assign(win.google.maps, mapsLib);
      }
      if (markerLib && typeof markerLib === 'object') {
        win.google.maps.marker = win.google.maps.marker || {};
        Object.assign(win.google.maps.marker, markerLib);
      }
      if (coreLib && typeof coreLib === 'object') {
        Object.assign(win.google.maps, coreLib);
      }
    } catch (err) {
      console.warn('[dispatch-map] importLibrary warning:', err);
    }
  }

  // Poll briefly (up to 1s) if Map constructor is still finishing initialization
  let attempts = 0;
  while (typeof win.google.maps.Map !== 'function' && attempts < 20) {
    await new Promise((r) => setTimeout(r, 50));
    if (typeof win.google.maps.importLibrary === 'function') {
      try {
        const mapsLib = await win.google.maps.importLibrary('maps');
        if (mapsLib && typeof mapsLib === 'object') {
          Object.assign(win.google.maps, mapsLib);
        }
      } catch {}
    }
    attempts++;
  }

  if (typeof win.google.maps.Map !== 'function') {
    throw new Error('Google Maps Map constructor is not available');
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function LiveDispatchMap({
  employees,
  jobs = [],
  selectedTechnicianId = null,
  onTechnicianSelect,
  controllerRef,
  className,
}: LiveDispatchMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const techMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const jobMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);

  // Per-job route polyline cache (replaces the flat routeLines array so we
  // can update only the affected tech's route on each GPS ping).
  const routeLinesByJobRef = useRef<Map<string, google.maps.Polyline[]>>(new Map());
  // Route history (breadcrumb) cache.
  const routeHistoryCacheRef = useRef<Map<string, RouteHistoryCacheEntry>>(new Map());
  // Road-following route cache (replaces OSRM cache). Keyed by jobId.
  const roadRouteCacheRef = useRef<Map<string, RoadRouteCacheEntry>>(new Map());
  // Tracks which jobs currently have a road route fetch in flight.
  const roadFetchInFlightRef = useRef<Set<string>>(new Set());
  // Start-point markers for active routes (one per job).
  const routeStartMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const accuracyCirclesRef = useRef<Map<string, google.maps.Circle>>(new Map());
  const animStateRef = useRef<Map<string, AnimState>>(new Map());
  // FIX A: per-marker signature cache — skip icon rebuild when nothing changed.
  const markerSigRef = useRef<Map<string, string>>(new Map());

  const employeesRef = useRef(employees);
  const jobsRef = useRef(jobs);
  const selectedTechIdRef = useRef<string | null>(selectedTechnicianId);
  const onTechnicianSelectRef = useRef(onTechnicianSelect);
  // Tracks jobIds for which we have already auto-framed the map (Uber-style
  // zoom to tech → destination). Prevents re-framing on every 5s poll.
  const autoFramedJobIdsRef = useRef<Set<string>>(new Set());

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // ── Easing (ease-out-cubic) — natural deceleration ──
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  /**
   * Start a smooth glide from the marker's current displayed position to the
   * new target, using requestAnimationFrame. Handles the stale / jump /
   * stationary rules. PRESERVED EXACTLY from the Leaflet version — the only
   * delta is `marker.position = new google.maps.LatLng(lat,lng)` instead of
   * `marker.setLatLng([lat,lng])`.
   */
  const startGlide = (
    employeeId: string,
    targetLat: number,
    targetLng: number,
    ping: TechTelemetry,
  ) => {
    const marker = techMarkersRef.current.get(employeeId);
    if (!marker) return;

    const state = animStateRef.current.get(employeeId);
    const now = Date.now();
    const pingTime = new Date(ping.capturedAt).getTime();

    // Current displayed position (start of the glide).
    const cur = marker.position;
    if (!cur) return;
    const curCoords = extractLatLng(cur);
    if (!curCoords) return;
    const fromLat = curCoords.lat;
    const fromLng = curCoords.lng;

    const distM = haversineMeters(fromLat, fromLng, targetLat, targetLng);

    // Rule: huge GPS jump → snap, don't glide.
    if (distM > JUMP_KM * 1000) {
      marker.position = new google.maps.LatLng(targetLat, targetLng);
      if (state) {
        if (state.rafId !== null) cancelAnimationFrame(state.rafId);
        state.fromLat = targetLat;
        state.fromLng = targetLng;
        state.toLat = targetLat;
        state.toLng = targetLng;
        state.rafId = null;
        state.telemetry = ping;
        state.lastPingAt = pingTime;
      }
      return;
    }

    // Rule: stationary → snap (no glide for tiny moves).
    if (distM < STATIONARY_M) {
      marker.position = new google.maps.LatLng(targetLat, targetLng);
      if (state) {
        if (state.rafId !== null) cancelAnimationFrame(state.rafId);
        state.fromLat = targetLat;
        state.fromLng = targetLng;
        state.toLat = targetLat;
        state.toLng = targetLng;
        state.rafId = null;
        state.telemetry = ping;
        state.lastPingAt = pingTime;
      }
      return;
    }

    // Determine the interpolation window from the Δtime between pings.
    let duration = ANIM_MIN_MS;
    if (state && state.lastPingAt !== null) {
      const interval = Math.max(0, pingTime - state.lastPingAt);
      // Rule: stale ping (too old, or interval far exceeds the previous) → snap.
      const ageMs = now - pingTime;
      const isStale =
        ageMs > STALE_MS ||
        (state.prevInterval !== null && interval > state.prevInterval * STALE_GAP_FACTOR);
      if (isStale) {
        marker.position = new google.maps.LatLng(targetLat, targetLng);
        if (state.rafId !== null) cancelAnimationFrame(state.rafId);
        state.fromLat = targetLat;
        state.fromLng = targetLng;
        state.toLat = targetLat;
        state.toLng = targetLng;
        state.rafId = null;
        state.telemetry = ping;
        state.prevInterval = interval;
        state.lastPingAt = pingTime;
        return;
      }
      // Clamp the glide window to [ANIM_MIN_MS, ANIM_MAX_MS].
      duration = Math.min(ANIM_MAX_MS, Math.max(ANIM_MIN_MS, interval));
    }

    // Cancel any in-flight glide for this marker.
    if (state && state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
    }

    const startAt = performance.now();
    const st: AnimState = {
      fromLat,
      fromLng,
      toLat: targetLat,
      toLng: targetLng,
      startAt,
      duration,
      rafId: null,
      lastPingAt: pingTime,
      prevInterval: state?.prevInterval ?? null,
      telemetry: ping,
    };
    animStateRef.current.set(employeeId, st);

    const tick = (t: number) => {
      const s = animStateRef.current.get(employeeId);
      if (!s || s.rafId === null) return;
      const elapsed = t - startAt;
      const progress = Math.min(1, elapsed / s.duration);
      const eased = easeOutCubic(progress);
      const lat = s.fromLat + (s.toLat - s.fromLat) * eased;
      const lng = s.fromLng + (s.toLng - s.fromLng) * eased;
      const m = techMarkersRef.current.get(employeeId);
      if (m) m.position = new google.maps.LatLng(lat, lng);
      if (progress < 1) {
        s.rafId = requestAnimationFrame(tick);
      } else {
        s.rafId = null;
        if (s.lastPingAt !== null) {
          s.prevInterval = Math.max(0, pingTime - s.lastPingAt);
        }
        s.lastPingAt = pingTime;
      }
    };
    st.rafId = requestAnimationFrame(tick);
  };

  // ── InfoWindow helpers ─────────────────────────────────────────────────

  const openTechInfoWindow = (
    marker: google.maps.marker.AdvancedMarkerElement,
    tech: MapTechnician,
    color: string,
    telemetry?: TechTelemetry | null,
  ) => {
    const iw = infoWindowRef.current;
    const map = mapRef.current;
    if (!iw || !map) return;
    iw.setContent(buildTechPopupHtml(tech, color, telemetry));
    iw.open({ anchor: marker, map });

    // Wire the "Follow this technician" button inside the InfoWindow DOM.
    // addListenerOnce ensures the listener fires once per open and is
    // auto-cleaned (so we don't accumulate handlers across opens).
    google.maps.event.addListenerOnce(iw, 'domready', () => {
      const btn = document.querySelector('[data-follow-tech-id]') as HTMLButtonElement | null;
      if (!btn) return;
      const techId = btn.getAttribute('data-follow-tech-id');
      if (!techId) return;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onTechnicianSelectRef.current?.(techId);
        infoWindowRef.current?.close();
      });
    });
  };

  const openJobInfoWindow = (
    marker: google.maps.marker.AdvancedMarkerElement,
    job: MapJob,
    color: string,
  ) => {
    const iw = infoWindowRef.current;
    const map = mapRef.current;
    if (!iw || !map) return;
    iw.setContent(buildJobPopupHtml(job, color));
    iw.open({ anchor: marker, map });
  };

  // ── Render functions (read from refs so effect deps stay stable) ──

  const updateTechMarkerContent = (
    tech: MapTechnician,
    color: string,
    isFollowed: boolean,
    telemetry?: TechTelemetry | null,
  ) => {
    const marker = techMarkersRef.current.get(tech.id);
    if (!marker) return;
    const dispLat = telemetry?.latitude ?? tech.latitude;
    const dispLng = telemetry?.longitude ?? tech.longitude;
    const eta = isValidCoord(dispLat, dispLng)
      ? computeEtaMinutes(dispLat, dispLng as number, jobsRef.current, tech.currentJobId)
      : null;
    marker.content = createTechMarkerElement(tech, color, isFollowed, telemetry, eta);
    marker.zIndex = color === COLOR_AVAILABLE || isFollowed ? 500 : 1;
  };

  const rerenderTechMarkers = () => {
    const map = mapRef.current;
    if (!map) return;
    const google = (window as unknown as { google: typeof globalThis.google }).google;

    const currentIds = new Set(employeesRef.current.map((t) => t.id));
    techMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.map = null;
        techMarkersRef.current.delete(id);
        markerSigRef.current.delete(id);
        const circle = accuracyCirclesRef.current.get(id);
        if (circle) {
          circle.setMap(null);
          accuracyCirclesRef.current.delete(id);
        }
        const st = animStateRef.current.get(id);
        if (st && st.rafId !== null) cancelAnimationFrame(st.rafId);
        animStateRef.current.delete(id);
      }
    });

    const techsWithCoords = employeesRef.current.filter((t) =>
      isValidCoord(t.latitude, t.longitude),
    );

    techsWithCoords.forEach((tech) => {
      const color = getMarkerColor(tech);
      const isFollowed = selectedTechIdRef.current === tech.id;
      const existingState = animStateRef.current.get(tech.id);
      const telemetry = existingState?.telemetry ?? null;

      // FIX A: signature idempotency guard. Skip rebuild when the visible
      // signature hasn't changed — avoids destroying the AdvancedMarkerElement
      // content DOM on every 5s poll (the flicker fix from the Leaflet version).
      const sig = [
        tech.status,
        isFollowed ? '1' : '0',
        telemetry?.capturedAt ?? 'none',
        tech.name,
        tech.currentJobId ?? 'none',
        Math.round((tech.latitude as number) * 1e6),
        Math.round((tech.longitude as number) * 1e6),
      ].join('|');

      const existing = techMarkersRef.current.get(tech.id);
      const prevSig = markerSigRef.current.get(tech.id);
      const sigChanged = sig !== prevSig;

      if (existing) {
        // FIX A: Only update position when a glide is NOT in flight. During
        // a rAF glide the marker is at an interpolated position; calling
        // `marker.position = ...` with the raw DB position would snap the
        // marker, interrupting the smooth animation.
        const gliding = existingState?.rafId !== null && existingState?.rafId !== undefined;
        if (!gliding) {
          existing.position = new google.maps.LatLng(
            tech.latitude as number,
            tech.longitude as number,
          );
        }
        if (sigChanged) {
          existing.content = createTechMarkerElement(
            tech,
            color,
            isFollowed,
            telemetry,
            isValidCoord(tech.latitude, tech.longitude)
              ? computeEtaMinutes(
                  tech.latitude as number,
                  tech.longitude as number,
                  jobsRef.current,
                  tech.currentJobId,
                )
              : null,
          );
          existing.zIndex = color === COLOR_AVAILABLE || isFollowed ? 500 : 1;
          markerSigRef.current.set(tech.id, sig);
        }
      } else {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: tech.latitude as number, lng: tech.longitude as number },
          map,
          content: createTechMarkerElement(
            tech,
            color,
            isFollowed,
            telemetry,
            isValidCoord(tech.latitude, tech.longitude)
              ? computeEtaMinutes(
                  tech.latitude as number,
                  tech.longitude as number,
                  jobsRef.current,
                  tech.currentJobId,
                )
              : null,
          ),
          zIndex: color === COLOR_AVAILABLE || isFollowed ? 500 : 1,
        });
        marker.addListener('gmp-click', () => {
          const newSel = selectedTechIdRef.current === tech.id ? null : tech.id;
          onTechnicianSelectRef.current?.(newSel);
        });
        techMarkersRef.current.set(tech.id, marker);
        markerSigRef.current.set(tech.id, sig);
        animStateRef.current.set(tech.id, {
          fromLat: tech.latitude as number,
          fromLng: tech.longitude as number,
          toLat: tech.latitude as number,
          toLng: tech.longitude as number,
          startAt: 0,
          duration: ANIM_MIN_MS,
          rafId: null,
          lastPingAt: null,
          prevInterval: null,
          telemetry: null,
        });
      }
    });

    // FIX A: only fitBounds on initial framing (before any routes are drawn),
    // so we don't fight the user's manual pan/zoom on every employees change.
    if (techMarkersRef.current.size > 0 && routeLinesByJobRef.current.size === 0) {
      const positions = techsWithCoords.map(
        (t) => new google.maps.LatLng(t.latitude as number, t.longitude as number),
      );
      if (positions.length > 1) {
        try {
          const bounds = new google.maps.LatLngBounds();
          positions.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 40);
        } catch {
          // ignore
        }
      } else if (positions.length === 1) {
        map.setCenter(positions[0]);
        map.setZoom(DEFAULT_ZOOM);
      }
    }
  };

  const rerenderJobMarkers = () => {
    const map = mapRef.current;
    if (!map) return;
    const google = (window as unknown as { google: typeof globalThis.google }).google;

    // Remove all existing job markers + clear clusterer.
    jobMarkersRef.current.forEach((m) => (m.map = null));
    jobMarkersRef.current.clear();
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current.setMap(null);
      clustererRef.current = null;
    }

    const jobsWithCoords = jobsRef.current.filter((j) => isValidCoord(j.latitude, j.longitude));
    if (jobsWithCoords.length === 0) return;

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    jobsWithCoords.forEach((job) => {
      const color = getJobColor(job.priority);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: job.latitude, lng: job.longitude },
        map,
        content: createJobMarkerElement(job, color),
        zIndex: 1,
      });
      marker.addListener('gmp-click', () => openJobInfoWindow(marker, job, color));
      jobMarkersRef.current.set(job.id, marker);
      markers.push(marker);
      // [dispatch-map] diagnostic — checkpoints 1+2: destination + END marker
      console.log('[dispatch-map] destination', { jobId: job.id, lat: job.latitude, lng: job.longitude });
      console.log('[dispatch-map] ✅ end marker', { jobId: job.id });
    });

    // Cluster jobs once we have enough to justify it (mirrors the Leaflet
    // CLUSTER_PIN_MIN_COUNT threshold). The renderer draws an emerald pill.
    if (markers.length >= 20) {
      try {
        clustererRef.current = new MarkerClusterer({
          map,
          markers,
          renderer: {
            render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
              const size = count > 99 ? 44 : count > 9 ? 38 : 32;
              const el = document.createElement('div');
              el.style.cssText = `
                width:${size}px;height:${size}px;border-radius:9999px;
                background:rgba(16,185,129,0.9);color:#ffffff;
                border:3px solid #ffffff;
                box-shadow:0 2px 8px rgba(0,0,0,0.35);
                display:flex;align-items:center;justify-content:center;
                font-size:13px;font-weight:700;font-family:ui-sans-serif,system-ui,sans-serif;
                line-height:1;cursor:pointer;
              `;
              el.textContent = String(count);
              return new google.maps.marker.AdvancedMarkerElement({
                position,
                content: el,
                zIndex: 1000 + count,
              });
            },
          },
        });
      } catch (err) {
        console.warn('[dispatch-map] clusterer init failed', err);
      }
    }
  };

  /**
   * Draw the breadcrumb trail + remaining route for a SINGLE job.
   * Renders up to three polylines per job:
   *   1. Completed breadcrumb (solid emerald) — the path the tech actually drove.
   *   2. Remaining route (dashed amber) — from latest breadcrumb point (or tech
   *      current position) to the job destination. Upgraded to road-following
   *      via POST /api/maps/routes.
   *   3. Historical completed routes (faint gray solid lines) — up to 5 past trips.
   */
  const drawRouteForJob = (jobId: string) => {
    const map = mapRef.current;
    if (!map) return;
    const google = (window as unknown as { google: typeof globalThis.google }).google;

    // Remove only this job's existing polylines (not all routes).
    const oldLines = routeLinesByJobRef.current.get(jobId);
    if (oldLines) {
      oldLines.forEach((l) => l.setMap(null));
    }

    const entry = routeHistoryCacheRef.current.get(jobId);
    const activePath = entry?.activePath ?? [];
    const completedPaths = entry?.completedPaths ?? [];
    const activeStartLat = entry?.activeStartLat ?? null;
    const activeStartLng = entry?.activeStartLng ?? null;

    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job || !isValidCoord(job.latitude, job.longitude)) {
      routeLinesByJobRef.current.delete(jobId);
      return;
    }
    const jobLat = job.latitude;
    const jobLng = job.longitude;

    console.log('[dispatch-map] drawRouteForJob', {
      jobId,
      hasEntry: !!entry,
      jobLat,
      jobLng,
    });

    // For the remaining-route start point: prefer the latest breadcrumb from
    // the server; if the route just started (no breadcrumbs yet), fall back
    // to the tech's current live marker position (post-glide).
    let startLat: number | null = null;
    let startLng: number | null = null;
    const lastBreadcrumb = activePath[activePath.length - 1];
    if (lastBreadcrumb) {
      startLat = lastBreadcrumb.lat;
      startLng = lastBreadcrumb.lng;
    } else {
      const tech = employeesRef.current.find(
        (t) => (job.assigneeId != null && t.id === job.assigneeId) || t.currentJobId === jobId,
      );
      const liveMarker = tech ? techMarkersRef.current.get(tech.id) : undefined;
      const liveCoords = extractLatLng(liveMarker?.position);
      if (liveCoords) {
        startLat = liveCoords.lat;
        startLng = liveCoords.lng;
      } else if (tech && isValidCoord(tech.latitude, tech.longitude)) {
        startLat = tech.latitude;
        startLng = tech.longitude as number;
      }
    }

    const newLines: google.maps.Polyline[] = [];

    // 0. Start-point marker — distinct pin showing where the tech began travelling.
    const oldStartMarker = routeStartMarkersRef.current.get(jobId);
    if (oldStartMarker) {
      oldStartMarker.map = null;
      routeStartMarkersRef.current.delete(jobId);
    }
    if (
      activeStartLat != null &&
      activeStartLng != null &&
      isValidCoord(activeStartLat, activeStartLng)
    ) {
      const startContent = document.createElement('div');
      startContent.style.cssText = `
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        background:#10b981;border:3px solid #fff;
        transform:rotate(-45deg);
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;
      `;
      const inner = document.createElement('span');
      inner.style.cssText =
        'transform:rotate(45deg);font-size:14px;color:#fff;font-weight:700;';
      inner.textContent = 'A';
      startContent.appendChild(inner);
      const startMarker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: activeStartLat, lng: activeStartLng },
        map,
        content: startContent,
        zIndex: 600,
      });
      startMarker.addListener('gmp-click', () => {
        const iw = infoWindowRef.current;
        if (!iw) return;
        iw.setContent(
          `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;">
            <strong style="color:#10b981;">Start point</strong><br/>
            <span style="color:#64748b;">Where the technician began travelling</span>
          </div>`,
        );
        iw.open({ anchor: startMarker, map });
      });
      routeStartMarkersRef.current.set(jobId, startMarker);
    }

    // 1. Completed breadcrumb (solid emerald).
    if (activePath.length >= 2) {
      const breadcrumb = new google.maps.Polyline({
        path: activePath.map((p) => ({ lat: p.lat, lng: p.lng })),
        map,
        strokeColor: ROUTE_BREADCRUMB_COLOR,
        strokeWeight: 4,
        strokeOpacity: 0.8,
        clickable: false,
      });
      newLines.push(breadcrumb);
    }

    // 2. Remaining route (dashed amber). Drawn as a straight 2-point line first,
    //    then asynchronously upgraded to a road-following polyline via
    //    /api/maps/routes (mirrors the old upgradeOsmrRoute pattern).
    if (startLat != null && startLng != null) {
      // strokePattern is supported at runtime (Google Maps v3.51+) but is
      // missing from @types/google.maps v3.66. Per the task spec ("use `as`
      // casts where the @types/google.maps package is loose"), we add the
      // pattern after construction via MVCObject.set(), which is the
      // documented escape hatch for runtime-only options.
      const remaining = new google.maps.Polyline({
        path: [
          { lat: startLat, lng: startLng },
          { lat: jobLat, lng: jobLng },
        ],
        map,
        strokeColor: ROUTE_REMAINING_COLOR,
        strokeWeight: 3,
        strokeOpacity: 0.7,
        clickable: false,
      });
      remaining.set('strokePattern', [
        { type: 'CIRCLE', length: 0 },
        { type: 'DASH', length: 10 },
        { type: 'DASH', length: 10 },
      ]);
      newLines.push(remaining);

      console.log('[dispatch-map] remaining route', {
        jobId,
        from: [startLat, startLng],
        to: [jobLat, jobLng],
      });

      // Skip if either coord is (0,0) — null island.
      const techAtNullIsland = startLat === 0 && startLng === 0;
      const destAtNullIsland = jobLat === 0 && jobLng === 0;
      if (!techAtNullIsland && !destAtNullIsland) {
        const cached = roadRouteCacheRef.current.get(jobId);
        if (cached) {
          // Reuse the cached road route if the tech hasn't moved far
          // (> OSRM_REFETCH_DISTANCE_M). Swap the polyline's path in place.
          const movedM = haversineMeters(startLat, startLng, cached.fromLat, cached.fromLng);
          if (movedM <= OSRM_REFETCH_DISTANCE_M) {
            remaining.setPath(cached.path);
          } else {
            upgradeRoadRoute(jobId, startLat, startLng, jobLat, jobLng);
          }
        } else {
          upgradeRoadRoute(jobId, startLat, startLng, jobLat, jobLng);
        }
      }
    }

    // 3. Historical completed routes (faint gray solid lines) — up to 5 past trips.
    completedPaths.forEach((path) => {
      if (path.length < 2) return;
      const historical = new google.maps.Polyline({
        path: path.map((p) => ({ lat: p.lat, lng: p.lng })),
        map,
        strokeColor: ROUTE_HISTORY_COLOR,
        strokeWeight: 2,
        strokeOpacity: 0.4,
        clickable: false,
      });
      newLines.push(historical);
    });

    routeLinesByJobRef.current.set(jobId, newLines);
  };

  /**
   * Asynchronously fetch a road-following polyline from POST /api/maps/routes
   * (the Phase C Google Routes proxy) and cache it per-job. When the fetch
   * resolves, triggers a redraw of that job's route so the straight
   * placeholder is swapped for the road-following line.
   *
   * Mirrors the old `upgradeOsmrRoute` exactly, but calls the new server-side
   * proxy instead of OSRM directly. The proxy returns a [lat,lng][] array —
   * we convert it to {lat,lng}[] for google.maps.Polyline.setPath.
   */
  const upgradeRoadRoute = (
    jobId: string,
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) => {
    if (roadFetchInFlightRef.current.has(jobId)) return;
    roadFetchInFlightRef.current.add(jobId);

    fetch(apiUrl('/api/maps/routes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { lat: fromLat, lng: fromLng },
        to: { lat: toLat, lng: toLng },
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{
          points: [number, number][];
          distanceMeters?: number;
          durationSeconds?: number;
          fallback?: boolean;
        }>;
      })
      .then((data) => {
        if (!Array.isArray(data.points) || data.points.length < 2) {
          // Keep the straight placeholder.
          return;
        }
        const path = data.points.map(([lat, lng]) => ({ lat, lng }));
        roadRouteCacheRef.current.set(jobId, {
          path,
          fromLat,
          fromLng,
        });
        console.log('[dispatch-map] road route', {
          jobId,
          points: path.length,
          fallback: !!data.fallback,
        });
      })
      .catch((err) => {
        // Swallow — the straight placeholder stays. The proxy already falls
        // back to a straight line on any error, so this catch is purely
        // defensive (e.g. network failure reaching our own API).
        console.warn('[dispatch-map] road route fetch failed', { jobId, err: String(err) });
      })
      .finally(() => {
        roadFetchInFlightRef.current.delete(jobId);
        // Trigger a redraw to swap the placeholder for the road-following
        // route. Guard against the job being removed during the fetch.
        if (jobsRef.current.some((j) => j.id === jobId)) {
          drawRouteForJob(jobId);
        }
      });
  };

  /**
   * Thin wrapper: redraw routes for every known job + clean up routes for
   * jobs that are no longer in jobsRef.
   */
  const drawRouteLines = () => {
    const currentJobIds = new Set(jobsRef.current.map((j) => j.id));
    routeLinesByJobRef.current.forEach((lines, jobId) => {
      if (!currentJobIds.has(jobId)) {
        lines.forEach((l) => l.setMap(null));
        routeLinesByJobRef.current.delete(jobId);
        routeHistoryCacheRef.current.delete(jobId);
        roadRouteCacheRef.current.delete(jobId);
        roadFetchInFlightRef.current.delete(jobId);
        const oldStartMarker = routeStartMarkersRef.current.get(jobId);
        if (oldStartMarker) {
          oldStartMarker.map = null;
          routeStartMarkersRef.current.delete(jobId);
        }
      }
    });
    jobsRef.current.forEach((job) => {
      if (!isValidCoord(job.latitude, job.longitude)) return;
      drawRouteForJob(job.id);
    });
  };

  /**
   * Fetch the breadcrumb trail for a job from
   * GET /api/jobs/[id]/route-history. Throttled per the route status
   * (15s for in_progress, 60s for completed).
   */
  const fetchRouteHistory = async (jobId: string, force: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const existing = routeHistoryCacheRef.current.get(jobId);
    if (!force && existing) {
      const age = Date.now() - existing.fetchedAt;
      const ttl =
        existing.status === 'in_progress' ? ROUTE_REFRESH_ACTIVE_MS : ROUTE_REFRESH_COMPLETED_MS;
      if (age < ttl) return;
    }
    try {
      const res = await fetch(apiUrl(`/api/jobs/${jobId}/route-history`));
      if (!res.ok) {
        console.log('[dispatch-map] route-history fetch failed', { jobId, status: res.status });
        return;
      }
      const data = await res.json();
      if (!jobsRef.current.some((j) => j.id === jobId)) return;
      const active = data?.active;
      const completed = Array.isArray(data?.completed) ? data.completed : [];
      console.log('[dispatch-map] route-history', {
        jobId,
        hasActive: !!active,
        activeStartLat: active?.startLat ?? null,
        activeStartLng: active?.startLng ?? null,
        breadcrumbPoints: Array.isArray(active?.path) ? active.path.length : 0,
      });
      const activePath: PathPoint[] = Array.isArray(active?.path) ? active.path : [];
      const completedPaths: PathPoint[][] = completed
        .map((r: { path?: PathPoint[] }) => (Array.isArray(r?.path) ? r.path : []))
        .filter((p: PathPoint[]) => p.length > 0);
      const status: RouteHistoryCacheEntry['status'] = active
        ? 'in_progress'
        : completedPaths.length > 0
          ? 'completed'
          : 'none';
      const activeStartLat =
        typeof active?.startLat === 'number' ? active.startLat : null;
      const activeStartLng =
        typeof active?.startLng === 'number' ? active.startLng : null;
      routeHistoryCacheRef.current.set(jobId, {
        activePath,
        completedPaths,
        activeStartLat,
        activeStartLng,
        fetchedAt: Date.now(),
        status,
      });
      drawRouteForJob(jobId);
    } catch {
      // Non-fatal — the map still works without breadcrumbs.
    }
  };

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    selectedTechIdRef.current = selectedTechnicianId;
    const sel = selectedTechnicianId;
    const map = mapRef.current;
    if (sel && map) {
      const tech = employeesRef.current.find((t) => t.id === sel);
      if (tech && isValidCoord(tech.latitude, tech.longitude)) {
        const techLat = tech.latitude;
        const techLng = tech.longitude as number;
        // Frame ALL assigned jobs (not just the first) so multi-job techs get
        // their full trip framed in a single fitBounds call.
        const assignedJobs = jobsRef.current.filter(
          (j) => j.assigneeId === tech.id || j.id === tech.currentJobId,
        );
        const validJobs = assignedJobs.filter((j) => isValidCoord(j.latitude, j.longitude));
        try {
          if (validJobs.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(techLat, techLng));
            validJobs.forEach((j) =>
              bounds.extend(new google.maps.LatLng(j.latitude, j.longitude)),
            );
            map.fitBounds(bounds, 80);
          } else {
            map.panTo(new google.maps.LatLng(techLat, techLng));
            map.setZoom(15);
          }
        } catch {
          // ignore
        }
        assignedJobs.forEach((j) => {
          fetchRouteHistory(j.id, false);
        });
      }
    }
    rerenderTechMarkers();
  }, [selectedTechnicianId]);

  useEffect(() => {
    onTechnicianSelectRef.current = onTechnicianSelect;
  }, [onTechnicianSelect]);

  // ─── Initialize the map once Google Maps JS API is loaded ─────────────
  useEffect(() => {
    let cancelled = false;

    if (!containerRef.current || mapRef.current) return;

    // Inject the CSS styles for the tech pulse animation. Idempotent — only
    // injected once per document, keyed by id.
    if (typeof document !== 'undefined' && !document.getElementById('fieseros-tech-marker-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'fieseros-tech-marker-style';
      styleEl.textContent = `
        @keyframes fieseros-tech-pulse {
          0%   { transform: scale(0.85); opacity: 0.45; }
          70%  { transform: scale(1.8);  opacity: 0;    }
          100% { transform: scale(1.8);  opacity: 0;    }
        }
        .gm-style-iw { font-family: inherit; }
        .gm-style-iw-ch { font-family: inherit; }
      `;
      document.head.appendChild(styleEl);
    }

    // Declare resizeTimer outside the try block so the cleanup closure can
    // safely reference it even if the try block fails before it's assigned.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    loadGoogleMapsApi()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const g = (window as unknown as { google: typeof globalThis.google }).google;
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
        const center = computeCenter(employeesRef.current);

        try {
          const map = new g.maps.Map(containerRef.current, {
            center,
            zoom: DEFAULT_ZOOM,
            mapId: mapId || 'DEMO_MAP_ID',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });

          mapRef.current = map;
          infoWindowRef.current = new g.maps.InfoWindow();

          // Click on the empty map → deselect the active tech (parity with Leaflet).
          map.addListener('click', () => {
            if (selectedTechIdRef.current && onTechnicianSelectRef.current) {
              onTechnicianSelectRef.current(null);
            }
          });

          // Trigger a resize after layout settles (Google's container must
          // have its final dimensions before tiles load correctly).
          resizeTimer = setTimeout(() => {
            if (mapRef.current) {
              google.maps.event.trigger(mapRef.current, 'resize');
            }
          }, 100);

          rerenderTechMarkers();
          rerenderJobMarkers();
          drawRouteLines();
          setIsReady(true);
        } catch (mapInitErr) {
          const msg = mapInitErr instanceof Error ? mapInitErr.message : String(mapInitErr);
          console.error('[dispatch-map] Map constructor failed:', msg);
          setLoadError(msg);
        }

        // Cleanup closure (registered with React's effect cleanup below).
        // We capture the timer ID so the unmount path can clear it.
        (cleanupRef as { current: () => void }).current = () => {
          if (resizeTimer !== null) clearTimeout(resizeTimer);
          // Cancel any in-flight animations.
          animStateRef.current.forEach((s) => {
            if (s.rafId !== null) cancelAnimationFrame(s.rafId);
          });
          animStateRef.current.clear();
          // Remove all markers.
          techMarkersRef.current.forEach((m) => (m.map = null));
          techMarkersRef.current.clear();
          jobMarkersRef.current.forEach((m) => (m.map = null));
          jobMarkersRef.current.clear();
          if (clustererRef.current) {
            clustererRef.current.clearMarkers();
            clustererRef.current.setMap(null);
            clustererRef.current = null;
          }
          // Accuracy circles.
          accuracyCirclesRef.current.forEach((c) => c.setMap(null));
          accuracyCirclesRef.current.clear();
          // Route polylines + start markers.
          routeLinesByJobRef.current.forEach((lines) => lines.forEach((l) => l.setMap(null)));
          routeLinesByJobRef.current.clear();
          routeStartMarkersRef.current.forEach((m) => (m.map = null));
          routeStartMarkersRef.current.clear();
          routeHistoryCacheRef.current.clear();
          roadRouteCacheRef.current.clear();
          roadFetchInFlightRef.current.clear();
          markerSigRef.current.clear();
          // Close + null the InfoWindow + map.
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
            infoWindowRef.current = null;
          }
          mapRef.current = null;
        };
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[dispatch-map] Failed to load Google Maps API:', msg);
        setLoadError(msg);
      });

    // Mutable cleanup holder — populated by the loader .then() callback once
    // the map is created. The effect-cleanup below invokes it if set.
    const cleanupRef: { current: () => void } = { current: () => {} };

    return () => {
      cancelled = true;
      cleanupRef.current();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    rerenderTechMarkers();
    drawRouteLines();
  }, [employees, isReady]);

  useEffect(() => {
    if (!isReady) return;
    rerenderJobMarkers();
    drawRouteLines();
    // ── Live Dispatch fix (Layer 2): fetch breadcrumb trails for ALL
    // assigned jobs on initial render / when jobs list changes.
    jobs.forEach((j) => {
      if (j.assigneeId) {
        fetchRouteHistory(j.id, false);
      }
    });
  }, [jobs, isReady]);

  // ─── Live route-history polling + Uber-style auto-frame ─────────────────
  //
  // Two responsibilities (mirrors the Leaflet version exactly):
  //   1. BREADCRUMB GROWTH: Re-fetch route history for every job with status
  //      'travelling' every 5s (force=true bypasses the 15s throttle).
  //   2. AUTO-FRAME (Uber-style zoom): When a travelling job is detected,
  //      frame the map to show the tech's current position + the job
  //      destination using RAW COORDINATES ONLY (no route history dependency).
  //      Fires once per job (tracked in autoFramedJobIdsRef) so it doesn't
  //      fight the user's manual pan/zoom.
  useEffect(() => {
    if (!isReady) return;
    const pollTravellingRoutes = () => {
      const map = mapRef.current;
      if (!map) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      const travellingJobs = jobsRef.current.filter(
        (j) => j.status === 'travelling' && j.assigneeId,
      );

      for (const job of travellingJobs) {
        // 1. Force-refresh route history so the breadcrumb grows live.
        fetchRouteHistory(job.id, true);

        // 2. Auto-frame using RAW coordinates.
        if (autoFramedJobIdsRef.current.has(job.id)) continue;

        const tech = employeesRef.current.find(
          (t) => t.id === job.assigneeId || t.currentJobId === job.id,
        );
        const liveMarker = tech ? techMarkersRef.current.get(tech.id) : undefined;
        let techLat: number | null = null;
        let techLng: number | null = null;
        const liveCoords = extractLatLng(liveMarker?.position);
        if (liveCoords) {
          techLat = liveCoords.lat;
          techLng = liveCoords.lng;
        } else if (tech && isValidCoord(tech.latitude, tech.longitude)) {
          techLat = tech.latitude;
          techLng = tech.longitude as number;
        }

        const jobHasCoords = isValidCoord(job.latitude, job.longitude);

        console.log('[dispatch-zoom] job=' + job.id.slice(-8) + ' title="' + job.title + '"', {
          techLat, techLng, jobLat: job.latitude, jobLng: job.longitude,
          techHasCoords: techLat != null && techLng != null,
          jobHasCoords,
        });

        if (techLat != null && techLng != null && jobHasCoords) {
          try {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(techLat, techLng));
            bounds.extend(new google.maps.LatLng(job.latitude, job.longitude));
            map.fitBounds(bounds, 80);
            autoFramedJobIdsRef.current.add(job.id);
            console.log('[dispatch-zoom] ✅ fitBounds tech+job');
          } catch {
            // ignore bounds errors (e.g. identical points)
          }
        } else if (techLat != null && techLng != null) {
          try {
            map.panTo(new google.maps.LatLng(techLat, techLng));
            map.setZoom(15);
            autoFramedJobIdsRef.current.add(job.id);
            console.log('[dispatch-zoom] ✅ panTo tech only (job has no coords)');
          } catch {
            // ignore
          }
        } else if (jobHasCoords) {
          try {
            map.panTo(new google.maps.LatLng(job.latitude, job.longitude));
            map.setZoom(15);
            autoFramedJobIdsRef.current.add(job.id);
            console.log('[dispatch-zoom] ✅ panTo job only (tech has no GPS)');
          } catch {
            // ignore
          }
        }
      }

      // Clean up the auto-frame set for jobs that are no longer travelling.
      const travellingIds = new Set(travellingJobs.map((j) => j.id));
      for (const id of Array.from(autoFramedJobIdsRef.current)) {
        if (!travellingIds.has(id)) {
          autoFramedJobIdsRef.current.delete(id);
        }
      }
    };

    pollTravellingRoutes();
    const interval = setInterval(pollTravellingRoutes, 5000);
    return () => clearInterval(interval);
  }, [jobs, isReady]);

  // ─── Imperative controller ─────────────────────────────────────────────
  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      handleGpsPing: (ping) => {
        const map = mapRef.current;
        if (!map) return;
        const g = (window as unknown as { google: typeof globalThis.google }).google;
        const { employeeId, latitude, longitude } = ping;
        if (!isValidCoord(latitude, longitude)) return;

        const telemetry: TechTelemetry = {
          latitude,
          longitude,
          accuracy: ping.accuracy ?? null,
          heading: ping.heading ?? null,
          speed: ping.speed ?? null,
          batteryLevel: ping.batteryLevel ?? null,
          capturedAt: ping.capturedAt ?? new Date().toISOString(),
        };

        let marker = techMarkersRef.current.get(employeeId);
        let tech: MapTechnician;
        if (!marker) {
          // Technician not yet on the map — create a marker for them.
          tech = {
            id: employeeId,
            name: `Tech ${employeeId.slice(-4)}`,
            latitude,
            longitude,
            status: 'online',
            lastSeenAt: telemetry.capturedAt,
          };
          const color = getMarkerColor(tech);
          marker = new g.maps.marker.AdvancedMarkerElement({
            position: { lat: latitude, lng: longitude },
            map,
            content: createTechMarkerElement(
              tech,
              color,
              selectedTechIdRef.current === employeeId,
              telemetry,
              computeEtaMinutes(latitude, longitude, jobsRef.current, tech.currentJobId),
            ),
            zIndex: 500,
          });
          marker.addListener('gmp-click', () => {
            const newSel = selectedTechIdRef.current === employeeId ? null : employeeId;
            onTechnicianSelectRef.current?.(newSel);
          });
          techMarkersRef.current.set(employeeId, marker);
          animStateRef.current.set(employeeId, {
            fromLat: latitude,
            fromLng: longitude,
            toLat: latitude,
            toLng: longitude,
            startAt: 0,
            duration: ANIM_MIN_MS,
            rafId: null,
            lastPingAt: null,
            prevInterval: null,
            telemetry,
          });
        } else {
          // Existing marker — glide to the new position + refresh icon.
          tech =
            employeesRef.current.find((t) => t.id === employeeId) ?? {
              id: employeeId,
              name: `Tech ${employeeId.slice(-4)}`,
              latitude,
              longitude,
              status: 'online',
              lastSeenAt: telemetry.capturedAt,
            };
          startGlide(employeeId, latitude, longitude, telemetry);
          const color = getMarkerColor(tech);
          updateTechMarkerContent(tech, color, selectedTechIdRef.current === employeeId, telemetry);
        }

        // Accuracy halo — a translucent circle of radius `accuracy` (m).
        if (
          typeof telemetry.accuracy === 'number' &&
          telemetry.accuracy > ACCURACY_CIRCLE_MIN_RADIUS_M &&
          telemetry.accuracy < ACCURACY_CIRCLE_MAX_RADIUS_M
        ) {
          let circle = accuracyCirclesRef.current.get(employeeId);
          if (!circle) {
            circle = new g.maps.Circle({
              center: { lat: latitude, lng: longitude },
              radius: telemetry.accuracy,
              map,
              strokeColor: '#3b82f6',
              strokeOpacity: 0.3,
              strokeWeight: 1,
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
              clickable: false,
            });
            accuracyCirclesRef.current.set(employeeId, circle);
          } else {
            circle.setCenter({ lat: latitude, lng: longitude });
            circle.setRadius(telemetry.accuracy);
          }
        }

        // If the dispatcher is following this tech, pan to keep them in view.
        // NOTE: panTo with the RAW ping position (not the interpolated marker
        // position) keeps the followed tech from drifting to the screen edge
        // between rAF ticks.
        if (selectedTechIdRef.current === employeeId) {
          try {
            map.panTo(new g.maps.LatLng(latitude, longitude));
          } catch {
            // ignore
          }
        }

        // Update only the affected tech's route (not all routes — wasteful).
        const currentJobId = tech.currentJobId;
        if (currentJobId) {
          fetchRouteHistory(currentJobId, false);
          drawRouteForJob(currentJobId);
        }
      },
      recenter: () => {
        const map = mapRef.current;
        if (!map) return;
        const techsWithCoords = employeesRef.current.filter((t) =>
          isValidCoord(t.latitude, t.longitude),
        );
        const jobsWithCoords = jobsRef.current.filter((j) => isValidCoord(j.latitude, j.longitude));
        if (techsWithCoords.length === 0 && jobsWithCoords.length === 0) {
          map.setCenter(DEFAULT_CENTER);
          map.setZoom(DEFAULT_ZOOM);
          return;
        }
        if (techsWithCoords.length + jobsWithCoords.length === 1) {
          const p =
            techsWithCoords.length === 1
              ? { lat: techsWithCoords[0].latitude as number, lng: techsWithCoords[0].longitude as number }
              : { lat: jobsWithCoords[0].latitude, lng: jobsWithCoords[0].longitude };
          map.setCenter(p);
          map.setZoom(DEFAULT_ZOOM);
          return;
        }
        try {
          const bounds = new google.maps.LatLngBounds();
          techsWithCoords.forEach((t) =>
            bounds.extend(new google.maps.LatLng(t.latitude as number, t.longitude as number)),
          );
          jobsWithCoords.forEach((j) =>
            bounds.extend(new google.maps.LatLng(j.latitude, j.longitude)),
          );
          map.fitBounds(bounds, 60);
        } catch {
          // ignore
        }
      },
      recenterOnTech: (employeeId: string) => {
        const map = mapRef.current;
        if (!map) return;

        // Prefer the live marker's current displayed position (which may be
        // mid-glide) over the DB-stored position.
        const liveMarker = techMarkersRef.current.get(employeeId);
        let techLat: number | null = null;
        let techLng: number | null = null;
        const liveCoords = extractLatLng(liveMarker?.position);
        if (liveCoords) {
          techLat = liveCoords.lat;
          techLng = liveCoords.lng;
        } else {
          const tech = employeesRef.current.find((t) => t.id === employeeId);
          if (tech && isValidCoord(tech.latitude, tech.longitude)) {
            techLat = tech.latitude;
            techLng = tech.longitude as number;
          }
        }
        if (techLat == null || techLng == null) return;

        const tech = employeesRef.current.find((t) => t.id === employeeId);
        const assignedJobs = jobsRef.current.filter(
          (j) =>
            (j.assigneeId === employeeId || j.id === tech?.currentJobId) &&
            isValidCoord(j.latitude, j.longitude),
        );

        try {
          if (assignedJobs.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(techLat, techLng));
            assignedJobs.forEach((j) =>
              bounds.extend(new google.maps.LatLng(j.latitude, j.longitude)),
            );
            map.fitBounds(bounds, 80);
          } else {
            map.panTo(new google.maps.LatLng(techLat, techLng));
            map.setZoom(15);
          }
        } catch {
          // ignore bounds errors (e.g. identical points)
        }
      },
      refreshMarkers: () => {
        rerenderTechMarkers();
      },
    };
    return () => {
      if (controllerRef) controllerRef.current = null;
    };
  }, [isReady]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const apiKeyMissing = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className={`relative h-full w-full ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="h-full w-full rounded-md"
        role="application"
        aria-label="Live dispatch map"
      />

      {/* Loading spinner until the Google Maps JS API + initial render completes */}
      {!isReady && !loadError && !apiKeyMissing && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-md bg-background/95 px-4 py-3 shadow-md">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-[11px] font-medium text-muted-foreground">Loading map…</span>
          </div>
        </div>
      )}

      {/* Hard error: API key missing or script failed to load.
          P0 fix: user-friendly error (not developer error) + Try again button.
          The dispatch system remains operational even when the map is unavailable. */}
      {(loadError || apiKeyMissing) && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50/95 px-6 py-5 text-center shadow-md dark:border-amber-900 dark:bg-amber-950/80">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Map unavailable
            </p>
            <p className="mt-1.5 text-xs text-amber-700/80 dark:text-amber-300/80">
              We couldn&rsquo;t connect to the live map. Your dispatch data is still available —
              use the team list and job queue on the left.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try again
            </button>
          </div>
        </div>
      )}

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

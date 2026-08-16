'use client';

/**
 * LiveTechnicianMap — Phase 2 "Uber-style" real-time tracking.
 * -------------------------------------------------------------
 * Pure Leaflet (no react-leaflet) for React 19 compatibility.
 * SSR-safe: dynamically imported with `next/dynamic` + `ssr:false`.
 *
 * Tracking principles (per the approved plan):
 *   • Smooth gliding — each `gps.ping` is interpolated to the new position
 *     via requestAnimationFrame. The interpolation window is driven by the
 *     Δtime between the previous and the incoming ping timestamps (NOT a
 *     hardcoded 1000ms), clamped to [600ms, 2500ms] to avoid jank on stale
 *     or erratic pings.
 *   • Stale ping — if the capturedAt timestamp is older than STALE_MS
 *     (60s) OR more than STALE_GAP_FACTOR× the previous interval, the
 *     marker SNAPS instead of gliding (we don't pretend the tech is moving
 *     normally when we haven't heard from them).
 *   • Huge GPS jump — if the new position is > JUMP_KM from the previous,
 *     treat it as a GPS correction: snap immediately, don't glide.
 *   • Stationary — if the tech has moved < STATIONARY_M, don't rotate the
 *     heading arrow (noisy heading at low speed produces spin).
 *   • Heading arrow — the marker icon rotates by `heading` degrees so it
 *     points in the direction of travel (like Uber's car icon).
 *
 * Marker badges (compact by default; full metrics on hover/select):
 *   • Speed (km/h)        — from gps.ping.speed (m/s → km/h)
 *   • Battery %           — from gps.ping.batteryLevel (0..1)
 *   • GPS freshness       — "live · 8s" / "stale · 9m"
 *   • Accuracy halo       — a translucent circle of radius `accuracy` (m)
 *
 * Other features preserved from the previous version:
 *   • Job location pins (color by priority) with popups + clustering.
 *   • Dashed route lines from tech → assigned job (animated dashes).
 *   • Follow-technician mode (click a tech to follow).
 *   • Streets / satellite basemap toggle.
 *
 * Data sources:
 *   • employees (with lat/lng/lastSeenAt/team) → tech markers
 *   • jobs (geocoded) → job pins
 *   • gps.ping realtime events → in-place marker updates (no refetch)
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchOsmrRoute } from '@/lib/osrm-route';

// Fix default Leaflet asset URLs to prevent broken image cross icons [x]
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

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

/** Imperative API exposed to the parent via `controllerRef`. */
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
  /** Toggle between streets and satellite basemap. */
  setLayer: (layer: 'streets' | 'satellite') => void;
  /** Force a refresh of all marker icons (used when selection changes). */
  refreshMarkers: () => void;
}

interface LiveTechnicianMapProps {
  employees: MapTechnician[];
  jobs?: MapJob[];
  selectedTechnicianId?: string | null;
  onTechnicianSelect?: (techId: string | null) => void;
  controllerRef?: React.MutableRefObject<LiveTechnicianMapController | null>;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [22.5937, 78.9629];
const DEFAULT_ZOOM = 12;
const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000;
const CLUSTER_THRESHOLD_PX = 50;
const CLUSTER_PIN_MIN_COUNT = 20;

// ── Phase 2 interpolation constants ──
const ANIM_MIN_MS = 600; // floor for the glide window
const ANIM_MAX_MS = 2500; // ceiling for the glide window
const STALE_MS = 60_000; // ping older than this → snap, don't glide
const STALE_GAP_FACTOR = 3; // interval > 3× previous → treat as stale
const JUMP_KM = 2.5; // > this distance from prev → GPS correction, snap
const STATIONARY_M = 8; // < this movement → don't rotate heading (noisy)
const FRESH_LIVE_MS = 30_000; // "live" badge while < 30s old
const LOW_BATTERY_PCT = 0.15; // battery below this → red badge

const COLOR_AVAILABLE = '#10b981';
const COLOR_BUSY = '#f59e0b';
const COLOR_LEAVE = '#94a3b8';
const COLOR_OFFLINE = '#ef4444';
const COLOR_DEFAULT = '#3b82f6';

const COLOR_JOB_URGENT = '#ef4444';
const COLOR_JOB_HIGH = '#f59e0b';
const COLOR_JOB_MEDIUM = '#3b82f6';
const COLOR_JOB_LOW = '#94a3b8';

// Phase 3.2: ROUTE_LINE_COLOR was indigo (#6366f1) — changed to emerald per the
// project's "no indigo/blue" rule. The new breadcrumb renderer uses the dedicated
// constants below; ROUTE_LINE_COLOR is retained for backwards compatibility.
const ROUTE_LINE_COLOR = '#10b981';
const ROUTE_BREADCRUMB_COLOR = '#10b981'; // emerald — completed path actually driven
const ROUTE_REMAINING_COLOR = '#f59e0b';  // amber — remaining route to destination (animated dashes)
const ROUTE_HISTORY_COLOR = '#94a3b8';    // slate-gray — historical completed routes (faint)
const ROUTE_REFRESH_ACTIVE_MS = 15_000;   // 15s throttle for in_progress routes
const ROUTE_REFRESH_COMPLETED_MS = 60_000; // 60s throttle for completed routes
// Phase LIVE-OSRM: refetch the road-following route when the tech has moved
// more than this many meters from the position the cached route started at.
// 100m is a good balance — small enough to keep the route fresh as the tech
// drives, large enough to avoid hammering the public OSRM server on every
// noisy GPS ping (which can jitter ±10-20m even when stationary).
const OSRM_REFETCH_DISTANCE_M = 100;

// CartoDB Voyager tiles render labels in English globally (the default
// OSM tiles render labels in the local language of each region, which for
// India shows Hindi/Devanagari — confusing for English-speaking dispatchers).
const TILE_URL_STREETS =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_URL_SATELLITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION_STREETS =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TILE_ATTRIBUTION_SATELLITE =
  'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics';

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
  if (status === 'busy' || status === 'on_job' || status === 'in_progress' || status === 'en_route' || status === 'traveling') {
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

/** Haversine distance in meters between two lat/lng points. */
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Build the popup HTML for a technician (with live telemetry if available). */
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

  // Live telemetry block (speed / battery / freshness)
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
    const batteryColor = batteryPct !== null && batteryPct <= LOW_BATTERY_PCT * 100 ? '#ef4444' : '#10b981';
    const rows: string[] = [];
    if (speedKmh !== null) {
      rows.push(`<span style="color:#94a3b8;">Speed</span><span style="font-weight:600;color:#0f172a;">${speedKmh} km/h</span>`);
    }
    if (batteryPct !== null) {
      rows.push(`<span style="color:#94a3b8;">Battery</span><span style="font-weight:600;color:${batteryColor};">${batteryPct}%</span>`);
    }
    rows.push(`<span style="color:#94a3b8;">GPS</span><span style="font-weight:600;color:#0f172a;">${freshnessLabel(telemetry.capturedAt)}</span>`);
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

/**
 * Build a Leaflet divIcon for a technician: a circular badge with the
 * technician's initial, an optional heading arrow (rotated by bearing), and
 * a small speed badge beneath. The heading arrow only renders when the tech
 * is moving (non-stationary) and a heading is available.
 */
function buildTechDivIcon(
  tech: MapTechnician,
  color: string,
  isFollowed: boolean,
  telemetry?: TechTelemetry | null,
  etaMinutes?: number | null,
): L.DivIcon {
  const initial = (tech.name || '?').trim().charAt(0).toUpperCase() || '?';
  const isOfflineMarker = color === COLOR_OFFLINE;
  const ringStyle = isFollowed
    ? `box-shadow:0 0 0 3px ${color}, 0 0 0 6px #ffffff, 0 1px 6px rgba(0,0,0,0.4);`
    : `box-shadow:0 1px 4px rgba(0,0,0,0.35);`;

  // Heading arrow — only when we have telemetry + a real heading + movement.
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
    (speedKmh === null || speedKmh > 2); // don't show arrow when essentially stationary

  // If we have telemetry distance to the previous point but it's tiny, treat
  // as stationary (caller already avoids feeding tiny moves, but double-guard).
  const arrowHtml = hasHeading
    ? `<span style="
        position:absolute;top:-12px;left:50%;transform:translateX(-50%) rotate(${telemetry!.heading}deg);
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-bottom:8px solid ${color};filter:drop-shadow(0 1px 1px rgba(0,0,0,0.3));
      "></span>`
    : '';

  // Speed badge beneath the marker (only when actually moving).
  const speedBadgeHtml =
    hasHeading && speedKmh !== null && speedKmh > 2
      ? `<span style="
          position:absolute;bottom:-13px;left:50%;transform:translateX(-50%);
          background:#0f172a;color:#fff;font-size:8px;font-weight:700;
          padding:1px 4px;border-radius:4px;white-space:nowrap;line-height:1.1;
          font-family:ui-sans-serif,system-ui,sans-serif;
        ">${Math.round(speedKmh)}</span>`
      : '';

  // B3 fix (2025-08-15): Battery badge to the right of the marker.
  // Shows battery % with color: green > 50%, amber 20-50%, red < 20%.
  // Only shown when batteryLevel telemetry is available.
  const batteryPct =
    telemetry && typeof telemetry.batteryLevel === 'number' && telemetry.batteryLevel >= 0 && telemetry.batteryLevel <= 1
      ? Math.round(telemetry.batteryLevel * 100)
      : null;
  const batteryColor =
    batteryPct === null ? '#64748b'
      : batteryPct > 50 ? '#16a34a'
      : batteryPct >= 20 ? '#f59e0b'
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

  // B3 fix (2025-08-15): ETA badge to the left of the marker.
  // Shows estimated minutes to arrival. Only shown when the tech has an
  // active job with a destination and ETA is finite.
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

  // Vehicle Van SVG icon for the map marker
  const vehicleSvg = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.23-4.11a1 1 0 0 0-.78-.37H14"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
    </svg>`;

  const html = `
    <div style="position:relative;width:32px;height:32px;">
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
        border:2px.5px solid #ffffff;
        ${ringStyle}
      " title="${escapeHtml(tech.name)}">
        ${vehicleSvg}
      </span>
      ${speedBadgeHtml}
      ${batteryBadgeHtml}
      ${etaBadgeHtml}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'fieseros-tech-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function buildJobDivIcon(job: MapJob, color: string): L.DivIcon {
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

// B3 fix (2025-08-15): Compute ETA in minutes from a tech's current position
// to their assigned job destination. Returns null if the tech has no active
// job or the job has no coordinates. Uses haversine distance + an assumed
// average speed of 35 km/h (matching dispatch-view.tsx's ASSUMED_SPEED_KMH).
const ASSUMED_SPEED_KMH = 35;
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
  const eta = Math.max(1, Math.round((distKm / ASSUMED_SPEED_KMH) * 60));
  return eta;
}

// ─── Route history cache types (Phase 3.2 breadcrumb trail) ───────────────
// Keyed by jobId so multiple techs with different jobs don't collide.
// Refreshed every ROUTE_REFRESH_ACTIVE_MS for active routes, ROUTE_REFRESH_COMPLETED_MS
// for completed ones.
interface PathPoint {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracy?: number | null;
}
interface RouteCacheEntry {
  activePath: PathPoint[];       // breadcrumb from the in_progress RouteHistory
  completedPaths: PathPoint[][]; // breadcrumbs from completed routes (max 5)
  // Start coordinates of the active (in_progress) route — from RouteHistory.startLat/startLng.
  // Used to draw a distinct "start" marker so dispatchers can see where the tech began.
  activeStartLat: number | null;
  activeStartLng: number | null;
  fetchedAt: number;
  status: 'in_progress' | 'completed' | 'none';
}

// Phase LIVE-OSRM: Per-job cache of the last OSRM road-following route.
// Keyed by jobId (in `osrmRouteCacheRef`) so multiple jobs don't collide.
// The `fromLat`/`fromLng` fields record where the tech was when the route was
// fetched — used to decide whether the tech has moved far enough
// (> OSRM_REFETCH_DISTANCE_M) to justify a refetch.
interface OsmrRouteCacheEntry {
  coords: [number, number][]; // road-following polyline (Leaflet [lat, lng] format)
  fromLat: number;            // tech latitude when the route was fetched
  fromLng: number;            // tech longitude when the route was fetched
}

// ─── Per-marker animation state ───────────────────────────────────────────
// Stored on a single ref Map keyed by employeeId. Each entry tracks the
// marker's "displayed" (interpolated) position, the last ping, the previous
// interval, and the active rAF handle so we can cancel superseded glides.

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
  const techMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const jobMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  // Phase 3.2: Per-job route polyline cache (replaces the flat routeLinesRef array
  // so we can update only the affected tech's route on each GPS ping, not all routes).
  const routeLinesByJobRef = useRef<Map<string, L.Polyline[]>>(new Map());
  // Route history cache: jobId → breadcrumb trail fetched from /api/jobs/[id]/route-history.
  const routeCacheRef = useRef<Map<string, RouteCacheEntry>>(new Map());
  // Phase LIVE-OSRM: OSRM road-following route cache, keyed by jobId. Lets us
  // swap the straight "as the crow flies" placeholder for real road directions
  // without refetching on every redraw. Cleared on unmount + when a job is
  // removed from jobsRef (see drawRouteLines cleanup).
  const osrmRouteCacheRef = useRef<Map<string, OsmrRouteCacheEntry>>(new Map());
  // Tracks which jobs currently have an OSRM fetch in flight. Prevents duplicate
  // concurrent requests for the same job — important because drawRouteForJob
  // can fire many times per second during a marker glide.
  const osrmFetchInFlightRef = useRef<Set<string>>(new Set());
  const accuracyCirclesRef = useRef<Map<string, L.Circle>>(new Map());
  // Start-point markers for active routes, keyed by jobId. Cleared on redraw.
  const routeStartMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const animStateRef = useRef<Map<string, AnimState>>(new Map());
  const tileLayersRef = useRef<{ streets: L.TileLayer | null; satellite: L.TileLayer | null }>({
    streets: null,
    satellite: null,
  });

  const employeesRef = useRef(employees);
  const jobsRef = useRef(jobs);
  const selectedTechIdRef = useRef<string | null>(selectedTechnicianId);
  const onTechnicianSelectRef = useRef(onTechnicianSelect);
  // Tracks jobIds for which we have already auto-framed the map (Uber-style
  // zoom to start → tech → destination) once. Prevents re-framing on every
  // 5s poll, which would fight the user's manual pan/zoom. A job is framed
  // once when it first appears with status 'travelling' + a valid route, and
  // again if it transitions back to travelling after being completed/cancelled
  // (entry removed on lifecycle change).
  const autoFramedJobIdsRef = useRef<Set<string>>(new Set());

  // ── Easing (ease-out-cubic) for natural deceleration ──
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  /**
   * Start a smooth glide from the marker's current displayed position to the
   * new target, using requestAnimationFrame. Handles the stale / jump /
   * stationary rules from the approved plan.
   */
  const startGlide = (employeeId: string, targetLat: number, targetLng: number, ping: TechTelemetry) => {
    const map = mapRef.current;
    if (!map) return;
    const marker = techMarkersRef.current.get(employeeId);
    if (!marker) return;

    const state = animStateRef.current.get(employeeId);
    const now = Date.now();
    const pingTime = new Date(ping.capturedAt).getTime();

    // Current displayed position (start of the glide).
    const cur = marker.getLatLng();
    const fromLat = cur.lat;
    const fromLng = cur.lng;

    const distM = haversineMeters(fromLat, fromLng, targetLat, targetLng);

    // Rule: huge GPS jump → snap, don't glide.
    if (distM > JUMP_KM * 1000) {
      marker.setLatLng([targetLat, targetLng]);
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
      marker.setLatLng([targetLat, targetLng]);
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
      const isStale = ageMs > STALE_MS || (state.prevInterval !== null && interval > state.prevInterval * STALE_GAP_FACTOR);
      if (isStale) {
        marker.setLatLng([targetLat, targetLng]);
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
      if (m) m.setLatLng([lat, lng]);
      if (progress < 1) {
        s.rafId = requestAnimationFrame(tick);
      } else {
        s.rafId = null;
        // Record the interval for the next ping's staleness check.
        if (s.lastPingAt !== null) {
          s.prevInterval = Math.max(0, pingTime - s.lastPingAt);
        }
        s.lastPingAt = pingTime;
      }
    };
    st.rafId = requestAnimationFrame(tick);
  };

  // ── Render functions (read from refs so effect deps stay stable) ──

  const updateTechMarkerIcon = (tech: MapTechnician, color: string, isFollowed: boolean, telemetry?: TechTelemetry | null) => {
    const marker = techMarkersRef.current.get(tech.id);
    if (!marker) return;
    // B3: compute ETA from current displayed position + assigned job.
    const dispLat = telemetry?.latitude ?? tech.latitude;
    const dispLng = telemetry?.longitude ?? tech.longitude;
    // isValidCoord narrows dispLat to number, but not dispLng (type predicates
    // can only narrow one param). Cast longitude since we just verified both.
    const eta = isValidCoord(dispLat, dispLng)
      ? computeEtaMinutes(dispLat, dispLng as number, jobsRef.current, tech.currentJobId)
      : null;
    marker.setIcon(buildTechDivIcon(tech, color, isFollowed, telemetry, eta));
    marker.setPopupContent(buildTechPopupHtml(tech, color, telemetry));
    marker.setZIndexOffset(color === COLOR_AVAILABLE || isFollowed ? 500 : 0);
  };

  const rerenderTechMarkers = () => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(employeesRef.current.map((t) => t.id));
    techMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        techMarkersRef.current.delete(id);
        const circle = accuracyCirclesRef.current.get(id);
        if (circle) {
          circle.remove();
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
      const icon = buildTechDivIcon(
        tech,
        color,
        isFollowed,
        existingState?.telemetry ?? null,
        // B3: compute ETA from tech's current position + assigned job.
        isValidCoord(tech.latitude, tech.longitude)
          ? computeEtaMinutes(tech.latitude as number, tech.longitude as number, jobsRef.current, tech.currentJobId)
          : null,
      );
      const existing = techMarkersRef.current.get(tech.id);
      if (existing) {
        existing.setLatLng([tech.latitude as number, tech.longitude as number]);
        existing.setIcon(icon);
        existing.setPopupContent(buildTechPopupHtml(tech, color, existingState?.telemetry ?? null));
        existing.setZIndexOffset(color === COLOR_AVAILABLE || isFollowed ? 500 : 0);
      } else {
        const marker = L.marker([tech.latitude as number, tech.longitude as number], {
          icon,
          zIndexOffset: color === COLOR_AVAILABLE || isFollowed ? 500 : 0,
        });
        marker.bindPopup(buildTechPopupHtml(tech, color, existingState?.telemetry ?? null), {
          closeButton: true,
          autoPan: true,
          maxWidth: 280,
        });
        marker.on('click', () => {
          const newSel = selectedTechIdRef.current === tech.id ? null : tech.id;
          onTechnicianSelectRef.current?.(newSel);
        });
        marker.addTo(map);
        techMarkersRef.current.set(tech.id, marker);
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

    if (techMarkersRef.current.size > 0 && routeLinesByJobRef.current.size === 0) {
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

    jobMarkersRef.current.forEach((m) => m.remove());
    jobMarkersRef.current.clear();

    const jobsWithCoords = jobsRef.current.filter((j) => isValidCoord(j.latitude, j.longitude));
    if (jobsWithCoords.length === 0) return;

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
          const lat = group.reduce((a, j) => a + j.latitude, 0) / group.length;
          const lng = group.reduce((a, j) => a + j.longitude, 0) / group.length;
          clusters.push({ lat, lng, jobs: group });
        } else {
          assigned.delete(job.id);
        }
      });
    }

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
        map.setView([cluster.lat, cluster.lng], Math.min(zoom + 2, 17), { animate: true });
      });
      marker.addTo(map);
      jobMarkersRef.current.set(clusterId, marker);
    });
  };

  /**
   * Phase 3.2: Draw the breadcrumb trail + remaining route for a SINGLE job.
   * Replaces the old drawRouteLines() which rebuilt ALL routes on every GPS ping.
   *
   * Renders up to three polylines per job:
   *   1. Completed breadcrumb (solid emerald) — the path the tech has actually driven.
   *   2. Remaining route (animated dashed amber) — from the latest breadcrumb point
   *      (or the tech's current marker position if no breadcrumbs yet) to the job.
   *   3. Historical completed routes (faint gray solid lines) — up to 5 past trips.
   */
  const drawRouteForJob = (jobId: string) => {
    const map = mapRef.current;
    if (!map) return;

    // Remove only this job's existing polylines (not all routes).
    const oldLines = routeLinesByJobRef.current.get(jobId);
    if (oldLines) {
      oldLines.forEach((l) => l.remove());
    }

    const entry = routeCacheRef.current.get(jobId);
    // If no cache entry yet, do nothing — the fetch will populate it asynchronously.
    if (!entry) {
      routeLinesByJobRef.current.delete(jobId);
      return;
    }

    // Look up the job destination (jobsRef is the single source of truth for job coords).
    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job || !isValidCoord(job.latitude, job.longitude)) {
      routeLinesByJobRef.current.delete(jobId);
      return;
    }
    const jobLat = job.latitude;
    const jobLng = job.longitude;

    // For the remaining-route start point: prefer the latest breadcrumb from the
    // server. If the route just started (no breadcrumbs yet), fall back to the
    // tech's current live marker position (post-glide).
    let startLat: number | null = null;
    let startLng: number | null = null;
    const lastBreadcrumb = entry.activePath[entry.activePath.length - 1];
    if (lastBreadcrumb) {
      startLat = lastBreadcrumb.lat;
      startLng = lastBreadcrumb.lng;
    } else {
      const tech = employeesRef.current.find(
        (t) => (job.assigneeId != null && t.id === job.assigneeId) || t.currentJobId === jobId,
      );
      const liveMarker = tech ? techMarkersRef.current.get(tech.id) : undefined;
      if (liveMarker) {
        const ll = liveMarker.getLatLng();
        startLat = ll.lat;
        startLng = ll.lng;
      } else if (tech && isValidCoord(tech.latitude, tech.longitude)) {
        startLat = tech.latitude;
        startLng = tech.longitude;
      }
    }

    const newLines: L.Polyline[] = [];

    // 0. Start-point marker — a distinct pin showing where the tech began
    //    travelling. Drawn from RouteHistory.startLat/startLng (captured at
    //    the moment `start_travel` was called). Without this, dispatchers
    //    only see the tech's CURRENT position + the job destination — they
    //    can't tell where the tech started from.
    const oldStartMarker = routeStartMarkersRef.current.get(jobId);
    if (oldStartMarker) {
      oldStartMarker.remove();
      routeStartMarkersRef.current.delete(jobId);
    }
    if (
      entry.activeStartLat != null &&
      entry.activeStartLng != null &&
      isValidCoord(entry.activeStartLat, entry.activeStartLng)
    ) {
      const startIcon = L.divIcon({
        className: 'fieseros-route-start-marker',
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:#10b981;border:3px solid #fff;
          transform:rotate(-45deg);
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
        "><span style="transform:rotate(45deg);font-size:14px;color:#fff;font-weight:700;">A</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const startMarker = L.marker(
        [entry.activeStartLat, entry.activeStartLng],
        { icon: startIcon },
      );
      startMarker.bindPopup(
        `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;">
          <strong style="color:#10b981;">Start point</strong><br/>
          <span style="color:#64748b;">Where the technician began travelling</span>
        </div>`,
        { closeButton: true },
      );
      startMarker.addTo(map);
      routeStartMarkersRef.current.set(jobId, startMarker);
    }

    // 1. Completed breadcrumb (solid emerald) — the path the tech has actually driven.
    if (entry.activePath.length >= 2) {
      const pts = entry.activePath.map((p) => [p.lat, p.lng] as [number, number]);
      const breadcrumb = L.polyline(pts, {
        color: ROUTE_BREADCRUMB_COLOR,
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      });
      breadcrumb.addTo(map);
      newLines.push(breadcrumb);
    }

    // 2. Remaining route (animated dashed amber) — from the latest breadcrumb
    //    point (or the tech's current position if no breadcrumbs yet) to the
    //    destination. Upgraded (Phase LIVE-OSRM) to road-following directions:
    //    we draw the straight 2-point line as an immediate placeholder, then
    //    asynchronously fetch the OSRM route and swap it in when it arrives.
    //    If the fetch fails or times out, the straight line stays (graceful
    //    degradation). The driven breadcrumb (emerald, item 1 above) is NOT
    //    touched — that's actual GPS data, not a routing API.
    if (startLat != null && startLng != null) {
      const remaining = L.polyline(
        [
          [startLat, startLng],
          [jobLat, jobLng],
        ] as [number, number][],
        {
          color: ROUTE_REMAINING_COLOR,
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 10',
          lineCap: 'round',
        },
      );
      remaining.addTo(map);
      // Marching-ants animation via CSS (more performant than a rAF dashOffset loop).
      const el = remaining.getElement();
      if (el) el.classList.add('fieseros-marching-ants');
      newLines.push(remaining);

      // Try to upgrade the placeholder to an OSRM road-following polyline.
      // Skip if either coord is (0,0) — OSRM can't route to/from null island
      // (Gulf of Guinea), and the request would just fail.
      const techAtNullIsland = startLat === 0 && startLng === 0;
      const destAtNullIsland = jobLat === 0 && jobLng === 0;
      if (!techAtNullIsland && !destAtNullIsland) {
        const cached = osrmRouteCacheRef.current.get(jobId);
        if (cached) {
          // Reuse the cached road route if the tech hasn't moved far
          // (> OSRM_REFETCH_DISTANCE_M). Just swap the placeholder polyline's
          // coords in place — no network call needed.
          const movedM = haversineMeters(
            startLat,
            startLng,
            cached.fromLat,
            cached.fromLng,
          );
          if (movedM <= OSRM_REFETCH_DISTANCE_M) {
            remaining.setLatLngs(cached.coords);
          } else {
            // Tech moved significantly — refetch in the background. The
            // placeholder stays until the new road route arrives.
            upgradeOsmrRoute(jobId, startLat, startLng, jobLat, jobLng);
          }
        } else {
          // No cache yet — fetch the road route in the background.
          upgradeOsmrRoute(jobId, startLat, startLng, jobLat, jobLng);
        }
      }
    }

    // 3. Historical completed routes (faint gray solid lines) — up to 5 past trips.
    entry.completedPaths.forEach((path) => {
      if (path.length < 2) return;
      const pts = path.map((p) => [p.lat, p.lng] as [number, number]);
      const historical = L.polyline(pts, {
        color: ROUTE_HISTORY_COLOR,
        weight: 2,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
      });
      historical.addTo(map);
      newLines.push(historical);
    });

    routeLinesByJobRef.current.set(jobId, newLines);
  };

  /**
   * Phase LIVE-OSRM: Asynchronously fetch a road-following polyline from OSRM
   * for the remaining route (tech → destination) and cache it per-job. When
   * the fetch resolves, triggers a redraw of that job's route so the straight
   * placeholder is swapped for the road-following line.
   *
   * The fetchOsmrRoute helper already falls back to a straight 2-point line on
   * any error / timeout — so the cached result is always a valid polyline, and
   * the redraw always has something road-shaped (or straight) to draw.
   *
   * Guards:
   *   • Skips if a fetch is already in flight for this job (prevents duplicate
   *     concurrent requests during marker glides that fire drawRouteForJob
   *     many times per second).
   *   • Skips the redraw if the job was removed during the fetch.
   *   • The redraw itself no-ops safely if the map has unmounted.
   */
  const upgradeOsmrRoute = (
    jobId: string,
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) => {
    if (osrmFetchInFlightRef.current.has(jobId)) return;
    osrmFetchInFlightRef.current.add(jobId);
    fetchOsmrRoute(fromLat, fromLng, toLat, toLng)
      .then((coords) => {
        osrmRouteCacheRef.current.set(jobId, {
          coords,
          fromLat,
          fromLng,
        });
      })
      .catch(() => {
        // Swallow — fetchOsmrRoute returns a fallback on any error, so this
        // catch is purely defensive. The straight placeholder stays.
      })
      .finally(() => {
        osrmFetchInFlightRef.current.delete(jobId);
        // Trigger a redraw to swap the placeholder for the road-following
        // route. Guard against the job being removed during the fetch.
        if (jobsRef.current.some((j) => j.id === jobId)) {
          drawRouteForJob(jobId);
        }
      });
  };

  /**
   * Thin wrapper: redraw routes for every known job + clean up routes for jobs
   * that are no longer in jobsRef. Used on initial render and full refreshes
   * (employees/jobs useEffects). GPS pings should call drawRouteForJob(jobId)
   * directly to avoid rebuilding ALL routes.
   */
  const drawRouteLines = () => {
    const currentJobIds = new Set(jobsRef.current.map((j) => j.id));
    // Remove routes for jobs no longer in jobsRef (e.g., completed and removed).
    routeLinesByJobRef.current.forEach((lines, jobId) => {
      if (!currentJobIds.has(jobId)) {
        lines.forEach((l) => l.remove());
        routeLinesByJobRef.current.delete(jobId);
        routeCacheRef.current.delete(jobId);
        osrmRouteCacheRef.current.delete(jobId);
        osrmFetchInFlightRef.current.delete(jobId);
      }
    });
    // Redraw routes for present jobs.
    jobsRef.current.forEach((job) => {
      if (!isValidCoord(job.latitude, job.longitude)) return;
      drawRouteForJob(job.id);
    });
  };

  /**
   * Phase 3.2: Fetch the breadcrumb trail for a job from
   * GET /api/jobs/[id]/route-history. Throttled per the route status
   * (15s for in_progress, 60s for completed). On success, updates the cache
   * and triggers a re-render of that job's polylines only.
   *
   * Errors are swallowed (non-fatal — the map still works without breadcrumbs).
   */
  const fetchRouteHistory = async (jobId: string, force: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const existing = routeCacheRef.current.get(jobId);
    if (!force && existing) {
      const age = Date.now() - existing.fetchedAt;
      const ttl =
        existing.status === 'in_progress' ? ROUTE_REFRESH_ACTIVE_MS : ROUTE_REFRESH_COMPLETED_MS;
      if (age < ttl) return;
    }
    try {
      const res = await fetch(`/api/jobs/${jobId}/route-history?XTransformPort=3000`);
      if (!res.ok) return;
      const data = await res.json();
      // Guard: if the job was removed while we were fetching, drop the result.
      if (!jobsRef.current.some((j) => j.id === jobId)) return;
      const active = data?.active;
      const completed = Array.isArray(data?.completed) ? data.completed : [];
      const activePath: PathPoint[] = Array.isArray(active?.path) ? active.path : [];
      const completedPaths: PathPoint[][] = completed
        .map((r: { path?: PathPoint[] }) => (Array.isArray(r?.path) ? r.path : []))
        .filter((p: PathPoint[]) => p.length > 0);
      const status: RouteCacheEntry['status'] = active
        ? 'in_progress'
        : completedPaths.length > 0
          ? 'completed'
          : 'none';
      // Capture the active route's start coordinates so we can draw a
      // distinct "start" marker (the tech's original position when travel began).
      const activeStartLat =
        typeof active?.startLat === 'number' ? active.startLat : null;
      const activeStartLng =
        typeof active?.startLng === 'number' ? active.startLng : null;
      routeCacheRef.current.set(jobId, {
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
    if (sel && mapRef.current) {
      const tech = employeesRef.current.find((t) => t.id === sel);
      if (tech && isValidCoord(tech.latitude, tech.longitude)) {
        // isValidCoord narrows tech.latitude to number, but not tech.longitude
        // (type predicates can only narrow one param). Cast longitude to number
        // since we just verified both are valid coords.
        const techLat = tech.latitude;
        const techLng = tech.longitude as number;
        // Phase 3.2 fix: frame ALL assigned jobs (not just the first) so multi-job
        // technicians get their full trip framed in a single flyToBounds call.
        const assignedJobs = jobsRef.current.filter(
          (j) => j.assigneeId === tech.id || j.id === tech.currentJobId,
        );
        const validJobs = assignedJobs.filter((j) => isValidCoord(j.latitude, j.longitude));
        try {
          if (validJobs.length > 0) {
            const bounds = L.latLngBounds([
              [techLat, techLng],
              ...validJobs.map((j) => [j.latitude, j.longitude] as [number, number]),
            ]);
            mapRef.current.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 1.4 });
          } else {
            mapRef.current.flyTo([techLat, techLng], 15, { duration: 1.2 });
          }
        } catch {
          // ignore
        }
        // Phase 3.2: fetch breadcrumb trails for each of the tech's assigned jobs.
        // The 15s/60s throttle skips redundant fetches.
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

    const streetsLayer = L.tileLayer(TILE_URL_STREETS, {
      attribution: TILE_ATTRIBUTION_STREETS,
      maxZoom: 19,
    }).addTo(map);
    tileLayersRef.current.streets = streetsLayer;

    const satelliteLayer = L.tileLayer(TILE_URL_SATELLITE, {
      attribution: TILE_ATTRIBUTION_SATELLITE,
      maxZoom: 19,
    });
    tileLayersRef.current.satellite = satelliteLayer;

    mapRef.current = map;

    if (typeof document !== 'undefined' && !document.getElementById('fieseros-tech-marker-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'fieseros-tech-marker-style';
      styleEl.textContent = `
        @keyframes fieseros-tech-pulse {
          0%   { transform: scale(0.85); opacity: 0.45; }
          70%  { transform: scale(1.8);  opacity: 0;    }
          100% { transform: scale(1.8);  opacity: 0;    }
        }
        /* Phase 3.2: Marching-ants animation for the dashed remaining-route line.
           Animating stroke-dashoffset via CSS is far cheaper than a rAF loop. */
        @keyframes fieseros-march {
          to { stroke-dashoffset: -20; }
        }
        .fieseros-marching-ants {
          animation: fieseros-march 0.8s linear infinite;
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

    map.on('click', () => {
      if (selectedTechIdRef.current && onTechnicianSelectRef.current) {
        onTechnicianSelectRef.current(null);
      }
    });

    // Wire the "Follow this technician" button inside tech popups.
    // Leaflet renders popup HTML as inert DOM — buttons inside popups don't
    // fire React onClick handlers. We listen for `popupopen`, find the
    // `[data-follow-tech-id]` button inside the just-opened popup, and attach
    // a real DOM click listener that selects the tech (same as clicking the
    // marker icon). Without this the button was a dead label.
    map.on('popupopen', (e: L.LeafletEvent) => {
      const popup = (e as unknown as { popup: L.Popup }).popup;
      const el = popup?.getElement?.();
      if (!el) return;
      const btn = el.querySelector('[data-follow-tech-id]') as HTMLButtonElement | null;
      if (!btn) return;
      const techId = btn.getAttribute('data-follow-tech-id');
      if (!techId) return;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onTechnicianSelectRef.current?.(techId);
        map.closePopup();
      });
    });

    const invalidateTimer = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    rerenderTechMarkers();
    rerenderJobMarkers();
    drawRouteLines();

    return () => {
      clearTimeout(invalidateTimer);
      // Cancel any in-flight animations.
      animStateRef.current.forEach((s) => {
        if (s.rafId !== null) cancelAnimationFrame(s.rafId);
      });
      animStateRef.current.clear();
      techMarkersRef.current.forEach((m) => m.remove());
      techMarkersRef.current.clear();
      jobMarkersRef.current.forEach((m) => m.remove());
      jobMarkersRef.current.clear();
      accuracyCirclesRef.current.forEach((c) => c.remove());
      accuracyCirclesRef.current.clear();
      // Phase 3.2: tear down per-job route polylines + cache.
      routeLinesByJobRef.current.forEach((lines) => lines.forEach((l) => l.remove()));
      routeLinesByJobRef.current.clear();
      routeStartMarkersRef.current.forEach((m) => m.remove());
      routeStartMarkersRef.current.clear();
      routeCacheRef.current.clear();
      osrmRouteCacheRef.current.clear();
      osrmFetchInFlightRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    rerenderTechMarkers();
    drawRouteLines();
  }, [employees]);

  useEffect(() => {
    rerenderJobMarkers();
    drawRouteLines();
    // ── Live Dispatch fix (Layer 2): fetch breadcrumb trails for ALL assigned
    // jobs on initial render / when jobs list changes. Previously routes only
    // appeared when the user clicked a technician (selectedTechnicianId effect
    // at L1191) or when a new GPS ping arrived (handleGpsPing at L1419). This
    // meant the map looked empty on first load — no start-end path visible.
    // Now we proactively populate the route cache for every job that has an
    // assignee, so polylines draw immediately without requiring a click.
    jobs.forEach((j) => {
      if (j.assigneeId) {
        fetchRouteHistory(j.id, false);
      }
    });
  }, [jobs]);

  // ─── Live route-history polling + Uber-style auto-frame ─────────────────
  //
  // Two responsibilities, both critical for live tracking on Vercel (where
  // the socket.io realtime bridge cannot run):
  //
  // 1. BREADCRUMB GROWTH: Re-fetch route history for every job with
  //    status 'travelling' every 5s (force=true bypasses the 15s throttle
  //    inside fetchRouteHistory). Without this the emerald breadcrumb
  //    polyline freezes at whatever was loaded on mount — the dispatcher
  //    can't see the tech's actual driven path growing as they move.
  //
  // 2. AUTO-FRAME (Uber-style zoom): When a travelling job is detected,
  //    frame the map to show the technician's current position + the job
  //    destination using RAW COORDINATES ONLY. This does NOT depend on
  //    route history, OSRM, or any async fetch — just the tech + job
  //    lat/lng that are already in props. This makes zoom reliable: even
  //    if the OSRM routing request fails or the route history is empty,
  //    the map still zooms to show both ends of the trip.
  //
  //    Zoom logic:
  //      - Tech has coords AND job has coords → flyToBounds([tech, job])
  //        (frames the whole trip — the Uber view)
  //      - Only tech has coords (job has no address) → flyTo(tech, 15)
  //        (centers on the moving vehicle so you can still watch it)
  //      - Only job has coords (tech has no GPS) → flyTo(job, 15)
  //      - Neither has coords → skip (nothing to show)
  //
  //    Fires once per job (tracked in autoFramedJobIdsRef) so it doesn't
  //    fight the user's manual pan/zoom. Cleared when a job stops
  //    travelling so it re-frames if travel restarts.
  useEffect(() => {
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

        // 2. Auto-frame using RAW coordinates (no route history dependency).
        if (autoFramedJobIdsRef.current.has(job.id)) continue;

        // Find the technician's current position (live marker if present,
        // else the employee record).
        const tech = employeesRef.current.find(
          (t) => t.id === job.assigneeId || t.currentJobId === job.id,
        );
        const liveMarker = tech ? techMarkersRef.current.get(tech.id) : undefined;
        let techLat: number | null = null;
        let techLng: number | null = null;
        if (liveMarker) {
          const ll = liveMarker.getLatLng();
          techLat = ll.lat;
          techLng = ll.lng;
        } else if (tech && isValidCoord(tech.latitude, tech.longitude)) {
          techLat = tech.latitude;
          techLng = tech.longitude as number;
        }

        const jobHasCoords = isValidCoord(job.latitude, job.longitude);

        // Diagnostic log — visible in browser console. Shows exactly which
        // condition is met for each travelling job so we can see why zoom
        // does/doesn't fire. Remove once confirmed.
        console.log('[dispatch-zoom] job=' + job.id.slice(-8) + ' title="' + job.title + '"', {
          techLat, techLng, jobLat: job.latitude, jobLng: job.longitude,
          techHasCoords: techLat != null && techLng != null,
          jobHasCoords,
        });

        if (techLat != null && techLng != null && jobHasCoords) {
          // Both coords → frame the whole trip (Uber view).
          try {
            map.flyToBounds(
              L.latLngBounds([
                [techLat, techLng],
                [job.latitude, job.longitude],
              ]),
              { padding: [80, 80], maxZoom: 16, duration: 1.4 },
            );
            autoFramedJobIdsRef.current.add(job.id);
            console.log('[dispatch-zoom] ✅ flyToBounds tech+job');
          } catch {
            // ignore bounds errors (e.g. identical points)
          }
        } else if (techLat != null && techLng != null) {
          // Only tech coords (job has no address) → center on the vehicle.
          try {
            map.flyTo([techLat, techLng], 15, { duration: 1.2 });
            autoFramedJobIdsRef.current.add(job.id);
            console.log('[dispatch-zoom] ✅ flyTo tech only (job has no coords)');
          } catch {
            // ignore
          }
        } else if (jobHasCoords) {
          // Only job coords (tech has no GPS) → center on destination.
          try {
            map.flyTo([job.latitude, job.longitude], 15, { duration: 1.2 });
            autoFramedJobIdsRef.current.add(job.id);
            console.log('[dispatch-zoom] ✅ flyTo job only (tech has no GPS)');
          } catch {
            // ignore
          }
        }
      }

      // Clean up the auto-frame set for jobs that are no longer travelling
      // (so if a job restarts travel later, it re-frames).
      const travellingIds = new Set(travellingJobs.map((j) => j.id));
      for (const id of Array.from(autoFramedJobIdsRef.current)) {
        if (!travellingIds.has(id)) {
          autoFramedJobIdsRef.current.delete(id);
        }
      }
    };

    // Run once immediately, then every 5s.
    pollTravellingRoutes();
    const interval = setInterval(pollTravellingRoutes, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [jobs]);

  // ─── Imperative controller ─────────────────────────────────────────────
  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      handleGpsPing: (ping) => {
        const map = mapRef.current;
        if (!map) return;
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
          const icon = buildTechDivIcon(
            tech,
            color,
            selectedTechIdRef.current === employeeId,
            telemetry,
            // B3: compute ETA from the new telemetry position + assigned job.
            computeEtaMinutes(latitude, longitude, jobsRef.current, tech.currentJobId),
          );
          marker = L.marker([latitude, longitude], { icon, zIndexOffset: 500 });
          marker.bindPopup(buildTechPopupHtml(tech, color, telemetry), {
            closeButton: true,
            autoPan: true,
            maxWidth: 280,
          });
          marker.on('click', () => {
            const newSel = selectedTechIdRef.current === employeeId ? null : employeeId;
            onTechnicianSelectRef.current?.(newSel);
          });
          marker.addTo(map);
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
          updateTechMarkerIcon(tech, color, selectedTechIdRef.current === employeeId, telemetry);
        }

        // Accuracy halo — a translucent circle of radius `accuracy` (m).
        if (typeof telemetry.accuracy === 'number' && telemetry.accuracy > 0 && telemetry.accuracy < 500) {
          let circle = accuracyCirclesRef.current.get(employeeId);
          if (!circle) {
            circle = L.circle([latitude, longitude], {
              radius: telemetry.accuracy,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
              weight: 1,
              opacity: 0.3,
              interactive: false,
            });
            circle.addTo(map);
            accuracyCirclesRef.current.set(employeeId, circle);
          } else {
            circle.setLatLng([latitude, longitude]);
            circle.setRadius(telemetry.accuracy);
          }
        }

        if (selectedTechIdRef.current === employeeId) {
          try {
            map.panTo([latitude, longitude], { animate: true });
          } catch {
            // ignore
          }
        }

        // Phase 3.2: Update only the affected tech's route (not all routes — wasteful).
        // The 15s throttle inside fetchRouteHistory skips if it was recently fetched.
        const currentJobId = tech.currentJobId;
        if (currentJobId) {
          fetchRouteHistory(currentJobId, false);
          drawRouteForJob(currentJobId);
        }
      },
      recenter: () => {
        const map = mapRef.current;
        if (!map) return;
        const techsWithCoords = employeesRef.current.filter((t) => isValidCoord(t.latitude, t.longitude));
        const jobsWithCoords = jobsRef.current.filter((j) => isValidCoord(j.latitude, j.longitude));
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
      refreshMarkers: () => {
        rerenderTechMarkers();
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

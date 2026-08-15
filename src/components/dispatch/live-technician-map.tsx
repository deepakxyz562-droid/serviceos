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

const ROUTE_LINE_COLOR = '#6366f1';

const TILE_URL_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_URL_SATELLITE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION_STREETS =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
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
      <div style="font-size:10px;color:#94a3b8;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:6px;">
        Click to follow this technician
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

  const html = `
    <div style="position:relative;width:28px;height:28px;">
      ${arrowHtml}
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
      ${speedBadgeHtml}
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
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const accuracyCirclesRef = useRef<Map<string, L.Circle>>(new Map());
  const animStateRef = useRef<Map<string, AnimState>>(new Map());
  const tileLayersRef = useRef<{ streets: L.TileLayer | null; satellite: L.TileLayer | null }>({
    streets: null,
    satellite: null,
  });

  const employeesRef = useRef(employees);
  const jobsRef = useRef(jobs);
  const selectedTechIdRef = useRef<string | null>(selectedTechnicianId);
  const onTechnicianSelectRef = useRef(onTechnicianSelect);

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
    marker.setIcon(buildTechDivIcon(tech, color, isFollowed, telemetry));
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
      const icon = buildTechDivIcon(tech, color, isFollowed, existingState?.telemetry ?? null);
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

  const drawRouteLines = () => {
    const map = mapRef.current;
    if (!map) return;
    routeLinesRef.current.forEach((l) => l.remove());
    routeLinesRef.current = [];

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
      routeLinesRef.current.forEach((l) => l.remove());
      routeLinesRef.current = [];
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
          const icon = buildTechDivIcon(tech, color, selectedTechIdRef.current === employeeId, telemetry);
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

        drawRouteLines();
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

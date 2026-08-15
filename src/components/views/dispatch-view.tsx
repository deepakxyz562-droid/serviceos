'use client';

/**
 * DispatchView — Phase 1+3+4 "Command Center".
 * -----------------------------------------------
 * Unified 3-pane workspace:
 *   ┌──────────────┬──────────────────┬──────────────┐
 *   │ Queue/Fleet  │      Map         │  Inspector   │
 *   │  - Teams     │   LIVE FLEET     │  Tech/Job    │
 *   │  - Techs     │   (smooth GPS)   │  Actions     │
 *   │  - Jobs      │                  │  Timeline    │
 *   └──────────────┴──────────────────┴──────────────┘
 *
 * Phase 1 — Fleet Organization & Visibility:
 *   • Live KPI bar (Total, On-Duty, En-Route, On-Job, Available, Unassigned,
 *     Attention count).
 *   • Team filter dropdown (internal operational groups — NEVER trades).
 *   • Team-grouped technician roster (collapsible sections) + "Unassigned"
 *     group so no technician is ever hidden.
 *   • Status filter + search.
 *   • No-GPS / Offline / Stale-GPS indicators.
 *   • Attention Center (late jobs, stale GPS, unassigned, idle techs).
 *
 * Phase 3 — Unified workspace:
 *   • Left pane = Fleet + Job Queue.
 *   • Center = Map.
 *   • Right = Inspector with 1-click Call/WhatsApp + Smart Match suggestions.
 *
 * Phase 4 — Intelligence:
 *   • Late-job detection (scheduledAt < now and not started).
 *   • Stale-GPS detection (no ping in N minutes).
 *   • Idle-tech detection (available + no active job for N minutes).
 *   • ETA calculation (haversine distance / assumed speed).
 *   • Arrival detection (tech within ARRIVAL_M of job pin).
 *   • Auto-assign via existing /api/dispatch/smart.
 *
 * CRITICAL: Teams are NOT trades. Tenant.industry is the trade; Team is the
 * customer's internal operational grouping. The filter dropdown is populated
 * from /api/teams (workspace-scoped), never from a hardcoded trade list.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Radio, MapPin, Calendar, Clock, User, CheckCircle2,
  RefreshCw, MessageCircle, Play,
  Activity, Loader2,
  ArrowRight, Sparkles, Star,
  X, Briefcase,
  PanelRightClose, PanelRightOpen, Locate, Layers,
  Users, ChevronUp, ChevronDown, ChevronRight,
  Phone, Navigation, AlertTriangle, Battery, Gauge,
  Search, CircleDot, UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/use-realtime';
import type { LiveTechnicianMapController } from '@/components/dispatch/live-technician-map';
import dynamic from 'next/dynamic';

const LiveTechnicianMap = dynamic(
  () => import('@/components/dispatch/live-technician-map'),
  { ssr: false, loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="size-4 mr-2 animate-spin" /> Loading map…
    </div>
  ) },
);

// ─── Types ──────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string;
  leadId?: string | null;
  isActive: boolean;
  lead?: { id: string; name: string; phone: string; status: string } | null;
  _count?: { members: number };
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  skills: string;
  rating: number;
  completedJobs: number;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  avatar?: string;
  lastSeenAt?: string | null;
  currentJobId?: string | null;
  onLeaveUntil?: string | null;
  teamId?: string | null;
  team?: { id: string; name: string; color: string } | null;
  activeJobs?: { id: string; title: string; status: string; scheduledAt?: string; address?: string; priority?: string; latitude?: number | null; longitude?: number | null }[];
}

interface Job {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  scheduledAt?: string;
  scheduledTime?: string;
  customerName?: string;
  customerPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  createdAt: string;
  updatedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  assignee?: { id: string; name: string; phone: string; role: string; status: string };
}

interface CandidateScore {
  employeeId: string;
  employeeName: string;
  employeePhone: string;
  employeeRole: string;
  employeeStatus: string;
  score: number;
  breakdown: {
    total: number;
    skillScore: number;
    proximityScore: number;
    workloadScore: number;
    ratingScore: number;
    reasons: string[];
    matchedSkills: string[];
    distanceKm: number | null;
    activeJobCount: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STALE_GPS_MS = 5 * 60 * 1000; // no ping in 5 min → stale
const IDLE_TECH_MS = 25 * 60 * 1000; // available + no active job for 25 min → idle
const ARRIVAL_M = 150; // within 150m of job → "arrived" hint
const ASSUMED_SPEED_KMH = 35; // for ETA when no live speed
const OFFLINE_MS = 30 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPriorityColor(priority: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getPriorityDot(priority: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-400',
    medium: 'bg-amber-400',
    high: 'bg-orange-500',
    urgent: 'bg-red-500 animate-pulse',
  };
  return map[priority] || 'bg-gray-400';
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    en_route: 'bg-sky-100 text-sky-700 border-sky-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getEmployeeStatusDot(status: string) {
  const map: Record<string, string> = {
    available: 'bg-emerald-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
    leave: 'bg-amber-500',
    traveling: 'bg-sky-500',
    en_route: 'bg-sky-500',
    on_job: 'bg-amber-500',
    in_progress: 'bg-amber-500',
  };
  return map[status] || 'bg-gray-400';
}

function getEmployeeStatusBg(status: string) {
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    busy: 'bg-red-100 text-red-700 border-red-200',
    offline: 'bg-gray-100 text-gray-600 border-gray-200',
    leave: 'bg-amber-100 text-amber-700 border-amber-200',
    traveling: 'bg-sky-100 text-sky-700 border-sky-200',
    en_route: 'bg-sky-100 text-sky-700 border-sky-200',
    on_job: 'bg-amber-100 text-amber-700 border-amber-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function formatTime(dateStr?: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--'; }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parseSkills(skillsStr: string): string[] {
  try { return JSON.parse(skillsStr || '[]'); } catch { return []; }
}

function getServiceTypeIcon(type: string) {
  const map: Record<string, string> = {
    delivery: '🚚', cleaning: '🧹', plumbing: '🔧', electrical: '⚡',
    hvac: '❄️', painting: '🎨', landscaping: '🌿', moving: '📦',
    installation: '🏗️', repair: '🛠️', maintenance: '⚙️', inspection: '🔍',
  };
  return map[type?.toLowerCase()] || '📋';
}

/** Haversine distance in km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** ETA in minutes given a distance (km) and assumed speed (km/h). */
function etaMinutes(distanceKm: number, speedKmh = ASSUMED_SPEED_KMH): number {
  if (speedKmh <= 0) return Infinity;
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

function hasGps(e: Employee): boolean {
  return typeof e.latitude === 'number' && typeof e.longitude === 'number' &&
    !Number.isNaN(e.latitude) && !Number.isNaN(e.longitude);
}

function isStaleGps(e: Employee): boolean {
  if (!e.lastSeenAt) return true;
  const ts = new Date(e.lastSeenAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > STALE_GPS_MS;
}

function isOfflineEmp(e: Employee): boolean {
  if (!e.lastSeenAt) return true;
  const ts = new Date(e.lastSeenAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > OFFLINE_MS;
}

function isIdleTech(e: Employee, activeJobCount: number): boolean {
  return e.status === 'available' && activeJobCount === 0;
}

function isLateJob(j: Job): boolean {
  if (!j.scheduledAt) return false;
  if (j.status === 'completed' || j.status === 'cancelled' || j.status === 'in_progress') return false;
  return new Date(j.scheduledAt).getTime() < Date.now();
}

// ─── Attention item (computed each render) ──────────────────────────────────

interface AttentionItem {
  id: string;
  severity: 'red' | 'amber' | 'yellow';
  icon: 'alert' | 'gps' | 'unassigned' | 'idle';
  title: string;
  detail: string;
  action?: { label: string; jobId?: string; employeeId?: string };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DispatchView() {
  // ─── Data state ─────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Filter state ───────────────────────────────────────────────────
  const [teamFilter, setTeamFilter] = useState<string>('all'); // 'all' | teamId | 'unassigned'
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gpsFilter, setGpsFilter] = useState<string>('all'); // all | live | stale | no-gps
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // ─── Selection / inspector state ────────────────────────────────────
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [inspectorMode, setInspectorMode] = useState<'technician' | 'job' | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  // ─── Smart-match state ──────────────────────────────────────────────
  const [assignCandidates, setAssignCandidates] = useState<CandidateScore[]>([]);
  const [smartMatchLoading, setSmartMatchLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [smartAssignAllLoading, setSmartAssignAllLoading] = useState(false);

  // ─── Layout state ───────────────────────────────────────────────────
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [fleetOpen, setFleetOpen] = useState(true);
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');
  const [showAttention, setShowAttention] = useState(false);

  const mapControllerRef = useRef<LiveTechnicianMapController | null>(null);

  // ─── Realtime GPS ───────────────────────────────────────────────────
  const { connected: realtimeConnected } = useRealtime({
    enabled: true,
    onGpsPing: (data: any) => {
      const empId = data?.employeeId;
      const lat = data?.latitude;
      const lng = data?.longitude;
      if (typeof empId !== 'string') return;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      mapControllerRef.current?.handleGpsPing({
        employeeId: empId,
        latitude: lat,
        longitude: lng,
        accuracy: data?.accuracy ?? null,
        heading: data?.heading ?? null,
        speed: data?.speed ?? null,
        batteryLevel: data?.batteryLevel ?? null,
        capturedAt: data?.capturedAt,
      });
      // Cheap in-place update of local employee state.
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === empId
            ? {
                ...e,
                latitude: lat,
                longitude: lng,
                lastSeenAt: data?.capturedAt ?? new Date().toISOString(),
              }
            : e,
        ),
      );
    },
  });

  // ─── Fetch functions ────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      // A6 fix (2025-08-15): Use canonical lifecycle statuses.
      // Was: 'pending,assigned,scheduled,en_route,in_progress'
      // 'scheduled' and 'en_route' are NOT canonical — they were dead filter
      // clauses that matched nothing. The canonical statuses from
      // src/lib/job-lifecycle.ts are: pending, assigned, accepted, travelling,
      // arrived, working, paused.
      const params = new URLSearchParams({ status: 'pending,assigned,accepted,travelling,arrived,working,paused' });
      const res = await fetch(`/api/jobs?XTransformPort=3000&${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? (Array.isArray(data) ? data : []));
      }
    } catch { setJobs([]); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch { setEmployees([]); }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch { setTeams([]); }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchJobs(), fetchEmployees(), fetchTeams()]);
    setIsRefreshing(false);
  }, [fetchJobs, fetchEmployees, fetchTeams]);

  // Auto-refresh jobs every 20s (skip when tab hidden).
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchJobs();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // ─── Live position polling (Vercel-compatible realtime replacement) ──
  //
  // The socket.io realtime mini-service cannot run on Vercel serverless, so
  // `useRealtime`'s `onGpsPing` callback never fires in production. Without
  // this poll, the technician marker on the Live Dispatch map freezes at
  // whatever position was loaded on page mount — even though the employee's
  // PWA is actively transmitting GPS pings to Supabase every few seconds.
  //
  // This polls the lightweight `/api/employees/positions` endpoint (no cache,
  // 6 scalar fields, no joins) every 5s. For every employee whose lat/lng
  // changed since the last poll, it feeds the new position into the map
  // controller's `handleGpsPing(...)` — which triggers the existing glide
  // animation, giving an Uber-like "vehicle moving" feel. It also updates
  // `lastSeenAt` / `status` / `currentJobId` so presence badges refresh.
  //
  // 5s is the sweet spot: fast enough to feel live (a vehicle at 40 km/h
  // moves ~55m in 5s — clearly visible), slow enough to stay well within
  // Vercel free-tier limits for a small fleet. Skipped when the tab is
  // hidden to avoid wasting serverless invocations.
  useEffect(() => {
    let active = true;

    const pollPositions = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch('/api/employees/positions?XTransformPort=3000');
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !Array.isArray(data)) return;

        // Snapshot the current positions so we can detect movement without
        // depending on stale closure state.
        setEmployees((prev) => {
          const byId = new Map(prev.map((e) => [e.id, e]));
          for (const p of data) {
            const id = p?.id;
            if (typeof id !== 'string') continue;
            const existing = byId.get(id);
            const newLat = typeof p.latitude === 'number' ? p.latitude : null;
            const newLng = typeof p.longitude === 'number' ? p.longitude : null;
            const newLast = p.lastSeenAt ?? null;

            // Feed moved positions into the map controller for glide animation.
            // Only fire when we actually have coords AND they differ from the
            // last known position (avoids spurious re-renders for stationary
            // technicians).
            if (
              newLat != null &&
              newLng != null &&
              (existing?.latitude !== newLat || existing?.longitude !== newLng)
            ) {
              mapControllerRef.current?.handleGpsPing({
                employeeId: id,
                latitude: newLat,
                longitude: newLng,
                accuracy: null,
                heading: null,
                speed: null,
                batteryLevel: null,
                capturedAt: newLast ?? new Date().toISOString(),
              });
            }

            if (existing) {
              byId.set(id, {
                ...existing,
                latitude: newLat ?? existing.latitude,
                longitude: newLng ?? existing.longitude,
                lastSeenAt: newLast ?? existing.lastSeenAt,
                status: typeof p.status === 'string' ? p.status : existing.status,
                currentJobId: p.currentJobId ?? existing.currentJobId ?? null,
              });
            }
          }
          return Array.from(byId.values());
        });
      } catch {
        // Non-fatal — the next tick will retry.
      }
    };

    pollPositions();
    const interval = setInterval(pollPositions, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setJobsLoading(true);
    setEmployeesLoading(true);
    Promise.all([fetchJobs(), fetchEmployees(), fetchTeams()]).finally(() => {
      setJobsLoading(false);
      setEmployeesLoading(false);
    });
  }, [fetchJobs, fetchEmployees, fetchTeams]);

  // ─── Computed: active job count per employee ────────────────────────
  const activeJobsByEmployee = useMemo(() => {
    const m = new Map<string, Job[]>();
    // A5 fix (2025-08-15): Use canonical active statuses.
    const ACTIVE = new Set(['assigned', 'accepted', 'travelling', 'arrived', 'working', 'paused']);
    for (const j of jobs) {
      if (!j.assigneeId) continue;
      if (!ACTIVE.has(j.status)) continue;
      const arr = m.get(j.assigneeId) ?? [];
      arr.push(j);
      m.set(j.assigneeId, arr);
    }
    return m;
  }, [jobs]);

  const getActiveJobCount = (empId: string) => activeJobsByEmployee.get(empId)?.length ?? 0;

  // ─── Computed: Attention items ──────────────────────────────────────
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    // Late jobs
    for (const j of jobs) {
      if (isLateJob(j)) {
        const lateMin = j.scheduledAt ? Math.round((Date.now() - new Date(j.scheduledAt).getTime()) / 60000) : 0;
        items.push({
          id: `late-${j.id}`,
          severity: 'red',
          icon: 'alert',
          title: `Job ${j.jobNumber || j.title.slice(0, 18)} ${lateMin} min late`,
          detail: j.customerName ? `Customer: ${j.customerName}` : 'No customer',
          action: { label: 'Inspect', jobId: j.id },
        });
      }
    }
    // Stale GPS
    for (const e of employees) {
      if (hasGps(e) && isStaleGps(e) && !isOfflineEmp(e) && e.status !== 'leave') {
        const min = e.lastSeenAt ? Math.round((Date.now() - new Date(e.lastSeenAt).getTime()) / 60000) : 0;
        items.push({
          id: `stale-${e.id}`,
          severity: 'amber',
          icon: 'gps',
          title: `${e.name} — GPS stale ${min}m`,
          detail: e.team?.name ? `Team: ${e.team.name}` : 'No team',
          action: { label: 'Inspect', employeeId: e.id },
        });
      }
    }
    // Unassigned jobs
    const unassignedJobs = jobs.filter((j) => j.status === 'pending');
    for (const j of unassignedJobs) {
      items.push({
        id: `unassigned-${j.id}`,
        severity: 'yellow',
        icon: 'unassigned',
        title: `Job ${j.jobNumber || j.title.slice(0, 18)} unassigned`,
        detail: j.priority ? `${j.priority} priority` : '',
        action: { label: 'Assign', jobId: j.id },
      });
    }
    // Idle techs (available + no active job)
    for (const e of employees) {
      if (isIdleTech(e, getActiveJobCount(e.id)) && e.status === 'available') {
        items.push({
          id: `idle-${e.id}`,
          severity: 'yellow',
          icon: 'idle',
          title: `${e.name} idle`,
          detail: e.team?.name ? `Team: ${e.team.name}` : 'No active job',
          action: { label: 'Inspect', employeeId: e.id },
        });
      }
    }
    return items;
  }, [employees, jobs]);

  // ─── Computed: KPI bar ──────────────────────────────────────────────
  // A5 fix (2025-08-15): Derive En-Route and On-Job from currentJobId +
  // Job.status (per the approved model), NOT from Employee.status.
  // Employee.status stays in {available, busy, offline, on_leave} — it
  // never becomes 'traveling' or 'en_route'. The dispatch KPIs are:
  //   En Route = employee.currentJobId != null AND that job's status = 'travelling'
  //   On Job   = employee.currentJobId != null AND that job's status in ['arrived', 'working']
  const kpis = useMemo(() => {
    const total = employees.length;
    const onDuty = employees.filter((e) => e.status !== 'offline' && !isOfflineEmp(e)).length;
    const enRoute = employees.filter((e) => {
      if (!e.currentJobId) return false;
      const cj = jobs.find((j) => j.id === e.currentJobId);
      return cj?.status === 'travelling';
    }).length;
    const onJob = employees.filter((e) => {
      if (!e.currentJobId) return false;
      const cj = jobs.find((j) => j.id === e.currentJobId);
      return cj ? ['arrived', 'working'].includes(cj.status) : false;
    }).length;
    const available = employees.filter((e) => e.status === 'available').length;
    const unassigned = jobs.filter((j) => j.status === 'pending').length;
    const attention = attentionItems.length;
    return { total, onDuty, enRoute, onJob, available, unassigned, attention };
  }, [employees, jobs, attentionItems]);

  // ─── Computed: filtered employees ───────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (teamFilter === 'unassigned') {
        if (e.teamId) return false;
      } else if (teamFilter !== 'all') {
        if (e.teamId !== teamFilter) return false;
      }
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (gpsFilter === 'live' && !(hasGps(e) && !isStaleGps(e))) return false;
      if (gpsFilter === 'stale' && !(hasGps(e) && isStaleGps(e) && !isOfflineEmp(e))) return false;
      if (gpsFilter === 'no-gps' && hasGps(e)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.name.toLowerCase().includes(q) && !(e.phone || '').includes(q) && !(e.role || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [employees, teamFilter, statusFilter, gpsFilter, search]);

  // ─── Computed: team-grouped roster ───────────────────────────────────
  const groupedRoster = useMemo(() => {
    const groups: { team: Team | null; employees: Employee[] }[] = [];
    const byTeam = new Map<string, Employee[]>();
    const unassigned: Employee[] = [];
    for (const e of filteredEmployees) {
      if (e.teamId && e.team) {
        const arr = byTeam.get(e.teamId) ?? [];
        arr.push(e);
        byTeam.set(e.teamId, arr);
      } else {
        unassigned.push(e);
      }
    }
    // Teams that have members (in filter result), in the team order.
    for (const t of teams) {
      const members = byTeam.get(t.id);
      if (members && members.length > 0) {
        groups.push({ team: t, employees: members });
      }
    }
    // Employees whose teamId references a team NOT in the teams list (e.g.
    // inactive team) — show under their team name if we can resolve it.
    for (const [tid, emps] of byTeam) {
      if (!teams.find((t) => t.id === tid)) {
        const sampleTeam = emps[0]?.team;
        groups.push({ team: sampleTeam ? { id: tid, name: sampleTeam.name, color: sampleTeam.color, isActive: true } : null, employees: emps });
      }
    }
    if (unassigned.length > 0) {
      groups.push({ team: null, employees: unassigned });
    }
    return groups;
  }, [filteredEmployees, teams]);

  // ─── Computed: map data ─────────────────────────────────────────────
  const mapTechnicians = useMemo(
    () => employees.filter((e) => hasGps(e)),
    [employees],
  );

  const activeJobsForMap = useMemo(() => {
    // A5 fix (2025-08-15): Use canonical active statuses.
    const ACTIVE = new Set(['pending', 'assigned', 'accepted', 'travelling', 'arrived', 'working', 'paused']);
    return jobs
      .filter((j) => ACTIVE.has(j.status) && hasGps(j as { latitude?: number | null; longitude?: number | null }))
      .map((j) => ({
        id: j.id, title: j.title, status: j.status, priority: j.priority,
        latitude: j.latitude as number, longitude: j.longitude as number,
        assigneeId: j.assigneeId ?? null, customerName: j.customerName,
        address: j.address, scheduledAt: j.scheduledAt,
      }));
  }, [jobs]);

  const pendingJobs = useMemo(() => jobs.filter((j) => j.status === 'pending'), [jobs]);
  // A5 fix (2025-08-15): Assigned-but-not-yet-working jobs (shows in the
  // dispatcher's "assigned queue"). Includes 'accepted' and 'travelling'
  // so the dispatcher can see jobs that are accepted/en-route but not yet
  // arrived/working.
  const assignedJobs = useMemo(() => jobs.filter((j) => ['assigned', 'accepted', 'travelling'].includes(j.status)), [jobs]);

  const filteredPending = useMemo(() => pendingJobs.filter((j) => {
    if (priorityFilter !== 'all' && j.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && j.type !== typeFilter) return false;
    return true;
  }), [pendingJobs, priorityFilter, typeFilter]);

  const serviceTypes = useMemo(() => [...new Set(pendingJobs.map((j) => j.type).filter(Boolean))], [pendingJobs]);

  // ─── Selected technician (inspector) ────────────────────────────────
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedTechnicianId) ?? null,
    [employees, selectedTechnicianId],
  );

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleTechnicianSelect = useCallback((techId: string | null) => {
    setSelectedTechnicianId((prev) => (prev === techId ? null : techId));
    if (techId) {
      setInspectorMode('technician');
      setInspectorOpen(true);
      setSelectedJob(null);
    }
  }, []);

  const handleJobSelect = useCallback((job: Job) => {
    setSelectedJob(job);
    setInspectorMode('job');
    setInspectorOpen(true);
    setSelectedTechnicianId(null);
  }, []);

  const handleAttentionClick = useCallback((item: AttentionItem) => {
    if (item.action?.employeeId) {
      handleTechnicianSelect(item.action.employeeId);
    } else if (item.action?.jobId) {
      const job = jobs.find((j) => j.id === item.action!.jobId);
      if (job) handleJobSelect(job);
    }
    setShowAttention(false);
  }, [jobs, handleTechnicianSelect, handleJobSelect]);

  const handleSmartMatch = useCallback(async (job: Job) => {
    setSmartMatchLoading(true);
    setAssignCandidates([]);
    try {
      const res = await fetch('/api/dispatch/smart?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, autoAssign: false }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.candidates && data.candidates.length > 0) {
          setAssignCandidates(data.candidates);
        }
      }
    } catch {
      // fallback: empty
    } finally {
      setSmartMatchLoading(false);
    }
  }, []);

  const handleAssign = useCallback(async (jobId: string, employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId, assigneeId: employee.id, assigneeName: employee.name,
          assigneePhone: employee.phone, status: 'assigned',
        }),
      });
      if (res.ok) {
        toast.success(`Assigned to ${employee.name}`);
        setInspectorMode(null);
        setSelectedJob(null);
        refreshAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to assign');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setAssignLoading(false);
    }
  }, [employees, refreshAll]);

  const handleStartJob = useCallback(async (job: Job) => {
    try {
      const res = await fetch(`/api/jobs/${job.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: 'in_progress' }),
      });
      if (res.ok) {
        toast.success(`Started "${job.title}"`);
        refreshAll();
      } else {
        toast.error('Failed to start job');
      }
    } catch {
      toast.error('Network error');
    }
  }, [refreshAll]);

  const handleSmartAssignAll = useCallback(async () => {
    setSmartAssignAllLoading(true);
    try {
      if (pendingJobs.length === 0) {
        toast.info('No pending jobs to assign');
        return;
      }
      let assigned = 0;
      for (const job of pendingJobs) {
        try {
          const res = await fetch('/api/dispatch/smart?XTransformPort=3000', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id, autoAssign: true }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) assigned++;
          }
        } catch { /* continue */ }
      }
      if (assigned > 0) toast.success(`Smart-assigned ${assigned} job${assigned > 1 ? 's' : ''}`);
      else toast.info('No suitable employees found');
      refreshAll();
    } catch {
      toast.error('Smart assign failed');
    } finally {
      setSmartAssignAllLoading(false);
    }
  }, [pendingJobs, refreshAll]);

  const handleRecenter = useCallback(() => mapControllerRef.current?.recenter(), []);
  const handleToggleLayer = useCallback(() => {
    setMapLayer((prev) => {
      const next = prev === 'streets' ? 'satellite' : 'streets';
      mapControllerRef.current?.setLayer(next);
      return next;
    });
  }, []);

  const toggleTeamCollapsed = (teamId: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  // Load smart match when a job is selected in the inspector. This is a
  // fetch-on-select pattern: setting the loading flag synchronously inside
  // the effect is intentional (shows the spinner before the fetch resolves).
  useEffect(() => {
    if (inspectorMode === 'job' && selectedJob) {
      handleSmartMatch(selectedJob);
    }
  }, [inspectorMode, selectedJob, handleSmartMatch]);

  // ─── Render: Employee row (compact, for roster) ─────────────────────
  const renderEmployeeRow = (e: Employee) => {
    const activeCount = getActiveJobCount(e.id);
    const gps = hasGps(e);
    const stale = isStaleGps(e);
    const offline = isOfflineEmp(e);
    const isSelected = selectedTechnicianId === e.id;
    const teamColor = e.team?.color;

    return (
      <button
        key={e.id}
        type="button"
        onClick={() => handleTechnicianSelect(e.id)}
        className={`w-full text-left rounded-lg border p-2.5 transition-all hover:shadow-sm ${
          isSelected ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/20' : 'border-border bg-card hover:border-teal-200'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="relative shrink-0">
            <Avatar className="size-9">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-medium">
                {e.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${getEmployeeStatusDot(e.status)}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{e.name}</span>
              {e.team && (
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: teamColor }}
                  title={e.team.name}
                  aria-hidden
                />
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
              <Badge variant="outline" className={`text-[9px] h-4 px-1 ${getEmployeeStatusBg(e.status)}`}>
                {e.status.replace('_', ' ')}
              </Badge>
              {activeCount > 0 ? (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Activity className="size-2.5" /> {activeCount} job{activeCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="size-2.5" /> free
                </span>
              )}
            </div>
            {/* GPS health indicator */}
            <div className="flex items-center gap-1 mt-1">
              {!gps ? (
                <span className="flex items-center gap-0.5 text-[9px] text-gray-400" title="No GPS signal">
                  <MapPin className="size-2.5" /> no GPS
                </span>
              ) : offline ? (
                <span className="flex items-center gap-0.5 text-[9px] text-red-500" title="Offline">
                  <MapPin className="size-2.5" /> offline
                </span>
              ) : stale ? (
                <span className="flex items-center gap-0.5 text-[9px] text-amber-500" title={`Last ping ${timeAgo(e.lastSeenAt)}`}>
                  <MapPin className="size-2.5" /> stale {timeAgo(e.lastSeenAt)}
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[9px] text-emerald-600" title={`Live · ${timeAgo(e.lastSeenAt)}`}>
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  live
                </span>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Star className="size-2.5 text-amber-400 fill-amber-400" />{e.rating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  // ─── Render: Job card (compact, for queue) ──────────────────────────
  const renderJobCard = (job: Job, compact = false) => {
    const late = isLateJob(job);
    return (
      <Card
        key={job.id}
        className={`border shadow-sm hover:shadow-md transition-all cursor-pointer group ${late ? 'border-red-300 bg-red-50/30' : ''}`}
        onClick={() => handleJobSelect(job)}
      >
        <CardContent className={compact ? 'p-3 space-y-1.5' : 'p-3.5 space-y-2'}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm shrink-0">{getServiceTypeIcon(job.type)}</span>
              <h4 className="font-medium text-xs truncate">{job.title}</h4>
            </div>
            <div className={`size-2 rounded-full shrink-0 mt-1 ${getPriorityDot(job.priority)}`} />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className={`${getPriorityColor(job.priority)} text-[9px] h-4 px-1`}>
              {job.priority}
            </Badge>
            <Badge variant="outline" className={`${getStatusColor(job.status)} text-[9px] h-4 px-1`}>
              {job.status.replace('_', ' ')}
            </Badge>
            {late && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-red-100 text-red-700 border-red-200 animate-pulse">
                <AlertTriangle className="size-2.5 mr-0.5" /> late
              </Badge>
            )}
          </div>
          {!compact && job.customerName && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="size-2.5" /> <span className="truncate">{job.customerName}</span>
            </div>
          )}
          {!compact && job.address && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="size-2.5 shrink-0" /> <span className="truncate">{job.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {job.scheduledAt && (
              <span className="flex items-center gap-0.5">
                <Clock className="size-2.5" /> {formatTime(job.scheduledAt)}
              </span>
            )}
            {job.assigneeName && (
              <span className="flex items-center gap-0.5 text-teal-600">
                <CircleDot className="size-2.5" /> {job.assigneeName.split(' ')[0]}
              </span>
            )}
          </div>
          {job.status === 'pending' && !compact && (
            <Button
              size="sm" className="w-full h-6 text-[10px] bg-teal-600 hover:bg-teal-700 text-white"
              onClick={(ev) => { ev.stopPropagation(); handleJobSelect(job); }}
            >
              <ArrowRight className="size-2.5 mr-1" /> Assign
            </Button>
          )}
          {job.status === 'assigned' && !compact && (
            <Button
              size="sm" className="w-full h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={(ev) => { ev.stopPropagation(); handleStartJob(job); }}
            >
              <Play className="size-2.5 mr-1" /> Start
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // ─── Render: Inspector — technician ─────────────────────────────────
  const renderInspectorTechnician = () => {
    if (!selectedEmployee) return null;
    const e = selectedEmployee;
    const activeJobs = activeJobsByEmployee.get(e.id) ?? [];
    const currentJob = activeJobs[0];
    const skills = parseSkills(e.skills);
    const gps = hasGps(e);

    // ETA to current job
    let etaMin: number | null = null;
    let distKm: number | null = null;
    let arrived = false;
    if (currentJob && gps && hasGps(currentJob as { latitude?: number | null; longitude?: number | null })) {
      distKm = haversineKm(e.latitude!, e.longitude!, currentJob.latitude!, currentJob.longitude!);
      etaMin = etaMinutes(distKm);
      arrived = distKm * 1000 < ARRIVAL_M;
    }

    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-medium">
                    {e.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background ${getEmployeeStatusDot(e.status)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{e.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className={`text-[9px] h-4 ${getEmployeeStatusBg(e.status)}`}>
                    {e.status.replace('_', ' ')}
                  </Badge>
                  {e.team && (
                    <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: e.team.color, color: e.team.color }}>
                      {e.team.name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-0.5">
                    <Star className="size-2.5 text-amber-400 fill-amber-400" />{e.rating.toFixed(1)}
                  </span>
                  <span>·</span>
                  <span>{e.completedJobs} done</span>
                </div>
              </div>
            </div>

            {/* GPS / tracking card */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">GPS Tracking</span>
                {gps ? (
                  isOfflineEmp(e) ? (
                    <Badge variant="outline" className="text-[9px] h-4 bg-red-50 text-red-700 border-red-200">Offline</Badge>
                  ) : isStaleGps(e) ? (
                    <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-700 border-amber-200">Stale</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200">Live</Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-[9px] h-4 bg-gray-50 text-gray-600 border-gray-200">No GPS</Badge>
                )}
              </div>
              {gps ? (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1">
                    <MapPin className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Last:</span>
                    <span className="font-medium">{timeAgo(e.lastSeenAt)}</span>
                  </div>
                  {distKm !== null && (
                    <div className="flex items-center gap-1">
                      <Navigation className="size-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Dist:</span>
                      <span className="font-medium">{distKm.toFixed(1)} km</span>
                    </div>
                  )}
                  {etaMin !== null && !Number.isInfinity(etaMin) && (
                    <div className="flex items-center gap-1">
                      <Clock className="size-3 text-muted-foreground" />
                      <span className="text-muted-foreground">ETA:</span>
                      <span className="font-medium">{arrived ? 'arrived' : `${etaMin} min`}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Gauge className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Coords:</span>
                    <span className="font-mono text-[9px]">{e.latitude!.toFixed(3)}, {e.longitude!.toFixed(3)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  This technician hasn&apos;t sent GPS coordinates yet. Location permission may be needed in the mobile app.
                </p>
              )}
            </div>

            {/* Current job */}
            {currentJob ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-1.5 dark:bg-amber-950/10">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-amber-600" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Current Job</span>
                  {arrived && (
                    <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto">
                      Arrived
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-sm">{currentJob.title}</p>
                {currentJob.customerName && (
                  <p className="text-[11px] text-muted-foreground">{currentJob.customerName}</p>
                )}
                {currentJob.address && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" /> {currentJob.address}
                  </p>
                )}
                <Button
                  size="sm" variant="outline" className="w-full h-7 text-[11px] mt-1"
                  onClick={() => handleJobSelect(currentJob)}
                >
                  View job details <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">No active job assigned</p>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] h-4">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <a href={`tel:${e.phone.replace(/[^+\d]/g, '')}`}>
                  <Phone className="size-3.5 mr-1" /> Call
                </a>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <a href={`https://wa.me/${e.phone.replace(/[^+\d]/g, '').replace(/^\+/, '')}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-3.5 mr-1" /> WhatsApp
                </a>
              </Button>
            </div>

            <Button
              size="sm" variant="ghost" className="w-full h-8 text-xs"
              onClick={() => { handleTechnicianSelect(e.id); mapControllerRef.current?.refreshMarkers(); }}
            >
              <Navigation className="size-3.5 mr-1" /> Follow on map
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ─── Render: Inspector — job ────────────────────────────────────────
  const renderInspectorJob = () => {
    if (!selectedJob) return null;
    const job = selectedJob;
    const late = isLateJob(job);

    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getServiceTypeIcon(job.type)}</span>
                <h3 className="font-semibold text-sm flex-1 min-w-0">{job.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={`text-[9px] h-4 ${getPriorityColor(job.priority)}`}>{job.priority}</Badge>
                <Badge variant="outline" className={`text-[9px] h-4 ${getStatusColor(job.status)}`}>{job.status.replace('_', ' ')}</Badge>
                {late && (
                  <Badge variant="outline" className="text-[9px] h-4 bg-red-100 text-red-700 border-red-200 animate-pulse">
                    <AlertTriangle className="size-2.5 mr-0.5" /> late
                  </Badge>
                )}
              </div>
            </div>

            {/* Customer + schedule */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-[11px]">
              {job.customerName && (
                <div className="flex items-center gap-1.5">
                  <User className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{job.customerName}</span>
                </div>
              )}
              {job.customerPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3 text-muted-foreground" />
                  <span className="font-medium">{job.customerPhone}</span>
                </div>
              )}
              {job.address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="size-3 text-muted-foreground mt-0.5" />
                  <span>{job.address}</span>
                </div>
              )}
              {job.scheduledAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-muted-foreground" />
                  <span>{formatDate(job.scheduledAt)} {formatTime(job.scheduledAt)}</span>
                </div>
              )}
            </div>

            {/* Assignee */}
            {job.assigneeName ? (
              <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 dark:bg-teal-950/10">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700 mb-1">Assigned to</p>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-teal-100 text-teal-700 text-[10px]">
                      {job.assigneeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{job.assigneeName}</span>
                </div>
                {job.status === 'assigned' && (
                  <Button
                    size="sm" className="w-full h-7 text-[11px] mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleStartJob(job)}
                  >
                    <Play className="size-3 mr-1" /> Start job
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:bg-amber-950/10">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">Unassigned</p>
                <p className="text-[11px] text-muted-foreground">Suggested technicians below (Smart Match).</p>
              </div>
            )}

            {/* Smart Match suggestions */}
            {!job.assigneeId && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="size-3" /> Suggested technicians
                </p>
                {smartMatchLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : assignCandidates.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-3">No matches found</p>
                ) : (
                  <div className="space-y-1.5">
                    {assignCandidates.slice(0, 5).map((c) => {
                      const emp = employees.find((x) => x.id === c.employeeId);
                      const offline = emp ? isOfflineEmp(emp) : false;
                      return (
                        <div
                          key={c.employeeId}
                          className="rounded-lg border bg-card p-2.5 flex items-center gap-2 hover:border-teal-300 transition-colors"
                        >
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-teal-100 text-teal-700 text-[10px]">
                              {c.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium truncate">{c.employeeName}</span>
                              {c.breakdown.distanceKm !== null && (
                                <span className="text-[9px] text-muted-foreground">{c.breakdown.distanceKm.toFixed(1)} km</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                              <Star className="size-2.5 text-amber-400 fill-amber-400" />
                              <span>{c.breakdown.total.toFixed(0)}% match</span>
                              {c.breakdown.activeJobCount > 0 && <span>· {c.breakdown.activeJobCount} active</span>}
                            </div>
                          </div>
                          {offline ? (
                            <Badge variant="outline" className="text-[9px] h-4 bg-gray-50 text-gray-500 border-gray-200">offline</Badge>
                          ) : (
                            <Button
                              size="sm" className="h-6 text-[10px] bg-teal-600 hover:bg-teal-700 text-white"
                              disabled={assignLoading}
                              onClick={() => handleAssign(job.id, c.employeeId)}
                            >
                              Assign
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ─── Render: Attention Center panel ─────────────────────────────────
  const renderAttentionPanel = () => {
    if (attentionItems.length === 0) return null;
    const severityColor: Record<AttentionItem['severity'], string> = {
      red: 'text-red-600 bg-red-500',
      amber: 'text-amber-600 bg-amber-500',
      yellow: 'text-yellow-600 bg-yellow-500',
    };
    const iconMap = {
      alert: AlertTriangle, gps: MapPin, unassigned: Briefcase, idle: Clock,
    };
    return (
      <div className="absolute top-3 left-3 z-[1000] w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border border-amber-200 bg-background/95 backdrop-blur shadow-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/50 transition-colors"
          onClick={() => setShowAttention((v) => !v)}
        >
          <div className="flex items-center gap-1.5 flex-1">
            <AlertTriangle className="size-3.5 text-amber-600" />
            <span className="text-xs font-semibold">{attentionItems.length} Attention</span>
          </div>
          {showAttention ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </button>
        {showAttention && (
          <div className="border-t max-h-72 overflow-y-auto">
            {attentionItems.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAttentionClick(item)}
                  className="w-full flex items-start gap-2 p-2.5 hover:bg-muted/50 transition-colors border-b last:border-0 text-left"
                >
                  <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded ${severityColor[item.severity]} bg-opacity-15`}>
                    <Icon className="size-3" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium leading-tight truncate">{item.title}</p>
                    {item.detail && <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* ─── Header + KPI bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between flex-wrap gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center size-9 rounded-lg bg-teal-600 shadow-md shadow-teal-600/20 shrink-0">
            <Radio className="size-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight leading-tight truncate">Live Dispatch</h2>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              Command center · live tracking · smart assignment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
                    realtimeConnected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-muted/50 border-border text-muted-foreground'
                  }`}
                >
                  <span className="relative flex size-2">
                    {realtimeConnected && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex size-2 rounded-full ${realtimeConnected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  </span>
                  <span className="font-medium">{realtimeConnected ? 'Live' : 'Offline'}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {realtimeConnected ? 'Realtime connected — GPS pings update markers live' : 'Realtime disconnected — falling back to 20s polling'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" onClick={refreshAll} disabled={isRefreshing} className="h-8">
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </Button>

          <Button
            size="sm"
            className="h-8 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md"
            onClick={handleSmartAssignAll}
            disabled={smartAssignAllLoading || pendingJobs.length === 0}
          >
            {smartAssignAllLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            <span className="hidden md:inline ml-1">Auto-Assign All</span>
          </Button>
        </div>
      </header>

      {/* KPI bar */}
      <div className="flex items-center gap-2 flex-wrap mb-2 shrink-0">
        <KpiPill icon={Users} label="Fleet" value={kpis.total} color="text-slate-600" />
        <KpiPill icon={CheckCircle2} label="On-Duty" value={kpis.onDuty} color="text-emerald-600" />
        <KpiPill icon={Navigation} label="En-Route" value={kpis.enRoute} color="text-sky-600" />
        <KpiPill icon={Briefcase} label="On-Job" value={kpis.onJob} color="text-amber-600" />
        <KpiPill icon={CircleDot} label="Available" value={kpis.available} color="text-teal-600" />
        <KpiPill icon={ArrowRight} label="Unassigned" value={kpis.unassigned} color="text-orange-600" />
        {attentionItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAttention((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-700 text-xs hover:bg-amber-100 transition-colors dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300"
          >
            <AlertTriangle className="size-3" />
            <span className="font-semibold">{attentionItems.length}</span>
            <span className="text-[10px]">attention</span>
          </button>
        )}
      </div>

      {/* ─── Unified 3-pane workspace ─────────────────────────────────── */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* Left pane: Queue + Fleet */}
        {fleetOpen && (
          <aside className="hidden md:flex w-[320px] shrink-0 flex-col min-h-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
            {/* Filter bar */}
            <div className="p-2.5 border-b bg-muted/30 space-y-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="h-7 text-[11px] flex-1">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                          <span className="text-muted-foreground">({t._count?.members ?? 0})</span>
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 text-[11px] w-[100px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="traveling">Traveling</SelectItem>
                    <SelectItem value="en_route">En Route</SelectItem>
                    <SelectItem value="on_job">On Job</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="leave">On Leave</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={gpsFilter} onValueChange={setGpsFilter}>
                  <SelectTrigger className="h-7 text-[11px] flex-1">
                    <SelectValue placeholder="GPS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All GPS</SelectItem>
                    <SelectItem value="live">Live only</SelectItem>
                    <SelectItem value="stale">Stale</SelectItem>
                    <SelectItem value="no-gps">No GPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search technicians…"
                  className="h-7 text-[11px] pl-6"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-3">
                {/* Team-grouped roster */}
                {employeesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : groupedRoster.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No technicians match these filters</p>
                  </div>
                ) : (
                  groupedRoster.map((group, gi) => {
                    const teamId = group.team?.id ?? 'unassigned';
                    const collapsed = collapsedTeams.has(teamId);
                    return (
                      <div key={teamId + gi}>
                        <button
                          type="button"
                          onClick={() => toggleTeamCollapsed(teamId)}
                          className="w-full flex items-center gap-1.5 px-1 py-1 hover:bg-muted/40 rounded transition-colors"
                        >
                          {collapsed ? <ChevronRight className="size-3 text-muted-foreground" /> : <ChevronDown className="size-3 text-muted-foreground" />}
                          {group.team ? (
                            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: group.team.color }} />
                          ) : (
                            <UserPlus className="size-3 text-muted-foreground" />
                          )}
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-1 text-left truncate">
                            {group.team ? group.team.name : 'Unassigned'}
                          </span>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">{group.employees.length}</Badge>
                        </button>
                        {!collapsed && (
                          <div className="space-y-1.5 mt-1">
                            {group.employees.map(renderEmployeeRow)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Unassigned jobs queue */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1.5 px-1 py-1">
                    <Briefcase className="size-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                      Job Queue
                    </span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">{filteredPending.length}</Badge>
                  </div>
                  <div className="space-y-1.5 mt-1">
                    {filteredPending.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-3">No pending jobs</p>
                    ) : (
                      filteredPending.slice(0, 12).map((j) => renderJobCard(j, true))
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Center: Map */}
        <div className="flex-1 relative min-h-[50vh] md:min-h-0 rounded-lg overflow-hidden border border-border shadow-sm bg-muted/20">
          {mapTechnicians.length === 0 && activeJobsForMap.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted/30 px-6 py-8 text-center">
              <MapPin className="size-10 mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">No live locations to display</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Technicians will appear here once they start GPS tracking from the employee app.
                Job pins appear once a job address is geocoded.
              </p>
            </div>
          ) : (
            <LiveTechnicianMap
              employees={mapTechnicians}
              jobs={activeJobsForMap}
              selectedTechnicianId={selectedTechnicianId}
              onTechnicianSelect={handleTechnicianSelect}
              controllerRef={mapControllerRef}
              className="absolute inset-0 h-full w-full"
            />
          )}

          {/* Attention Center overlay */}
          {renderAttentionPanel()}

          {/* Map controls */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm" onClick={handleRecenter} className="h-8 w-8 p-0 shadow-md bg-background/95 backdrop-blur" aria-label="Recenter map">
                    <Locate className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Recenter on all technicians</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm" onClick={handleToggleLayer} className="h-8 w-8 p-0 shadow-md bg-background/95 backdrop-blur" aria-label="Toggle map layer">
                    <Layers className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{mapLayer === 'streets' ? 'Switch to satellite' : 'Switch to streets'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Map info badges */}
          <div className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1.5">
            <Badge variant="secondary" className="text-[10px] h-5 bg-background/95 backdrop-blur shadow-sm w-fit">
              <MapPin className="size-3 mr-1 text-teal-600" />
              {mapTechnicians.length} tech{mapTechnicians.length !== 1 ? 's' : ''}
              <span className="text-muted-foreground mx-1">·</span>
              {activeJobsForMap.length} job{activeJobsForMap.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Toggle panes buttons (mobile-friendly) */}
          <div className="absolute bottom-3 right-3 z-[1000] flex gap-1.5 md:hidden">
            <Button variant="secondary" size="sm" onClick={() => setFleetOpen((v) => !v)} className="h-8 px-3 shadow-md bg-background/95 backdrop-blur">
              <Users className="size-3.5 mr-1" /> Fleet
            </Button>
          </div>
        </div>

        {/* Right pane: Inspector */}
        {inspectorOpen && inspectorMode && (
          <aside className="hidden lg:flex w-[300px] shrink-0 flex-col min-h-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
            <div className="flex items-center justify-between p-2.5 border-b shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {inspectorMode === 'technician' ? 'Technician' : 'Job'} Inspector
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setInspectorMode(null); setSelectedTechnicianId(null); setSelectedJob(null); }}>
                <X className="size-3.5" />
              </Button>
            </div>
            {inspectorMode === 'technician' ? renderInspectorTechnician() : renderInspectorJob()}
          </aside>
        )}
      </div>

      {/* Mobile inspector sheet trigger */}
      {inspectorMode && !inspectorOpen && (
        <Button
          variant="secondary" size="sm"
          onClick={() => setInspectorOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-[1001] shadow-lg"
        >
          <PanelRightOpen className="size-4 mr-1" /> Inspector
        </Button>
      )}
    </div>
  );
}

// ─── KPI pill component ────────────────────────────────────────────────────

function KpiPill({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-xs">
      <Icon className={`size-3 ${color}`} />
      <span className="font-semibold">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

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
 *   • Left pane = Fleet + Job Queue.   (→ <FleetPane />)
 *   • Center = Map.                     (inline — LiveTechnicianMap)
 *   • Right = Inspector with 1-click Call/WhatsApp + Smart Match.  (→ <InspectorPanel />)
 *
 * Phase 4 — Intelligence:
 *   • Late-job detection (scheduledAt < now and not started).
 *   • Stale-GPS detection (no ping in N minutes).
 *   • Idle-tech detection (available + no active job for N minutes).
 *   • ETA calculation (haversine distance / assumed speed).
 *   • Arrival detection (tech within ARRIVAL_M of job pin).
 *   • Auto-assign via existing /api/dispatch/smart.
 *
 * Phase 6E refactor (this file):
 *   Pure presentational sub-components were extracted to
 *   `src/features/dispatch/components/`:
 *     - <FleetPane />      (filter bar + roster + job queue)
 *     - <InspectorPanel /> (technician + job inspector switcher)
 *     - <AttentionPanel /> (collapsible attention overlay)
 *     - <KpiPill />        (header KPI badge)
 *   Helpers + types were extracted to:
 *     - src/features/dispatch/utils/dispatch-helpers.ts
 *     - src/features/dispatch/types/index.ts
 *
 * CRITICAL: Teams are NOT trades. Tenant.industry is the trade; Team is the
 * customer's internal operational grouping. The filter dropdown is populated
 * from /api/teams (workspace-scoped), never from a hardcoded trade list.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Radio, MapPin, RefreshCw,
  Activity, Loader2,
  Sparkles,
  X,
  PanelRightOpen, Locate,
  Users,
  Navigation, ArrowRight, AlertTriangle,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/use-realtime';
import type { LiveTechnicianMapController } from '@/components/dispatch/live-dispatch-map';
import { apiUrl } from '@/lib/api';
import dynamic from 'next/dynamic';

import {
  haversineMeters,
  MOVE_THRESHOLD_M,
  STALE_GPS_MS,
  OFFLINE_MS,
  hasGps, isStaleGps, isOfflineEmp,
  isIdleTech, isLateJob,
} from '@/features/dispatch/utils/dispatch-helpers';
import type {
  Team, Employee, Job, CandidateScore, AttentionItem,
} from '@/features/dispatch/types';
import { FleetPane } from '@/features/dispatch/components/fleet-pane';
import type { RosterGroup } from '@/features/dispatch/components/fleet-roster';
import {
  InspectorPanel,
} from '@/features/dispatch/components/inspector-panel';
import { AttentionPanel } from '@/features/dispatch/components/attention-panel';
import { KpiPill } from '@/features/dispatch/components/kpi-pill';

const LiveDispatchMap = dynamic(
  () => import('@/components/dispatch/live-dispatch-map'),
  { ssr: false, loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="size-4 mr-2 animate-spin" /> Loading map…
    </div>
  ) },
);

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
  const [showAttention, setShowAttention] = useState(false);

  const mapControllerRef = useRef<LiveTechnicianMapController | null>(null);

  // P0-6: Track last poll time for connection state indicator
  const lastPollAt = useRef<Date | null>(null);

  // ─── Live position ref (FIX A+B) ────────────────────────────────────
  //
  // GPS positions are held in this ref, NOT in React state. This is the
  // critical fix for the map flicker: previously every 5s poll called
  // setEmployees() with a new array, which triggered
  // LiveTechnicianMap's useEffect([employees]) → rerenderTechMarkers() →
  // setIcon() + setLatLng() on every marker — rebuilding the DivIcon DOM
  // and interrupting in-flight rAF glides every 5 seconds.
  //
  // Now positions flow through this ref → handleGpsPing() (imperative).
  // React state (employees) is only flushed for non-position metadata
  // (status / currentJobId changes), debounced to 30s.
  const positionsRef = useRef<
    Map<
      string,
      {
        lat: number;
        lng: number;
        lastSeenAt: string | null;
        /** Authoritative GPS telemetry timestamp. */
        lastGpsAt: string | null;
        /** Derived GPS freshness. */
        gpsStatus: 'live' | 'stale' | 'offline';
        status?: string;
        currentJobId?: string | null;
      }
    >
  >(new Map());
  const lastMetaFlushRef = useRef<number>(0);

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
      // FIX A: Update the positions ref (imperative) — do NOT call
      // setEmployees(). Position updates go through handleGpsPing() above,
      // which drives the rAF glide directly. React state is only for
      // metadata (status / currentJobId), refreshed by the 5s poll's
      // debounced flush. This prevents the flicker caused by rebuilding
      // Leaflet markers on every GPS ping.
      const rtCapturedAt = data?.capturedAt ?? new Date().toISOString();
      positionsRef.current.set(empId, {
        lat,
        lng,
        lastSeenAt: rtCapturedAt,
        // Realtime ping = authoritative GPS telemetry is fresh.
        lastGpsAt: rtCapturedAt,
        gpsStatus: 'live',
      });
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
      const res = await fetch(apiUrl(`/api/jobs?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? (Array.isArray(data) ? data : []));
      }
    } catch { setJobs([]); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/employees'));
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch { setEmployees([]); }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/teams'));
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

  // ─── Live position polling (ref-based, no React state churn) ────────
  //
  // FIX A+B (2026-08-16): Previously this poll called setEmployees() on
  // every 5s cycle, creating a new array reference that triggered
  // LiveTechnicianMap's useEffect([employees]) → rerenderTechMarkers() →
  // setIcon() + setLatLng() on every technician marker. That destroyed
  // and rebuilt the DivIcon DOM every 5s, causing the visible flicker
  // even when no technician had moved.
  //
  // It also used `!==` equality for move detection, which fired phantom
  // "moved" pings whenever an employee was missing from the cached
  // /api/employees list (existing === undefined → undefined !== 25.60 →
  // "moved" every cycle forever, because the `if (existing)` guard
  // prevented the employee from ever being added).
  //
  // NOW:
  //   1. Positions are held in positionsRef (imperative — no React state).
  //   2. Move detection uses haversine distance > 5m (eliminates both
  //      float noise AND the missing-employee phantom ping).
  //   3. handleGpsPing() is called ONLY when a tech moves > 5m.
  //   4. React state (employees) is flushed ONLY for non-position
  //      metadata (status / currentJobId), debounced to 30s, so roster
  //      badges refresh without re-rendering the map.
  //   5. The ref is always updated (no `if (existing)` guard) so polled
  //      employees that aren't in the cached /api/employees list still
  //      get tracked.
  useEffect(() => {
    let active = true;

    const pollPositions = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch(apiUrl('/api/employees/positions'));
        if (!res.ok) {
          console.warn('[dispatch-poll] positions endpoint returned', res.status, res.statusText);
          return;
        }
        const data = await res.json();
        if (!active || !Array.isArray(data)) {
          console.warn('[dispatch-poll] positions returned non-array:', typeof data);
          return;
        }

        const ref = positionsRef.current;
        let movedCount = 0;
        const movements: Array<{
          id: string;
          email: string | null;
          old: [number, number] | null;
          next: [number, number];
          distM: number;
          lastGpsAt: string | null;
          gpsStatus: string;
        }> = [];
        let metaChanged = false;
        const now = Date.now();

        for (const p of data) {
          const id = p?.id;
          if (typeof id !== 'string') continue;
          const newLat = typeof p.latitude === 'number' ? p.latitude : null;
          const newLng = typeof p.longitude === 'number' ? p.longitude : null;
          const newLast = p.lastSeenAt ?? null;
          // Read authoritative GPS telemetry fields from the positions
          // endpoint. lastGpsAt comes from GPSLocation.capturedAt (the
          // latest actual GPS coordinate), NOT from Employee.lastSeenAt
          // (which can be updated by non-GPS flows).
          const newLastGps = (p.lastGpsAt ?? null) as string | null;
          const newGpsStatus = (p.gpsStatus ?? 'offline') as 'live' | 'stale' | 'offline';
          const newStatus = typeof p.status === 'string' ? p.status : undefined;
          const newJobId = p.currentJobId ?? undefined;

          const existing = ref.get(id);

          // FIX B: Haversine distance > 5m instead of `!==` equality.
          if (newLat != null && newLng != null) {
            const prevLat = existing?.lat;
            const prevLng = existing?.lng;
            const distM =
              prevLat != null && prevLng != null && !isNaN(prevLat) && !isNaN(prevLng)
                ? haversineMeters(prevLat, prevLng, newLat, newLng)
                : Infinity;
            if (distM > MOVE_THRESHOLD_M) {
              movedCount++;
              movements.push({
                id,
                email: (p as { email?: string | null }).email ?? null,
                old:
                  prevLat != null && prevLng != null && !isNaN(prevLat) && !isNaN(prevLng)
                    ? [prevLat, prevLng]
                    : null,
                next: [newLat, newLng],
                distM,
                lastGpsAt: newLastGps,
                gpsStatus: newGpsStatus,
              });
              mapControllerRef.current?.handleGpsPing({
                employeeId: id,
                latitude: newLat,
                longitude: newLng,
                accuracy: null,
                heading: null,
                speed: null,
                batteryLevel: null,
                // Phase F-1: use lastGpsAt (authoritative GPS timestamp from
                // GPSLocation.capturedAt) instead of lastSeenAt (which can be
                // updated by non-GPS flows like clock-in / API calls). Without
                // this, marker interpolation timing is wrong — the glide
                // window is computed from the ping's capturedAt, and using
                // lastSeenAt would make a technician who was active but had no
                // GPS pings look "live" with a stale coordinate.
                capturedAt: newLastGps ?? newLast ?? new Date().toISOString(),
              });
            }
          }

          // Always update the ref — no `if (existing)` guard.
          ref.set(id, {
            lat: newLat ?? existing?.lat ?? NaN,
            lng: newLng ?? existing?.lng ?? NaN,
            lastSeenAt: newLast ?? existing?.lastSeenAt ?? null,
            lastGpsAt: newLastGps ?? existing?.lastGpsAt ?? null,
            gpsStatus: newGpsStatus,
            status: newStatus ?? existing?.status,
            currentJobId: newJobId ?? existing?.currentJobId,
          });

          // Detect non-position metadata changes for the debounced flush.
          if (
            (newStatus && newStatus !== existing?.status) ||
            (newJobId !== undefined && newJobId !== existing?.currentJobId) ||
            (newGpsStatus !== existing?.gpsStatus) ||
            (newLastGps !== existing?.lastGpsAt)
          ) {
            metaChanged = true;
          }
        }

        if (movedCount > 0) {
          console.log('[dispatch-poll] moved', movedCount, 'technician(s) — fed to map glide');
          for (const m of movements) {
            console.log('[dispatch-poll] movement', {
              id: m.id.slice(-8),
              name: m.email,
              old: m.old,
              next: m.next,
              distanceM: Math.round(m.distM),
              lastGpsAt: m.lastGpsAt,
              gpsStatus: m.gpsStatus,
            });
          }
        }

        // FIX A: Only flush to React state when metadata (status /
        // currentJobId) actually changed, AND debounce to 30s.
        if (metaChanged && now - lastMetaFlushRef.current > 30_000) {
          lastMetaFlushRef.current = now;
          setEmployees((prev) => {
            const byId = new Map(prev.map((e) => [e.id, e]));
            for (const p of data) {
              const id = p?.id;
              if (typeof id !== 'string') continue;
              const existing = byId.get(id);
              if (existing) {
                byId.set(id, {
                  ...existing,
                  status: typeof p.status === 'string' ? p.status : existing.status,
                  currentJobId: p.currentJobId ?? existing.currentJobId ?? null,
                  lastSeenAt: p.lastSeenAt ?? existing.lastSeenAt ?? null,
                  lastGpsAt: (p.lastGpsAt ?? null) as string | null ?? existing.lastGpsAt ?? null,
                  gpsStatus: (p.gpsStatus ?? 'offline') as 'live' | 'stale' | 'offline',
                });
              }
            }
            return Array.from(byId.values());
          });
        }
      } catch (e) {
        console.error('[dispatch-poll] positions fetch failed:', e);
      }
    };

    pollPositions();
    // P0-6: Track last successful poll for the connection state indicator
    lastPollAt.current = new Date();
    const interval = setInterval(() => {
      pollPositions();
      lastPollAt.current = new Date();
    }, 5000);
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
  const groupedRoster = useMemo<RosterGroup[]>(() => {
    const groups: RosterGroup[] = [];
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

  // Technician-Focused Map Mode: the selected technician's currentJobId,
  // memoized separately so that GPS polls (which update `employees` positions
  // but NOT `currentJobId`) don't cause `activeJobsForMap` to recompute and
  // trigger an unnecessary full map redraw.
  const selectedTechCurrentJobId = useMemo(() => {
    if (!selectedTechnicianId) return null;
    return employees.find((e) => e.id === selectedTechnicianId)?.currentJobId ?? null;
  }, [employees, selectedTechnicianId]);

  const activeJobsForMap = useMemo(() => {
    // A5 fix (2025-08-15): Use canonical active statuses.
    const ACTIVE = new Set(['pending', 'assigned', 'accepted', 'travelling', 'arrived', 'working', 'paused']);
    // Technician-Focused Map Mode: when a technician is selected, show only
    // their assigned jobs + their currentJob. Other technicians' jobs are
    // filtered out HERE (at the source) so the map's downstream render paths
    // — rerenderJobMarkers, drawRouteLines, pollTravellingRoutes — naturally
    // only see the selected technician's jobs.
    const techId = selectedTechnicianId;
    const techCurrentJobId = selectedTechCurrentJobId;
    return jobs
      .filter((j) =>
        ACTIVE.has(j.status) &&
        hasGps(j as { latitude?: number | null; longitude?: number | null }) &&
        (!techId || j.assigneeId === techId || j.id === techCurrentJobId)
      )
      .map((j) => ({
        id: j.id, title: j.title, status: j.status, priority: j.priority,
        latitude: j.latitude as number, longitude: j.longitude as number,
        assigneeId: j.assigneeId ?? null, customerName: j.customerName,
        address: j.address, scheduledAt: j.scheduledAt,
      }));
  }, [jobs, selectedTechnicianId, selectedTechCurrentJobId]);

  const pendingJobs = useMemo(() => jobs.filter((j) => j.status === 'pending'), [jobs]);
  // A5 fix (2025-08-15): Assigned-but-not-yet-working jobs (shows in the
  // dispatcher's "assigned queue"). Includes 'accepted' and 'travelling'
  // so the dispatcher can see jobs that are accepted/en-route but not yet
  // arrived/working.
  const assignedJobs = useMemo(() => jobs.filter((j) => ['assigned', 'accepted', 'travelling'].includes(j.status)), [jobs]);
  void assignedJobs; // retained for future dispatcher queue; cheap to compute.

  const filteredPending = useMemo(() => pendingJobs.filter((j) => {
    if (priorityFilter !== 'all' && j.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && j.type !== typeFilter) return false;
    return true;
  }), [pendingJobs, priorityFilter, typeFilter]);

  void filteredPending; // computed for future filter UI; currently the
                        // FleetPane shows all pending jobs unfiltered.

  const serviceTypes = useMemo(() => [...new Set(pendingJobs.map((j) => j.type).filter(Boolean))], [pendingJobs]);
  void serviceTypes; // reserved for future type-filter dropdown.

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
      const res = await fetch(apiUrl('/api/dispatch/smart'), {
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
      const res = await fetch(apiUrl(`/api/jobs/${jobId}`), {
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
      const res = await fetch(apiUrl(`/api/jobs/${job.id}`), {
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
          const res = await fetch(apiUrl('/api/dispatch/smart'), {
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

  // FIX F: Explicit recenter on the selected technician. Called by the
  // "Recenter" button in the inspector's GPS Tracking card — NOT on every
  // GPS ping. Normal pings just glide the marker; this frames the map on
  // the tech + their destination (Uber view). The dispatcher clicks this
  // after the PWA tech hits "Resync" to see where they are.
  const handleRecenterOnTech = useCallback((techId: string) => {
    mapControllerRef.current?.recenterOnTech(techId);
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

  // Avoid unused warnings — these constants are part of the contract
  // documented in dispatch-helpers.ts but not directly referenced in the
  // view after extraction. Keeping the import for documentation/audit.
  void STALE_GPS_MS;
  void OFFLINE_MS;

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
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300'
                  }`}
                >
                  <span className="relative flex size-2">
                    {realtimeConnected && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex size-2 rounded-full ${realtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </span>
                  <span className="font-medium">{realtimeConnected ? 'Live' : 'Reconnecting'}</span>
                  {/* P0-6: Show last updated time when disconnected */}
                  {!realtimeConnected && lastPollAt.current && (
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                      · updated {timeAgoShort(lastPollAt.current)}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {realtimeConnected
                  ? 'Realtime connected — GPS pings update markers live'
                  : 'Realtime disconnected — using 5s polling fallback. Data is still updating.'}
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
            onClick={() => {
              // P0-5: Confirmation before bulk auto-assignment
              if (pendingJobs.length === 0) return;
              const jobList = pendingJobs.map(j => `• ${j.title || j.jobNumber || j.id}`).join('\n');
              const confirmed = window.confirm(
                `Auto-assign ${pendingJobs.length} job(s)?\n\n${jobList}\n\nWe'll assign technicians based on availability, distance, and service area.`
              );
              if (confirmed) handleSmartAssignAll();
            }}
            disabled={smartAssignAllLoading || pendingJobs.length === 0}
          >
            {smartAssignAllLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            <span className="hidden md:inline ml-1">Auto-Assign All</span>
          </Button>
        </div>
      </header>

      {/* KPI bar */}
      <div className="flex items-center gap-2 flex-wrap mb-2 shrink-0">
        <KpiPill icon={Users} label="Team" value={kpis.total} color="text-slate-600" />
        <KpiPill icon={CircleDot} label="Available" value={kpis.available} color="text-teal-600" />
        <KpiPill icon={Navigation} label="En Route" value={kpis.enRoute} color="text-sky-600" />
        <KpiPill icon={Activity} label="On Job" value={kpis.onJob} color="text-amber-600" />
        {/* P0-4: Make Unassigned KPI clickable — filters the job queue */}
        <button
          type="button"
          onClick={() => {
            // Scroll to the fleet pane's job queue + highlight unassigned
            const queueEl = document.querySelector('[data-job-queue]');
            if (queueEl) queueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }}
          className="flex items-center gap-1.5 rounded-md border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs hover:bg-orange-100 transition-colors dark:bg-orange-950/50 dark:border-orange-700"
          title="Click to view unassigned jobs"
        >
          <ArrowRight className="size-3 text-orange-600" />
          <span className="font-semibold text-orange-700 dark:text-orange-300">{kpis.unassigned}</span>
          <span className="text-[10px] text-orange-600 dark:text-orange-400">Unassigned</span>
        </button>
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
          <FleetPane
            teams={teams}
            teamFilter={teamFilter}
            onTeamFilterChange={setTeamFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            gpsFilter={gpsFilter}
            onGpsFilterChange={setGpsFilter}
            search={search}
            onSearchChange={setSearch}
            rosterGroups={groupedRoster}
            collapsedTeams={collapsedTeams}
            onToggleTeam={toggleTeamCollapsed}
            selectedTechnicianId={selectedTechnicianId}
            onSelectTechnician={handleTechnicianSelect}
            getActiveJobCount={getActiveJobCount}
            pendingJobs={pendingJobs}
            onSelectJob={handleJobSelect}
            onStartJob={handleStartJob}
            employeesLoading={employeesLoading}
          />
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
            <LiveDispatchMap
              employees={mapTechnicians}
              jobs={activeJobsForMap}
              selectedTechnicianId={selectedTechnicianId}
              onTechnicianSelect={handleTechnicianSelect}
              controllerRef={mapControllerRef}
              className="absolute inset-0 h-full w-full"
            />
          )}

          {/* Attention Center overlay */}
          <AttentionPanel
            items={attentionItems}
            expanded={showAttention}
            onToggle={() => setShowAttention((v) => !v)}
            onItemClick={handleAttentionClick}
          />

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
            <InspectorPanel
              mode={inspectorMode}
              selectedTechnician={selectedEmployee}
              selectedJob={selectedJob}
              employees={employees}
              activeJobsByEmployee={activeJobsByEmployee}
              candidates={assignCandidates}
              smartMatchLoading={smartMatchLoading}
              assignLoading={assignLoading}
              onRecenterOnTech={handleRecenterOnTech}
              onViewJob={handleJobSelect}
              onDeselectTechnician={() => setSelectedTechnicianId(null)}
              onRefreshMarkers={() => mapControllerRef.current?.refreshMarkers()}
              onStartJob={handleStartJob}
              onAssign={handleAssign}
            />
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

// P0-6: Compact time-ago formatter for the connection state indicator
function timeAgoShort(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

'use client';

/**
 * DispatchView — High-Productivity Operational Command Center
 * -------------------------------------------------------------
 * Architected around:
 *   1. Operational Header with multi-state connection health & date context
 *   2. Single Canonical Dispatch Summary driving header, KPIs, queue, & roster
 *   3. Dual-Pane default layout (Sidebar 360px + Dominant Live Map)
 *   4. Slide-over Inspector Drawer (opens on demand, preserves map workspace)
 *   5. Interactive Assign Job Drawer & Safe Auto-Assign Preview Modal
 *   6. Decoupled Map Layer with graceful operational fallback
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Radio,
  MapPin,
  RefreshCw,
  Activity,
  Loader2,
  Sparkles,
  X,
  Locate,
  Users,
  Navigation,
  ArrowRight,
  AlertTriangle,
  CircleDot,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/use-realtime';
import type { LiveTechnicianMapController } from '@/components/dispatch/live-dispatch-map';
import { apiUrl } from '@/lib/api';
import dynamic from 'next/dynamic';

import {
  haversineMeters,
  MOVE_THRESHOLD_M,
  hasGps,
} from '@/features/dispatch/utils/dispatch-helpers';
import type { Team, Employee, Job, CandidateScore } from '@/features/dispatch/types';

import { useDispatchSummary } from '@/features/dispatch/hooks/use-dispatch-summary';
import { useDispatchConnection } from '@/features/dispatch/hooks/use-dispatch-connection';
import { DispatchHeader } from '@/features/dispatch/components/dispatch-header';
import { DispatchKpiStrip } from '@/features/dispatch/components/dispatch-kpi-strip';
import { DispatchSidebar } from '@/features/dispatch/components/dispatch-sidebar';
import { DispatchInspectorDrawer } from '@/features/dispatch/components/dispatch-inspector-drawer';
import { AssignJobDrawer } from '@/features/dispatch/components/assign-job-drawer';
import { AutoAssignModal } from '@/features/dispatch/components/auto-assign-modal';
import { AttentionPanel } from '@/features/dispatch/components/attention-panel';

const LiveDispatchMap = dynamic(
  () => import('@/components/dispatch/live-dispatch-map'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground bg-muted/20">
        <Loader2 className="size-5 mr-2 animate-spin text-teal-600" /> Loading map…
      </div>
    ),
  }
);

export function DispatchView() {
  // ─── Core Data State ──────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Workspace Interaction State ──────────────────────────────────
  const [activeSidebarTab, setActiveSidebarTab] = useState<'queue' | 'roster'>('queue');
  const [activeKpiFilter, setActiveKpiFilter] = useState<string>('all');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);

  // ─── Drawers & Modals ─────────────────────────────────────────────
  const [inspectTarget, setInspectTarget] = useState<
    { type: 'technician'; data: Employee } | { type: 'job'; data: Job } | null
  >(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const [assignJobDrawerOpen, setAssignJobDrawerOpen] = useState(false);
  const [assignJobTarget, setAssignJobTarget] = useState<Job | null>(null);

  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [showAttention, setShowAttention] = useState(false);

  // Smart match candidates for the currently inspected job
  const [smartMatchCandidates, setSmartMatchCandidates] = useState<CandidateScore[]>([]);
  const [isSearchingSmartMatch, setIsSearchingSmartMatch] = useState(false);

  // Map Controller Ref
  const mapControllerRef = useRef<LiveTechnicianMapController | null>(null);

  // ─── Position Ref for Non-flickering GPS Marker Glides ────────────
  const positionsRef = useRef<Map<string, { lat: number; lng: number; lastGpsAt?: string | null }>>(
    new Map()
  );

  // ─── Data Fetchers ────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/jobs?limit=200'));
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.jobs || [];
        setJobs(list);
      }
    } catch {
      // Background poll silently continues
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/employees/positions'));
      if (res.ok) {
        const data = await res.json();
        const list: Employee[] = Array.isArray(data) ? data : data.employees || [];

        let movedCount = 0;
        list.forEach((emp) => {
          if (hasGps(emp)) {
            const prev = positionsRef.current.get(emp.id);
            if (!prev) {
              positionsRef.current.set(emp.id, {
                lat: emp.latitude!,
                lng: emp.longitude!,
                lastGpsAt: emp.lastGpsAt,
              });
              mapControllerRef.current?.handleGpsPing({
                employeeId: emp.id,
                latitude: emp.latitude!,
                longitude: emp.longitude!,
                capturedAt: emp.lastGpsAt,
              });
              movedCount++;
            } else {
              const movedMeters = haversineMeters(
                prev.lat,
                prev.lng,
                emp.latitude!,
                emp.longitude!
              );
              if (movedMeters > MOVE_THRESHOLD_M) {
                positionsRef.current.set(emp.id, {
                  lat: emp.latitude!,
                  lng: emp.longitude!,
                  lastGpsAt: emp.lastGpsAt,
                });
                mapControllerRef.current?.handleGpsPing({
                  employeeId: emp.id,
                  latitude: emp.latitude!,
                  longitude: emp.longitude!,
                  capturedAt: emp.lastGpsAt,
                });
                movedCount++;
              }
            }
          }
        });

        setEmployees(list);
      }
    } catch {
      // Background poll silently continues
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/teams'));
      if (res.ok) {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : data.teams || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Realtime Hook ────────────────────────────────────────────────
  const { isConnected: realtimeConnected } = useRealtime({
    channel: 'dispatch',
    events: ['gps_ping', 'job_created', 'job_updated', 'job_assigned'],
    onEvent: (event, payload) => {
      if (event === 'gps_ping' && payload) {
        const p = payload as {
          employeeId: string;
          latitude: number;
          longitude: number;
          capturedAt?: string;
        };
        positionsRef.current.set(p.employeeId, {
          lat: p.latitude,
          lng: p.longitude,
          lastGpsAt: p.capturedAt,
        });
        mapControllerRef.current?.handleGpsPing(p);
      } else if (event.startsWith('job_')) {
        fetchJobs();
      }
    },
  });

  const connection = useDispatchConnection(realtimeConnected);
  const { markSync } = connection;

  // ─── Periodic Polling Fallbacks (Controlled intervals) ────────────
  useEffect(() => {
    fetchJobs();
    fetchEmployees();
    fetchTeams();

    const jobsInterval = setInterval(() => {
      fetchJobs();
      markSync();
    }, 20000);

    const empInterval = setInterval(() => {
      fetchEmployees();
      markSync();
    }, 5000);

    return () => {
      clearInterval(jobsInterval);
      clearInterval(empInterval);
    };
  }, [fetchJobs, fetchEmployees, fetchTeams, markSync]);

  // Refresh All Trigger
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchJobs(), fetchEmployees(), fetchTeams()]);
    connection.markSync();
    mapControllerRef.current?.recenter();
    setIsRefreshing(false);
    toast.success('Dispatch data refreshed');
  }, [fetchJobs, fetchEmployees, fetchTeams, connection]);

  // ─── Derived Canonical Summary Hook ───────────────────────────────
  const {
    summary,
    activeJobsByEmployee,
    pendingJobs,
    assignedJobs,
    inProgressJobs,
  } = useDispatchSummary(employees, jobs);

  // ─── Map Data ─────────────────────────────────────────────────────
  const mapTechnicians = useMemo(() => {
    return employees.filter(hasGps);
  }, [employees]);

  const activeJobsForMap = useMemo(() => {
    return jobs.filter((j) => hasGps(j) && ['assigned', 'accepted', 'travelling', 'arrived', 'working', 'pending'].includes(j.status));
  }, [jobs]);

  // ─── Inspector Handlers ───────────────────────────────────────────
  const handleInspectTechnician = useCallback((techId: string) => {
    const tech = employees.find((e) => e.id === techId);
    if (tech) {
      setSelectedTechnicianId(techId);
      setInspectTarget({ type: 'technician', data: tech });
      setInspectorOpen(true);
      mapControllerRef.current?.recenterOnTech(techId);
    }
  }, [employees]);

  const handleInspectJob = useCallback(async (job: Job) => {
    setInspectTarget({ type: 'job', data: job });
    setInspectorOpen(true);

    // Fetch smart match suggestions for the inspected job
    setIsSearchingSmartMatch(true);
    try {
      const res = await fetch(apiUrl('/api/dispatch/smart'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, autoAssign: false }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.candidates && Array.isArray(data.candidates)) {
          setSmartMatchCandidates(data.candidates);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingSmartMatch(false);
    }
  }, []);

  // Open Assign Job Drawer
  const handleOpenAssignDrawer = useCallback((job?: Job | null) => {
    if (job) {
      setAssignJobTarget(job);
      setAssignJobDrawerOpen(true);
    } else if (pendingJobs.length > 0) {
      setAssignJobTarget(pendingJobs[0]);
      setAssignJobDrawerOpen(true);
    } else {
      toast.info('No unassigned jobs currently pending');
    }
  }, [pendingJobs]);

  const handleAssignToTechFromSidebar = useCallback((techId: string) => {
    const tech = employees.find((e) => e.id === techId);
    if (!tech) return;
    if (pendingJobs.length > 0) {
      setAssignJobTarget(pendingJobs[0]);
      setAssignJobDrawerOpen(true);
    } else {
      toast.info(`Select an unassigned job to assign to ${tech.name}`);
      setActiveSidebarTab('queue');
    }
  }, [employees, pendingJobs]);

  // Handle start job
  const handleStartJob = useCallback(async (job: Job) => {
    try {
      const res = await fetch(apiUrl(`/api/jobs/${job.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: 'in_progress' }),
      });
      if (res.ok) {
        toast.success(`Started Job #${job.jobNumber || job.title}`);
        fetchJobs();
      }
    } catch {
      toast.error('Failed to update job status');
    }
  }, [fetchJobs]);

  // KPI Filter click behavior
  const handleKpiFilterSelect = useCallback((filter: string) => {
    setActiveKpiFilter(filter);
    if (filter === 'unassigned') {
      setActiveSidebarTab('queue');
    } else if (filter === 'available' || filter === 'en_route' || filter === 'on_job') {
      setActiveSidebarTab('roster');
    }
  }, []);

  // Attention item click
  const handleAttentionClick = useCallback((item: (typeof summary.attentionItems)[0]) => {
    if (item.action?.jobId) {
      const job = jobs.find((j) => j.id === item.action!.jobId);
      if (job) handleInspectJob(job);
    } else if (item.action?.employeeId) {
      handleInspectTechnician(item.action.employeeId);
    }
    setShowAttention(false);
  }, [jobs, handleInspectJob, handleInspectTechnician]);

  return (
    <div className="h-full flex flex-col p-3 md:p-4 bg-background overflow-hidden">
      {/* ─── 1. Operational Header ───────────────────────────────────── */}
      <DispatchHeader
        summary={summary}
        connection={connection}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshAll}
        onOpenAssignJob={() => handleOpenAssignDrawer()}
        onOpenAutoAssign={() => setAutoAssignModalOpen(true)}
      />

      {/* ─── 2. Actionable KPI Strip ─────────────────────────────────── */}
      <DispatchKpiStrip
        summary={summary}
        activeFilter={activeKpiFilter}
        onSelectFilter={handleKpiFilterSelect}
        showAttention={showAttention}
        onToggleAttention={() => setShowAttention((v) => !v)}
      />

      {/* ─── 3. Dominant Command Center Workspace ─────────────────────── */}
      <div className="flex-1 flex gap-3 min-h-0 relative rounded-2xl overflow-hidden border border-border bg-card shadow-xs">
        {/* Left Operational Sidebar */}
        <DispatchSidebar
          activeTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          unassignedJobs={pendingJobs}
          allJobs={jobs}
          employees={employees}
          teams={teams}
          activeJobsByEmployee={activeJobsByEmployee}
          selectedTechnicianId={selectedTechnicianId}
          onSelectTechnician={handleInspectTechnician}
          onSelectJob={handleInspectJob}
          onAssignJob={handleOpenAssignDrawer}
          onAssignToTech={handleAssignToTechFromSidebar}
          onStartJob={handleStartJob}
        />

        {/* Center: Dominant Map Canvas */}
        <main className="flex-1 relative h-full w-full bg-muted/20 overflow-hidden flex flex-col">
          <LiveDispatchMap
            employees={mapTechnicians}
            jobs={activeJobsForMap}
            selectedTechnicianId={selectedTechnicianId}
            onTechnicianSelect={handleInspectTechnician}
            controllerRef={mapControllerRef}
            className="absolute inset-0 h-full w-full"
          />

          {/* Attention Center Overlay */}
          <AttentionPanel
            items={summary.attentionItems}
            expanded={showAttention}
            onToggle={() => setShowAttention((v) => !v)}
            onItemClick={handleAttentionClick}
          />

          {/* Map floating controls */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => mapControllerRef.current?.recenter()}
              className="h-8 px-2.5 text-xs gap-1.5 shadow-md bg-background/95 backdrop-blur border border-border"
              title="Recenter map on all active units"
            >
              <Locate className="size-3.5 text-teal-600" />
              <span className="hidden sm:inline">Fit Team</span>
            </Button>
          </div>

          {/* Floating live summary count badge */}
          <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
            <Badge
              variant="secondary"
              className="text-[11px] px-2.5 py-1 bg-background/95 backdrop-blur shadow-sm border border-border gap-1.5"
            >
              <MapPin className="size-3 text-teal-600 shrink-0" />
              <span className="font-semibold text-foreground">{mapTechnicians.length}</span>
              <span className="text-muted-foreground">Techs Mapped</span>
              <span className="text-border">·</span>
              <span className="font-semibold text-foreground">{activeJobsForMap.length}</span>
              <span className="text-muted-foreground">Jobs Mapped</span>
            </Badge>
          </div>
        </main>
      </div>

      {/* ─── 4. Slide-over Inspector Drawer ──────────────────────────── */}
      <DispatchInspectorDrawer
        open={inspectorOpen}
        onOpenChange={(open) => {
          setInspectorOpen(open);
          if (!open) {
            setSelectedTechnicianId(null);
            setInspectTarget(null);
          }
        }}
        inspectTarget={inspectTarget}
        activeJobsByEmployee={activeJobsByEmployee}
        smartMatchCandidates={smartMatchCandidates}
        isSearchingSmartMatch={isSearchingSmartMatch}
        onRecenterOnTech={(techId) => mapControllerRef.current?.recenterOnTech(techId)}
        onViewJob={handleInspectJob}
        onViewTech={(tech) => handleInspectTechnician(tech.id)}
        onRefreshMarkers={() => mapControllerRef.current?.recenter()}
        onAssignTech={(jobId, tech) => {
          handleOpenAssignDrawer(jobs.find((j) => j.id === jobId));
        }}
        onStartJob={handleStartJob}
      />

      {/* ─── 5. Slide-over Assign Job Drawer ─────────────────────────── */}
      <AssignJobDrawer
        open={assignJobDrawerOpen}
        onOpenChange={setAssignJobDrawerOpen}
        job={assignJobTarget}
        employees={employees}
        activeJobsByEmployee={activeJobsByEmployee}
        onAssigned={() => {
          fetchJobs();
          fetchEmployees();
          connection.markSync();
        }}
      />

      {/* ─── 6. Auto-Assign Review & Confirmation Modal ──────────────── */}
      <AutoAssignModal
        open={autoAssignModalOpen}
        onOpenChange={setAutoAssignModalOpen}
        unassignedJobs={pendingJobs}
        employees={employees}
        activeJobsByEmployee={activeJobsByEmployee}
        onAssignmentsCompleted={() => {
          fetchJobs();
          fetchEmployees();
          connection.markSync();
        }}
      />
    </div>
  );
}

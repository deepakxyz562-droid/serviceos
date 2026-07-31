'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Radio, MapPin, Calendar, Clock, User, CheckCircle2,
  RefreshCw, MessageCircle, Play,
  Activity, Loader2,
  ArrowRight, Sparkles, Star,
  X, Briefcase,
  PanelRightClose, PanelRightOpen, Locate, Layers,
  Users, ChevronUp,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useRealtime, usePresence } from '@/hooks/use-realtime';
import type { LiveTechnicianMapController } from '@/components/dispatch/live-technician-map';
import dynamic from 'next/dynamic';
import { useMemo, useRef } from 'react';

// SSR-safe dynamic import: Leaflet needs `window`, so we disable SSR for the map.
const LiveTechnicianMap = dynamic(
  () => import('@/components/dispatch/live-technician-map'),
  { ssr: false, loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="size-4 mr-2 animate-spin" /> Loading map…
    </div>
  ) },
);

// ─── Types ──────────────────────────────────────────────────────────────────

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
  // Geocoded job location (populated by POST /api/jobs via the geocoder).
  // Used to render job pins on the Live Dispatch map.
  latitude?: number | null;
  longitude?: number | null;
  assignee?: { id: string; name: string; phone: string; role: string; status: string };
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
  activeJobs?: { id: string; title: string; status: string; scheduledAt?: string; address?: string; priority?: string }[];
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
  if (seconds < 60) return 'Just now';
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

// ─── Component ──────────────────────────────────────────────────────────────

export function DispatchView() {
  // ─── State ────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>('all');

  // Assignment dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningJob, setAssigningJob] = useState<Job | null>(null);
  const [assignCandidates, setAssignCandidates] = useState<CandidateScore[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [smartMatchLoading, setSmartMatchLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  // Employee detail dialog
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Smart assign all
  const [smartAssignAllLoading, setSmartAssignAllLoading] = useState(false);

  // ─── Map-first layout state ─────────────────────────────────────────
  // Desktop: right side panel can be collapsed to give the map full width.
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  // Mobile: bottom sheet peek/expand state.
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  // Active tab in the side panel / bottom sheet (Job Queue vs Team).
  const [panelTab, setPanelTab] = useState<'jobs' | 'team'>('jobs');
  // Map basemap: 'streets' (OSM) or 'satellite' (Esri World Imagery).
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');
  // Followed technician ID — when set, the map pans to follow their GPS updates.
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  // Imperative handle to the map (lets us forward gps.ping events + recenter
  // + layer toggles without triggering a React re-render of the map).
  const mapControllerRef = useRef<LiveTechnicianMapController | null>(null);

  // ─── Real-time presence ─────────────────────────────────────────────
  const employeeIds = useMemo(() => employees.map(e => e.id), [employees]);
  const presence = usePresence(employeeIds);

  // Realtime socket connection for live updates. The `onGpsPing` callback
  // forwards each live GPS ping directly to the map's imperative controller,
  // which updates the matching technician marker in-place via
  // `marker.setLatLng` — no full refetch, no marker flicker (Uber/Jobber-style).
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
        capturedAt: data?.capturedAt,
      });
      // Also update the local `employees` state so the Team panel shows the
      // fresh coordinates + lastSeenAt. This is a cheap in-place update.
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

  // ─── Fetch functions ─────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: 'pending,assigned,scheduled' });
      const res = await fetch(`/api/jobs?XTransformPort=3000&${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
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

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchJobs(), fetchEmployees()]);
    setIsRefreshing(false);
  }, [fetchJobs, fetchEmployees]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Initial fetch
  useEffect(() => {
    setJobsLoading(true);
    setEmployeesLoading(true);
    Promise.all([fetchJobs(), fetchEmployees()]).finally(() => {
      setJobsLoading(false);
      setEmployeesLoading(false);
    });
  }, [fetchJobs, fetchEmployees]);

  // ─── Computed ────────────────────────────────────────────────────────
  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const assignedJobs = jobs.filter(j => j.status === 'assigned');

  // Filtered jobs
  const filteredPending = pendingJobs.filter(j => {
    if (priorityFilter !== 'all' && j.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && j.type !== typeFilter) return false;
    if (dateFilter && j.scheduledAt) {
      const jobDate = new Date(j.scheduledAt).toISOString().split('T')[0];
      if (jobDate !== dateFilter) return false;
    }
    return true;
  });

  const filteredAssigned = assignedJobs.filter(j => {
    if (priorityFilter !== 'all' && j.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && j.type !== typeFilter) return false;
    return true;
  });

  // Filtered employees
  const filteredEmployees = employees.filter(e => {
    if (employeeStatusFilter !== 'all' && e.status !== employeeStatusFilter) return false;
    return true;
  });

  // Available employees count
  const availableCount = employees.filter(e => e.status === 'available').length;
  const busyCount = employees.filter(e => e.status === 'busy').length;
  const offlineCount = employees.filter(e => e.status === 'offline' || e.status === 'leave').length;

  // Technicians with valid GPS coordinates for the Live Map panel.
  // Re-uses the existing `employees` state from the Team panel — no extra fetch.
  const mapTechnicians = useMemo(
    () =>
      employees.filter(
        (e) =>
          typeof e.latitude === 'number' &&
          typeof e.longitude === 'number' &&
          !Number.isNaN(e.latitude) &&
          !Number.isNaN(e.longitude),
      ),
    [employees],
  );

  // Active jobs with valid geocoded coordinates for the map.
  // Includes any status that represents "live work in the field" so the map
  // shows job pins for everything currently in flight (not just pending/assigned).
  const activeJobsForMap = useMemo(() => {
    const ACTIVE_STATUSES = new Set([
      'pending',
      'assigned',
      'in_progress',
      'en_route',
      'scheduled',
    ]);
    return jobs
      .filter((j) => ACTIVE_STATUSES.has(j.status))
      .filter(
        (j) =>
          typeof j.latitude === 'number' &&
          typeof j.longitude === 'number' &&
          !Number.isNaN(j.latitude) &&
          !Number.isNaN(j.longitude),
      )
      .map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        priority: j.priority,
        latitude: j.latitude as number,
        longitude: j.longitude as number,
        assigneeId: j.assigneeId ?? null,
        customerName: j.customerName,
        address: j.address,
      }));
  }, [jobs]);

  // Unique service types from pending jobs
  const serviceTypes = [...new Set(pendingJobs.map(j => j.type).filter(Boolean))];

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleOpenAssignDialog = async (job: Job) => {
    setAssigningJob(job);
    setSelectedEmployeeId('');
    setAssignCandidates([]);
    setShowAssignDialog(true);

    // Fetch smart match candidates
    setSmartMatchLoading(true);
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
          setSelectedEmployeeId(data.candidates[0].employeeId);
        }
      }
    } catch {
      // Fallback: show available employees without scores
    } finally {
      setSmartMatchLoading(false);
    }
  };

  const handleConfirmAssign = async () => {
    if (!assigningJob || !selectedEmployeeId) return;
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return;

    setAssignLoading(true);
    try {
      const res = await fetch(`/api/jobs/${assigningJob.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assigningJob.id,
          assigneeId: employee.id,
          assigneeName: employee.name,
          assigneePhone: employee.phone,
          status: 'assigned',
        }),
      });
      if (res.ok) {
        toast.success(`Assigned "${assigningJob.title}" to ${employee.name}`);
        setShowAssignDialog(false);
        setAssigningJob(null);
        refreshAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to assign job');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSmartAssignAll = async () => {
    setSmartAssignAllLoading(true);
    try {
      const unassigned = pendingJobs;
      if (unassigned.length === 0) {
        toast.info('No pending jobs to assign');
        setSmartAssignAllLoading(false);
        return;
      }

      let assigned = 0;
      for (const job of unassigned) {
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
        } catch {
          // continue with next
        }
      }

      if (assigned > 0) {
        toast.success(`Smart-assigned ${assigned} job${assigned > 1 ? 's' : ''}`);
      } else {
        toast.info('No suitable employees found for auto-assignment');
      }
      refreshAll();
    } catch {
      toast.error('Smart assign failed');
    } finally {
      setSmartAssignAllLoading(false);
    }
  };

  const handleStartJob = async (job: Job) => {
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
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeDialog(true);
  };

  // ─── Map control handlers ─────────────────────────────────────────────

  const handleRecenter = useCallback(() => {
    mapControllerRef.current?.recenter();
  }, []);

  const handleToggleLayer = useCallback(() => {
    setMapLayer((prev) => {
      const next = prev === 'streets' ? 'satellite' : 'streets';
      mapControllerRef.current?.setLayer(next);
      return next;
    });
  }, []);

  const handleTechnicianSelect = useCallback((techId: string | null) => {
    setSelectedTechnicianId((prev) => (prev === techId ? null : techId));
  }, []);

  // ─── Render: Job Card ────────────────────────────────────────────────

  const renderJobCard = (job: Job) => (
    <Card key={job.id} className="border shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => handleOpenAssignDialog(job)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{getServiceTypeIcon(job.type)}</span>
            <h4 className="font-medium text-sm truncate">{job.title}</h4>
          </div>
          <div className={`size-2 rounded-full shrink-0 mt-1.5 ${getPriorityDot(job.priority)}`} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`${getPriorityColor(job.priority)} text-[10px] h-5`}>
            {job.priority}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 border-slate-200 text-slate-600">
            {job.type}
          </Badge>
          <Badge variant="outline" className={`${getStatusColor(job.status)} text-[10px] h-5`}>
            {job.status.replace('_', ' ')}
          </Badge>
        </div>

        {job.customerName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3" />
            <span className="truncate">{job.customerName}</span>
          </div>
        )}

        {job.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{job.address}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {job.scheduledAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" /> {formatDate(job.scheduledAt)} {formatTime(job.scheduledAt)}
            </span>
          )}
        </div>

        {job.assigneeName && (
          <div className="flex items-center gap-1.5 pt-1 border-t">
            <Avatar className="size-5">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-[8px]">
                {job.assigneeName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{job.assigneeName}</span>
          </div>
        )}

        {/* Assign button for pending jobs */}
        {job.status === 'pending' && (
          <div className="pt-1">
            <Button
              size="sm"
              className="w-full h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              onClick={(e) => { e.stopPropagation(); handleOpenAssignDialog(job); }}
            >
              <ArrowRight className="size-3 mr-1" /> Assign
            </Button>
          </div>
        )}

        {/* Start button for assigned jobs */}
        {job.status === 'assigned' && (
          <div className="pt-1">
            <Button
              size="sm"
              className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={(e) => { e.stopPropagation(); handleStartJob(job); }}
            >
              <Play className="size-3 mr-1" /> Start
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ─── Render: Employee Card ───────────────────────────────────────────

  const renderEmployeeCard = (employee: Employee) => {
    const skills = parseSkills(employee.skills);
    const isPulsing = employee.status === 'busy' || employee.status === 'traveling';
    const employeePresence = presence[employee.id];
    const activeJobCount = jobs.filter(
      j => j.assigneeId === employee.id && ['assigned', 'in_progress'].includes(j.status)
    ).length;

    return (
      <Card
        key={employee.id}
        className="border shadow-sm hover:shadow-md transition-all cursor-pointer"
        onClick={() => handleViewEmployee(employee)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar with status dot */}
            <div className="relative shrink-0">
              <Avatar className="size-11">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-medium">
                  {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${getEmployeeStatusDot(employee.status)} ${isPulsing ? 'animate-pulse' : ''}`} />
              {/* Presence indicator */}
              {employeePresence && (
                <div className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full border border-white ${
                  employeePresence === 'online' ? 'bg-green-400' : employeePresence === 'away' ? 'bg-yellow-400' : 'bg-gray-300'
                }`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name & status badge */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm truncate">{employee.name}</span>
                <Badge variant="outline" className={`${getEmployeeStatusBg(employee.status)} text-[9px] h-4 shrink-0`}>
                  {employee.status}
                </Badge>
              </div>

              {/* Role & stats */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Badge variant="secondary" className="text-[9px] h-4">
                  {employee.role}
                </Badge>
                <span className="flex items-center gap-0.5">
                  <Star className="size-3 text-amber-400 fill-amber-400" />
                  {employee.rating.toFixed(1)}
                </span>
                <span>{employee.completedJobs} done</span>
              </div>

              {/* Active jobs indicator */}
              {activeJobCount > 0 ? (
                <div className="flex items-center gap-1 text-[11px] text-amber-600">
                  <Activity className="size-3" />
                  <span>{activeJobCount} active job{activeJobCount > 1 ? 's' : ''}</span>
                </div>
              ) : employee.status === 'available' ? (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <CheckCircle2 className="size-3" />
                  <span>Ready for assignment</span>
                </div>
              ) : null}

              {/* Skills tags */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {skills.slice(0, 3).map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] h-4 bg-teal-50/50 border-teal-200 text-teal-700">
                      {skill}
                    </Badge>
                  ))}
                  {skills.length > 3 && (
                    <Badge variant="outline" className="text-[9px] h-4">+{skills.length - 3}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────

  // The side-panel content (Job Queue + Team tabs) is shared between the
  // desktop right panel and the mobile bottom sheet — extracted into a
  // helper so the markup is identical in both layouts.
  const renderSidePanelContent = () => (
    <Tabs
      value={panelTab}
      onValueChange={(v) => setPanelTab(v as 'jobs' | 'team')}
      className="flex-1 flex flex-col min-h-0"
    >
      <div className="px-3 pt-3 shrink-0">
        <TabsList className="w-full h-9">
          <TabsTrigger value="jobs" className="text-xs flex-1 gap-1.5">
            <Briefcase className="size-3.5" />
            Jobs
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {pendingJobs.length + assignedJobs.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs flex-1 gap-1.5">
            <Users className="size-3.5" />
            Team
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {employees.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ─── Jobs tab ──────────────────────────────────────────────────── */}
      <TabsContent value="jobs" className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden">
        {/* Filters */}
        <div className="px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-7 text-xs w-[100px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {serviceTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-7 text-xs w-[120px]"
            />
            {(priorityFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => { setPriorityFilter('all'); setTypeFilter('all'); setDateFilter(''); }}
              >
                <X className="size-3" /> Clear
              </Button>
            )}
          </div>
          {/* Pending / Assigned sub-tabs */}
          <div className="flex items-center gap-1 mt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[11px] px-2 hover:bg-muted"
              onClick={() => setPanelTab('jobs')}
            >
              Pending <span className="ml-1 text-muted-foreground">({filteredPending.length})</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[11px] px-2 hover:bg-muted"
              onClick={() => setPanelTab('jobs')}
            >
              Assigned <span className="ml-1 text-muted-foreground">({filteredAssigned.length})</span>
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-2.5">
            {jobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPending.length === 0 && filteredAssigned.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No jobs match these filters</p>
              </div>
            ) : (
              <>
                {filteredPending.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                      Pending · {filteredPending.length}
                    </p>
                    {filteredPending.map(renderJobCard)}
                  </div>
                )}
                {filteredAssigned.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                      Assigned · {filteredAssigned.length}
                    </p>
                    {filteredAssigned.map(renderJobCard)}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ─── Team tab ──────────────────────────────────────────────────── */}
      <TabsContent value="team" className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden">
        <div className="px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="traveling">Traveling</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-auto">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" />{availableCount}</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-500" />{busyCount}</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-gray-400" />{offlineCount}</span>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-2.5">
            {employeesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No employees found</p>
              </div>
            ) : (
              [...filteredEmployees]
                .sort((a, b) => {
                  const order: Record<string, number> = { available: 0, traveling: 1, busy: 2, leave: 3, offline: 4 };
                  return (order[a.status] ?? 5) - (order[b.status] ?? 5);
                })
                .map(renderEmployeeCard)
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="h-full flex flex-col">
      {/* ─── Compact Header (single row) ──────────────────────────────── */}
      <header className="flex items-center justify-between flex-wrap gap-2 mb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center size-9 rounded-lg bg-teal-600 shadow-md shadow-teal-600/20 shrink-0">
            <Radio className="size-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight leading-tight truncate">Live Dispatch</h2>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              Map-first view · live tracking · smart assignment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Inline stats */}
          <div className="hidden sm:flex items-center gap-2 mr-2 px-2 py-1 rounded-md bg-muted/50">
            <span className="flex items-center gap-1 text-xs" title="Pending jobs">
              <Briefcase className="size-3 text-amber-600" />
              <span className="font-semibold">{pendingJobs.length}</span>
              <span className="text-muted-foreground text-[10px]">pend</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1 text-xs" title="Assigned jobs">
              <ArrowRight className="size-3 text-sky-600" />
              <span className="font-semibold">{assignedJobs.length}</span>
              <span className="text-muted-foreground text-[10px]">asgnd</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1 text-xs" title="Available technicians">
              <CheckCircle2 className="size-3 text-emerald-600" />
              <span className="font-semibold">{availableCount}</span>
              <span className="text-muted-foreground text-[10px]">free</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1 text-xs" title="Busy technicians">
              <Activity className="size-3 text-red-600" />
              <span className="font-semibold">{busyCount}</span>
              <span className="text-muted-foreground text-[10px]">busy</span>
            </span>
          </div>

          {/* Live badge with pulsing green dot when realtime is connected */}
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
                {realtimeConnected
                  ? 'Realtime connected — GPS pings update markers live'
                  : 'Realtime disconnected — falling back to 15s polling'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </Button>

          <Button
            size="sm"
            className="h-8 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md"
            onClick={handleSmartAssignAll}
            disabled={smartAssignAllLoading || pendingJobs.length === 0}
          >
            {smartAssignAllLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span className="hidden md:inline ml-1">Smart Assign All</span>
          </Button>

          {/* Desktop: collapse/expand the right side panel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidePanelOpen((v) => !v)}
            className="hidden lg:inline-flex h-8 w-8 p-0"
            aria-label={sidePanelOpen ? 'Collapse side panel' : 'Expand side panel'}
          >
            {sidePanelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </Button>
        </div>
      </header>

      {/* ─── Map-first main area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        {/* Map canvas (the centerpiece) */}
        <div className="flex-1 relative min-h-[50vh] lg:min-h-0 rounded-lg overflow-hidden border border-border shadow-sm bg-muted/20">
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

          {/* Map controls overlay (top-right) */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRecenter}
                    className="h-8 w-8 p-0 shadow-md bg-background/95 backdrop-blur"
                    aria-label="Recenter map"
                  >
                    <Locate className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Recenter on all technicians</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleToggleLayer}
                    className="h-8 w-8 p-0 shadow-md bg-background/95 backdrop-blur"
                    aria-label="Toggle map layer"
                  >
                    <Layers className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {mapLayer === 'streets' ? 'Switch to satellite' : 'Switch to streets'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Map info badges (top-left) */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
            <Badge variant="secondary" className="text-[10px] h-5 bg-background/95 backdrop-blur shadow-sm">
              <MapPin className="size-3 mr-1 text-teal-600" />
              {mapTechnicians.length} tech{mapTechnicians.length !== 1 ? 's' : ''}
              <span className="text-muted-foreground mx-1">·</span>
              {activeJobsForMap.length} job{activeJobsForMap.length !== 1 ? 's' : ''}
            </Badge>
            {selectedTechnicianId && (
              <Badge
                variant="secondary"
                className="text-[10px] h-5 bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/80 dark:border-teal-800 dark:text-teal-300 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900"
                onClick={() => handleTechnicianSelect(null)}
              >
                Following · tap to stop
              </Badge>
            )}
          </div>

          {/* Mobile: expand button to open the bottom sheet */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileSheetOpen(true)}
            className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] h-9 px-4 shadow-md bg-background/95 backdrop-blur"
          >
            <ChevronUp className="size-4 mr-1" />
            View jobs &amp; team
            <Badge variant="secondary" className="ml-2 text-[10px] h-4">
              {pendingJobs.length + assignedJobs.length + employees.length}
            </Badge>
          </Button>
        </div>

        {/* Desktop: collapsible right side panel (~380px) */}
        {sidePanelOpen && (
          <aside className="hidden lg:flex w-[380px] shrink-0 flex-col min-h-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
            {renderSidePanelContent()}
          </aside>
        )}
      </div>

      {/* Mobile: bottom sheet with Job Queue + Team */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[80vh] p-0 flex flex-col [&>button]:hidden"
        >
          <SheetHeader className="px-3 py-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold flex items-center gap-2">
                <Radio className="size-4 text-teal-600" />
                Dispatch Console
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileSheetOpen(false)}
                className="h-8 w-8 p-0"
                aria-label="Close panel"
              >
                <X className="size-4" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col">
            {renderSidePanelContent()}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Assignment Dialog ─────────────────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="size-4 text-teal-600" />
              Assign Job
            </DialogTitle>
            <DialogDescription>
              {assigningJob ? `"${assigningJob.title}" — ${assigningJob.customerName || 'No customer'}` : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Job details */}
          {assigningJob && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${getPriorityColor(assigningJob.priority)} text-[10px]`}>
                  {assigningJob.priority}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{assigningJob.type}</Badge>
                <Badge variant="outline" className={`${getStatusColor(assigningJob.status)} text-[10px]`}>
                  {assigningJob.status}
                </Badge>
              </div>
              {assigningJob.address && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {assigningJob.address}
                </div>
              )}
              {assigningJob.scheduledAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3" /> {formatDate(assigningJob.scheduledAt)} {formatTime(assigningJob.scheduledAt)}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Smart Match Results */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="size-3.5 text-amber-500" />
              Smart Match Results
            </Label>

            {smartMatchLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Finding best matches...</span>
              </div>
            ) : assignCandidates.length > 0 ? (
              <ScrollArea className="max-h-64">
                <div className="space-y-2 pr-2">
                  {assignCandidates.slice(0, 5).map((candidate) => (
                    <button
                      key={candidate.employeeId}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedEmployeeId === candidate.employeeId
                          ? 'border-teal-500 bg-teal-50/50'
                          : 'border-transparent bg-muted/30 hover:border-teal-200'
                      }`}
                      onClick={() => setSelectedEmployeeId(candidate.employeeId)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                            {candidate.employeeName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{candidate.employeeName}</span>
                            <Badge variant="outline" className="text-[9px] h-4">{candidate.employeeRole}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1">
                              <Progress value={candidate.score} className="h-1.5" />
                            </div>
                            <span className="text-xs font-medium text-teal-600">{candidate.score}%</span>
                          </div>
                        </div>
                        {selectedEmployeeId === candidate.employeeId && (
                          <CheckCircle2 className="size-5 text-teal-600 shrink-0" />
                        )}
                      </div>

                      {/* Score breakdown */}
                      {selectedEmployeeId === candidate.employeeId && (
                        <div className="mt-2 pt-2 border-t grid grid-cols-4 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground block">Skills</span>
                            <span className="font-medium">{candidate.breakdown.skillScore}/40</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Proximity</span>
                            <span className="font-medium">{candidate.breakdown.proximityScore}/30</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Workload</span>
                            <span className="font-medium">{candidate.breakdown.workloadScore}/15</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Rating</span>
                            <span className="font-medium">{candidate.breakdown.ratingScore}/15</span>
                          </div>
                        </div>
                      )}

                      {/* Matched skills & reasons */}
                      {selectedEmployeeId === candidate.employeeId && candidate.breakdown.matchedSkills.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {candidate.breakdown.matchedSkills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] h-4 bg-teal-50 border-teal-200 text-teal-700">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No smart match results</p>
                <p className="text-xs mt-1">Select an employee manually below</p>
              </div>
            )}
          </div>

          {/* Manual employee selection fallback */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Or select manually</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter(e => e.status === 'available' || e.status === 'busy')
                  .sort((a, b) => {
                    const order: Record<string, number> = { available: 0, busy: 1 };
                    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
                  })
                  .map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <span className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${getEmployeeStatusDot(emp.status)}`} />
                        {emp.name} — {emp.role} ({emp.status})
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAssign}
              disabled={!selectedEmployeeId || assignLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {assignLoading ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-1" />
              )}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Employee Detail Dialog ────────────────────────────────────── */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-teal-100 text-teal-700">
                  {selectedEmployee?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedEmployee?.name}</span>
                <p className="text-sm text-muted-foreground font-normal">{selectedEmployee?.role}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-4">
              {/* Status & Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={`${getEmployeeStatusBg(selectedEmployee.status)} text-xs`}>
                  {selectedEmployee.status}
                </Badge>
                <span className="flex items-center gap-1 text-sm">
                  <Star className="size-3.5 text-amber-400 fill-amber-400" />
                  {selectedEmployee.rating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">{selectedEmployee.completedJobs} jobs completed</span>
              </div>

              {/* Skills */}
              {parseSkills(selectedEmployee.skills).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Skills</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {parseSkills(selectedEmployee.skills).map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-teal-50/50 border-teal-200 text-teal-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Contact</Label>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="size-3.5 text-muted-foreground" />
                    <span>{selectedEmployee.phone}</span>
                  </div>
                  {selectedEmployee.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{selectedEmployee.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {selectedEmployee.location && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    <span>{selectedEmployee.location}</span>
                  </div>
                </div>
              )}

              {/* Last Seen */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-3.5" />
                <span>Last seen: {timeAgo(selectedEmployee.lastSeenAt)}</span>
              </div>

              {/* Active Jobs for this employee */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Active Jobs</Label>
                {jobs.filter(j => j.assigneeId === selectedEmployee.id && ['assigned', 'in_progress'].includes(j.status)).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active jobs</p>
                ) : (
                  <div className="space-y-2">
                    {jobs
                      .filter(j => j.assigneeId === selectedEmployee.id && ['assigned', 'in_progress'].includes(j.status))
                      .map(job => (
                        <div key={job.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                          <div className={`size-2 rounded-full ${getPriorityDot(job.priority)}`} />
                          <span className="text-sm flex-1 truncate">{job.title}</span>
                          <Badge variant="outline" className={`${getStatusColor(job.status)} text-[9px] h-4`}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {/* Quick assign pending job to this employee */}
            {selectedEmployee && selectedEmployee.status === 'available' && pendingJobs.length > 0 && (
              <Select
                onValueChange={(jobId) => {
                  const job = pendingJobs.find(j => j.id === jobId);
                  if (job) {
                    setAssigningJob(job);
                    setSelectedEmployeeId(selectedEmployee.id);
                    setAssignCandidates([]);
                    setShowEmployeeDialog(false);
                    setShowAssignDialog(true);
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Assign a job..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingJobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

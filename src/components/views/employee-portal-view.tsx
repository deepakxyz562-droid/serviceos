'use client';

/**
 * EmployeePortalView — admin *preview* of the technician-facing portal.
 *
 * Renders the portal UI inside <GpsTrackingProvider previewMode> so the GPS
 * banner + status indicators behave exactly like the real employee portal,
 * BUT no real GPS pings are POSTed to /api/gps/track. This prevents an admin
 * viewing the preview from a desktop browser from polluting the dispatch map
 * with their desktop coordinates. Real technicians see this same UI on
 * /portal/[id] via EmployeePortalLayout.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Phase 6A1 extraction (this commit)
 * ────────────────────────────────────────────────────────────────────────────
 * The 10 inline sub-components (ActiveJobCard, JobCard, PendingJobCard,
 * UpcomingJobRow, ActiveJobActionBar, SummaryCard, QuickAction,
 * ValidationItem, TimestampItem, GpsStatusBannerAdminPreview) and the 4
 * inline dialogs (PhotoCaptureDialog, SignatureDialog, ChecklistDialog,
 * CompleteJobDialog) now live under src/features/employee-portal/components/.
 * Shared types live under src/features/employee-portal/types/. Display
 * constants (PRIORITY_*, LIFECYCLE_*) and portal-specific formatters
 * (formatDistance, formatTimer) live under
 * src/features/employee-portal/utils/portal-helpers.ts. Date/time/relative
 * formatters are imported from the shared @/lib/format-utils.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Calendar, CheckCircle2, Clock, Loader2,
  ChevronDown, ChevronUp,
  Wifi, WifiOff, Bell,
  Briefcase, Route as RouteIcon,
  LogIn, LogOut, Coffee, Play, Camera, FileText,
  AlertTriangle, MapPinned,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/use-realtime';
import { authFetch } from '@/lib/client-auth';
import { GpsTrackingProvider, useGpsTracking } from '@/hooks/use-gps-tracking';
import { formatDistance, formatTimer } from '@/features/employee-portal/utils/portal-helpers';
import { formatMinutes, formatTime } from '@/lib/format-utils';
import type {
  Employee, Job, ShiftData, TodayTotals,
  LifecycleAction, PhotoType, ShiftStatus,
} from '@/features/employee-portal/types';
import { SummaryCard } from '@/features/employee-portal/components/summary-card';
import { QuickAction } from '@/features/employee-portal/components/quick-action';
import { GpsStatusBannerAdminPreview } from '@/features/employee-portal/components/gps-status-banner-admin-preview';
import { ActiveJobCard } from '@/features/employee-portal/components/active-job-card';
import { PendingJobCard } from '@/features/employee-portal/components/pending-job-card';
import { JobCard } from '@/features/employee-portal/components/job-card';
import { UpcomingJobRow } from '@/features/employee-portal/components/upcoming-job-row';
import { ActiveJobActionBar } from '@/features/employee-portal/components/active-job-action-bar';
import { PhotoCaptureDialog } from '@/features/employee-portal/components/photo-capture-dialog';
import { SignatureDialog } from '@/features/employee-portal/components/signature-dialog';
import { ChecklistDialog } from '@/features/employee-portal/components/checklist-dialog';
import { CompleteJobDialog } from '@/features/employee-portal/components/complete-job-dialog';
import { CompletedTodayCard } from '@/features/employee-portal/components/completed-today-card';

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Public wrapper. Lifts employeeId to the GpsTrackingProvider so the provider
 * can be passed the id as soon as the inner component fetches it (without
 * requiring the inner component to render the provider itself).
 */
export function EmployeePortalView() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  return (
    <GpsTrackingProvider employeeId={employeeId} previewMode>
      <EmployeePortalViewInner onEmployeeId={setEmployeeId} />
    </GpsTrackingProvider>
  );
}

function EmployeePortalViewInner({ onEmployeeId }: { onEmployeeId: (id: string | null) => void }) {
  // ── State ──
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [todayJobs, setTodayJobs] = useState<Job[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null);
  const [todayTotals, setTodayTotals] = useState<TodayTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Photo capture dialog
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoJobId, setPhotoJobId] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>('before');

  // Signature dialog
  const [showSignature, setShowSignature] = useState(false);
  const [signatureJobId, setSignatureJobId] = useState<string | null>(null);

  // Checklist dialog
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistJobId, setChecklistJobId] = useState<string | null>(null);

  // Complete dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);

  // Live timer (ticks every second to update elapsed displays)
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // GPS tracking — delegated to the shared useGpsTracking hook (previewMode
  // is set on the provider, so no real pings are POSTed from the admin preview).
  const { gpsActive, status, lastPing, error, resync, captureOnce } = useGpsTracking();

  // Online/offline + realtime
  const [isOnline, setIsOnline] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { connected: realtimeConnected } = useRealtime({
    employeeId: currentEmployee?.id,
    onJobUpdate: useCallback(() => {
      if (currentEmployee?.id) fetchAllJobs();
    }, [currentEmployee?.id, fetchAllJobs]),
  });

  // ── Fetch Employee ──
  const fetchCurrentEmployee = useCallback(async () => {
    try {
      // Try to get the user, then the employee linked via userId
      const meRes = await authFetch('/api/auth/me');
      let userId: string | undefined;
      if (meRes.ok) {
        const meData = await meRes.json();
        userId = meData.user?.id;
      }
      const url = userId ? `/api/employees?userId=${userId}` : '/api/employees';
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          if (userId) {
            const matching = data.find((e: Employee) => (e as any).userId === userId);
            if (matching) {
              setCurrentEmployee(matching);
              return;
            }
          }
          setCurrentEmployee(data[0]);
        }
      }
    } catch {
      // Silent
    }
  }, []);

  // ── Fetch Active Shift ──
  const fetchShift = useCallback(async () => {
    try {
      const res = await authFetch('/api/employee/shift');
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.shift || null);
      }
    } catch {
      // Silent
    }
  }, []);

  // ── Fetch Today's Totals ──
  const fetchTodayTotals = useCallback(async () => {
    try {
      const res = await authFetch('/api/employee/shift/today');
      if (res.ok) {
        const data = await res.json();
        setTodayTotals(data);
        setActiveShift(data.activeShift || null);
      }
    } catch {
      // Silent
    }
  }, []);

  // ── Fetch Jobs ──
  const fetchAllJobs = useCallback(async () => {
    try {
      const [todayRes, upcomingRes, completedRes] = await Promise.all([
        fetch('/api/employee/jobs?filter=today'),
        fetch('/api/employee/jobs?filter=upcoming'),
        fetch('/api/employee/jobs?filter=completed'),
      ]);
      if (todayRes.ok) {
        const data = await todayRes.json();
        setTodayJobs(Array.isArray(data) ? data : []);
      }
      if (upcomingRes.ok) {
        const data = await upcomingRes.json();
        setUpcomingJobs(Array.isArray(data) ? data : []);
      }
      if (completedRes.ok) {
        const data = await completedRes.json();
        setCompletedJobs(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silent
    }
  }, []);

  // ── Initial Load ──
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchCurrentEmployee();
      setLoading(false);
    };
    init();
  }, [fetchCurrentEmployee]);

  // ── Load shift + jobs once employee is known ──
  useEffect(() => {
    if (!currentEmployee?.id) return;
    fetchShift();
    fetchTodayTotals();
    fetchAllJobs();
  }, [currentEmployee?.id, fetchShift, fetchTodayTotals, fetchAllJobs]);

  // ── Heartbeat every 60s (keeps employee.lastSeenAt fresh) ──
  useEffect(() => {
    if (!currentEmployee?.id) return;
    const send = async () => {
      try {
        await authFetch('/api/employees/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: currentEmployee.id }),
        });
      } catch {
        // Silent
      }
    };
    send();
    heartbeatIntervalRef.current = setInterval(send, 60000);
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [currentEmployee?.id]);

  // ── Live timer tick (every second) ──
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // ── Online/offline detection ──
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ── Notification permission ──
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // ── Lift employeeId to the wrapper so GpsTrackingProvider gets it ──
  useEffect(() => {
    onEmployeeId(currentEmployee?.id ?? null);
  }, [currentEmployee?.id, onEmployeeId]);

  // ── Refresh totals periodically when shift is active ──
  useEffect(() => {
    if (!activeShift) return;
    const id = setInterval(() => {
      fetchTodayTotals();
    }, 60000); // refresh totals every minute
    return () => clearInterval(id);
  }, [activeShift, fetchTodayTotals]);

  // ─── Lifecycle Action ─────────────────────────────────────────────────────

  const { startTracking, stopTracking } = useGpsTracking();

  const handleLifecycle = useCallback(
    async (
      action: LifecycleAction,
      jobId: string,
      opts?: { latitude?: number; longitude?: number },
    ) => {
      setActionLoading(`${action}-${jobId}`);
      try {
        // Capture GPS for lifecycle transitions that need it (best-effort).
        let bodyLatitude = opts?.latitude;
        let bodyLongitude = opts?.longitude;
        if ((action === 'start_travel' || action === 'arrive' || action === 'complete') && bodyLatitude == null) {
          const coords = await captureOnce();
          bodyLatitude = coords.latitude;
          bodyLongitude = coords.longitude;
        }
        const res = await authFetch(`/api/employee/jobs/${jobId}/lifecycle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            latitude: bodyLatitude,
            longitude: bodyLongitude,
          }),
        });
        if (res.ok) {
          const labels: Record<LifecycleAction, string> = {
            accept: 'accepted',
            start_travel: 'travel started',
            arrive: 'arrived',
            start_work: 'work started',
            pause: 'paused',
            resume: 'resumed',
            complete: 'completed',
          };
          toast.success(`Job ${labels[action] || action}`);

          // Manage GPS based on action (Phase 2 spec):
          //   start_travel → startTracking(jobId)  GPS ON
          //   arrive       → keep tracking (no-op)  GPS still ON
          //   start_work   → keep tracking (no-op)  GPS still ON
          //   complete     → stopTracking()        GPS OFF
          if (action === 'start_travel') {
            startTracking(jobId);
          } else if (action === 'complete') {
            stopTracking();
          }

          await Promise.all([fetchAllJobs(), fetchTodayTotals()]);
        } else {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          toast.error(err.error || `Failed to ${action} job`);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActionLoading(null);
      }
    },
    [captureOnce, fetchAllJobs, fetchTodayTotals, startTracking, stopTracking],
  );

  // ─── Shift Actions ────────────────────────────────────────────────────────

  const handleClockIn = async () => {
    setActionLoading('clockin');
    try {
      // Capture current position if available
      let lat: number | undefined;
      let lng: number | undefined;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // ignore — clock-in works without location
        }
      }
      const res = await authFetch('/api/employee/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.shift);
        toast.success('Clocked in — have a great shift!');
        await fetchTodayTotals();
      } else if (res.status === 409) {
        toast.info('Already clocked in');
        await fetchShift();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to clock in' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleShiftAction = async (action: 'break' | 'resume' | 'clockout') => {
    setActionLoading(`shift-${action}`);
    try {
      const res = await authFetch('/api/employee/shift', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.shift);
        const labels: Record<string, string> = {
          break: 'Break started',
          resume: 'Back to work',
          clockout: 'Clocked out — see you next time!',
        };
        toast.success(labels[action]);
        if (action === 'clockout') {
          setActiveShift(null);
        }
        await fetchTodayTotals();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update shift' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Photo / Signature / Checklist / Complete dialog openers ──────────────

  const openPhotoDialog = (jobId: string, type: PhotoType) => {
    setPhotoJobId(jobId);
    setPhotoType(type);
    setShowPhotoDialog(true);
  };

  const openSignatureDialog = (jobId: string) => {
    setSignatureJobId(jobId);
    setShowSignature(true);
  };

  const openChecklistDialog = (jobId: string) => {
    setChecklistJobId(jobId);
    setShowChecklist(true);
  };

  const openCompleteDialog = (jobId: string) => {
    setCompletingJobId(jobId);
    setShowCompleteDialog(true);
  };

  // ─── Notification Permission ─────────────────────────────────────────────

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Notifications are not supported in this browser');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') toast.success('Push notifications enabled');
      else if (permission === 'denied') toast.error('Push notifications blocked by browser');
    } catch {
      toast.error('Failed to request notification permission');
    }
  };

  // ─── Navigation ──────────────────────────────────────────────────────────

  const openNavigation = (job: Job) => {
    const dest =
      job.checkInLat && job.checkInLng
        ? `${job.checkInLat},${job.checkInLng}`
        : encodeURIComponent(job.address || job.title || '');
    if (!dest) {
      toast.error('No address or coordinates available');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const activeJob = useMemo(() => {
    // The "active" job is the one that's in the working/paused/arrived/travelling state
    return (
      todayJobs.find((j) =>
        ['working', 'paused', 'arrived', 'travelling'].includes(j.lifecycleState || ''),
      ) || null
    );
  }, [todayJobs]);

  const pendingJob = useMemo(() => {
    // Next job that needs to be accepted
    return todayJobs.find((j) => j.lifecycleState === 'assigned') || null;
  }, [todayJobs]);

  const completedToday = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return completedJobs.filter(
      (j) => j.completedAt && new Date(j.completedAt) >= startOfDay,
    );
  }, [completedJobs]);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
          <span className="text-muted-foreground text-sm">Loading your portal...</span>
        </div>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="size-8 text-amber-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No Employee Record</h3>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t find an employee record linked to your account.
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shiftStatus: ShiftStatus =
    !activeShift ? 'clocked_out' : activeShift.status === 'on_break' ? 'on_break' : 'active';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24">
      {/* ─── Offline Banner ─── */}
      {!isOnline && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-300">
          <WifiOff className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">You&apos;re Offline</p>
            <p className="text-xs text-amber-600">Actions will be queued and synced when you&apos;re back online.</p>
          </div>
        </div>
      )}

      {/* ─── Top Bar: Employee + Shift Status ─── */}
      <Card className="shadow-sm border-2" style={{ borderColor: '#10b981' }}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            {/* Avatar with shift status dot */}
            <div className="relative shrink-0">
              <Avatar className="size-12 sm:size-14 border-2 border-white shadow-md">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-base font-bold">
                  {currentEmployee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-white shadow-sm ${
                  shiftStatus === 'active'
                    ? 'bg-emerald-500'
                    : shiftStatus === 'on_break'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                }`}
              />
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold truncate">{currentEmployee.name}</h2>
                <Badge
                  variant="outline"
                  className={`text-[10px] sm:text-xs font-medium shrink-0 ${
                    shiftStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : shiftStatus === 'on_break'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {shiftStatus === 'active'
                    ? 'Clocked In'
                    : shiftStatus === 'on_break'
                      ? 'On Break'
                      : 'Clocked Out'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="capitalize">{currentEmployee.role}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  {isOnline ? (
                    <>
                      <Wifi className="size-3 text-emerald-500" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="size-3 text-amber-500" />
                      <span>Offline</span>
                    </>
                  )}
                </span>
                {realtimeConnected && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
            </div>

            {/* Live timer */}
            {activeShift && (
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {shiftStatus === 'on_break' ? 'Break' : 'Shift'}
                </div>
                <div className="text-sm sm:text-base font-mono font-bold text-emerald-700 tabular-nums">
                  {formatTimer(activeShift.clockIn)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Today's Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Briefcase className="size-4" />}
          label="Today's Jobs"
          value={String(todayTotals?.jobsAssignedToday ?? todayJobs.length)}
          accent="emerald"
        />
        <SummaryCard
          icon={<CheckCircle2 className="size-4" />}
          label="Completed"
          value={String(todayTotals?.jobsCompletedToday ?? completedToday.length)}
          accent="green"
        />
        <SummaryCard
          icon={<Clock className="size-4" />}
          label="Hours Worked"
          value={formatMinutes(todayTotals?.workingMinutes ?? 0)}
          accent="cyan"
        />
        <SummaryCard
          icon={<RouteIcon className="size-4" />}
          label="Travel Distance"
          value={formatDistance(todayTotals?.travelDistanceMeters ?? 0)}
          accent="purple"
        />
      </div>

      {/* ─── Quick Actions Row ─── */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-5 gap-2">
            {!activeShift ? (
              <QuickAction
                icon={<LogIn className="size-5" />}
                label="Clock In"
                onClick={handleClockIn}
                disabled={actionLoading === 'clockin'}
                loading={actionLoading === 'clockin'}
                accent="emerald"
              />
            ) : shiftStatus === 'on_break' ? (
              <QuickAction
                icon={<Play className="size-5" />}
                label="Resume"
                onClick={() => handleShiftAction('resume')}
                disabled={actionLoading?.startsWith('shift-')}
                loading={actionLoading === 'shift-resume'}
                accent="emerald"
              />
            ) : (
              <QuickAction
                icon={<Coffee className="size-5" />}
                label="Break"
                onClick={() => handleShiftAction('break')}
                disabled={actionLoading?.startsWith('shift-')}
                loading={actionLoading === 'shift-break'}
                accent="amber"
              />
            )}

            {activeShift && (
              <QuickAction
                icon={<LogOut className="size-5" />}
                label="Clock Out"
                onClick={() => handleShiftAction('clockout')}
                disabled={actionLoading?.startsWith('shift-')}
                loading={actionLoading === 'shift-clockout'}
                accent="red"
              />
            )}

            <QuickAction
              icon={<MapPinned className="size-5" />}
              label="My Route"
              onClick={() => toast.info('Route history view coming soon')}
              accent="purple"
            />

            <QuickAction
              icon={<Camera className="size-5" />}
              label="Camera"
              onClick={() => {
                if (activeJob) openPhotoDialog(activeJob.id, 'progress');
                else if (pendingJob) openPhotoDialog(pendingJob.id, 'before');
                else toast.info('No active job to capture photo for');
              }}
              accent="cyan"
            />

            <QuickAction
              icon={<FileText className="size-5" />}
              label="Reports"
              onClick={() => toast.info('Reports coming soon — use the admin dashboard for now')}
              accent="slate"
            />

            {!activeShift && (
              <QuickAction
                icon={<Bell className="size-5" />}
                label={notificationPermission === 'granted' ? 'Alerts On' : 'Alerts'}
                onClick={handleRequestNotificationPermission}
                accent="amber"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── GPS Status Banner (Phase 2: shared hook + declarative status + Re-sync) ─── */}
      <GpsStatusBannerAdminPreview
        gpsActive={gpsActive}
        status={status}
        lastPing={lastPing}
        error={error}
        onResync={resync}
      />

      {/* ─── Active Job (Working / Paused / Arrived / Travelling) ─── */}
      {activeJob && (
        <ActiveJobCard
          job={activeJob}
          actionLoading={actionLoading}
          onAction={handleLifecycle}
          onOpenNav={openNavigation}
          onCapturePhoto={openPhotoDialog}
          onOpenSignature={openSignatureDialog}
          onOpenChecklist={openChecklistDialog}
        />
      )}

      {/* ─── Pending Job (Needs Acceptance) ─── */}
      {!activeJob && pendingJob && (
        <PendingJobCard
          job={pendingJob}
          actionLoading={actionLoading}
          onAccept={(id) => handleLifecycle('accept', id)}
          onOpenNav={openNavigation}
        />
      )}

      {/* ─── Today's Jobs List ─── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Calendar className="size-3.5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Today&apos;s Jobs</CardTitle>
                <CardDescription className="text-xs">
                  {todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''} scheduled today
                </CardDescription>
              </div>
            </div>
            {todayJobs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {todayJobs.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {todayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No jobs scheduled for today</p>
              <p className="text-xs mt-1">Enjoy the breather — or check Upcoming below.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[28rem]">
              <div className="space-y-2 pr-1">
                {todayJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    expanded={expandedJob === job.id}
                    onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                    actionLoading={actionLoading}
                    onAction={handleLifecycle}
                    onOpenNav={openNavigation}
                    onCapturePhoto={openPhotoDialog}
                    onOpenSignature={openSignatureDialog}
                    onOpenChecklist={openChecklistDialog}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ─── Upcoming Jobs (Collapsible) ─── */}
      {upcomingJobs.length > 0 && (
        <Card className="shadow-sm">
          <button
            className="w-full text-left"
            onClick={() => setUpcomingExpanded(!upcomingExpanded)}
          >
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Calendar className="size-3.5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Upcoming Jobs</CardTitle>
                    <CardDescription className="text-xs">
                      {upcomingJobs.length} future job{upcomingJobs.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{upcomingJobs.length}</Badge>
                  {upcomingExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </button>
          {upcomingExpanded && (
            <CardContent className="pt-3">
              <ScrollArea className="max-h-80">
                <div className="space-y-2 pr-1">
                  {upcomingJobs.map((job) => (
                    <UpcomingJobRow key={job.id} job={job} onOpenNav={openNavigation} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}

      {/* ─── Completed Today (Collapsible) ─── */}
      <CompletedTodayCard
        jobs={completedToday}
        expanded={completedExpanded}
        onToggle={() => setCompletedExpanded(!completedExpanded)}
      />

      {/* ─── Sticky Bottom Action Bar for the active/pending job ─── */}
      {(activeJob || pendingJob) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t shadow-lg sm:max-w-2xl sm:left-1/2 sm:-translate-x-1/2">
          <div className="p-3">
            {activeJob ? (
              <ActiveJobActionBar
                job={activeJob}
                actionLoading={actionLoading}
                onAction={handleLifecycle}
                onOpenComplete={() => openCompleteDialog(activeJob.id)}
              />
            ) : pendingJob ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">New job assigned</p>
                  <p className="text-sm font-medium truncate">{pendingJob.title}</p>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6 shrink-0"
                  onClick={() => handleLifecycle('accept', pendingJob.id)}
                  disabled={actionLoading === `accept-${pendingJob.id}`}
                >
                  {actionLoading === `accept-${pendingJob.id}` ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4 mr-2" />
                  )}
                  Accept
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ─── Inline Dialogs (each self-contained; state + mutations owned) ─── */}

      <PhotoCaptureDialog
        open={showPhotoDialog}
        jobId={photoJobId}
        initialPhotoType={photoType}
        onClose={() => setShowPhotoDialog(false)}
        onUploaded={fetchAllJobs}
      />

      <SignatureDialog
        open={showSignature}
        jobId={signatureJobId}
        initialSignatoryName={currentEmployee?.name || ''}
        onClose={() => setShowSignature(false)}
        onSaved={fetchAllJobs}
      />

      <ChecklistDialog
        open={showChecklist}
        jobId={checklistJobId}
        onClose={() => setShowChecklist(false)}
        onSaved={fetchAllJobs}
      />

      <CompleteJobDialog
        open={showCompleteDialog}
        jobId={completingJobId}
        onClose={() => setShowCompleteDialog(false)}
        onCompleted={(jobId, lat, lng) => handleLifecycle('complete', jobId, { latitude: lat, longitude: lng })}
      />
    </div>
  );
}

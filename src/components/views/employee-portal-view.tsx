'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  User, MapPin, Clock, Phone, CheckCircle2, XCircle, Play,
  Loader2, ChevronDown, ChevronUp, Star, Navigation,
  Radio, Calendar, AlertTriangle, Eye,
  Wifi, WifiOff, Bell, BellOff, Camera, PenLine, Trash2, Timer,
  Briefcase, CheckCircle, Route as RouteIcon, FileText, Pause,
  LogIn, LogOut, Coffee, Plus, ListChecks, MapPinned,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/use-realtime';
import { authFetch } from '@/lib/client-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

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
  latitude?: number;
  longitude?: number;
  avatar?: string;
  updatedAt: string;
}

interface LifecycleTimestamps {
  assigned?: string;
  accepted?: string;
  travelling?: string;
  arrived?: string;
  working?: string;
  paused?: string;
  completed?: string;
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
  scheduledAt?: string | null;
  scheduledTime?: string;
  estimatedDuration?: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkOutLat?: number;
  checkOutLng?: number;
  customerRating?: number;
  employeeRating?: number;
  assignmentStatus?: string;
  completedAt?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  createdAt: string;
  updatedAt: string;
  // Enriched by /api/employee/jobs
  lifecycleTimestamps?: LifecycleTimestamps;
  lifecycleState?: string;
  _counts?: {
    photos: number;
    signatures: number;
    checklists: number;
  };
}

interface ShiftData {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut?: string | null;
  status: 'active' | 'on_break' | 'completed';
  breaksJson: string;
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
}

interface TodayTotals {
  activeShift: ShiftData | null;
  shiftsToday: number;
  jobsAssignedToday: number;
  jobsCompletedToday: number;
  workingMinutes: number;
  breakMinutes: number;
  totalMinutes: number;
  travelDistanceMeters: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  busy: 'Busy',
  offline: 'Offline',
  leave: 'On Leave',
  traveling: 'Traveling',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

const PRIORITY_DOTS: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

// Lifecycle state colors and labels
const LIFECYCLE_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  travelling: 'Travelling',
  arrived: 'Arrived',
  working: 'Working',
  paused: 'Paused',
  completed: 'Completed',
};

const LIFECYCLE_COLORS: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  travelling: 'bg-purple-100 text-purple-700 border-purple-200',
  arrived: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  working: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatTime(dateStr?: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return 'Unknown';
  try {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Unknown';
  }
}

// Format minutes as "Xh Ym"
function formatDuration(minutes: number): string {
  if (!minutes || minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Format meters as "X.X km" or "X m"
function formatDistance(meters: number): string {
  if (!meters || meters < 1) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Format an elapsed timer as HH:MM:SS from a start ISO string
function formatTimer(startIso: string | null | undefined): string {
  if (!startIso) return '00:00:00';
  try {
    const diffMs = Date.now() - new Date(startIso).getTime();
    if (diffMs < 0) return '00:00:00';
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } catch {
    return '00:00:00';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmployeePortalView() {
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
  const [photoType, setPhotoType] = useState<'before' | 'after' | 'progress' | 'issue'>('before');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Signature dialog
  const [showSignature, setShowSignature] = useState(false);
  const [signatureJobId, setSignatureJobId] = useState<string | null>(null);
  const [signatoryName, setSignatoryName] = useState('');
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Checklist dialog
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistJobId, setChecklistJobId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  // Complete dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionValidation, setCompletionValidation] = useState<{
    missing: string[];
    details: { before: boolean; after: boolean; signature: boolean; checklist: boolean };
  } | null>(null);

  // Live timer (ticks every second to update elapsed displays)
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // GPS tracking
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsTrackingJobIdRef = useRef<string | null>(null);
  const [gpsActive, setGpsActive] = useState(false);

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

  // ── Cleanup GPS on unmount ──
  useEffect(() => {
    return () => stopGPSTracking();
  }, [stopGPSTracking]);

  // ── Refresh totals periodically when shift is active ──
  useEffect(() => {
    if (!activeShift) return;
    const id = setInterval(() => {
      fetchTodayTotals();
    }, 60000); // refresh totals every minute
    return () => clearInterval(id);
  }, [activeShift, fetchTodayTotals]);

  // ─── GPS Tracking ─────────────────────────────────────────────────────────

  const startGPSTracking = useCallback((jobId: string) => {
    if (!currentEmployee?.id) return;
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported by this device');
      return;
    }
    // Stop any existing tracking
    stopGPSTracking();
    gpsTrackingJobIdRef.current = jobId;
    setGpsActive(true);

    const sendPing = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading, speed } = pos.coords;
          fetch('/api/gps/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: currentEmployee.id,
              jobId,
              latitude,
              longitude,
              accuracy,
              heading,
              speed,
            }),
          }).catch(() => {
            // Silent — offline pings will be lost (acceptable for V1.5)
          });
        },
        (err) => {
          console.warn('[GPS] ping failed:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    };

    // Send immediately + every 30s
    sendPing();
    gpsIntervalRef.current = setInterval(sendPing, 30000);
    toast.success('GPS tracking started — pinging every 30s');
  }, [currentEmployee?.id]);

  const stopGPSTracking = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    if (gpsTrackingJobIdRef.current) {
      gpsTrackingJobIdRef.current = null;
    }
    setGpsActive(false);
  }, []);

  // ─── Lifecycle Action ─────────────────────────────────────────────────────

  const handleLifecycle = useCallback(
    async (
      action: 'accept' | 'start_travel' | 'arrive' | 'start_work' | 'pause' | 'resume' | 'complete',
      jobId: string,
      opts?: { latitude?: number; longitude?: number },
    ) => {
      setActionLoading(`${action}-${jobId}`);
      try {
        const res = await authFetch(`/api/employee/jobs/${jobId}/lifecycle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            latitude: opts?.latitude,
            longitude: opts?.longitude,
          }),
        });
        if (res.ok) {
          const labels: Record<string, string> = {
            accept: 'accepted',
            start_travel: 'travel started',
            arrive: 'arrived',
            start_work: 'work started',
            pause: 'paused',
            resume: 'resumed',
            complete: 'completed',
          };
          toast.success(`Job ${labels[action] || action}`);

          // Manage GPS based on action
          if (action === 'start_travel') {
            // Capture current position for the initial ping + start tracking
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  // Send the first ping via the dedicated GPS endpoint
                  fetch('/api/gps/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      employeeId: currentEmployee?.id,
                      jobId,
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      accuracy: pos.coords.accuracy,
                    }),
                  }).catch(() => {});
                },
                () => {},
                { enableHighAccuracy: true, timeout: 10000 },
              );
            }
            startGPSTracking(jobId);
          } else if (action === 'arrive' || action === 'complete') {
            stopGPSTracking();
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
    [currentEmployee?.id, fetchAllJobs, fetchTodayTotals, startGPSTracking, stopGPSTracking],
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

  // ─── Photo Upload ─────────────────────────────────────────────────────────

  const openPhotoDialog = (jobId: string, type: 'before' | 'after' | 'progress' | 'issue') => {
    setPhotoJobId(jobId);
    setPhotoType(type);
    setPhotoDataUrl(null);
    setShowPhotoDialog(true);
  };

  const capturePhoto = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoDataUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input value so the same file can be re-selected
    e.target.value = '';
  };

  const confirmPhotoUpload = async () => {
    if (!photoJobId || !photoDataUrl) return;
    setActionLoading('photo-upload');
    try {
      const res = await authFetch(`/api/jobs/${photoJobId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoType,
          file: photoDataUrl,
        }),
      });
      if (res.ok) {
        toast.success(`${photoType} photo uploaded`);
        setShowPhotoDialog(false);
        setPhotoDataUrl(null);
        await fetchAllJobs();
      } else {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Signature Capture ────────────────────────────────────────────────────

  const openSignatureDialog = (jobId: string) => {
    setSignatureJobId(jobId);
    setSignatoryName(currentEmployee?.name || '');
    setShowSignature(true);
    setTimeout(initSignatureCanvas, 100);
  };

  const initSignatureCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1f2937';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };
    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };
    const stop = () => {
      isDrawingRef.current = false;
    };
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stop);
  }, []);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const confirmSignature = async () => {
    if (!signatureJobId) return;
    if (!signatoryName.trim()) {
      toast.error('Please enter the signatory name');
      return;
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setActionLoading('signature');
    try {
      const res = await authFetch(`/api/jobs/${signatureJobId}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatoryType: 'customer',
          signatoryName: signatoryName.trim(),
          signatoryRole: 'Customer',
          signatureData: dataUrl,
        }),
      });
      if (res.ok) {
        toast.success('Signature captured');
        setShowSignature(false);
        setSignatoryName('');
        await fetchAllJobs();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to save signature' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Checklist ────────────────────────────────────────────────────────────

  const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
    { id: 'arrival', label: 'Arrived at the customer site', checked: false },
    { id: 'inspect', label: 'Inspected the issue / asset', checked: false },
    { id: 'quote', label: 'Quoted work to customer', checked: false },
    { id: 'perform', label: 'Performed the work', checked: false },
    { id: 'cleanup', label: 'Cleaned up the work area', checked: false },
    { id: 'review', label: 'Reviewed work with customer', checked: false },
  ];

  const openChecklistDialog = async (jobId: string) => {
    setChecklistJobId(jobId);
    setShowChecklist(true);
    setActionLoading('checklist-load');
    try {
      const res = await authFetch(`/api/jobs/${jobId}/checklist`);
      if (res.ok) {
        const data = await res.json();
        if (data.checklist && data.checklist.itemsJson) {
          try {
            const items = JSON.parse(data.checklist.itemsJson);
            if (Array.isArray(items) && items.length > 0) {
              setChecklistItems(items);
              return;
            }
          } catch {
            // fall through to default
          }
        }
      }
      setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
    } catch {
      setChecklistItems(DEFAULT_CHECKLIST_ITEMS);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistItems((items) =>
      items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  };

  const saveChecklist = async (markCompleted: boolean) => {
    if (!checklistJobId) return;
    setActionLoading(markCompleted ? 'checklist-complete' : 'checklist-save');
    try {
      const allChecked = checklistItems.every((it) => it.checked);
      const status = markCompleted ? (allChecked ? 'completed' : 'completed') : 'in_progress';
      const res = await authFetch(`/api/jobs/${checklistJobId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: checklistItems, status }),
      });
      if (res.ok) {
        toast.success(markCompleted ? 'Checklist completed' : 'Checklist saved');
        setShowChecklist(false);
        await fetchAllJobs();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to save checklist' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Complete Job (with validation) ───────────────────────────────────────

  const openCompleteDialog = async (jobId: string) => {
    setCompletingJobId(jobId);
    setCompletionNotes('');
    setCompletionValidation(null);
    setShowCompleteDialog(true);
    setActionLoading('validate-complete');
    try {
      // Fetch the latest proof data for this job
      const [photosRes, sigRes, checkRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}/photos`),
        fetch(`/api/jobs/${jobId}/signatures`),
        fetch(`/api/jobs/${jobId}/checklist`),
      ]);
      let before = false, after = false, signature = false, checklist = false;
      if (photosRes.ok) {
        const data = await photosRes.json();
        const photos = (data.photos || []) as Array<{ photoType: string }>;
        before = photos.some((p) => p.photoType === 'before');
        after = photos.some((p) => p.photoType === 'after');
      }
      if (sigRes.ok) {
        const data = await sigRes.json();
        const sigs = (data.signatures || []) as Array<{ signatoryType: string }>;
        signature = sigs.some((s) => s.signatoryType === 'customer');
      }
      if (checkRes.ok) {
        const data = await checkRes.json();
        checklist = data.checklist?.status === 'completed';
      }
      const missing: string[] = [];
      if (!before) missing.push('Before photo');
      if (!after) missing.push('After photo');
      if (!signature) missing.push('Customer signature');
      if (!checklist) missing.push('Completed checklist');
      setCompletionValidation({ missing, details: { before, after, signature, checklist } });
    } catch {
      // Allow proceeding even if validation fetch fails
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteJob = async () => {
    if (!completingJobId) return;
    if (completionValidation && completionValidation.missing.length > 0) {
      toast.error('Cannot complete: ' + completionValidation.missing.join(', '));
      return;
    }
    // Save completion notes to the job
    if (completionNotes.trim()) {
      try {
        await authFetch(`/api/jobs/${completingJobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: completingJobId, notes: completionNotes }),
        });
      } catch {
        // Continue with completion even if notes fail
      }
    }
    setShowCompleteDialog(false);
    // Capture GPS for check-out if available
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
        // ignore
      }
    }
    await handleLifecycle('complete', completingJobId, { latitude: lat, longitude: lng });
    setCompletingJobId(null);
    setCompletionNotes('');
    setCompletionValidation(null);
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

  const shiftStatus: 'clocked_out' | 'active' | 'on_break' =
    !activeShift ? 'clocked_out' : activeShift.status === 'on_break' ? 'on_break' : 'active';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24">
      {/* Hidden file input for photo capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelected}
      />

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
          value={formatDuration(todayTotals?.workingMinutes ?? 0)}
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

      {/* ─── GPS Active Banner ─── */}
      {gpsActive && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-300">
          <MapPinned className="size-5 text-purple-600 shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-purple-800">GPS Tracking Active</p>
            <p className="text-xs text-purple-600">Sharing your location every 30 seconds while travelling.</p>
          </div>
        </div>
      )}

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
      <Card className="shadow-sm">
        <button
          className="w-full text-left"
          onClick={() => setCompletedExpanded(!completedExpanded)}
        >
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-slate-600 flex items-center justify-center">
                  <CheckCircle className="size-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Completed Today</CardTitle>
                  <CardDescription className="text-xs">
                    {completedToday.length} job{completedToday.length !== 1 ? 's' : ''} finished today
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{completedToday.length}</Badge>
                {completedExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </button>
        {completedExpanded && (
          <CardContent className="pt-3">
            {completedToday.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <CheckCircle className="size-8 mb-2 opacity-30" />
                <p className="text-sm">No jobs completed today yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedToday.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {job.customerName && <span className="truncate">{job.customerName}</span>}
                          {job.completedAt && (
                            <span>&middot; {formatTime(job.completedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] shrink-0"
                    >
                      Done
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

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

      {/* ─── Photo Dialog ─── */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5" />
              {photoType === 'before' && 'Before Photo'}
              {photoType === 'after' && 'After Photo'}
              {photoType === 'progress' && 'Progress Photo'}
              {photoType === 'issue' && 'Issue Photo'}
            </DialogTitle>
            <DialogDescription>
              Capture or upload a photo. This will be saved to the job record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {photoDataUrl ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={photoDataUrl} alt="Preview" className="w-full h-48 object-cover" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 size-7 p-0"
                  onClick={() => setPhotoDataUrl(null)}
                >
                  <XCircle className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={capturePhoto}
                className="w-full h-48 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors flex flex-col items-center justify-center gap-2 text-slate-500"
              >
                <Camera className="size-8" />
                <span className="text-sm font-medium">Tap to take or choose a photo</span>
              </button>
            )}
            <div className="flex gap-2">
              {(['before', 'after', 'progress', 'issue'] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={photoType === t ? 'default' : 'outline'}
                  className={`h-8 flex-1 capitalize ${photoType === t ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  onClick={() => setPhotoType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhotoDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={confirmPhotoUpload}
              disabled={!photoDataUrl || actionLoading === 'photo-upload'}
            >
              {actionLoading === 'photo-upload' ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Signature Dialog ─── */}
      <Dialog open={showSignature} onOpenChange={setShowSignature}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="size-5" />
              Customer Signature
            </DialogTitle>
            <DialogDescription>
              Have the customer sign below to confirm the work was completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Customer Name
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="e.g. James Wilson"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={200}
                className="w-full touch-none cursor-crosshair"
                style={{ maxHeight: '200px' }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Draw signature above using mouse or touch
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={clearSignature} className="gap-1.5">
              <Trash2 className="size-4" />
              Clear
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={confirmSignature}
              disabled={actionLoading === 'signature' || !signatoryName.trim()}
            >
              {actionLoading === 'signature' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Confirm Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Checklist Dialog ─── */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="size-5" />
              Job Checklist
            </DialogTitle>
            <DialogDescription>
              Tick each item as you complete it. All items must be checked to mark the checklist as complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {actionLoading === 'checklist-load' ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-emerald-500" />
              </div>
            ) : (
              checklistItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    item.checked
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`size-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      item.checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                    }`}
                  >
                    {item.checked && <CheckCircle2 className="size-3 text-white" />}
                  </div>
                  <span className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </span>
                </button>
              ))
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowChecklist(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => saveChecklist(false)}
              disabled={actionLoading === 'checklist-save'}
            >
              {actionLoading === 'checklist-save' ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : null}
              Save Progress
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => saveChecklist(true)}
              disabled={
                actionLoading === 'checklist-complete' ||
                !checklistItems.every((it) => it.checked)
              }
            >
              {actionLoading === 'checklist-complete' ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-1" />
              )}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Complete Job Dialog ─── */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              Complete Job
            </DialogTitle>
            <DialogDescription>
              Review the completion requirements and add any final notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Validation status */}
            {actionLoading === 'validate-complete' ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-emerald-500" />
                <span className="ml-2 text-sm text-muted-foreground">Checking requirements...</span>
              </div>
            ) : completionValidation ? (
              <div className={`rounded-lg border p-3 ${
                completionValidation.missing.length === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <p className={`text-sm font-semibold mb-2 ${
                  completionValidation.missing.length === 0
                    ? 'text-emerald-800'
                    : 'text-amber-800'
                }`}>
                  {completionValidation.missing.length === 0
                    ? '✓ All requirements met'
                    : `${completionValidation.missing.length} requirement(s) missing`}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <ValidationItem ok={completionValidation.details.before} label="Before Photo" />
                  <ValidationItem ok={completionValidation.details.after} label="After Photo" />
                  <ValidationItem ok={completionValidation.details.signature} label="Signature" />
                  <ValidationItem ok={completionValidation.details.checklist} label="Checklist" />
                </div>
                {completionValidation.missing.length > 0 && (
                  <p className="text-xs text-amber-700 mt-2">
                    Complete the missing items above before marking the job as complete.
                  </p>
                )}
              </div>
            ) : null}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Completion Notes</label>
              <Textarea
                placeholder="Enter any notes about the job completion, issues encountered, or follow-up needed..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCompleteJob}
              disabled={
                actionLoading === 'complete-job' ||
                (completionValidation ? completionValidation.missing.length > 0 : false)
              }
            >
              {actionLoading === 'complete-job' ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              Complete Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'emerald' | 'green' | 'cyan' | 'purple';
}) {
  const accentClasses = {
    emerald: 'bg-emerald-50 text-emerald-700',
    green: 'bg-green-50 text-green-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className={`size-8 rounded-lg flex items-center justify-center mb-2 ${accentClasses[accent]}`}>
          {icon}
        </div>
        <div className="text-lg sm:text-xl font-bold leading-tight">{value}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  disabled,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  accent: 'emerald' | 'amber' | 'red' | 'purple' | 'cyan' | 'slate';
}) {
  const accentClasses: Record<string, string> = {
    emerald: 'text-emerald-600 hover:bg-emerald-50',
    amber: 'text-amber-600 hover:bg-amber-50',
    red: 'text-red-600 hover:bg-red-50',
    purple: 'text-purple-600 hover:bg-purple-50',
    cyan: 'text-cyan-600 hover:bg-cyan-50',
    slate: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-h-[60px] ${accentClasses[accent]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      <span className="text-[10px] sm:text-xs font-medium leading-tight text-center">{label}</span>
    </button>
  );
}

function ValidationItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="size-3.5 text-amber-600 shrink-0" />
      )}
      <span className={ok ? 'text-emerald-800' : 'text-amber-800'}>{label}</span>
    </div>
  );
}

// Active job card (working / paused / arrived / travelling)
function ActiveJobCard({
  job,
  actionLoading,
  onAction,
  onOpenNav,
  onCapturePhoto,
  onOpenSignature,
  onOpenChecklist,
}: {
  job: Job;
  actionLoading: string | null;
  onAction: (action: 'accept' | 'start_travel' | 'arrive' | 'start_work' | 'pause' | 'resume' | 'complete', jobId: string) => void;
  onOpenNav: (job: Job) => void;
  onCapturePhoto: (jobId: string, type: 'before' | 'after' | 'progress' | 'issue') => void;
  onOpenSignature: (jobId: string) => void;
  onOpenChecklist: (jobId: string) => void;
}) {
  const state = job.lifecycleState || 'working';
  return (
    <Card className="shadow-sm border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Play className="size-4 text-white fill-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">Active Job</CardTitle>
              <CardDescription className="text-xs">
                {LIFECYCLE_LABELS[state] || state}
              </CardDescription>
            </div>
          </div>
          <Badge className={`${LIFECYCLE_COLORS[state] || LIFECYCLE_COLORS.working} border shrink-0`}>
            {LIFECYCLE_LABELS[state] || state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">{job.title}</h3>
          {job.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {job.customerName && (
            <div className="flex items-center gap-2 min-w-0">
              <User className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{job.customerName}</span>
              {job.customerPhone && (
                <a href={`tel:${job.customerPhone}`} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                  <Phone className="size-3.5" />
                </a>
              )}
            </div>
          )}
          {job.address && (
            <button
              onClick={() => onOpenNav(job)}
              className="flex items-center gap-2 text-left min-w-0 text-emerald-700 hover:text-emerald-800"
            >
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{job.address}</span>
            </button>
          )}
          {job.scheduledAt && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <span>{formatDate(job.scheduledAt)} at {formatTime(job.scheduledAt)}</span>
            </div>
          )}
          {job.estimatedDuration && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <span>Est. {job.estimatedDuration} min</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          <Badge variant="outline" className={`${PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.medium} text-xs`}>
            {job.priority}
          </Badge>
        </div>

        <Separator />

        {/* Lifecycle timestamps */}
        {job.lifecycleTimestamps && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
            {job.lifecycleTimestamps.accepted && (
              <TimestampItem label="Accepted" ts={job.lifecycleTimestamps.accepted} />
            )}
            {job.lifecycleTimestamps.travelling && (
              <TimestampItem label="Travelling" ts={job.lifecycleTimestamps.travelling} />
            )}
            {job.lifecycleTimestamps.arrived && (
              <TimestampItem label="Arrived" ts={job.lifecycleTimestamps.arrived} />
            )}
            {job.lifecycleTimestamps.working && (
              <TimestampItem label="Started Work" ts={job.lifecycleTimestamps.working} />
            )}
          </div>
        )}

        {/* Action buttons (changes based on state) */}
        <div className="flex flex-wrap gap-2">
          {state === 'accepted' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px] h-11"
              onClick={() => onAction('start_travel', job.id)}
              disabled={actionLoading === `start_travel-${job.id}`}
            >
              {actionLoading === `start_travel-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="size-4 mr-2" />
              )}
              Start Travel
            </Button>
          )}
          {state === 'travelling' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px] h-11"
              onClick={() => onAction('arrive', job.id)}
              disabled={actionLoading === `arrive-${job.id}`}
            >
              {actionLoading === `arrive-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="size-4 mr-2" />
              )}
              Mark Arrived
            </Button>
          )}
          {state === 'arrived' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px] h-11"
              onClick={() => onAction('start_work', job.id)}
              disabled={actionLoading === `start_work-${job.id}`}
            >
              {actionLoading === `start_work-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Start Work
            </Button>
          )}
          {state === 'working' && (
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 h-11"
              onClick={() => onAction('pause', job.id)}
              disabled={actionLoading === `pause-${job.id}`}
            >
              {actionLoading === `pause-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Pause className="size-4 mr-2" />
              )}
              Pause
            </Button>
          )}
          {state === 'paused' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 h-11"
              onClick={() => onAction('resume', job.id)}
              disabled={actionLoading === `resume-${job.id}`}
            >
              {actionLoading === `resume-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Resume
            </Button>
          )}

          {/* Always-available on-site actions */}
          <Button
            variant="outline"
            className="h-11"
            onClick={() => onOpenNav(job)}
          >
            <Navigation className="size-4 mr-2" />
            Navigate
          </Button>
          <Button
            variant="outline"
            className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 h-11"
            onClick={() => onCapturePhoto(job.id, 'progress')}
          >
            <Camera className="size-4 mr-2" />
            Photo
          </Button>
          <Button
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50 h-11"
            onClick={() => onOpenSignature(job.id)}
          >
            <PenLine className="size-4 mr-2" />
            Signature
          </Button>
          <Button
            variant="outline"
            className="border-teal-200 text-teal-700 hover:bg-teal-50 h-11"
            onClick={() => onOpenChecklist(job.id)}
          >
            <ListChecks className="size-4 mr-2" />
            Checklist
          </Button>
        </div>

        {/* Counts of proof items */}
        {job._counts && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Camera className="size-3" />
              {job._counts.photos} photo{job._counts.photos !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <PenLine className="size-3" />
              {job._counts.signatures} signature{job._counts.signatures !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <ListChecks className="size-3" />
              {job._counts.checklists} checklist{job._counts.checklists !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimestampItem({ label, ts }: { label: string; ts: string }) {
  return (
    <div className="flex flex-col bg-muted/40 rounded px-2 py-1">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium">{formatTime(ts)}</span>
    </div>
  );
}

function PendingJobCard({
  job,
  actionLoading,
  onAccept,
  onOpenNav,
}: {
  job: Job;
  actionLoading: string | null;
  onAccept: (jobId: string) => void;
  onOpenNav: (job: Job) => void;
}) {
  return (
    <Card className="shadow-sm border-2 border-blue-200 bg-gradient-to-br from-blue-50/40 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Radio className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">New Job Assigned</CardTitle>
              <CardDescription className="text-xs">Awaiting your acceptance</CardDescription>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 border shrink-0">Assigned</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">{job.title}</h3>
          {job.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {job.customerName && (
            <div className="flex items-center gap-2 min-w-0">
              <User className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{job.customerName}</span>
              {job.customerPhone && (
                <a href={`tel:${job.customerPhone}`} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                  <Phone className="size-3.5" />
                </a>
              )}
            </div>
          )}
          {job.address && (
            <button
              onClick={() => onOpenNav(job)}
              className="flex items-center gap-2 text-left min-w-0 text-emerald-700 hover:text-emerald-800"
            >
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{job.address}</span>
            </button>
          )}
          {job.scheduledAt && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <span>{formatDate(job.scheduledAt)} at {formatTime(job.scheduledAt)}</span>
            </div>
          )}
          {job.estimatedDuration && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <span>Est. {job.estimatedDuration} min</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          <Badge variant="outline" className={`${PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.medium} text-xs`}>
            {job.priority}
          </Badge>
        </div>
        <Separator />
        <div className="flex gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-11"
            onClick={() => onAccept(job.id)}
            disabled={actionLoading === `accept-${job.id}`}
          >
            {actionLoading === `accept-${job.id}` ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            Accept Job
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => onOpenNav(job)}
          >
            <Navigation className="size-4 mr-2" />
            Navigate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCard({
  job,
  expanded,
  onToggle,
  actionLoading,
  onAction,
  onOpenNav,
  onCapturePhoto,
  onOpenSignature,
  onOpenChecklist,
}: {
  job: Job;
  expanded: boolean;
  onToggle: () => void;
  actionLoading: string | null;
  onAction: (action: 'accept' | 'start_travel' | 'arrive' | 'start_work' | 'pause' | 'resume' | 'complete', jobId: string) => void;
  onOpenNav: (job: Job) => void;
  onCapturePhoto: (jobId: string, type: 'before' | 'after' | 'progress' | 'issue') => void;
  onOpenSignature: (jobId: string) => void;
  onOpenChecklist: (jobId: string) => void;
}) {
  const state = job.lifecycleState || 'assigned';
  return (
    <Card
      className={`border transition-all ${
        state === 'assigned'
          ? 'border-blue-100 bg-blue-50/30'
          : ['working', 'travelling', 'arrived'].includes(state)
            ? 'border-emerald-200 bg-emerald-50/30'
            : state === 'paused'
              ? 'border-amber-200 bg-amber-50/30'
              : 'border-border'
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <button className="w-full text-left" onClick={onToggle}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`size-2 rounded-full shrink-0 ${PRIORITY_DOTS[job.priority] || PRIORITY_DOTS.medium}`} />
              <span className="font-medium text-sm truncate">{job.title}</span>
              <Badge
                className={`${LIFECYCLE_COLORS[state] || LIFECYCLE_COLORS.assigned} border text-[10px] h-5 shrink-0`}
              >
                {LIFECYCLE_LABELS[state] || state}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {job.scheduledAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(job.scheduledAt)}
                </span>
              )}
              {expanded ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {job.customerName && (
              <span className="flex items-center gap-1">
                <User className="size-3" /> {job.customerName}
              </span>
            )}
            {job.address && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" /> {job.address}
              </span>
            )}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {job.description && (
              <p className="text-sm text-muted-foreground">{job.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {job.customerPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3 text-muted-foreground" />
                  <a href={`tel:${job.customerPhone}`} className="text-emerald-600 hover:underline">
                    {job.customerPhone}
                  </a>
                </div>
              )}
              {job.scheduledAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3 text-muted-foreground" />
                  {formatDate(job.scheduledAt)}
                </div>
              )}
              {job.estimatedDuration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-muted-foreground" />
                  Est. {job.estimatedDuration} min
                </div>
              )}
              {job.type && (
                <div className="flex items-center gap-1.5">
                  <Radio className="size-3 text-muted-foreground" />
                  <span className="capitalize">{job.type}</span>
                </div>
              )}
            </div>

            {/* Action buttons based on state */}
            <div className="flex flex-wrap gap-2 pt-1">
              {state === 'assigned' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('accept', job.id)}
                  disabled={actionLoading === `accept-${job.id}`}
                >
                  {actionLoading === `accept-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-1.5" />
                  )}
                  Accept
                </Button>
              )}
              {state === 'accepted' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('start_travel', job.id)}
                  disabled={actionLoading === `start_travel-${job.id}`}
                >
                  {actionLoading === `start_travel-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Navigation className="size-3.5 mr-1.5" />
                  )}
                  Start Travel
                </Button>
              )}
              {state === 'travelling' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('arrive', job.id)}
                  disabled={actionLoading === `arrive-${job.id}`}
                >
                  {actionLoading === `arrive-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <MapPin className="size-3.5 mr-1.5" />
                  )}
                  Mark Arrived
                </Button>
              )}
              {state === 'arrived' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('start_work', job.id)}
                  disabled={actionLoading === `start_work-${job.id}`}
                >
                  {actionLoading === `start_work-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5 mr-1.5" />
                  )}
                  Start Work
                </Button>
              )}
              {state === 'working' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 h-10"
                    onClick={() => onAction('pause', job.id)}
                    disabled={actionLoading === `pause-${job.id}`}
                  >
                    {actionLoading === `pause-${job.id}` ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Pause className="size-3.5 mr-1.5" />
                    )}
                    Pause
                  </Button>
                </>
              )}
              {state === 'paused' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('resume', job.id)}
                  disabled={actionLoading === `resume-${job.id}`}
                >
                  {actionLoading === `resume-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5 mr-1.5" />
                  )}
                  Resume
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="h-10"
                onClick={() => onOpenNav(job)}
              >
                <Navigation className="size-3.5 mr-1.5" />
                Navigate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 h-10"
                onClick={() => onCapturePhoto(job.id, state === 'assigned' ? 'before' : 'progress')}
              >
                <Camera className="size-3.5 mr-1.5" />
                Photo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 h-10"
                onClick={() => onOpenSignature(job.id)}
              >
                <PenLine className="size-3.5 mr-1.5" />
                Sign
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-teal-200 text-teal-700 hover:bg-teal-50 h-10"
                onClick={() => onOpenChecklist(job.id)}
              >
                <ListChecks className="size-3.5 mr-1.5" />
                Checklist
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingJobRow({ job, onOpenNav }: { job: Job; onOpenNav: (job: Job) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full shrink-0 ${PRIORITY_DOTS[job.priority] || PRIORITY_DOTS.medium}`} />
          <span className="font-medium text-sm truncate">{job.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {job.scheduledAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {formatDate(job.scheduledAt)} {formatTime(job.scheduledAt)}
            </span>
          )}
          {job.customerName && (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {job.customerName}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 ml-2"
        onClick={() => onOpenNav(job)}
      >
        <Navigation className="size-3.5" />
      </Button>
    </div>
  );
}

// Sticky bottom action bar — shows the primary action for the active job
function ActiveJobActionBar({
  job,
  actionLoading,
  onAction,
  onOpenComplete,
}: {
  job: Job;
  actionLoading: string | null;
  onAction: (action: 'pause' | 'resume' | 'complete', jobId: string) => void;
  onOpenComplete: () => void;
}) {
  const state = job.lifecycleState || 'working';
  let primary: { label: string; icon: React.ReactNode; action?: 'pause' | 'resume' | 'complete'; onClick?: () => void };
  if (state === 'working') {
    primary = {
      label: 'Pause Work',
      icon: <Pause className="size-4" />,
      action: 'pause',
    };
  } else if (state === 'paused') {
    primary = {
      label: 'Resume Work',
      icon: <Play className="size-4" />,
      action: 'resume',
    };
  } else if (state === 'accepted') {
    primary = {
      label: 'Start Travel',
      icon: <Navigation className="size-4" />,
      action: 'start_travel' as 'resume', // type narrowing — handled below
    };
  } else if (state === 'travelling') {
    primary = {
      label: 'Mark Arrived',
      icon: <MapPin className="size-4" />,
      action: 'arrive' as 'resume',
    };
  } else if (state === 'arrived') {
    primary = {
      label: 'Start Work',
      icon: <Play className="size-4" />,
      action: 'start_work' as 'resume',
    };
  } else {
    primary = {
      label: 'Complete Job',
      icon: <CheckCircle2 className="size-4" />,
      onClick: onOpenComplete,
    };
  }

  const handleClick = () => {
    if (primary.onClick) {
      primary.onClick();
    } else if (primary.action) {
      onAction(primary.action, job.id);
    }
  };

  const isLoading =
    primary.action && actionLoading === `${primary.action}-${job.id}`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {LIFECYCLE_LABELS[state] || state}
        </p>
        <p className="text-sm font-medium truncate">{job.title}</p>
      </div>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6 shrink-0"
        onClick={handleClick}
        disabled={!!isLoading}
      >
        {isLoading ? (
          <Loader2 className="size-4 mr-2 animate-spin" />
        ) : (
          <span className="mr-2">{primary.icon}</span>
        )}
        {primary.label}
      </Button>
      {(state === 'working' || state === 'paused') && (
        <Button
          variant="outline"
          className="h-12 px-4 shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={onOpenComplete}
        >
          <CheckCircle2 className="size-4 mr-2" />
          Complete
        </Button>
      )}
    </div>
  );
}

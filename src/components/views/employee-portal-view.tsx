'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, MapPin, Clock, Phone, CheckCircle2, XCircle, Play,
  Loader2, ChevronDown, ChevronUp, Star, Navigation,
  Radio, MessageSquare, Calendar, AlertTriangle, Eye,
  Wifi, WifiOff, Bell, BellOff, Camera, PenLine, Trash2, Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/use-realtime';

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
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  busy: 'bg-red-100 text-red-700 border-red-200',
  offline: 'bg-gray-100 text-gray-600 border-gray-200',
  leave: 'bg-amber-100 text-amber-700 border-amber-200',
  traveling: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_DOTS: Record<string, string> = {
  available: 'bg-emerald-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
  leave: 'bg-amber-500',
  traveling: 'bg-blue-500',
};

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

const JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
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

// ─── Component ──────────────────────────────────────────────────────────────

export function EmployeePortalView() {
  // ── State ──
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New feature states
  const [isOnline, setIsOnline] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [activeTimer, setActiveTimer] = useState<string | null>(null); // HH:MM:SS
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<Array<{ action: string; data: any }>>([]);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Real-time connection
  const { connected: realtimeConnected } = useRealtime({
    employeeId: currentEmployee?.id,
    onJobUpdate: useCallback(() => {
      if (currentEmployee?.id) fetchJobs(currentEmployee.id);
    }, [currentEmployee?.id]),
  });

  // ── Fetch Employee ──
  const fetchCurrentEmployee = useCallback(async () => {
    try {
      // Try to get the employee record linked to the current user
      const meRes = await fetch('/api/auth/me');
      let userId: string | undefined;
      if (meRes.ok) {
        const meData = await meRes.json();
        userId = meData.user?.id;
      }

      // Fetch employees, optionally filtered by userId
      const url = userId ? `/api/employees?userId=${userId}` : '/api/employees';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // If we have a userId, find the matching employee
          if (userId) {
            const matching = data.find((e: any) => e.userId === userId);
            if (matching) {
              setCurrentEmployee(matching);
              return;
            }
          }
          // Fallback to first employee
          setCurrentEmployee(data[0]);
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  // ── Fetch Jobs ──
  const fetchJobs = useCallback(async (employeeId: string) => {
    try {
      const [assignedRes, inProgressRes, completedRes] = await Promise.all([
        fetch(`/api/jobs?assigneeId=${employeeId}&status=assigned`),
        fetch(`/api/jobs?assigneeId=${employeeId}&status=in_progress`),
        fetch(`/api/jobs?assigneeId=${employeeId}&status=completed`),
      ]);

      if (assignedRes.ok) {
        const data = await assignedRes.json();
        setAssignedJobs(Array.isArray(data) ? data : []);
      }
      if (inProgressRes.ok) {
        const data = await inProgressRes.json();
        setInProgressJobs(Array.isArray(data) ? data : []);
      }
      if (completedRes.ok) {
        const data = await completedRes.json();
        setCompletedJobs(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail
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

  // ── Fetch jobs when employee is set ──
  useEffect(() => {
    if (currentEmployee?.id) {
      fetchJobs(currentEmployee.id);
    }
  }, [currentEmployee?.id, fetchJobs]);

  // ── Auto-heartbeat every 60 seconds ──
  useEffect(() => {
    if (!currentEmployee?.id) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/employees/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: currentEmployee.id }),
        });
      } catch {
        // Silent
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 60000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [currentEmployee?.id]);

  // ── Online/Offline Detection ──
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Process offline queue
      if (offlineQueue.length > 0) {
        toast.success(`Back online — processing ${offlineQueue.length} queued action(s)`);
        setOfflineQueue([]);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue.length]);

  // ── Notification Permission ──
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // ── Active Job Timer ──
  useEffect(() => {
    const activeJob = inProgressJobs[0];
    if (!activeJob) {
      setActiveTimer(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const startTime = activeJob.updatedAt ? new Date(activeJob.updatedAt) : new Date();

    const updateTimer = () => {
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setActiveTimer(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [inProgressJobs]);

  // ── Refresh employee data (for status and updatedAt) ──
  const refreshEmployee = useCallback(async () => {
    if (!currentEmployee?.id) return;
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const updated = data.find((e: Employee) => e.id === currentEmployee.id);
          if (updated) setCurrentEmployee(updated);
        }
      }
    } catch {
      // Silent
    }
  }, [currentEmployee?.id]);

  // ── Handlers ──

  const handleStatusChange = async (newStatus: string) => {
    if (!currentEmployee?.id || newStatus === currentEmployee.status) return;
    setActionLoading(`status-${newStatus}`);
    try {
      const res = await fetch('/api/employees/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        // API returns { employee, statusLog } — only set the employee object
        setCurrentEmployee(updated.employee ?? updated);
        toast.success(`Status changed to ${STATUS_LABELS[newStatus] || newStatus}`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update status');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLifecycleAction = async (action: string, jobId: string) => {
    setActionLoading(`${action}-${jobId}`);
    try {
      const res = await fetch('/api/jobs/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId }),
      });
      if (res.ok) {
        const actionLabels: Record<string, string> = {
          accept: 'accepted',
          reject: 'rejected',
          start: 'started',
          complete: 'completed',
        };
        toast.success(`Job ${actionLabels[action] || action} successfully`);
        if (currentEmployee?.id) {
          await fetchJobs(currentEmployee.id);
          await refreshEmployee();
        }
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action} job`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGPSCheckIn = async (jobId: string) => {
    setGpsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Update job with check-in coordinates
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          checkInLat: lat,
          checkInLng: lng,
        }),
      });

      if (res.ok) {
        toast.success('GPS check-in captured successfully');
        if (currentEmployee?.id) {
          await fetchJobs(currentEmployee.id);
        }
      } else {
        toast.error('Failed to save GPS coordinates');
      }
    } catch {
      toast.error('Unable to get GPS location. Please enable location access.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleGPSCheckOut = async (jobId: string) => {
    setGpsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          checkOutLat: lat,
          checkOutLng: lng,
        }),
      });

      if (res.ok) {
        toast.success('GPS check-out captured');
      } else {
        toast.error('Failed to save GPS coordinates');
      }
    } catch {
      toast.error('Unable to get GPS location');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleOpenCompleteDialog = (jobId: string) => {
    setCompletingJobId(jobId);
    setCompletionNotes('');
    setShowCompleteDialog(true);
  };

  const handleCompleteJob = async () => {
    if (!completingJobId) return;

    // Save notes first
    if (completionNotes.trim()) {
      try {
        await fetch(`/api/jobs/${completingJobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: completingJobId, notes: completionNotes }),
        });
      } catch {
        // Continue with completion even if notes fail
      }
    }

    setShowCompleteDialog(false);
    await handleLifecycleAction('complete', completingJobId);
    setCompletingJobId(null);
    setCompletionNotes('');
  };

  // ── Push Notification Permission ──
  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Notifications are not supported in this browser');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Push notifications enabled');
      } else if (permission === 'denied') {
        toast.error('Push notifications blocked by browser');
      }
    } catch {
      toast.error('Failed to request notification permission');
    }
  };

  // ── Photo Upload ──
  const handlePhotoUpload = (jobId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        setPhotoPreview(dataUrl);
        setShowPhotoUpload(true);

        // Save to job notes
        try {
          const res = await fetch(`/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: jobId,
              notes: `[Photo uploaded: ${file.name}]`,
            }),
          });
          if (res.ok) {
            toast.success('Photo uploaded and saved to job notes');
          } else {
            toast.error('Failed to save photo to job');
          }
        } catch {
          if (!isOnline) {
            setOfflineQueue(prev => [...prev, { action: 'photoUpload', data: { jobId, fileName: file.name } }]);
            toast.warning('Offline — photo upload queued');
          } else {
            toast.error('Failed to upload photo');
          }
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ── Signature Capture ──
  const initSignatureCanvas = useCallback(() => {
    setTimeout(() => {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
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

      const startDrawing = (e: MouseEvent | TouchEvent) => {
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

      const stopDrawing = () => {
        isDrawingRef.current = false;
      };

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);
      canvas.addEventListener('touchstart', startDrawing, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDrawing);
    }, 100);
  }, []);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const confirmSignature = async (jobId: string) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL('image/png');
    setSignatureData(data);
    setShowSignature(false);

    // Save signature to job metadata
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          notes: `[Customer signature captured]`,
        }),
      });
      if (res.ok) {
        toast.success('Signature captured and saved');
      } else {
        toast.error('Failed to save signature');
      }
    } catch {
      if (!isOnline) {
        setOfflineQueue(prev => [...prev, { action: 'signature', data: { jobId } }]);
        toast.warning('Offline — signature saved locally, will sync later');
      } else {
        toast.error('Failed to save signature');
      }
    }
  };

  // ── Loading State ──
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

  // ── No Employee Found ──
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

  // ── Computed ──
  const activeJob = inProgressJobs[0] || null;
  const upcomingJobs = assignedJobs
    .filter(j => j.assignmentStatus !== 'rejected')
    .sort((a, b) => {
      const timeA = a.scheduledAt || a.createdAt;
      const timeB = b.scheduledAt || b.createdAt;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });
  const recentCompleted = completedJobs.slice(0, 10);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* ─── Offline Mode Banner ─────────────────────────────────────────── */}
      {!isOnline && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-300">
          <WifiOff className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">You&apos;re Offline</p>
            <p className="text-xs text-amber-600">
              Actions will be queued and synced when you&apos;re back online.
              {offlineQueue.length > 0 && ` (${offlineQueue.length} pending)`}
            </p>
          </div>
        </div>
      )}
      {/* ─── Section 1: Employee Status Card ──────────────────────────────── */}
      <Card className="border-2" style={{ borderColor: currentEmployee.status === 'available' ? '#10b981' : currentEmployee.status === 'busy' ? '#ef4444' : currentEmployee.status === 'traveling' ? '#3b82f6' : currentEmployee.status === 'leave' ? '#f59e0b' : '#9ca3af' }}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar with status dot */}
            <div className="relative shrink-0">
              <Avatar className="size-16 border-2 border-white shadow-md">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-xl font-bold">
                  {currentEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 size-5 rounded-full border-3 border-white shadow-sm ${STATUS_DOTS[currentEmployee.status] || 'bg-gray-400'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold truncate">{currentEmployee.name}</h2>
                <Badge variant="outline" className={`${STATUS_COLORS[currentEmployee.status] || STATUS_COLORS.offline} font-medium`}>
                  {STATUS_LABELS[currentEmployee.status] || currentEmployee.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs capitalize">
                  {currentEmployee.role}
                </Badge>
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
                  {currentEmployee.rating.toFixed(1)}
                </span>
                <span>{currentEmployee.completedJobs} jobs</span>
              </div>

              {/* Last seen & Location */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  Last seen {formatRelativeTime(currentEmployee.updatedAt)}
                </span>
                {currentEmployee.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {currentEmployee.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Toggle Buttons */}
          <div className="mt-5">
            <p className="text-xs text-muted-foreground font-medium mb-2">Quick Status Change</p>
            <div className="flex flex-wrap gap-2">
              {(['available', 'busy', 'traveling', 'leave', 'offline'] as const).map((status) => (
                <Button
                  key={status}
                  variant={currentEmployee.status === status ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs ${
                    currentEmployee.status === status
                      ? STATUS_COLORS[status] + ' border font-semibold'
                      : 'hover:' + STATUS_COLORS[status]
                  }`}
                  onClick={() => handleStatusChange(status)}
                  disabled={actionLoading?.startsWith('status-')}
                >
                  {actionLoading === `status-${status}` ? (
                    <Loader2 className="size-3 mr-1 animate-spin" />
                  ) : (
                    <span className={`size-2 rounded-full mr-1.5 ${STATUS_DOTS[status]}`} />
                  )}
                  {STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </div>

          {/* Connection Status & Notifications Row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              {realtimeConnected ? (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Wifi className="size-3" />
                  <span className="font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                  <WifiOff className="size-3" />
                  <span className="font-medium">Reconnecting...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notificationPermission === 'granted' ? (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs">
                  <Bell className="size-3" />
                  <span className="font-medium">Notifications On</span>
                </div>
              ) : notificationPermission === 'denied' ? (
                <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-1 rounded-full text-xs">
                  <BellOff className="size-3" />
                  <span className="font-medium">Notifications Blocked</span>
                </div>
              ) : notificationPermission === 'unsupported' ? null : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={handleRequestNotificationPermission}
                >
                  <Bell className="size-3 mr-1" />
                  Enable Notifications
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 2: Active Job Card ───────────────────────────────────── */}
      {activeJob ? (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Play className="size-4 text-white fill-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Active Job</CardTitle>
                  <CardDescription className="text-xs">Currently in progress</CardDescription>
                </div>
              </div>
              <Badge className={`${JOB_STATUS_COLORS.in_progress} border`}>
                In Progress
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{activeJob.title}</h3>
              {activeJob.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activeJob.description}</p>
              )}
            </div>

            {/* Job Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeJob.customerName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{activeJob.customerName}</span>
                  {activeJob.customerPhone && (
                    <a href={`tel:${activeJob.customerPhone}`} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                      <Phone className="size-3.5" />
                    </a>
                  )}
                </div>
              )}
              {activeJob.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{activeJob.address}</span>
                </div>
              )}
              {activeJob.scheduledAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span>{formatDate(activeJob.scheduledAt)} at {formatTime(activeJob.scheduledAt)}</span>
                </div>
              )}
              {activeJob.estimatedDuration && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                  <span>Est. {activeJob.estimatedDuration} min</span>
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Priority:</span>
              <Badge variant="outline" className={`${PRIORITY_COLORS[activeJob.priority] || PRIORITY_COLORS.medium} text-xs`}>
                {activeJob.priority}
              </Badge>
            </div>

            <Separator />

            {/* Active Job Timer */}
            {activeTimer && (
              <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Timer className="size-5 text-emerald-600" />
                <span className="text-2xl font-mono font-bold text-emerald-700 tracking-wider">{activeTimer}</span>
                <span className="text-xs text-emerald-600">elapsed</span>
              </div>
            )}

            {/* Photo Preview */}
            {photoPreview && showPhotoUpload && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Uploaded Photo:</p>
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={photoPreview} alt="Job photo" className="w-full h-40 object-cover" />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 size-7 p-0"
                    onClick={() => { setPhotoPreview(null); setShowPhotoUpload(false); }}
                  >
                    <XCircle className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px]"
                onClick={() => handleOpenCompleteDialog(activeJob.id)}
                disabled={actionLoading === `complete-${activeJob.id}`}
              >
                {actionLoading === `complete-${activeJob.id}` ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4 mr-2" />
                )}
                Complete Job
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGPSCheckOut(activeJob.id)}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="size-4 mr-2" />
                )}
                GPS Check-out
              </Button>
              <Button
                variant="outline"
                className="border-teal-200 text-teal-700 hover:bg-teal-50"
                onClick={() => handlePhotoUpload(activeJob.id)}
              >
                <Camera className="size-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={() => { setShowSignature(true); initSignatureCanvas(); }}
              >
                <PenLine className="size-4 mr-2" />
                Get Signature
              </Button>
            </div>

            {/* GPS Info */}
            {activeJob.checkInLat && activeJob.checkInLng && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-emerald-500" />
                Checked in at: {activeJob.checkInLat.toFixed(4)}, {activeJob.checkInLng.toFixed(4)}
              </div>
            )}
          </CardContent>
        </Card>
      ) : upcomingJobs.length > 0 && upcomingJobs[0]?.assignmentStatus !== 'accepted' ? (
        /* Show the next upcoming job as a call-to-action if no active job */
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Radio className="size-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Next Job</CardTitle>
                  <CardDescription className="text-xs">Awaiting your acceptance</CardDescription>
                </div>
              </div>
              <Badge className={`${JOB_STATUS_COLORS.assigned} border`}>
                Assigned
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const nextJob = upcomingJobs[0];
              return (
                <>
                  <div>
                    <h3 className="font-semibold text-lg">{nextJob.title}</h3>
                    {nextJob.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{nextJob.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {nextJob.customerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="size-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{nextJob.customerName}</span>
                        {nextJob.customerPhone && (
                          <a href={`tel:${nextJob.customerPhone}`} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                            <Phone className="size-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                    {nextJob.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="size-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{nextJob.address}</span>
                      </div>
                    )}
                    {nextJob.scheduledAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground shrink-0" />
                        <span>{formatDate(nextJob.scheduledAt)} at {formatTime(nextJob.scheduledAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Priority:</span>
                    <Badge variant="outline" className={`${PRIORITY_COLORS[nextJob.priority] || PRIORITY_COLORS.medium} text-xs`}>
                      {nextJob.priority}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                      onClick={() => handleLifecycleAction('accept', nextJob.id)}
                      disabled={actionLoading === `accept-${nextJob.id}`}
                    >
                      {actionLoading === `accept-${nextJob.id}` ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4 mr-2" />
                      )}
                      Accept Job
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleLifecycleAction('reject', nextJob.id)}
                      disabled={actionLoading === `reject-${nextJob.id}`}
                    >
                      {actionLoading === `reject-${nextJob.id}` ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="size-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      ) : null}

      {/* ─── Section 3: Upcoming Jobs List ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-teal-600 flex items-center justify-center">
                <Calendar className="size-3.5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Upcoming Jobs</CardTitle>
                <CardDescription className="text-xs">{upcomingJobs.length} assigned job{upcomingJobs.length !== 1 ? 's' : ''}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No upcoming jobs assigned</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {upcomingJobs.map((job) => {
                  const isExpanded = expandedJob === job.id;
                  const isPending = job.assignmentStatus !== 'accepted';

                  return (
                    <Card
                      key={job.id}
                      className={`border transition-all ${
                        isPending ? 'border-blue-100 bg-blue-50/30' : 'border-border'
                      }`}
                    >
                      <CardContent className="p-4">
                        {/* Job Header */}
                        <button
                          className="w-full text-left"
                          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-medium text-sm truncate">{job.title}</span>
                              <Badge variant="outline" className={`${PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.medium} text-[10px] h-5 shrink-0`}>
                                {job.priority}
                              </Badge>
                              {isPending && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-5 shrink-0">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {job.scheduledAt && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTime(job.scheduledAt)}
                                </span>
                              )}
                              {isExpanded ? (
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

                        {/* Expanded Details */}
                        {isExpanded && (
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

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-1">
                              {isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-9"
                                    onClick={() => handleLifecycleAction('accept', job.id)}
                                    disabled={actionLoading === `accept-${job.id}`}
                                  >
                                    {actionLoading === `accept-${job.id}` ? (
                                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="size-3.5 mr-1.5" />
                                    )}
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 h-9"
                                    onClick={() => handleLifecycleAction('reject', job.id)}
                                    disabled={actionLoading === `reject-${job.id}`}
                                  >
                                    {actionLoading === `reject-${job.id}` ? (
                                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <XCircle className="size-3.5 mr-1.5" />
                                    )}
                                    Reject
                                  </Button>
                                </>
                              )}
                              {!isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-9"
                                    onClick={() => handleLifecycleAction('start', job.id)}
                                    disabled={actionLoading === `start-${job.id}`}
                                  >
                                    {actionLoading === `start-${job.id}` ? (
                                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <Play className="size-3.5 mr-1.5" />
                                    )}
                                    Start Job
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9"
                                    onClick={() => handleGPSCheckIn(job.id)}
                                    disabled={gpsLoading}
                                  >
                                    {gpsLoading ? (
                                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <Navigation className="size-3.5 mr-1.5" />
                                    )}
                                    GPS Check-in
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 4: Completed Jobs (Collapsible) ──────────────────────── */}
      <Card>
        <button
          className="w-full text-left"
          onClick={() => setCompletedExpanded(!completedExpanded)}
        >
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-green-600 flex items-center justify-center">
                  <CheckCircle2 className="size-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Completed Jobs</CardTitle>
                  <CardDescription className="text-xs">{recentCompleted.length} recent job{recentCompleted.length !== 1 ? 's' : ''}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {recentCompleted.length}
                </Badge>
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
          <CardContent className="pt-4">
            {recentCompleted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="size-8 mb-2 opacity-30" />
                <p className="text-sm">No completed jobs yet</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {recentCompleted.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{job.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {job.customerName && <span>{job.customerName}</span>}
                            {job.updatedAt && <span>&middot; {formatDate(job.updatedAt)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {job.customerRating && (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`size-3 ${
                                  star <= job.customerRating!
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        <Badge variant="outline" className={`${JOB_STATUS_COLORS.completed} text-[10px] h-5`}>
                          Done
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>

      {/* ─── Signature Capture Dialog ─────────────────────────────────── */}
      <Dialog open={showSignature} onOpenChange={setShowSignature}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="size-5" />
              Customer Signature
            </DialogTitle>
            <DialogDescription>
              Have the customer sign below to confirm job completion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
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
            <Button
              variant="outline"
              onClick={clearSignature}
              className="gap-1.5"
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={() => activeJob && confirmSignature(activeJob.id)}
              disabled={!activeJob}
            >
              <CheckCircle2 className="size-4" />
              Confirm Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Complete Job Dialog ──────────────────────────────────────────── */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>
              Add any final notes about the job before marking it as complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Completion Notes</label>
              <Textarea
                placeholder="Enter any notes about the job completion, issues encountered, or follow-up needed..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="size-4" />
              <span>These notes will be saved with the job record.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCompleteJob}
              disabled={actionLoading?.startsWith('complete-')}
            >
              {actionLoading?.startsWith('complete-') ? (
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

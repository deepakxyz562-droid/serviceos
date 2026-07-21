'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, Star, MessageCircle, Phone,
  CheckCircle2, ArrowRight, ExternalLink, FileText,
  RefreshCw, Loader2, ChevronRight,
  Building2, User, CreditCard, Zap, Send,
  Globe, Copy, Plus, Search, QrCode, Link2, Eye,
  Navigation, UserCheck, Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerPortalProps {
  token?: string;
}

interface Booking {
  id: string;
  title: string;
  status: string;
  priority: string;
  address: string | null;
  scheduledAt: string | null;
  assigneeName: string | null;
  assignee?: { id: string; name: string; phone: string; avatar: string | null; rating: number } | null;
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  tax: number;
  total: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
}

interface PortalData {
  customer: Customer;
  bookings: Booking[];
  invoices: Invoice[];
  session: { id: string; expiresAt: string };
}

interface PortalSession {
  id: string;
  token: string;
  customerId: string;
  customerName: string;
  expiresAt: string;
  portalUrl: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * 8-stage job lifecycle (subset shown to customers — paused/invoiced hidden).
 * Matches src/lib/job-lifecycle.ts but kept self-contained here so the
 * customer portal doesn't pull in server-only code.
 */
const LIFECYCLE_STAGES = [
  { key: 'assigned',  label: 'Assigned',   icon: UserCheck },
  { key: 'accepted',  label: 'Accepted',   icon: CheckCircle2 },
  { key: 'travelling',label: 'Travelling', icon: Navigation },
  { key: 'arrived',   label: 'Arrived',    icon: MapPin },
  { key: 'working',   label: 'Working',    icon: Wrench },
  { key: 'completed', label: 'Completed',  icon: CheckCircle2 },
] as const;

// Map of legacy / raw Job.status values → lifecycle stage key.
const STATUS_TO_STAGE_KEY: Record<string, string> = {
  assigned: 'assigned',
  accepted: 'accepted',
  travelling: 'travelling',
  traveling: 'travelling',
  en_route: 'travelling',
  enroute: 'travelling',
  arrived: 'arrived',
  working: 'working',
  in_progress: 'working',
  completed: 'completed',
  pending: 'assigned',
};

function getLifecycleStageKey(status: string): string {
  return STATUS_TO_STAGE_KEY[status] ?? 'assigned';
}

function getLifecycleStageIndex(status: string): number {
  const key = getLifecycleStageKey(status);
  const idx = LIFECYCLE_STAGES.findIndex(s => s.key === key);
  return idx === -1 ? 0 : idx;
}

// Legacy 5-step progress stepper (kept for backwards compat with the
// existing JobProgressStepper component below).
const JOB_STEPS = [
  { key: 'pending', label: 'Booked', icon: Calendar },
  { key: 'assigned', label: 'Assigned', icon: User },
  { key: 'en_route', label: 'En Route', icon: ArrowRight },
  { key: 'in_progress', label: 'In Progress', icon: Zap },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  const idx = JOB_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
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

function getInvoiceStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    sent: 'bg-blue-100 text-blue-700 border-blue-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '--'; }
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--'; }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

// ─── Star Rating Component ──────────────────────────────────────────────────

function StarRating({ value, onChange, readonly = false, size = 'md' }: {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClasses = { sm: 'size-4', md: 'size-6', lg: 'size-8' };
  const sizeClass = sizeClasses[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200 fill-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Progress Stepper Component ─────────────────────────────────────────────

function JobProgressStepper({ status }: { status: string }) {
  const currentIndex = getStepIndex(status);
  const progressPercent = (currentIndex / (JOB_STEPS.length - 1)) * 100;

  return (
    <div className="space-y-3">
      <Progress value={progressPercent} className="h-2" />
      <div className="flex items-start justify-between">
        {JOB_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center size-8 rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-600'
                    : 'bg-gray-50 border-gray-200 text-gray-300'
                }`}
              >
                <Icon className="size-4" />
              </div>
              <span className={`text-[10px] font-medium text-center ${
                isCompleted || isCurrent ? 'text-emerald-700' : 'text-gray-300'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live Job Tracker (customer-facing, polling-based) ──────────────────────

interface GpsLocation {
  latitude: number;
  longitude: number;
  capturedAt?: string;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

interface LiveJobTrackerProps {
  booking: Booking;
  portalToken?: string;
  onSwitchBooking?: (id: string) => void;
  otherActiveBookings?: Booking[];
}

/**
 * LiveJobTracker — customer-facing live tracking card.
 *
 * Polls the customer-portal endpoint every 15 seconds (when portalToken is
 * available) to refresh the booking + technician info, and polls
 * `/api/gps/track?employeeId=<id>` to fetch the technician's latest GPS
 * location. Shows the 8-stage lifecycle (assigned → accepted → travelling →
 * arrived → working → completed), an ETA when the technician is en route,
 * a live OpenStreetMap embed, and the technician's name + avatar.
 *
 * Polling is used instead of socket.io because the customer portal uses a
 * separate portal-token auth system (different from the JWT the socket.io
 * mini-service expects).
 */
function LiveJobTracker({ booking, portalToken, onSwitchBooking, otherActiveBookings = [] }: LiveJobTrackerProps) {
  // Live state — start with the booking prop, then update from polls.
  const [liveBooking, setLiveBooking] = useState<Booking>(booking);
  const [technicianLocation, setTechnicianLocation] = useState<GpsLocation | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Keep liveBooking in sync when the parent prop changes (e.g. when the
  // user switches to a different active booking).
  useEffect(() => {
    setLiveBooking(booking);
    setTechnicianLocation(null);
    setLastUpdated(null);
  }, [booking.id, booking.status, booking.updatedAt]);

  // ── Poll the customer-portal endpoint to refresh booking data ──
  // We hit /api/customer-portal/[token] (the same endpoint the parent uses
  // for the initial fetch) and pick out the matching booking. This re-uses
  // the portal-token auth flow rather than requiring a JWT.
  useEffect(() => {
    if (!portalToken) return; // No token → rely on parent's onRefresh prop

    let cancelled = false;

    const pollBooking = async () => {
      try {
        const res = await fetch(`/api/customer-portal/${portalToken}?XTransformPort=3000`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const bookings: Booking[] = Array.isArray(data?.bookings) ? data.bookings : [];
        const match = bookings.find(b => b.id === booking.id);
        if (match && !cancelled) {
          setLiveBooking(match);
          setLastUpdated(new Date());
        }
      } catch {
        // Network errors are non-fatal — we'll retry on the next interval.
      }
    };

    // Initial poll immediately, then every 15s.
    pollBooking();
    const interval = setInterval(pollBooking, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [portalToken, booking.id]);

  // ── Poll the GPS endpoint to get the technician's latest location ──
  // The GPS endpoint doesn't require auth (the employeeId acts as a
  // capability token). We use authFetch for consistency with the rest of
  // the app — it gracefully degrades to plain fetch when no JWT is set.
  const employeeId = liveBooking.assignee?.id;
  const stageKey = getLifecycleStageKey(liveBooking.status);
  const isTravelling = stageKey === 'travelling';

  useEffect(() => {
    if (!employeeId) {
      setTechnicianLocation(null);
      return;
    }

    let cancelled = false;

    const pollGps = async () => {
      if (cancelled) return;
      setIsPolling(true);
      try {
        const res = await authFetch(`/api/gps/track?employeeId=${encodeURIComponent(employeeId)}&XTransformPort=3000`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const loc = data?.location;
        if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && !cancelled) {
          setTechnicianLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
            capturedAt: loc.capturedAt,
            accuracy: loc.accuracy ?? null,
            heading: loc.heading ?? null,
            speed: loc.speed ?? null,
          });
        }
      } catch {
        // Ignore — GPS may not be available yet (technician hasn't started travel).
      } finally {
        if (!cancelled) setIsPolling(false);
      }
    };

    // Poll more frequently while travelling (every 15s), otherwise every 30s.
    pollGps();
    const interval = setInterval(pollGps, isTravelling ? 15000 : 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [employeeId, isTravelling]);

  const currentIndex = getLifecycleStageIndex(liveBooking.status);
  const progressPercent = (currentIndex / (LIFECYCLE_STAGES.length - 1)) * 100;

  // ETA estimate: when travelling, show a simple " ETA ~X min" based on GPS
  // speed if available, otherwise a static "On the way" message.
  const etaMinutes = (() => {
    if (!isTravelling) return null;
    if (technicianLocation?.speed && technicianLocation.speed > 0) {
      // Very rough: assume ~5 km average remaining distance if no job address
      // coords available. Real implementation would compute haversine.
      const remainingKm = 5;
      const speedKmPerMin = (technicianLocation.speed * 60) / 1000;
      if (speedKmPerMin > 0) {
        return Math.max(1, Math.round(remainingKm / speedKmPerMin));
      }
    }
    return null;
  })();

  // OpenStreetMap embed URL for the technician's current location.
  const mapEmbedUrl = technicianLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${technicianLocation.longitude - 0.01}%2C${technicianLocation.latitude - 0.01}%2C${technicianLocation.longitude + 0.01}%2C${technicianLocation.latitude + 0.01}&layer=mapnik&marker=${technicianLocation.latitude}%2C${technicianLocation.longitude}`
    : null;

  return (
    <Card className="border-emerald-200 bg-white shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-emerald-900">
              <Zap className="size-5 text-emerald-600" />
              Job Tracker
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              Real-time status of the active service
              {lastUpdated && (
                <span className="text-[10px] text-gray-400">
                  · updated {timeAgo(lastUpdated.toISOString())}
                </span>
              )}
              {portalToken && (
                <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline" className={`${getStatusColor(liveBooking.status)} text-xs capitalize`}>
            {liveBooking.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">{liveBooking.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
            {liveBooking.address && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {liveBooking.address}
              </span>
            )}
            {liveBooking.scheduledAt && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" /> {formatDate(liveBooking.scheduledAt)} {formatTime(liveBooking.scheduledAt)}
              </span>
            )}
          </div>
        </div>

        {/* 8-stage lifecycle stepper */}
        <div className="space-y-3">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-start justify-between">
            {LIFECYCLE_STAGES.map((stage, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const Icon = stage.icon;
              return (
                <div key={stage.key} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`flex items-center justify-center size-8 rounded-full border-2 transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-600'
                        : 'bg-gray-50 border-gray-200 text-gray-300'
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className={`text-[10px] font-medium text-center ${
                    isCompleted || isCurrent ? 'text-emerald-700' : 'text-gray-300'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ETA when travelling */}
        {isTravelling && (
          <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
            <Navigation className="size-5 text-sky-600 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-sky-900">
                {etaMinutes ? `ETA ~${etaMinutes} min` : 'Technician is on the way'}
              </p>
              <p className="text-xs text-sky-700">
                {technicianLocation
                  ? `Last location update ${technicianLocation.capturedAt ? timeAgo(technicianLocation.capturedAt) : 'recently'}`
                  : isPolling ? 'Locating technician…' : 'Waiting for location data…'}
              </p>
            </div>
          </div>
        )}

        {/* Live map when technician is en route */}
        {isTravelling && mapEmbedUrl && technicianLocation && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe
              title="Technician live location"
              src={mapEmbedUrl}
              className="w-full h-64"
              style={{ border: 0 }}
              loading="lazy"
            />
            <div className="p-2 bg-gray-50 text-[10px] text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {technicianLocation.latitude.toFixed(5)}, {technicianLocation.longitude.toFixed(5)}
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${technicianLocation.latitude}&mlon=${technicianLocation.longitude}#map=15/${technicianLocation.latitude}/${technicianLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline flex items-center gap-0.5"
              >
                Open in Maps <ExternalLink className="size-2.5" />
              </a>
            </div>
          </div>
        )}

        {/* Technician info */}
        {liveBooking.assigneeName && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <Avatar className="size-9">
              {liveBooking.assignee?.avatar ? (
                <AvatarImage src={liveBooking.assignee.avatar} alt={liveBooking.assigneeName} />
              ) : null}
              <AvatarFallback className="bg-emerald-200 text-emerald-800 text-sm font-medium">
                {liveBooking.assigneeName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{liveBooking.assigneeName}</p>
              <p className="text-xs text-gray-500">
                Technician
                {liveBooking.assignee?.rating ? ` · ★ ${liveBooking.assignee.rating}` : ''}
              </p>
            </div>
            {liveBooking.assignee?.phone && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={() => window.open(`tel:${liveBooking.assignee!.phone}`)}
              >
                <Phone className="size-3 mr-1" /> Call
              </Button>
            )}
          </div>
        )}

        {/* Switch between multiple active bookings */}
        {otherActiveBookings.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Track another:</span>
            {otherActiveBookings.map(b => (
              <Button
                key={b.id}
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => onSwitchBooking?.(b.id)}
              >
                {b.title}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Portal Experience Component (reused for both direct access & preview) ──

function PortalExperience({ portalData, onRefresh, portalToken }: {
  portalData: PortalData;
  onRefresh?: () => void;
  /**
   * The customer portal token. When provided, the Job Tracker card polls
   * `/api/customer-portal/[token]` every 15s to live-update the booking
   * status, technician location, and ETA.
   */
  portalToken?: string;
}) {
  const { currency, format } = useCompanyCurrency();

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewJob, setReviewJob] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const customer = portalData.customer;
  const bookings = portalData.bookings || [];
  const invoices = portalData.invoices || [];

  const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  const activeBooking = activeBookings.find(b => b.id === activeBookingId) || activeBookings[0] || null;

  useEffect(() => {
    if (activeBookings.length > 0 && !activeBookingId) {
      setActiveBookingId(activeBookings[0].id);
    }
  }, [activeBookings, activeBookingId]);

  const handleSubmitReview = async () => {
    if (!reviewJob) return;
    setReviewSubmitting(true);
    try {
      const res = await authFetch('/api/reviews?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          jobId: reviewJob.id,
          customerId: customer.id,
          employeeId: reviewJob.assignee?.id || null,
          source: 'portal',
          status: 'published',
        }),
      });
      if (res.ok) {
        toast.success('Review submitted! Thank you for your feedback.');
        setShowReviewDialog(false);
        setReviewJob(null);
        setReviewComment('');
        setReviewRating(5);
        onRefresh?.();
      } else {
        toast.error('Failed to submit review');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Job Tracker — live-updating when portalToken is available */}
      {activeBooking && (
        <LiveJobTracker
          booking={activeBooking}
          portalToken={portalToken}
          onSwitchBooking={(id) => setActiveBookingId(id)}
          otherActiveBookings={activeBookings.filter(b => b.id !== activeBooking.id)}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="w-full h-10 bg-white border shadow-sm">
          <TabsTrigger value="bookings" className="text-xs flex-1">
            <Calendar className="size-3.5 mr-1" /> Bookings
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs flex-1">
            <FileText className="size-3.5 mr-1" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs flex-1">
            <Star className="size-3.5 mr-1" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs flex-1">
            <MessageCircle className="size-3.5 mr-1" /> Contact
          </TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-3">
          {bookings.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Calendar className="size-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No bookings yet</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeBookings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="size-3.5 text-emerald-600" /> Upcoming
                  </h3>
                  {activeBookings.map(booking => (
                    <Card key={booking.id} className="border-0 shadow-sm bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900">{booking.title}</h4>
                            {booking.address && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <MapPin className="size-3" /> {booking.address}
                              </div>
                            )}
                            {booking.scheduledAt && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <Calendar className="size-3" /> {formatDate(booking.scheduledAt)} at {formatTime(booking.scheduledAt)}
                              </div>
                            )}
                            {booking.assigneeName && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Avatar className="size-5">
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[8px]">
                                    {booking.assigneeName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-600">{booking.assigneeName}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className={`${getStatusColor(booking.status)} text-[10px]`}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {pastBookings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-gray-400" /> Past
                  </h3>
                  {pastBookings.map(booking => (
                    <Card key={booking.id} className="border-0 shadow-sm bg-white/70">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-700">{booking.title}</h4>
                            {booking.scheduledAt && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                <Calendar className="size-3" /> {formatDate(booking.scheduledAt)}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className={`${getStatusColor(booking.status)} text-[10px]`}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-3">
          {invoices.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <FileText className="size-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No invoices yet</p>
              </CardContent>
            </Card>
          ) : (
            invoices.map(invoice => (
              <Card key={invoice.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">
                        Invoice {invoice.number || invoice.id.slice(0, 8)}
                      </h4>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>Issued: {formatDate(invoice.createdAt)}</span>
                        {invoice.dueDate && <span>Due: {formatDate(invoice.dueDate)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-lg font-bold text-gray-900">{format(invoice.total)}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${getInvoiceStatusColor(invoice.status)} text-[10px]`}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {invoice.paidAt && (
                    <p className="text-xs text-emerald-600 mt-1">Paid on {formatDate(invoice.paidAt)}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-3">
          {completedBookings.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Star className="size-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No completed jobs to review yet</p>
              </CardContent>
            </Card>
          ) : (
            completedBookings.map(booking => (
              <Card key={booking.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">{booking.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Completed {formatDate(booking.updatedAt)}</p>
                      {booking.assigneeName && (
                        <p className="text-xs text-gray-500 mt-0.5">Technician: {booking.assigneeName}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setReviewJob(booking);
                        setReviewRating(5);
                        setReviewComment('');
                        setShowReviewDialog(true);
                      }}
                    >
                      <Star className="size-3 mr-1" /> Leave Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <MessageCircle className="size-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900">Need Help?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Reach out by phone or email for support
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="tel:1"
                  className="flex items-center justify-center gap-2 h-12 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Phone className="size-4 text-emerald-600" />
                  Call Support
                </a>
                <a
                  href="mailto:support@example.com"
                  className="flex items-center justify-center gap-2 h-12 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Send className="size-4 text-emerald-600" />
                  Email Support
                </a>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Common Questions</h4>
                <div className="space-y-1.5">
                  {[
                    { q: 'How do I reschedule my appointment?', a: 'Contact us by phone or email and we will help you find a new time slot.' },
                    { q: 'What are your business hours?', a: 'Standard business hours are Monday to Friday, 9 AM to 5 PM. Emergency support may be available outside these hours.' },
                    { q: 'How can I get a quote for a new service?', a: 'Email us with a brief description of the work you need and we will send a quote.' },
                    { q: 'I have an issue with my recent service', a: 'Please call or email us with your booking details and we will resolve it promptly.' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border border-gray-100 text-sm text-gray-600"
                    >
                      <p className="font-medium text-gray-700">{item.q}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="size-5 text-amber-500" />
              Leave a Review
            </DialogTitle>
            <DialogDescription>
              {reviewJob ? `How was the experience with "${reviewJob.title}"?` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rating</label>
              <div className="flex items-center gap-3">
                <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
                <span className="text-sm text-gray-500">{reviewRating}/5</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your feedback</label>
              <Textarea
                placeholder="Tell us about the experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {reviewSubmitting ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Send className="size-4 mr-1" />
              )}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Management View (no token) ─────────────────────────────────────────────

function PortalManagementView() {
  const { auth } = useAppStore();
  const tenantId = auth.user?.tenantId || null;

  useCompanyCurrency();

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');

  // Portal sessions
  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Generate link
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Preview
  const [previewCustomerId, setPreviewCustomerId] = useState<string>('');
  const [previewData, setPreviewData] = useState<PortalData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewPortalUrl, setPreviewPortalUrl] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('links');

  // ─── Fetch customers ──────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await authFetch(`/api/customers${customerSearch ? `?search=${encodeURIComponent(customerSearch)}&XTransformPort=3000` : '?XTransformPort=3000'}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  }, [customerSearch]);

  // ─── Fetch portal sessions ────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await authFetch(`/api/customer-portal?list=true&tenantId=${tenantId || ''}&XTransformPort=3000`);
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      } else {
        // If list endpoint not available, try alternative approach
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchCustomers();
    fetchSessions();
  }, [fetchCustomers, fetchSessions]);

  // ─── Generate portal link ─────────────────────────────────────────────
  const handleGenerateLink = async (customerId: string) => {
    setGeneratingFor(customerId);
    try {
      const res = await authFetch('/api/customer-portal?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          expiresInHours: 72,
          tenantId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newSession: PortalSession = {
          id: data.session.id,
          token: data.session.token,
          customerId: data.session.customerId,
          customerName: data.session.customerName,
          expiresAt: data.session.expiresAt,
          portalUrl: data.session.portalUrl,
        };
        setSessions(prev => [newSession, ...prev]);
        toast.success(`Portal link generated for ${data.session.customerName}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to generate portal link');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setGeneratingFor(null);
    }
  };

  // ─── Copy link to clipboard ───────────────────────────────────────────
  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Portal link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // ─── Open portal in new tab ───────────────────────────────────────────
  const handleOpenPortal = (portalUrl: string) => {
    if (portalUrl) window.open(portalUrl, '_blank');
  };

  // ─── Preview portal ──────────────────────────────────────────────────
  const handleStartPreview = async () => {
    if (!previewCustomerId) {
      toast.error('Please select a customer first');
      return;
    }

    setPreviewLoading(true);
    setPreviewData(null);
    setPreviewToken(null);
    setPreviewPortalUrl(null);

    try {
      // Generate a temporary portal session
      const genRes = await authFetch('/api/customer-portal?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: previewCustomerId,
          expiresInHours: 1,
          tenantId,
        }),
      });

      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to generate preview session');
        setPreviewLoading(false);
        return;
      }

      const genData = await genRes.json();
      const token = genData.session.token;
      const portalUrl: string = genData.session.portalUrl || '';
      setPreviewToken(token);
      setPreviewPortalUrl(portalUrl);

      // Fetch portal data using the token
      const dataRes = await fetch(`/api/customer-portal/${token}?XTransformPort=3000`);
      if (dataRes.ok) {
        const portalData = await dataRes.json();
        setPreviewData(portalData);
      } else {
        toast.error('Failed to load portal preview data');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRefreshPreview = async () => {
    if (!previewToken) return;
    try {
      const dataRes = await fetch(`/api/customer-portal/${previewToken}?XTransformPort=3000`);
      if (dataRes.ok) {
        const portalData = await dataRes.json();
        setPreviewData(portalData);
      }
    } catch {
      toast.error('Failed to refresh preview');
    }
  };

  // ─── Computed ─────────────────────────────────────────────────────────
  const filteredCustomers = customers.filter(c =>
    !customerSearch ||
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === previewCustomerId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-600 shadow-md shadow-emerald-600/20">
                <Globe className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Customer Portal</h1>
                <p className="text-xs text-gray-500">Manage portal access & preview customer experience</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { fetchCustomers(); fetchSessions(); }}
              >
                <RefreshCw className="size-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm h-10">
            <TabsTrigger value="links" className="text-sm px-4">
              <Link2 className="size-4 mr-1.5" /> Portal Links
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-sm px-4">
              <Eye className="size-4 mr-1.5" /> Preview
            </TabsTrigger>
          </TabsList>

          {/* ─── Portal Links Tab ───────────────────────────────────────── */}
          <TabsContent value="links" className="space-y-6">
            {/* Customer List & Generate */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Building2 className="size-4 text-emerald-600" />
                      Customers
                    </CardTitle>
                    <CardDescription className="mt-1">Generate portal links for customers to self-serve</CardDescription>
                  </div>
                </div>
                <div className="relative mt-3">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search customers by name, phone, or email..."
                    className="pl-9 h-9 text-sm"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-emerald-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading customers...</span>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="size-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {customerSearch ? 'No customers match your search' : 'No customers found'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-1">
                      {filteredCustomers.map(customer => {
                        const existingSession = sessions.find(s => s.customerId === customer.id && !isExpired(s.expiresAt));
                        const isGenerating = generatingFor === customer.id;

                        return (
                          <div
                            key={customer.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="size-9 shrink-0">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                                  {customer.name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{customer.name || 'Unnamed'}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {customer.phone && <span>{customer.phone}</span>}
                                  {customer.email && <span className="truncate">{customer.email}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {existingSession ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  <CheckCircle2 className="size-3 mr-1" /> Active Link
                                </Badge>
                              ) : null}
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={isGenerating}
                                onClick={() => handleGenerateLink(customer.id)}
                              >
                                {isGenerating ? (
                                  <Loader2 className="size-3 mr-1 animate-spin" />
                                ) : (
                                  <Plus className="size-3 mr-1" />
                                )}
                                Generate Link
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Active Portal Sessions */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <QrCode className="size-4 text-emerald-600" />
                  Portal Sessions
                </CardTitle>
                <CardDescription>Active and recent portal access links</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-emerald-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading sessions...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Link2 className="size-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No portal sessions yet</p>
                    <p className="text-xs text-gray-400 mt-1">Generate a link above to create a session</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {sessions.map(session => {
                        const expired = isExpired(session.expiresAt);
                        return (
                          <div
                            key={session.id}
                            className={`p-4 rounded-lg border transition-colors ${
                              expired
                                ? 'bg-gray-50/50 border-gray-100'
                                : 'bg-white border-emerald-100 hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <Avatar className="size-9 shrink-0 mt-0.5">
                                  <AvatarFallback className={`text-xs font-medium ${
                                    expired
                                      ? 'bg-gray-100 text-gray-500'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {session.customerName?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium ${expired ? 'text-gray-500' : 'text-gray-900'}`}>
                                    {session.customerName || 'Unknown Customer'}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Link2 className="size-3 text-gray-400" />
                                    <span className="text-xs text-gray-400 font-mono truncate max-w-[200px] sm:max-w-[320px]">
                                      {session.portalUrl || `/portal/${session.token.slice(0, 12)}...`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs">
                                    <span className={`flex items-center gap-1 ${expired ? 'text-red-500' : 'text-gray-500'}`}>
                                      <Clock className="size-3" />
                                      {expired ? `Expired ${timeAgo(session.expiresAt)}` : `Expires ${formatDate(session.expiresAt)}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    expired
                                      ? 'bg-red-50 text-red-600 border-red-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {expired ? 'Expired' : 'Active'}
                                </Badge>
                                {!expired && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleCopyLink(session.portalUrl || `${window.location.origin}/portal/${session.token}`)}
                                      title="Copy link"
                                    >
                                      <Copy className="size-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleOpenPortal(session.portalUrl)}
                                      title="Open portal"
                                    >
                                      <ExternalLink className="size-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Preview Tab ────────────────────────────────────────────── */}
          <TabsContent value="preview" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Eye className="size-4 text-emerald-600" />
                  Portal Preview
                </CardTitle>
                <CardDescription>
                  Preview the portal experience as a specific customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                  <div className="flex-1 w-full space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Select Customer</Label>
                    <Select value={previewCustomerId} onValueChange={setPreviewCustomerId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a customer to preview..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customersLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="size-4 animate-spin text-emerald-600" />
                            <span className="ml-2 text-xs text-gray-500">Loading...</span>
                          </div>
                        ) : customers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-500">No customers available</div>
                        ) : (
                          customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6">
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[8px]">
                                    {customer.name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{customer.name || 'Unnamed'}</span>
                                {customer.phone && <span className="text-gray-400 text-xs">({customer.phone})</span>}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 w-full sm:w-auto"
                    disabled={!previewCustomerId || previewLoading}
                    onClick={handleStartPreview}
                  >
                    {previewLoading ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <Eye className="size-4 mr-1.5" />
                    )}
                    {previewLoading ? 'Loading Preview...' : 'Preview Portal'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview Content */}
            {previewLoading && !previewData && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
                  <p className="mt-3 text-sm text-gray-500">Generating preview session...</p>
                </div>
              </div>
            )}

            {previewData && selectedCustomer && (
              <div className="space-y-4">
                {/* Preview Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Previewing portal for <strong>{selectedCustomer.name}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      onClick={handleRefreshPreview}
                    >
                      <RefreshCw className="size-3 mr-1" /> Refresh
                    </Button>
                    {previewToken && previewPortalUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        onClick={() => handleOpenPortal(previewPortalUrl)}
                      >
                        <ExternalLink className="size-3 mr-1" /> Open in New Tab
                      </Button>
                    )}
                  </div>
                </div>

                {/* Embedded Portal Experience */}
                <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-lg border border-emerald-100 p-4 sm:p-6">
                  {/* Mini header for context */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 shadow-md shadow-emerald-600/20">
                        <Building2 className="size-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">ServiceOS</h2>
                        <p className="text-[10px] text-gray-500">Customer Portal</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">Hi, {selectedCustomer.name}</span>
                  </div>

                  <PortalExperience portalData={previewData} onRefresh={handleRefreshPreview} portalToken={previewToken ?? undefined} />

                  {/* Mini footer */}
                  <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Powered by ServiceOS</span>
                    {previewData.session?.expiresAt && (
                      <span>Session expires {formatDate(previewData.session.expiresAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!previewData && !previewLoading && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="flex items-center justify-center size-16 rounded-2xl bg-emerald-50 mx-auto mb-4">
                    <Eye className="size-8 text-emerald-300" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Select a Customer to Preview</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Choose a customer above and click &quot;Preview Portal&quot; to see their portal experience inline
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Customer Portal Management</span>
          <span>{sessions.filter(s => !isExpired(s.expiresAt)).length} active session(s)</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

/**
 * CustomerPortalView — ADMIN-ONLY management view.
 *
 * Per Option (b) of the INV-CP-1 investigation, this file has been
 * consolidated to ONLY the admin management experience (PortalManagementView).
 * The real customer-facing portal lives at
 * `src/components/portals/customer-portal-layout.tsx` and is rendered by
 * `src/app/page.tsx` when `auth.user.role === 'customer'` (set via magic-link
 * exchange or password login) — NOT via this sidebar view.
 *
 * The `token` prop (and the legacy `DirectPortalView`/`PortalExperience`
 * token-resolution branching) has been removed. Callers that previously
 * passed a `token` (none in this codebase do) should instead link the
 * customer to the magic-link URL returned by `POST /api/customer-portal`.
 */
export function CustomerPortalView(_props: CustomerPortalProps = {}) {
  return <PortalManagementView />;
}

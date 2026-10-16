'use client';

/**
 * LiveTripTrackerCard — Zomato & Swiggy-Style Real-time Tracking HUD
 * -------------------------------------------------------------------
 * Floating HUD overlay positioned on the map showing active technician
 * travel telemetry, live ETA countdown, route milestones, speed, battery,
 * and 1-tap customer/technician contact actions.
 */

import { useState, useMemo } from 'react';
import {
  Phone,
  MessageSquare,
  Navigation,
  Clock,
  Battery,
  Gauge,
  MapPin,
  CheckCircle2,
  X,
  ExternalLink,
  Crosshair,
  User,
  Radio,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { haversineKm, etaMinutes, formatTime } from '../utils/dispatch-helpers';
import type { Employee, Job } from '../types';

export interface LiveTripTrackerCardProps {
  employee: Employee;
  job?: Job | null;
  onClose: () => void;
  onViewJob?: (job: Job) => void;
  onFollowToggle?: () => void;
  isFollowing?: boolean;
}

export function LiveTripTrackerCard({
  employee: e,
  job,
  onClose,
  onViewJob,
  onFollowToggle,
  isFollowing = false,
}: LiveTripTrackerCardProps) {
  // Calculate live distance & ETA if both coords exist
  const distanceRemainingKm = useMemo(() => {
    if (
      typeof e.latitude === 'number' &&
      typeof e.longitude === 'number' &&
      job &&
      typeof job.latitude === 'number' &&
      typeof job.longitude === 'number'
    ) {
      return haversineKm(e.latitude, e.longitude, job.latitude, job.longitude);
    }
    return null;
  }, [e.latitude, e.longitude, job]);

  const eta = useMemo(() => {
    if (distanceRemainingKm != null) {
      return etaMinutes(distanceRemainingKm);
    }
    return null;
  }, [distanceRemainingKm]);

  // Extract battery & speed from metadata or employee object if present
  const batteryPct = useMemo(() => {
    const raw = (e as unknown as { batteryLevel?: number }).batteryLevel;
    if (typeof raw === 'number' && raw >= 0 && raw <= 1) {
      return Math.round(raw * 100);
    }
    return null;
  }, [e]);

  const speedKmh = useMemo(() => {
    const raw = (e as unknown as { speed?: number }).speed;
    if (typeof raw === 'number' && raw >= 0) {
      return Math.round(raw * 3.6);
    }
    return null;
  }, [e]);

  // Determine active lifecycle step
  const currentStep = useMemo(() => {
    const status = (job?.status || e.status || '').toLowerCase();
    if (status === 'completed') return 4;
    if (['in_progress', 'working'].includes(status)) return 3;
    if (['arrived', 'on_site'].includes(status)) return 2;
    if (['travelling', 'en_route', 'traveling'].includes(status)) return 1;
    return 0; // Dispatched / Assigned
  }, [job?.status, e.status]);

  const handleShareTracking = async () => {
    if (!job) return;
    try {
      const res = await fetch(`/api/dispatch/jobs/${job.id}/magic-link`);
      const data = await res.json();
      if (data.magicUrl) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(data.magicUrl);
          toast.success(`Copied live tracking link for ${e.name}!`);
        } else {
          toast.info(`Tracking link: ${data.magicUrl}`);
        }
      }
    } catch {
      toast.error('Failed to get tracking link');
    }
  };

  const isEnRoute =
    ['travelling', 'en_route', 'traveling'].includes((job?.status || '').toLowerCase()) ||
    ['travelling', 'en_route', 'traveling'].includes((e.status || '').toLowerCase());

  return (
    <div className="w-full max-w-md sm:max-w-lg bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl overflow-hidden pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* ── Top Bar: Tech Info & Follow Toggle ─────────────────── */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="size-9 ring-2 ring-background shadow-xs">
              <AvatarFallback className="bg-teal-600 text-white font-bold text-xs">
                {e.name?.slice(0, 2).toUpperCase() || 'TC'}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background',
                isEnRoute
                  ? 'bg-amber-500 animate-pulse'
                  : e.status === 'available'
                    ? 'bg-emerald-500'
                    : 'bg-teal-500'
              )}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-xs text-foreground truncate">{e.name}</h3>
              {typeof e.rating === 'number' && e.rating > 0 && (
                <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-0.5">
                  ★ {e.rating.toFixed(1)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="capitalize">{e.role || 'Service Pro'}</span>
              {e.skills && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[120px]">{e.skills}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onFollowToggle && (
            <Button
              variant={isFollowing ? 'default' : 'outline'}
              size="sm"
              onClick={onFollowToggle}
              className={cn(
                'h-7 px-2 text-[11px] gap-1 font-medium transition-all',
                isFollowing
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={isFollowing ? 'Lock camera enabled' : 'Lock camera on technician'}
            >
              <Crosshair className={cn('size-3.5', isFollowing && 'animate-spin')} />
              <span className="hidden sm:inline">{isFollowing ? 'Locked' : 'Follow'}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Dismiss HUD"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Mid Section: Live Telemetry & ETA HUD ───────────────── */}
      <div className="p-3.5 space-y-3">
        {/* Live Trip Status Pill */}
        <div className="flex items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/50">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-teal-600" />
            </span>
            <span className="text-xs font-semibold text-foreground">
              {isEnRoute
                ? 'En Route to Destination'
                : job?.status === 'in_progress'
                  ? 'Active Diagnostic & Repair'
                  : job?.status === 'arrived'
                    ? 'Arrived on Site'
                    : 'Dispatched & Tracking'}
            </span>
          </div>

          {/* Prominent ETA Badge */}
          {eta != null && eta > 0 && eta < 999 ? (
            <Badge className="bg-teal-600 text-white font-bold text-xs px-2.5 py-0.5 shadow-xs">
              <Clock className="size-3 mr-1 shrink-0" />
              ETA {eta} min
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              <Radio className="size-2.5 mr-1 text-teal-600" /> Live GPS
            </Badge>
          )}
        </div>

        {/* Live Metrics Grid (Speed, Distance, Battery) */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
              Distance
            </span>
            <span className="font-bold text-xs text-foreground">
              {distanceRemainingKm != null ? `${distanceRemainingKm.toFixed(1)} km` : '—'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
              Speed
            </span>
            <span className="font-bold text-xs text-foreground">
              {speedKmh != null ? `${speedKmh} km/h` : 'Moving'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
              Battery
            </span>
            <span
              className={cn(
                'font-bold text-xs',
                batteryPct != null && batteryPct > 50
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : batteryPct != null && batteryPct >= 20
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {batteryPct != null ? `${batteryPct}%` : 'Normal'}
            </span>
          </div>
        </div>

        {/* Zomato/Swiggy Delivery Stepper */}
        <div className="pt-1">
          <div className="flex items-center justify-between relative px-2">
            {/* Connecting line */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-muted-foreground/20 -z-0" />
            <div
              className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-teal-600 transition-all duration-300 -z-0"
              style={{
                width: `${Math.min(100, Math.max(0, (currentStep / 3) * 100))}%`,
              }}
            />

            {[
              { label: 'Assigned', step: 0 },
              { label: 'En Route', step: 1 },
              { label: 'On Site', step: 2 },
              { label: 'Completed', step: 3 },
            ].map(({ label, step }) => {
              const isPast = currentStep > step;
              const isCurrent = currentStep === step;

              return (
                <div key={label} className="flex flex-col items-center gap-1 z-10">
                  <div
                    className={cn(
                      'size-4 rounded-full flex items-center justify-center transition-all',
                      isPast
                        ? 'bg-teal-600 text-white'
                        : isCurrent
                          ? 'bg-teal-600 text-white ring-4 ring-teal-100 dark:ring-teal-950/60'
                          : 'bg-card border-2 border-muted-foreground/30 text-transparent'
                    )}
                  >
                    {isPast ? <CheckCircle2 className="size-3" /> : <span className="size-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-medium transition-colors',
                      isCurrent
                        ? 'text-teal-700 dark:text-teal-300 font-bold'
                        : isPast
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Job & Customer Destination Snippet */}
        {job ? (
          <div className="p-2.5 rounded-xl border border-border/60 bg-muted/15 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-xs text-foreground truncate" title={job.title}>
                  {job.title}
                </h4>
                {job.jobNumber && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    #{job.jobNumber}
                  </span>
                )}
              </div>
              {onViewJob && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewJob(job)}
                  className="h-6 px-1.5 text-[10px] text-teal-600 hover:text-teal-700 gap-1 shrink-0"
                >
                  Details <ExternalLink className="size-2.5" />
                </Button>
              )}
            </div>

            {(job.customerName || job.address) && (
              <div className="space-y-1 text-[11px] text-muted-foreground">
                {job.customerName && (
                  <div className="flex items-center gap-1.5">
                    <User className="size-3 text-teal-600 shrink-0" />
                    <span className="text-foreground font-medium truncate">{job.customerName}</span>
                  </div>
                )}
                {job.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="size-3 text-rose-500 shrink-0 mt-0.5" />
                    <span className="truncate">{job.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl">
            Technician is available · No active job assigned
          </div>
        )}

        {/* ── Bottom Action Strip ────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1">
          {e.phone ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 h-8 text-xs gap-1.5 border-border hover:bg-muted"
            >
              <a href={`tel:${e.phone}`}>
                <Phone className="size-3.5 text-teal-600" />
                <span>Call Pro</span>
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 h-8 text-xs gap-1.5 opacity-60"
            >
              <Phone className="size-3.5" />
              <span>No Phone</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareTracking}
            className="flex-1 h-8 text-xs gap-1.5 border-border hover:bg-muted"
          >
            <Share2 className="size-3.5 text-sky-600" />
            <span>Share Link</span>
          </Button>

          {job && onViewJob && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onViewJob(job)}
              className="flex-1 h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Navigation className="size-3.5" />
              <span>Inspect</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

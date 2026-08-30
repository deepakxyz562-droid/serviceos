'use client';

/**
 * GpsRouteSection — shows a summary of the travel route (distance,
 * duration, on-time arrival) and a "View on Map" button that opens a
 * modal with the path coordinates + Google Maps link.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2A refactor).
 */

import type { ReactNode } from 'react';
import { MapPin, Route as RouteIcon, MapPinned, Navigation, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatMinutes } from '@/lib/format-utils';
import type { Job, LifecycleDataShape } from '@/features/jobs/types/jobs-view-types';

export function GpsRouteSection({
  job,
  lifecycleData,
  onOpenRoute,
}: {
  job: Job;
  lifecycleData: LifecycleDataShape | null;
  onOpenRoute: () => void;
}) {
  // Prefer the in-progress (active) route; fall back to the most recent
  // completed route so finished jobs still show their real distance /
  // duration / "View on Map" instead of "No travel recorded".
  const route = lifecycleData?.activeRoute ?? lifecycleData?.completedRoute ?? null;
  // Lifecycle timestamps tell us whether travel ever happened at all
  // (travelStarted / arrived). The completed route object also counts.
  const ts = lifecycleData?.timestamps;
  const travelHappened = !!(ts && (ts.travelStarted || ts.arrived)) || !!lifecycleData?.completedRoute;

  if (!travelHappened && !route) {
    // Fallback: even if no RouteHistory row exists (job completed via a
    // path that didn't create one), show the check-in / check-out
    // coordinates that were captured, instead of a bare "No travel recorded."
    const hasCheckIn = typeof job.checkInLat === 'number' && typeof job.checkInLng === 'number';
    const hasCheckOut = typeof job.checkOutLat === 'number' && typeof job.checkOutLng === 'number';
    if (hasCheckIn || hasCheckOut) {
      const mapsUrl = hasCheckIn && hasCheckOut
        ? `https://www.google.com/maps/dir/${job.checkInLat},${job.checkInLng}/${job.checkOutLat},${job.checkOutLng}`
        : `https://www.google.com/maps?q=${hasCheckIn ? `${job.checkInLat},${job.checkInLng}` : `${job.checkOutLat},${job.checkOutLng}`}`;
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-emerald-600" />
            <span>Location captured for this job.</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {hasCheckIn && (
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {job.checkInLat!.toFixed(5)}, {job.checkInLng!.toFixed(5)}
                </p>
              </div>
            )}
            {hasCheckOut && (
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {job.checkOutLat!.toFixed(5)}, {job.checkOutLng!.toFixed(5)}
                </p>
              </div>
            )}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <MapPinned className="size-4 mr-1.5" /> View on Map
          </a>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RouteIcon className="size-4" />
        <span>No travel recorded for this job yet.</span>
      </div>
    );
  }

  // Compute on-time status (if scheduledAt + arrivedAt both present).
  let onTimeDiffMin: number | null = null;
  if (ts?.arrived && job.scheduledAt) {
    try {
      const arrived = new Date(ts.arrived).getTime();
      const scheduled = new Date(job.scheduledAt).getTime();
      onTimeDiffMin = Math.round((arrived - scheduled) / 60000);
    } catch {
      onTimeDiffMin = null;
    }
  }
  let onTimeBadge: ReactNode = null;
  if (onTimeDiffMin !== null) {
    if (onTimeDiffMin <= 0) {
      onTimeBadge = (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          On time
        </Badge>
      );
    } else if (onTimeDiffMin <= 15) {
      onTimeBadge = (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          {onTimeDiffMin}m late
        </Badge>
      );
    } else {
      onTimeBadge = (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {onTimeDiffMin}m late
        </Badge>
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Distance</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {route?.distanceMeters
              ? `${(route.distanceMeters / 1000).toFixed(2)} km`
              : '—'}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Travel time</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {route?.durationMinutes ? formatMinutes(route.durationMinutes) : (ts?.travelStarted && ts?.arrived ? formatMinutes(Math.round((new Date(ts.arrived).getTime() - new Date(ts.travelStarted).getTime()) / 60000)) : '—')}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Started</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {ts?.travelStarted ? formatDateTime(ts.travelStarted) : '—'}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Arrived</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {ts?.arrived ? formatDateTime(ts.arrived) : (route?.status === 'in_progress' ? 'In transit…' : '—')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          {onTimeBadge}
          {route?.status === 'in_progress' && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Navigation className="size-3 mr-1 animate-pulse" /> In transit
            </Badge>
          )}
          {route?.status === 'completed' && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="size-3 mr-1" /> Route completed
            </Badge>
          )}
        </div>
        <button
          onClick={onOpenRoute}
          className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          <MapPinned className="size-4 mr-1.5" /> View on Map
        </button>
      </div>
    </div>
  );
}

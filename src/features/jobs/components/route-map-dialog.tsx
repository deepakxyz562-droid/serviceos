'use client';

/**
 * RouteMapDialog — V1.5 GPS Travel Route modal.
 *
 * Displays the GPS path captured for a single job (the pings recorded while
 * the technician was in transit). Shows summary stats (distance, duration,
 * point count), a first/last-3 sample table of the path coordinates, and a
 * "Open in Google Maps" deep link for turn-by-turn navigation.
 *
 * The parent (JobsView) owns the route data + loading flag — it fetches the
 * data when opening the modal (so the spinner is shown until the fetch
 * resolves). This component is purely presentational.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2E refactor).
 */

import { ExternalLink, Loader2, MapPinned } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime, formatMinutes } from '@/lib/format-utils';

export interface RouteMapPathPoint {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracy?: number | null;
}

export interface RouteMapSummary {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  routeCount: number;
}

export interface RouteMapData {
  path: RouteMapPathPoint[];
  summary: RouteMapSummary;
  routes: Array<{
    id: string;
    startedAt: string;
    arrivedAt: string | null;
    distanceMeters: number;
    durationMinutes: number;
    startLat: number | null;
    startLng: number | null;
    endLat: number | null;
    endLng: number | null;
  }>;
}

export interface RouteMapDialogProps {
  /** Controls the modal's open state. */
  open: boolean;
  /** Called when the user dismisses the modal (Esc, backdrop, X). */
  onOpenChange: (open: boolean) => void;
  /** True while the parent is fetching route data — shows a spinner. */
  loading: boolean;
  /** The fetched route data, or null if not yet loaded / fetch failed. */
  data: RouteMapData | null;
}

/**
 * Modal showing the GPS path recorded for the currently-selected job.
 *
 * Empty state: when `data` is null or has zero path points, a muted
 * "No GPS path recorded for this job yet." message is shown.
 *
 * Sampled path table: shows only the first 3 + last 3 path points (with an
 * "… N more points …" divider in the middle) to keep the modal short for jobs
 * with hundreds of pings.
 *
 * Google Maps deep link: builds a `https://www.google.com/maps/dir/?api=1`
 * URL using the first and last path points as origin/destination with
 * `travelmode=driving`.
 */
export function RouteMapDialog({ open, onOpenChange, loading, data }: RouteMapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="size-5 text-emerald-600" /> Travel Route
          </DialogTitle>
          <DialogDescription>
            GPS path recorded for this job. Open in Google Maps for a full turn-by-turn view.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60dvh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            </div>
          ) : !data || data.path.length === 0 ? (
            <div className="text-center py-12">
              <MapPinned className="size-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No GPS path recorded for this job yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">GPS pings are captured while the technician is in transit.</p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {data.summary.totalDistanceKm.toFixed(2)} km
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {formatMinutes(data.summary.totalDurationMinutes)}
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Points</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {data.path.length}
                  </p>
                </div>
              </div>

              {/* Path table (first/last + middle sample) */}
              <div className="rounded-md border border-border/60 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      <th className="px-2 py-1.5 text-left font-medium">Lat</th>
                      <th className="px-2 py-1.5 text-left font-medium">Lng</th>
                      <th className="px-2 py-1.5 text-left font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {/* Show first 3 + last 3 to keep the modal short */}
                    {data.path.slice(0, 3).map((p, i) => (
                      <tr key={`f-${i}`} className="border-t border-border/40">
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className="px-2 py-1.5">{p.lat.toFixed(5)}</td>
                        <td className="px-2 py-1.5">{p.lng.toFixed(5)}</td>
                        <td className="px-2 py-1.5">{formatDateTime(p.capturedAt)}</td>
                      </tr>
                    ))}
                    {data.path.length > 6 && (
                      <tr className="border-t border-border/40">
                        <td colSpan={4} className="px-2 py-1.5 text-center text-muted-foreground italic">
                          … {data.path.length - 6} more points …
                        </td>
                      </tr>
                    )}
                    {data.path.length > 3 && data.path.slice(-3).map((p, i) => (
                      <tr key={`l-${i}`} className="border-t border-border/40">
                        <td className="px-2 py-1.5">{data.path.length - 2 + i}</td>
                        <td className="px-2 py-1.5">{p.lat.toFixed(5)}</td>
                        <td className="px-2 py-1.5">{p.lng.toFixed(5)}</td>
                        <td className="px-2 py-1.5">{formatDateTime(p.capturedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Google Maps link */}
              {(() => {
                const first = data.path[0];
                const last = data.path[data.path.length - 1];
                if (!first || !last) return null;
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${first.lat},${first.lng}&destination=${last.lat},${last.lng}&travelmode=driving`;
                return (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm w-full"
                  >
                    <ExternalLink className="size-4 mr-1.5" /> Open in Google Maps
                  </a>
                );
              })()}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

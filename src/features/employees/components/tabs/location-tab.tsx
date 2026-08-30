'use client';

/**
 * Location Tab — live employee GPS + ETA + today's route.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Navigation, MapPin, MapPinned, Clock, Briefcase, Route, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import { formatMinutes, timeAgo } from '@/lib/format-utils';
import type { Employee, EmployeeJob, RouteResponse } from '../../types';
import {
  apiUrl, formatTime, haversineDistanceKm, estimateTravelMinutes,
} from '../../utils/employee-helpers';

export function LocationTab({ employee }: { employee: Employee }) {
  const { data, isLoading } = useQuery<RouteResponse>({
    queryKey: ['employee-route', employee.id],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/gps/route/${employee.id}`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!(employee.latitude || employee.longitude),
  });

  // Fetch the employee's jobs so we can identify the current active job
  // (status 'assigned' or 'in_progress') and compute ETA from the
  // employee's GPS coordinates to the job's geocoded destination lat/lng.
  const jobsQuery = useQuery<{ employee: { id: string; name: string; status: string }; jobs: EmployeeJob[] }>({
    queryKey: ['employee-location-jobs', employee.id],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employee.id}/jobs`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const hasCoords = !!(employee.latitude && employee.longitude);
  const totalDistanceKm = data?.summary?.totalDistanceKm ?? 0;
  const totalDurationMin = data?.summary?.totalDurationMinutes ?? 0;
  const routes = data?.routes ?? [];

  // Identify the employee's current active job: the first one in
  // 'assigned' or 'in_progress' status. Sorted by scheduledAt desc on the
  // server, so the most-recent assignment wins.
  const currentJob = useMemo(() => {
    const all = jobsQuery.data?.jobs ?? [];
    return all.find((j) => j.status === 'assigned' || j.status === 'in_progress') ?? null;
  }, [jobsQuery.data]);

  // Compute straight-line haversine distance + estimated travel time
  // (40 km/h urban average — per Phase 2 spec for LocationTab ETA).
  // Both the employee's current GPS and the job's geocoded destination
  // must be present to compute; otherwise we show the appropriate empty state.
  const eta = useMemo(() => {
    if (!employee.latitude || !employee.longitude) return null;
    if (!currentJob) return null;
    const jobLat = currentJob.latitude;
    const jobLng = currentJob.longitude;
    if (typeof jobLat !== 'number' || typeof jobLng !== 'number' || !jobLat || !jobLng) return null;
    const distKm = haversineDistanceKm(employee.latitude, employee.longitude, jobLat, jobLng);
    const travelMin = estimateTravelMinutes(distKm);
    return { distKm, travelMin, jobTitle: currentJob.title, customerName: currentJob.customer?.name || currentJob.customerName || null };
  }, [employee.latitude, employee.longitude, currentJob]);

  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(employee.longitude! - 0.01)}%2C${(employee.latitude! - 0.01)}%2C${(employee.longitude! + 0.01)}%2C${(employee.latitude! + 0.01)}&layer=mapnik&marker=${employee.latitude}%2C${employee.longitude}`
    : null;

  return (
    <div className="space-y-4">
      {/* ETA Card — straight-line distance + rough travel time */}
      <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Navigation className="size-4 text-emerald-600" /> ETA to Current Job
          </CardTitle>
          <CardDescription className="text-xs">
            Straight-line distance · 40 km/h urban estimate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !hasCoords ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <AlertCircle className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">No GPS data</p>
                <p className="text-xs text-muted-foreground">
                  The employee hasn&apos;t shared their current location.
                </p>
              </div>
            </div>
          ) : !currentJob ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Briefcase className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">No active job</p>
                <p className="text-xs text-muted-foreground">
                  No job is currently assigned or in progress.
                </p>
              </div>
            </div>
          ) : !eta ? (
            <div className="flex items-center gap-3 py-2">
              <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <MapPin className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Job site coordinates unavailable</p>
                <p className="text-xs text-muted-foreground">
                  {currentJob.title} ({currentJob.customer?.name || currentJob.customerName || 'no customer'})
                  &nbsp;has no geocoded lat/lng — cannot compute ETA.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{eta.distKm.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground font-medium">km away</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-baseline gap-1.5">
                <Clock className="size-3.5 text-emerald-600 self-center" />
                <span className="text-lg font-semibold">~{eta.travelMin} min</span>
                <span className="text-xs text-muted-foreground font-medium">ETA</span>
              </div>
              <div className="ml-auto text-right min-w-0">
                <p className="text-xs font-medium truncate">{eta.jobTitle}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {eta.customerName ? `${eta.customerName}` : 'No customer'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map + Current Location */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPinned className="size-4 text-emerald-600" /> Live Location
            </CardTitle>
            <CardDescription className="text-xs">
              {employee.lastLocationAt ? `Last updated ${timeAgo(employee.lastLocationAt)}` : 'No location data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : mapSrc ? (
              <iframe
                title="Employee location map"
                src={mapSrc}
                className="w-full h-[300px] rounded-lg border border-border"
                loading="lazy"
              />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <MapPinned className="size-10 opacity-30 mb-2" />
                <p className="text-sm font-medium">No location data</p>
                <p className="text-xs">The employee hasn&apos;t shared their location yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Travel Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Navigation className="size-4 text-emerald-600" /> Today&apos;s Travel
            </CardTitle>
            <CardDescription className="text-xs">Distance & duration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Distance</p>
              <p className="text-2xl font-bold mt-1">{totalDistanceKm.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">km</span></p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Travel Time</p>
              <p className="text-2xl font-bold mt-1">{formatMinutes(totalDurationMin)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Routes Today</p>
              <p className="text-2xl font-bold mt-1">{data?.summary?.routeCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Route — visited jobs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Route className="size-4 text-emerald-600" /> Today&apos;s Route
          </CardTitle>
          <CardDescription className="text-xs">Visited jobs and stops</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No routes recorded today.
            </div>
          ) : (
            <div className="space-y-2">
              {routes.map((route, i) => (
                <div key={route.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="size-9 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-emerald-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {route.jobId ? `Job ${route.jobId.slice(-6)}` : 'Travel'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started {formatTime(route.startedAt)}
                      {route.endedAt ? ` · Ended ${formatTime(route.endedAt)}` : ''}
                      {route.arrivedAt && ` · Arrived ${formatTime(route.arrivedAt)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{(route.distanceMeters / 1000).toFixed(2)} km</p>
                    <p className="text-[10px] text-muted-foreground">{formatMinutes(route.durationMinutes)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

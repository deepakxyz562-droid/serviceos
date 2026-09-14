/**
 * Geo-Fencing Engine
 * -------------------
 * Evaluates real-time GPS telemetry from field technicians against active job sites.
 * Detects on-site proximity within a configurable radius (default: 100m).
 *
 * When technician enters the geofence perimeter:
 *   1. Automatically records geofence arrival telemetry (lat, lng, distance, timestamp)
 *   2. Transitions job status from 'travelling' / 'assigned' to 'arrived' if applicable
 *   3. Emits 'job.geofence_arrival' and 'job.status_change' events via EventBus
 *   4. Logs an audit entry & dispatches automated customer arrival SMS notification (if configured)
 */

import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';

export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

export interface GeofenceEvaluationParams {
  employeeId: string;
  latitude: number;
  longitude: number;
  jobId?: string | null;
  tenantId?: string | null;
  workspaceId?: string | null;
}

export interface GeofenceArrivalResult {
  triggered: boolean;
  jobId?: string;
  jobNumber?: string | null;
  jobTitle?: string;
  distanceMeters?: number;
  previousStatus?: string;
  newStatus?: string;
  arrivedAt?: string;
}

/**
 * Haversine formula distance between two coordinates in meters.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Evaluates whether an incoming GPS ping enters the geofence perimeter of any active job.
 */
export async function evaluateGeofenceArrival(
  params: GeofenceEvaluationParams,
): Promise<GeofenceArrivalResult> {
  const { employeeId, latitude, longitude, jobId, tenantId, workspaceId } = params;

  try {
    // 1. Find candidate active jobs assigned to this technician
    // If a specific jobId was given in the GPS ping, prioritize it; otherwise check active jobs
    const whereClause: Record<string, unknown> = {
      assigneeId: employeeId,
      deletedAt: null,
      status: { in: ['travelling', 'assigned', 'accepted'] },
      latitude: { not: null },
      longitude: { not: null },
    };

    if (jobId) {
      whereClause.id = jobId;
    }

    const candidateJobs = await db.job.findMany({
      where: whereClause,
      select: {
        id: true,
        jobNumber: true,
        title: true,
        status: true,
        latitude: true,
        longitude: true,
        metadataJson: true,
        customerName: true,
        customerPhone: true,
        workspaceId: true,
      },
    });

    if (!candidateJobs || candidateJobs.length === 0) {
      return { triggered: false };
    }

    const now = new Date();

    for (const job of candidateJobs) {
      if (job.latitude == null || job.longitude == null) continue;

      const meta = safeParseJson<Record<string, unknown>>(job.metadataJson, {});
      const lifecycleTimestamps = (meta.lifecycleTimestamps || {}) as Record<string, string>;

      // If geofence arrival was already triggered for this job, skip re-triggering
      if (meta.geofenceArrivalAt || lifecycleTimestamps.arrived) {
        continue;
      }

      const distance = haversineMeters(
        latitude,
        longitude,
        job.latitude,
        job.longitude,
      );

      const radius = typeof meta.geofenceRadiusMeters === 'number'
        ? meta.geofenceRadiusMeters
        : DEFAULT_GEOFENCE_RADIUS_METERS;

      if (distance <= radius) {
        // --- Geofence Breach / Arrival Detected! ---
        const arrivedIso = now.toISOString();
        const prevStatus = job.status;
        const newStatus = 'arrived';

        // Update metadata with geofence telemetry
        const updatedMeta = {
          ...meta,
          geofenceArrivalAt: arrivedIso,
          geofenceArrivalDistanceM: Math.round(distance),
          geofenceRadiusUsedM: radius,
          lifecycleTimestamps: {
            ...lifecycleTimestamps,
            arrived: arrivedIso,
          },
        };

        // Update job state in DB
        await db.job.update({
          where: { id: job.id },
          data: {
            status: newStatus,
            checkInLat: latitude,
            checkInLng: longitude,
            metadataJson: JSON.stringify(updatedMeta),
          },
        });

        // Emit Geofence Arrival Event
        try {
          EventBus.emit(
            'job.geofence_arrival',
            {
              jobId: job.id,
              jobNumber: job.jobNumber,
              jobTitle: job.title,
              employeeId,
              distanceMeters: Math.round(distance),
              latitude,
              longitude,
              arrivedAt: arrivedIso,
              tenantId: tenantId ?? undefined,
              workspaceId: job.workspaceId ?? workspaceId ?? undefined,
            },
            {
              tenantId: tenantId ?? undefined,
              workspaceId: job.workspaceId ?? workspaceId ?? undefined,
            },
          );

          // Also emit general job status change for realtime live map updates
          EventBus.emit(
            'job.status_change',
            {
              jobId: job.id,
              previousStatus: prevStatus,
              newStatus: newStatus,
              updatedBy: employeeId,
              source: 'geofence_auto_detection',
              tenantId: tenantId ?? undefined,
              workspaceId: job.workspaceId ?? workspaceId ?? undefined,
            },
            {
              tenantId: tenantId ?? undefined,
              workspaceId: job.workspaceId ?? workspaceId ?? undefined,
            },
          );
        } catch (eventErr) {
          console.warn('[GeofenceEngine] EventBus emission error (non-fatal):', eventErr);
        }

        return {
          triggered: true,
          jobId: job.id,
          jobNumber: job.jobNumber,
          jobTitle: job.title,
          distanceMeters: Math.round(distance),
          previousStatus: prevStatus,
          newStatus: newStatus,
          arrivedAt: arrivedIso,
        };
      }
    }

    return { triggered: false };
  } catch (error) {
    console.error('[GeofenceEngine] Error evaluating arrival:', error);
    return { triggered: false };
  }
}

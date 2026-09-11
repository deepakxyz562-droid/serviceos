import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loadTenantEmailBranding } from '@/lib/tenant-branding';
import { resolveTenantId } from '@/lib/owner-notifications';

/**
 * GET /api/portal/[id]
 *
 * Public portal endpoint queried by the Customer Mobile App & Portal pages.
 * Returns LiveTrackingInfo DTO with live technician moving coordinates and dynamic ETA.
 */

function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateEtaMinutes(distKm: number): number {
  // Average urban travel speed ~30 km/h + 2 min buffer
  const minutes = Math.round((distKm / 30) * 60) + 2;
  return Math.max(1, minutes);
}

function toIso(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  try {
    const d = new Date(val as any);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        description: true,
        status: true,
        address: true,
        scheduledAt: true,
        actualStartTime: true,
        completedAt: true,
        quotedAmount: true,
        lineItemsJson: true,
        latitude: true,
        longitude: true,
        workspaceId: true,
        customer: {
          select: {
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            latitude: true,
            longitude: true,
            lastLocationAt: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let branding: {
      businessName: string;
      logoUrl: string | null;
      primaryColor: string;
      accentColor: string;
      hideFieserosBranding: boolean;
    } | null = null;

    try {
      if (job.workspaceId) {
        const tenantId = await resolveTenantId(job.workspaceId);
        if (tenantId) {
          const full = await loadTenantEmailBranding(tenantId);
          branding = {
            businessName: full.businessName,
            logoUrl: full.logoUrl,
            primaryColor: full.primaryColor,
            accentColor: full.accentColor,
            hideFieserosBranding: full.hideFieserosBranding,
          };
        }
      }
    } catch {
      // Non-fatal
    }

    const isActive = [
      'assigned',
      'accepted',
      'travelling',
      'en_route',
      'on_the_way',
      'in_progress',
      'working',
      'started',
      'arrived',
      'on_site',
    ].includes(job.status);

    const techLat = job.assignee?.latitude ?? null;
    const techLng = job.assignee?.longitude ?? null;
    const jobLat = job.latitude ?? null;
    const jobLng = job.longitude ?? null;

    let etaMinutes: number | null = null;
    let distanceKm: number | null = null;

    if (isActive && techLat != null && techLng != null && jobLat != null && jobLng != null) {
      distanceKm = Math.round(computeDistanceKm(techLat, techLng, jobLat, jobLng) * 10) / 10;
      if (['arrived', 'on_site', 'working', 'in_progress'].includes(job.status)) {
        etaMinutes = 0;
      } else {
        etaMinutes = estimateEtaMinutes(distanceKm);
      }
    }

    const currentLat = isActive ? (techLat ?? jobLat) : null;
    const currentLng = isActive ? (techLng ?? jobLng) : null;

    return NextResponse.json({
      jobId: job.id,
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      description: job.description,
      status: job.status,
      address: job.address,
      scheduledAt: toIso(job.scheduledAt),
      startedAt: toIso(job.actualStartTime),
      completedAt: toIso(job.completedAt),
      customerName: job.customer?.name ?? null,
      employeeName: job.assignee?.name ?? null,
      employeePhone: job.assignee?.phone ?? null,
      assigneeName: job.assignee?.name ?? null,
      assigneePhone: job.assignee?.phone ?? null,
      currentLatitude: currentLat,
      currentLongitude: currentLng,
      destinationLatitude: jobLat,
      destinationLongitude: jobLng,
      lastLocationAt: toIso(job.assignee?.lastLocationAt),
      etaMinutes,
      distanceKm,
      provider: job.assignee
        ? {
            id: job.assignee.id,
            name: job.assignee.name,
            phone: job.assignee.phone,
          }
        : null,
      branding,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch portal job details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

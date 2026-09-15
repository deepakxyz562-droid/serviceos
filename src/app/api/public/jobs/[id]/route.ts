import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loadTenantEmailBranding } from '@/lib/tenant-branding';
import { resolveTenantId } from '@/lib/owner-notifications';

/**
 * GET /api/public/jobs/[id]
 *
 * Public-safe job tracking DTO. NO authentication required.
 * Used by the customer portal tracking page (/portal/[id]).
 *
 * Returns ONLY fields safe for public consumption:
 *   - Job title, description, status, address, scheduledAt
 *   - Customer name (first name only — see note below)
 *   - Assignee name (technician's display name)
 *   - Assignee phone (for "Call Technician" button on tracking page)
 *   - Live location (latitude, longitude) for real-time tracking map
 *   - Service line items + quoted amount
 *   - Tenant branding (businessName, logoUrl, primary/accent color,
 *     hideFieserosBranding) — used by the portal page to render with the
 *     tenant's logo + colors instead of hardcoded "Fieseros" styling.
 *
 * NEVER includes:
 *   - verificationPin (the PIN is sent to the customer via SMS/WhatsApp/email)
 *   - internal notes
 *   - customer phone/email/address (beyond what's needed for display)
 *   - any pricing beyond the quoted amount
 *   - lifecycle timestamps (internal operational data)
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
        // Destination job site coordinates
        latitude: true,
        longitude: true,
        workspaceId: true,
        // Relations — select ONLY display-safe fields
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
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // ── Resolve tenant branding (best-effort — never fatal) ──
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
      // Non-fatal — branding is null, portal page uses defaults.
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

    // Live technician coordinates (if assigned and active) or job coordinates fallback
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

    // ── Fetch active warranties for this job (best-effort, never fatal) ──
    // Only returned after job completion so the portal can show a warranty card.
    let warranties: Array<{
      id: string;
      title: string;
      type: string;
      coverage: string;
      endDate: string | null;
      isActive: boolean;
    }> = [];
    if (job.status === 'completed') {
      try {
        const rawWarranties = await db.warranty.findMany({
          where: { jobId: id, isActive: true },
          select: {
            id: true,
            title: true,
            type: true,
            coverage: true,
            endDate: true,
            isActive: true,
          },
        });
        warranties = rawWarranties.map((w) => ({
          ...w,
          endDate: w.endDate ? w.endDate.toISOString() : null,
        }));
      } catch {
        // Non-fatal — warranties section simply won't appear
      }
    }

    // Return a flat, rich DTO compatible with both web portal and mobile app
    return NextResponse.json({
      id: job.id,
      jobId: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      description: job.description,
      status: job.status,
      address: job.address,
      scheduledAt: job.scheduledAt,
      actualStartTime: job.actualStartTime,
      completedAt: job.completedAt,
      quotedAmount: job.quotedAmount,
      lineItemsJson: job.lineItemsJson,
      customerName: job.customer?.name ?? null,
      assigneeName: job.assignee?.name ?? null,
      assigneePhone: job.assignee?.phone ?? null,
      employeeName: job.assignee?.name ?? null,
      employeePhone: job.assignee?.phone ?? null,
      // Live moving coordinates & destination coordinates
      currentLatitude: currentLat,
      currentLongitude: currentLng,
      destinationLatitude: jobLat,
      destinationLongitude: jobLng,
      lastLocationAt: job.assignee?.lastLocationAt ?? null,
      etaMinutes,
      distanceKm,
      branding,
      warranties,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

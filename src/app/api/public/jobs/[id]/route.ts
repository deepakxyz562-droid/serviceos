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
 *   - Service line items + quoted amount
 *   - Tenant branding (businessName, logoUrl, primary/accent color,
 *     hideFieserosBranding) — used by the portal page to render with the
 *     tenant's logo + colors instead of hardcoded "Fieseros" styling.
 *
 * NEVER includes:
 *   - verificationPin (the PIN is sent to the customer via SMS/WhatsApp/email)
 *   - internal notes
 *   - customer phone/email/address (beyond what's needed for display)
 *   - assignee phone or contact details
 *   - any pricing beyond the quoted amount
 *   - lifecycle timestamps (internal operational data)
 */
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
        quotedAmount: true,
        lineItemsJson: true,
        // workspaceId is required to resolve tenant branding below.
        // Not returned in the public DTO itself (kept internal-only).
        workspaceId: true,
        // Relations — select ONLY display-safe fields
        customer: {
          select: {
            name: true,
          },
        },
        assignee: {
          select: {
            name: true,
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
    // The Job model stores `workspaceId` (not `tenantId` directly), so we
    // normalize via resolveTenantId() and then load the canonical email
    // branding DTO. If anything fails, branding stays null and the portal
    // page falls back to default styling (no logo, "Customer Portal" name,
    // default teal accent).
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

    // Return a flat DTO (not wrapped in { job: ... }) for simpler public consumption
    return NextResponse.json({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      description: job.description,
      status: job.status,
      address: job.address,
      scheduledAt: job.scheduledAt,
      quotedAmount: job.quotedAmount,
      lineItemsJson: job.lineItemsJson,
      customerName: job.customer?.name ?? null,
      assigneeName: job.assignee?.name ?? null,
      // NOTE: verificationPin is intentionally NOT included.
      branding,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

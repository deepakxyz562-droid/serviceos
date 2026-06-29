import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSubdomain, isSuperAdminSubdomain } from '@/lib/subdomain';

/**
 * GET /api/tenant/resolve
 *
 * Resolves the current tenant based on the request's hostname.
 * Called from client-side to determine which tenant (if any) the
 * current subdomain belongs to.
 *
 * Query params:
 *   - hostname: The hostname to resolve (sent from client-side)
 *
 * Returns:
 *   - { type: "root" } — root domain, show landing page
 *   - { type: "superadmin" } — admin subdomain
 *   - { type: "tenant", tenant: {...} } — company subdomain
 *   - { type: "unknown", subdomain: "..." } — subdomain not found
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hostname = searchParams.get('hostname');

    if (!hostname) {
      return NextResponse.json({ type: 'root' });
    }

    const subdomain = extractSubdomain(hostname);

    // No subdomain detected → root domain
    if (!subdomain) {
      return NextResponse.json({ type: 'root' });
    }

    // Super admin subdomain
    if (isSuperAdminSubdomain(subdomain)) {
      return NextResponse.json({ type: 'superadmin' });
    }

    // Try to find tenant by subdomain first, then by slug
    let tenant = await db.tenant.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        industry: true,
        logo: true,
        phone: true,
        email: true,
        address: true,
        plan: true,
        planStatus: true,
        onboardingCompleted: true,
        country: true,
        currency: true,
        whatsappPhone: true,
      },
    });

    // Fallback: try matching by slug (for existing tenants without subdomain set)
    if (!tenant) {
      tenant = await db.tenant.findUnique({
        where: { slug: subdomain },
        select: {
          id: true,
          name: true,
          slug: true,
          subdomain: true,
          industry: true,
          logo: true,
          phone: true,
          email: true,
          address: true,
          plan: true,
          planStatus: true,
          onboardingCompleted: true,
          country: true,
          currency: true,
          whatsappPhone: true,
        },
      });

      // Auto-set subdomain if found by slug (one-time migration)
      if (tenant && !tenant.subdomain) {
        await db.tenant
          .update({
            where: { id: tenant.id },
            data: { subdomain: tenant.slug, subdomainVerified: true },
          })
          .catch((err) => {
            // Log but don't fail the request if auto-migration fails
            console.error('[TenantResolve] Failed to auto-set subdomain:', err);
          });
      }
    }

    // No tenant found for this subdomain
    if (!tenant) {
      return NextResponse.json({
        type: 'unknown',
        subdomain,
        message: `No company found at "${subdomain}.serviceos.cc"`,
      });
    }

    // Tenant found
    return NextResponse.json({
      type: 'tenant',
      tenant,
    });
  } catch (error) {
    console.error('[TenantResolve] Error resolving tenant:', error);
    return NextResponse.json(
      { error: 'Failed to resolve tenant' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export const runtime = 'nodejs';

export interface CustomDomainConfig {
  domain: string;
  status: 'PENDING_DNS' | 'PENDING' | 'DNS_VERIFIED' | 'MISMATCH' | 'VERIFIED' | 'SSL_ACTIVE';
  cnameRecord: {
    type: 'CNAME';
    host: string;
    pointsTo: string;
    ttl: string;
  };
  verifiedAt?: string;
  lastVerifiedAt?: string;
  lastError?: string | null;
  createdAt: string;
}

/**
 * Compute the CNAME record instructions for a given domain. The host part is
 * the subdomain segment (or '@' for the apex). `pointsTo` is the platform's
 * expected CNAME target — pulled from env or defaulting to
 * `cname.fieseros.com`.
 */
function buildCnameRecord(domain: string, expectedTarget: string) {
  const parts = domain.split('.');
  const host = parts.length > 2 ? parts[0] : '@';
  return {
    type: 'CNAME' as const,
    host,
    pointsTo: expectedTarget,
    ttl: '3600 (Auto)',
  };
}

/**
 * Map the Prisma `CustomDomain` row → the mobile-friendly `CustomDomainConfig`
 * shape. Keeps the response shape stable across the JSON-blob → Prisma
 * migration so `gptform-mobile-app/app/custom-domain.tsx` doesn't need a
 * release.
 */
function customDomainToConfig(row: {
  domain: string;
  expectedCnameTarget: string;
  status: string;
  verifiedAt: Date | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}): CustomDomainConfig {
  // Map DB status → mobile status enum. The mobile UI recognises:
  //   PENDING_DNS | PENDING | DNS_VERIFIED | MISMATCH | VERIFIED | SSL_ACTIVE
  let status: CustomDomainConfig['status'];
  switch (row.status) {
    case 'DNS_VERIFIED':
      status = 'DNS_VERIFIED';
      break;
    case 'MISMATCH':
      status = 'MISMATCH';
      break;
    case 'SSL_ACTIVE':
      status = 'SSL_ACTIVE';
      break;
    case 'DISABLED':
      // Surface as PENDING_DNS so the mobile UI shows "configure DNS".
      status = 'PENDING_DNS';
      break;
    case 'PENDING':
    default:
      status = 'PENDING_DNS';
      break;
  }
  return {
    domain: row.domain,
    status,
    cnameRecord: buildCnameRecord(row.domain, row.expectedCnameTarget),
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : undefined,
    lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : undefined,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * GET /api/commerce/domain
 * Returns custom domain settings for merchant (now from `db.customDomain`).
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    let row: any = null;
    try {
      row = await db.customDomain.findFirst({
        where: {
          OR: [
            { businessId: business.id },
            ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr) {
      console.warn('[commerce/domain] CustomDomain query failed (schema cache or table missing):', dbErr);
      row = null;
    }

    const defaultCnameTarget = process.env.NEXT_PUBLIC_CNAME_TARGET || 'cname.fieseros.com';

    const domainConfig: CustomDomainConfig = row
      ? customDomainToConfig(row)
      : {
          domain: '',
          status: 'PENDING_DNS',
          cnameRecord: {
            type: 'CNAME',
            host: 'shop',
            pointsTo: defaultCnameTarget,
            ttl: '3600 (Auto)',
          },
          createdAt: new Date().toISOString(),
        };

    // AiBusiness has no `slug` field — derive the store slug from the Tenant
    // row (Tenant.slug is the unique URL-safe handle used in /store/[slug]).
    // Falls back to the business.id if no tenant is linked.
    let storeSlug = business.id;
    if (business.tenantId) {
      try {
        const tenant = await db.tenant.findUnique({
          where: { id: business.tenantId },
          select: { slug: true },
        });
        if (tenant?.slug) storeSlug = tenant.slug;
      } catch {
        // ignore — fall back to business.id
      }
    }

    return NextResponse.json({
      configured: !!row?.domain,
      domainConfig,
      storeSlug,
      defaultStoreUrl: `https://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'serviceos.com'}/store/${storeSlug}`,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to get domain config:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch domain' }, { status: 500 });
  }
}

/**
 * POST /api/commerce/domain
 * Connect / replace / remove a custom domain.
 *
 * Body:
 *   { action: 'DELETE' }           → remove the merchant's CustomDomain row.
 *   { domain: 'orders.shop.in' }   → upsert the CustomDomain row.
 *
 * Cross-tenant uniqueness is enforced here (a domain can only belong to one
 * merchant). The `domain` column is `@unique` globally so the DB also catches
 * races.
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { domain, action } = body;

    const tenantId = business.tenantId || null;

    if (action === 'DELETE') {
      const existing = await db.customDomain.findFirst({
        where: {
          OR: [
            { businessId: business.id },
            ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
          ],
        },
      });
      if (existing) {
        await db.customDomain.delete({ where: { id: existing.id } });
      }
      return NextResponse.json({ success: true, message: 'Custom domain removed.' });
    }

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Valid domain name is required' }, { status: 400 });
    }

    // Clean domain: strip protocol, paths, ports, lowercase.
    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '');

    // Basic domain format validation.
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json(
        { error: 'Please enter a valid domain format (e.g. orders.myshop.com or mykirana.in)' },
        { status: 400 }
      );
    }

    // Cross-tenant uniqueness: another merchant must not own this domain.
    // We use NOT to exclude the current merchant's own rows.
    const conflict = await db.customDomain.findFirst({
      where: {
        domain: cleanDomain,
        NOT: {
          OR: [
            { businessId: business.id },
            ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
          ],
        },
      },
    });
    if (conflict) {
      return NextResponse.json(
        {
          error: `Domain ${cleanDomain} is already claimed by another store. If you believe this is an error, contact support.`,
        },
        { status: 409 }
      );
    }

    const expectedCnameTarget = process.env.NEXT_PUBLIC_CNAME_TARGET || 'cname.fieseros.com';

    // Upsert by domain (globally @unique). On create, attach the merchant
    // identity. On update, reset status to PENDING so the merchant must
    // re-verify after a domain swap.
    const upserted = await db.customDomain.upsert({
      where: { domain: cleanDomain },
      create: {
        domain: cleanDomain,
        tenantId,
        businessId: business.id,
        expectedCnameTarget,
        status: 'PENDING',
        sslStatus: 'PENDING',
      },
      update: {
        domain: cleanDomain,
        tenantId,
        businessId: business.id,
        expectedCnameTarget,
        status: 'PENDING',
        lastError: null,
        // NOTE: do NOT reset sslStatus — infra layer may already be mid-flight
        // on a wildcard cert. The verify route never touches sslStatus either.
      },
    });

    const domainConfig = customDomainToConfig(upserted);

    return NextResponse.json({
      success: true,
      domainConfig,
      message: `Domain ${cleanDomain} added. Please configure your DNS CNAME record.`,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // P2002 = unique constraint violation on `domain` — race between two
    // concurrent POSTs claiming the same domain for different tenants.
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'This domain is already claimed by another store.' },
        { status: 409 }
      );
    }
    if (e?.message?.includes('PGRST205') || e?.message?.includes('Could not find the table')) {
      return NextResponse.json(
        { error: 'Custom domain support is being provisioned. Please check back shortly.' },
        { status: 503 }
      );
    }
    console.error('Failed to configure custom domain:', e);
    return NextResponse.json({ error: e.message || 'Failed to save domain' }, { status: 500 });
  }
}

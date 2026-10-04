import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import dns from 'dns';

export const runtime = 'nodejs';

/**
 * POST /api/commerce/domain/verify
 * Performs DNS CNAME verification for the merchant's custom domain.
 *
 * Phase 2 migration: now reads/updates the real `CustomDomain` Prisma row
 * (instead of `GptformCommerceConfig.fieldsJson.customDomainConfig` JSON
 * blob). DNS resolution logic is unchanged from the prior honest fix — the
 * catch block does NOT fabricate a successful verification on DNS failure.
 *
 * Status mapping (DB → response):
 *   - DNS verified, CNAME matches expected target → `DNS_VERIFIED`
 *   - DNS resolves but CNAME points elsewhere      → `MISMATCH`
 *   - DNS lookup fails / no CNAME                  → `PENDING` (keep retrying)
 *
 * `sslStatus` is intentionally NOT touched here — it's set by the infra
 * layer (Caddy on-demand TLS / ACM) once the edge actually issues a cert.
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    const row = await db.customDomain.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) {
      return NextResponse.json(
        { error: 'No custom domain configured. Save a domain first.' },
        { status: 400 }
      );
    }

    const domainToVerify = row.domain;
    const expectedTarget = (row.expectedCnameTarget || 'cname.serviceos.com').toLowerCase().trim();
    let resolvedTarget = '';
    let dnsError: string | null = null;

    // Real DNS CNAME resolution. Do NOT fabricate verification on failure —
    // surface the real DNS state to the merchant so they can fix their record.
    try {
      const records = await dns.promises.resolveCname(domainToVerify);
      if (records && records.length > 0) {
        resolvedTarget = records[0].toLowerCase().trim();
      } else {
        dnsError = 'No CNAME record found for this domain.';
      }
    } catch (err: any) {
      // Map common DNS error codes to actionable messages.
      const code = (err as { code?: string }).code;
      if (code === 'ENOTFOUND' || code === 'ESERVFAIL' || code === 'ECONNREFUSED') {
        dnsError = `DNS lookup failed for ${domainToVerify}. The CNAME record may not have propagated yet, or the domain is not configured. Please verify your DNS settings with your registrar and retry in a few minutes.`;
      } else {
        dnsError = `DNS resolution error: ${err.message || code || 'unknown'}`;
      }
    }

    // Failure path — keep status PENDING so the merchant can retry.
    if (dnsError || !resolvedTarget) {
      await db.customDomain.update({
        where: { id: row.id },
        data: {
          status: 'PENDING',
          lastVerifiedAt: new Date(),
          lastError: dnsError || 'No CNAME record resolved.',
        },
      });

      return NextResponse.json({
        verified: false,
        domain: domainToVerify,
        status: 'PENDING',
        resolvedTarget: resolvedTarget || null,
        expectedTarget,
        error: dnsError || 'No CNAME record resolved.',
        message: `DNS verification failed for ${domainToVerify}. Ensure a CNAME record points to ${expectedTarget}.`,
      });
    }

    // Strict match: resolved target must equal the expected target. A
    // mismatch means the domain points elsewhere and traffic won't reach us.
    if (resolvedTarget !== expectedTarget) {
      await db.customDomain.update({
        where: { id: row.id },
        data: {
          status: 'MISMATCH',
          lastVerifiedAt: new Date(),
          lastError: `CNAME resolves to "${resolvedTarget}" but expected "${expectedTarget}".`,
        },
      });

      return NextResponse.json({
        verified: false,
        domain: domainToVerify,
        status: 'MISMATCH',
        resolvedTarget,
        expectedTarget,
        error: `CNAME record points to "${resolvedTarget}" but it must point to "${expectedTarget}".`,
        message: `Your domain's CNAME points to the wrong target. Update it to point to ${expectedTarget} and retry.`,
      });
    }

    // DNS verified — the CNAME correctly points to our servers.
    // NOTE: SSL certificate provisioning is handled separately by the
    // infrastructure layer (Caddy/Let's Encrypt auto-HTTPS on the wildcard
    // *.serviceos.com cert + SNI routing). We do NOT claim SSL is active
    // here — that would require a real cert-issuance check. The merchant
    // should receive a separate SSL_ACTIVE notification once the edge
    // issues the cert (the `sslStatus` field on CustomDomain is reserved
    // for the infra layer to update).
    await db.customDomain.update({
      where: { id: row.id },
      data: {
        status: 'DNS_VERIFIED',
        verifiedAt: new Date(),
        lastVerifiedAt: new Date(),
        lastError: null,
      },
    });

    return NextResponse.json({
      verified: true,
      domain: domainToVerify,
      status: 'DNS_VERIFIED',
      resolvedTarget,
      expectedTarget,
      verifiedAt: new Date().toISOString(),
      message: `DNS verified! ${domainToVerify} correctly points to ${expectedTarget}. SSL certificate provisioning will complete automatically within a few minutes.`,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DNS verification error:', e);
    return NextResponse.json({ error: e.message || 'Verification failed' }, { status: 500 });
  }
}

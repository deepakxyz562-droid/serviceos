import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { recordEvidence, recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';

/**
 * POST /api/verification/website/check
 * --------------------------------------
 * Phase 18 / Gate E: Check if the website verification token is present.
 *
 * The user has added the verification token to their website via one of:
 *   - DNS TXT record
 *   - HTML meta tag on the homepage
 *   - Verification file at /.well-known/fieseros-verification.txt
 *
 * This endpoint checks the method the user selected:
 *   - meta: fetches the homepage HTML + looks for the meta tag
 *   - file: fetches /.well-known/fieseros-verification.txt + compares
 *   - dns: looks up TXT records for the domain (via dns.resolveTxt)
 *
 * If the token is found → marks the WEBSITE evidence as VERIFIED.
 *
 * Body: { method: 'meta' | 'file' | 'dns' }
 * Returns: { verified: boolean, method: string }
 */
import { resolveTxt } from 'dns';
import { promisify } from 'util';

const resolveTxtAsync = promisify(resolveTxt);

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    }

    const body = await request.json();
    const { method } = body as { method: 'meta' | 'file' | 'dns' };

    if (!method) {
      return NextResponse.json({ error: 'method (meta|file|dns) is required' }, { status: 400 });
    }

    // Find the PENDING WEBSITE evidence with the token
    const evidence = await db.verificationEvidence.findFirst({
      where: {
        tenantId: authUser.tenantId,
        type: 'WEBSITE',
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: 'No pending website verification. Start verification first.' },
        { status: 404 },
      );
    }

    const metadata = JSON.parse(evidence.metadata || '{}') as {
      token?: string;
      domain?: string;
      website?: string;
    };

    if (!metadata.token || !metadata.domain) {
      return NextResponse.json(
        { error: 'Verification record is incomplete. Please restart.' },
        { status: 500 },
      );
    }

    const { token, domain, website } = metadata;
    let verified = false;

    if (method === 'meta') {
      // Fetch the homepage HTML + look for the meta tag
      try {
        const res = await fetch(website || `https://${domain}`, {
          signal: AbortSignal.timeout(10_000),
          redirect: 'follow',
          headers: { 'User-Agent': 'Fieseros-Verification/1.0' },
        });
        if (res.ok) {
          const html = await res.text();
          // Look for: <meta name="fieseros-verification" content="fieseros-verify-..." />
          const metaRegex = new RegExp(
            `<meta[^>]+name=["']fieseros-verification["'][^>]+content=["']${token}["']`,
            'i',
          );
          if (metaRegex.test(html)) {
            verified = true;
          }
        }
      } catch (err) {
        logger.warn({ component: 'website-verify', domain, err: err instanceof Error ? err.message : err }, 'Meta tag fetch failed');
      }
    } else if (method === 'file') {
      // Fetch /.well-known/fieseros-verification.txt
      try {
        const fileUrl = `https://${domain}/.well-known/fieseros-verification.txt`;
        const res = await fetch(fileUrl, {
          signal: AbortSignal.timeout(10_000),
          redirect: 'follow',
          headers: { 'User-Agent': 'Fieseros-Verification/1.0' },
        });
        if (res.ok) {
          const content = (await res.text()).trim();
          if (content === token) {
            verified = true;
          }
        }
      } catch (err) {
        logger.warn({ component: 'website-verify', domain, err: err instanceof Error ? err.message : err }, 'Verification file fetch failed');
      }
    } else if (method === 'dns') {
      // Look up TXT records for the domain
      try {
        const records = await resolveTxtAsync(domain);
        // records is an array of arrays: [['value1'], ['value2'], ...]
        for (const record of records) {
          const value = Array.isArray(record) ? record.join('') : String(record);
          if (value.includes(token)) {
            verified = true;
            break;
          }
        }
      } catch (err) {
        logger.warn({ component: 'website-verify', domain, err: err instanceof Error ? err.message : err }, 'DNS TXT lookup failed');
      }
    }

    if (!verified) {
      return NextResponse.json({
        verified: false,
        method,
        message: `Token not found via ${method}. Please make sure you've added the verification token correctly and DNS has propagated (may take up to 48 hours for DNS).`,
      }, { status: 400 });
    }

    // Token found — mark the evidence as VERIFIED
    await db.verificationEvidence.update({
      where: { id: evidence.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        metadata: JSON.stringify({
          ...metadata,
          method,
          verifiedAt: new Date().toISOString(),
        }),
      },
    });

    // Gate H: Recompute cached marketplace eligibility after website verification
    await recomputeMarketplaceEligibility(authUser.tenantId);

    logger.info(
      { component: 'website-verify', tenantId: authUser.tenantId, domain, method },
      'Website verified',
    );

    return NextResponse.json({
      verified: true,
      method,
      domain,
      message: `Website verified via ${method}. Your domain "${domain}" is now verified.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check website verification';
    logger.error({ component: 'website-verify', err: error }, 'Check failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

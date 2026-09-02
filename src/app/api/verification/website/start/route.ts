import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

/**
 * POST /api/verification/website/start
 * --------------------------------------
 * Phase 18 / Gate E: Start website/domain verification.
 *
 * The user provides their business website URL. This endpoint:
 *   1. Generates a unique verification token (e.g. "fieseros-verify-abc123...")
 *   2. Stores it on a PENDING VerificationEvidence row (type=WEBSITE)
 *   3. Returns the token + instructions for DNS TXT / HTML meta / file upload
 *
 * The user then adds the token to their website (DNS TXT record, HTML meta
 * tag, or a verification file). They call /api/verification/website/check
 * to verify the token is present.
 *
 * Body: { website: string }
 * Returns: { token, methods: { dns, meta, file } }
 */
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
    const { website } = body as { website: string };

    if (!website) {
      return NextResponse.json({ error: 'website URL is required' }, { status: 400 });
    }

    // Normalize + validate the website URL
    let domain: string;
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      domain = url.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }

    // Check if already verified
    const existing = await db.verificationEvidence.findFirst({
      where: {
        tenantId: authUser.tenantId,
        type: 'WEBSITE',
        status: 'VERIFIED',
      },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Website already verified.',
      });
    }

    // Invalidate any previous PENDING website evidence for this tenant
    await db.verificationEvidence.updateMany({
      where: {
        tenantId: authUser.tenantId,
        type: 'WEBSITE',
        status: 'PENDING',
      },
      data: { status: 'EXPIRED' },
    });

    // Generate a unique verification token
    const token = `fieseros-verify-${randomBytes(16).toString('hex')}`;

    // Store the tenant's website URL on the tenant row (for reference)
    await db.tenant.update({
      where: { id: authUser.tenantId },
      data: { website },
    });

    // Create a PENDING WEBSITE evidence row
    await db.verificationEvidence.create({
      data: {
        tenantId: authUser.tenantId,
        type: 'WEBSITE',
        status: 'PENDING',
        target: domain,
        metadata: JSON.stringify({
          website,
          domain,
          token,
          method: null, // will be set when the user picks a method
        }),
        verifiedById: authUser.id,
      },
    });

    logger.info(
      { component: 'website-verify', tenantId: authUser.tenantId, domain },
      'Website verification started',
    );

    return NextResponse.json({
      success: true,
      domain,
      token,
      methods: {
        dns: {
          type: 'TXT',
          name: domain,
          value: token,
          instructions: `Add a TXT record to your DNS:\n  Name: @ (or ${domain})\n  Value: ${token}`,
        },
        meta: {
          tag: `<meta name="fieseros-verification" content="${token}" />`,
          instructions: `Add this meta tag to your homepage HTML <head>:`,
        },
        file: {
          url: `https://${domain}/.well-known/fieseros-verification.txt`,
          content: token,
          instructions: `Create a file at /.well-known/fieseros-verification.txt containing:`,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start website verification';
    logger.error({ component: 'website-verify', err: error }, 'Start failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

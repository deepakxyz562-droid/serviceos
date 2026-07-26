import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Provider Certifications — list + add (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET  /api/provider/certifications          — list own certifications
 * POST /api/provider/certifications          — add a new certification
 *
 * Body (POST):
 *   {
 *     name:               string,    (required, e.g. "Gas Safe Registered")
 *     issuer?:            string,    (issuing body)
 *     issueDate?:         string (ISO),
 *     expiryDate?:        string (ISO),
 *     certificateNumber?: string,
 *     documentUrl?:       string,    (uploaded certificate document URL)
 *   }
 *
 * Auth required. Caller must have a tenantId. Certifications created via
 * this route default to isVerified=false — verification is performed by the
 * platform admin (separate flow).
 *
 * Returns: { certification }   (POST)
 *          { certifications }  (GET)
 */

function coerceString(v: unknown, max = 500): string | null {
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.trim().slice(0, max);
  }
  return null;
}

function coerceDate(v: unknown): Date | null {
  if (typeof v !== 'string' || v.trim().length === 0) return null;
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  try {
    const certifications = await db.providerCertification.findMany({
      where: { tenantId: authUser.tenantId },
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        issuer: true,
        issueDate: true,
        expiryDate: true,
        certificateNumber: true,
        documentUrl: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    log.info(
      { tenantId: authUser.tenantId, count: certifications.length },
      'provider/certifications: list',
    );

    return NextResponse.json({ certifications });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'provider/certifications: list failed');
    return NextResponse.json(
      { error: 'Failed to fetch certifications' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = coerceString(body.name, 200);
  if (!name) {
    return NextResponse.json(
      { error: '`name` is required (1-200 chars).' },
      { status: 400 },
    );
  }
  const issuer = coerceString(body.issuer, 200);
  const issueDate = coerceDate(body.issueDate);
  const expiryDate = coerceDate(body.expiryDate);
  const certificateNumber = coerceString(body.certificateNumber, 200);
  const documentUrl = coerceString(body.documentUrl, 500);

  if (issueDate && expiryDate && expiryDate < issueDate) {
    return NextResponse.json(
      { error: '`expiryDate` cannot be before `issueDate`.' },
      { status: 400 },
    );
  }

  try {
    const certification = await db.providerCertification.create({
      data: {
        tenantId: authUser.tenantId,
        name,
        issuer,
        issueDate,
        expiryDate,
        certificateNumber,
        documentUrl,
        isVerified: false, // platform-verified in a separate admin flow
      },
      select: {
        id: true,
        name: true,
        issuer: true,
        issueDate: true,
        expiryDate: true,
        certificateNumber: true,
        documentUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    log.info(
      { tenantId: authUser.tenantId, certificationId: certification.id, name },
      'provider/certifications: added',
    );

    return NextResponse.json({ certification }, { status: 201 });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'provider/certifications: add failed');
    return NextResponse.json(
      { error: 'Failed to add certification' },
      { status: 500 },
    );
  }
}

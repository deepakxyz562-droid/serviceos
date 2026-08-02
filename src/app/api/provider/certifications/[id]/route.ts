import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Provider Certifications — edit + delete (Fieseros V1.5 — P13-provider-ui)
 * ------------------------------------------------------------
 * PATCH   /api/provider/certifications/[id]   — update fields on an existing cert
 * DELETE  /api/provider/certifications/[id]   — delete a cert
 *
 * Both routes are scoped to the calling tenant's own certifications — a tenant
 * cannot PATCH/DELETE another tenant's certifications (404 returned if the
 * cert exists but belongs to someone else, to avoid leaking existence).
 *
 * PATCH body (all optional — only the provided fields are updated):
 *   {
 *     name?:               string,    (1-200 chars)
 *     issuer?:             string,
 *     issueDate?:          string (ISO),
 *     expiryDate?:         string (ISO),
 *     certificateNumber?:  string,
 *     documentUrl?:        string,
 *   }
 *
 * `isVerified` is NOT mutable here — verification is a separate admin flow.
 *
 * Returns: { certification }
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext,
) {
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

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Build the update payload — only fields that are explicitly present in
  // the body are touched. isVerified is intentionally NOT mutable here.
  const updateData: Record<string, unknown> = {};

  if ('name' in body) {
    const name = coerceString(body.name, 200);
    if (!name) {
      return NextResponse.json(
        { error: '`name` must be a non-empty string (1-200 chars).' },
        { status: 400 },
      );
    }
    updateData.name = name;
  }
  if ('issuer' in body) {
    const issuer = coerceString(body.issuer, 200);
    updateData.issuer = issuer; // null is allowed (clears the field)
  }
  if ('certificateNumber' in body) {
    const certificateNumber = coerceString(body.certificateNumber, 200);
    updateData.certificateNumber = certificateNumber;
  }
  if ('documentUrl' in body) {
    const documentUrl = coerceString(body.documentUrl, 500);
    updateData.documentUrl = documentUrl;
  }

  // Dates — accept ISO string; null clears the field.
  if ('issueDate' in body) {
    if (body.issueDate === null || body.issueDate === '') {
      updateData.issueDate = null;
    } else {
      const dt = coerceDate(body.issueDate);
      if (!dt) {
        return NextResponse.json(
          { error: '`issueDate` must be a valid ISO datetime.' },
          { status: 400 },
        );
      }
      updateData.issueDate = dt;
    }
  }
  if ('expiryDate' in body) {
    if (body.expiryDate === null || body.expiryDate === '') {
      updateData.expiryDate = null;
    } else {
      const dt = coerceDate(body.expiryDate);
      if (!dt) {
        return NextResponse.json(
          { error: '`expiryDate` must be a valid ISO datetime.' },
          { status: 400 },
        );
      }
      updateData.expiryDate = dt;
    }
  }

  // Cross-field validation: expiryDate >= issueDate (if both set).
  if (
    updateData.issueDate !== undefined &&
    updateData.expiryDate !== undefined &&
    updateData.issueDate !== null &&
    updateData.expiryDate !== null &&
    (updateData.expiryDate as Date) < (updateData.issueDate as Date)
  ) {
    return NextResponse.json(
      { error: '`expiryDate` cannot be before `issueDate`.' },
      { status: 400 },
    );
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No updatable fields provided.' },
      { status: 400 },
    );
  }

  try {
    // Tenant-scoped update — findFirst ensures the cert belongs to the caller.
    const existing = await db.providerCertification.findFirst({
      where: { id, tenantId: authUser.tenantId },
      select: { id: true, issueDate: true, expiryDate: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 },
      );
    }

    // Cross-field validation when only ONE of issueDate/expiryDate is updated.
    const finalIssue =
      updateData.issueDate !== undefined ? updateData.issueDate : existing.issueDate;
    const finalExpiry =
      updateData.expiryDate !== undefined ? updateData.expiryDate : existing.expiryDate;
    if (
      finalIssue &&
      finalExpiry &&
      (finalExpiry as Date) < (finalIssue as Date)
    ) {
      return NextResponse.json(
        { error: '`expiryDate` cannot be before `issueDate`.' },
        { status: 400 },
      );
    }

    const certification = await db.providerCertification.update({
      where: { id },
      data: updateData,
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
      { tenantId: authUser.tenantId, certificationId: id, fields: Object.keys(updateData) },
      'provider/certifications/[id]: patched',
    );

    return NextResponse.json({ certification });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId, id }, 'provider/certifications/[id]: patch failed');
    return NextResponse.json(
      { error: 'Failed to update certification' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext,
) {
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

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    // Tenant-scoped delete — findFirst ensures ownership.
    const existing = await db.providerCertification.findFirst({
      where: { id, tenantId: authUser.tenantId },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 },
      );
    }

    await db.providerCertification.delete({ where: { id } });

    log.info(
      { tenantId: authUser.tenantId, certificationId: id, name: existing.name },
      'provider/certifications/[id]: deleted',
    );

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId, id }, 'provider/certifications/[id]: delete failed');
    return NextResponse.json(
      { error: 'Failed to delete certification' },
      { status: 500 },
    );
  }
}

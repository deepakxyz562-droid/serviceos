import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  uploadFile,
  STORAGE_BUCKETS,
  isS3Configured,
} from '@/lib/supabase-storage';
import { randomUUID } from 'crypto';

const VALID_SIGNATORY_TYPES = ['customer', 'employee'];

/**
 * Extract the binary content + mime type from a base64 data URL.
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { buffer, mimeType };
}

/**
 * GET /api/jobs/[id]/signatures
 * Returns all signatures for a job (customer + employee).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const signatures = await db.jobSignature.findMany({
      where: { jobId },
      orderBy: { signedAt: 'asc' },
    });

    return NextResponse.json({ signatures });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch signatures';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[id]/signatures
 * Body: { signatoryType, signatoryName, signatoryRole?, signatureData, latitude?, longitude?, notes? }
 *
 * Accepts two content types:
 *   1. JSON (PWA customer/employee portal) — `{ signatoryType, signatoryName,
 *      signatoryRole?, signatureData, latitude?, longitude?, notes? }` where
 *      `signatureData` is a base64 PNG data URL.
 *   2. multipart/form-data (mobile app) — fields:
 *        - `file`         Blob (PNG) — converted to a base64 data URL inline
 *        - `type`         signatoryType ('customer' | 'employee')
 *        - `signerName`   signatoryName
 *        - `latitude?`    string
 *        - `longitude?`   string
 *        - `accuracy?`    string
 *        - `signatoryRole?`, `notes?`, `signatureData?` (alt file field)
 *
 * Previously the handler unconditionally did `await request.json()`, which
 * threw `SyntaxError: Unexpected token ...` on FormData bytes → the mobile
 * signature save failed with a 500 "json parse error invalid number".
 *
 * Uploads the signature PNG via the shared storage helper (S3 → Supabase →
 * local), creates a JobSignature record, and emits a CustomerTimelineEntry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, customerId: true, customerName: true, workspaceId: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // ── Parse body: support both JSON (PWA) and multipart/form-data (mobile) ──
    let signatoryType: string | undefined;
    let signatoryName: string | undefined;
    let signatoryRole: string | undefined;
    let signatureData: string | undefined;
    let latitude: number | undefined;
    let longitude: number | undefined;
    let notes: string | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Mobile app sends FormData. Map the mobile field names to the canonical
      // schema fields: `type` → `signatoryType`, `signerName` → `signatoryName`,
      // and the `file` Blob → a base64 data URL string (`signatureData`) so the
      // shared parseDataUrl + uploadFile path below works for both clients.
      const formData = await request.formData();

      signatoryType =
        (formData.get('signatoryType') as string) ||
        (formData.get('type') as string) ||
        'customer';

      signatoryName =
        (formData.get('signatoryName') as string) ||
        (formData.get('signerName') as string) ||
        undefined;

      signatoryRole = (formData.get('signatoryRole') as string) || undefined;
      notes = (formData.get('notes') as string) || undefined;

      latitude = formData.get('latitude')
        ? Number(formData.get('latitude'))
        : undefined;
      longitude = formData.get('longitude')
        ? Number(formData.get('longitude'))
        : undefined;

      // `file` may be a Blob (native captureRef / web canvas blob) or, in some
      // edge cases, a pre-encoded base64 data URL string sent by the web build.
      const file = formData.get('file');
      if (file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const b64 = buffer.toString('base64');
        const mime = (file as File).type || 'image/png';
        signatureData = `data:${mime};base64,${b64}`;
      } else if (typeof file === 'string' && file) {
        signatureData = file;
      }

      // Allow `signatureData` field as an alternate source for clients that
      // pre-encode the PNG themselves (e.g. the web build's dataUrlToBlob path
      // occasionally falls back to sending the raw data URL).
      if (!signatureData) {
        const alt = formData.get('signatureData');
        if (typeof alt === 'string' && alt) signatureData = alt;
      }
    } else {
      // PWA / JSON path (unchanged).
      const body = await request.json();
      signatoryType = body.signatoryType;
      signatoryName = body.signatoryName;
      signatoryRole = body.signatoryRole;
      signatureData = body.signatureData;
      latitude = body.latitude;
      longitude = body.longitude;
      notes = body.notes;
    }

    if (!VALID_SIGNATORY_TYPES.includes(signatoryType as string)) {
      return NextResponse.json(
        { error: `Invalid signatoryType. Must be one of: ${VALID_SIGNATORY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!signatoryName || typeof signatoryName !== 'string' || !signatoryName.trim()) {
      return NextResponse.json({ error: 'signatoryName is required' }, { status: 400 });
    }

    if (!signatureData || typeof signatureData !== 'string') {
      return NextResponse.json({ error: 'signatureData is required (base64 PNG data URL)' }, { status: 400 });
    }

    const parsed = parseDataUrl(signatureData);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid signatureData format. Expected base64 data URL.' },
        { status: 400 }
      );
    }

    // ── Upload via the shared storage helper (S3 → Supabase → local) ──
    // Same storage path as /api/upload + job photos, so signatures respect
    // the configured storage provider instead of being hardcoded to local.
    const companyId = (job.workspaceId || user.tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${jobId}_${signatoryType}_${Date.now()}_${randomUUID().slice(0, 8)}.png`;

    const { url: publicUrl } = await uploadFile({
      bucket: STORAGE_BUCKETS.jobAttachments,
      file: parsed.buffer,
      companyId,
      folder: `signatures/${jobId}`,
      fileName: uniqueName,
      contentType: parsed.mimeType || 'image/png',
    });

    // ── Capture optional IP / user agent for audit ──
    const headersList = request.headers;
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      null;
    const userAgent = headersList.get('user-agent') || null;

    // ── Create the JobSignature record ──
    const signature = await db.jobSignature.create({
      data: {
        tenantId: job.workspaceId || user.tenantId || 'default',
        jobId,
        customerId: job.customerId || undefined,
        signatoryType,
        signatoryName: signatoryName.trim(),
        signatoryRole: signatoryRole || null,
        signatureUrl: publicUrl,
        signatureDataJson: JSON.stringify({
          mimeType: parsed.mimeType,
          size: parsed.buffer.length,
        }),
        ipAddress,
        userAgent,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
        notes: notes || null,
      },
    });

    // ── Emit a CustomerTimelineEntry (non-fatal) ──
    try {
      if (job.customerId) {
        await db.customerTimelineEntry.create({
          data: {
            tenantId: job.workspaceId || user.tenantId || 'default',
            customerId: job.customerId,
            entryType: 'signature',
            title: `${signatoryType === 'customer' ? 'Customer' : 'Employee'} signature collected`,
            description: `Signed by ${signatoryName.trim()}${signatoryRole ? ` (${signatoryRole})` : ''}`,
            sourceType: 'JobSignature',
            sourceId: signature.id,
            metadataJson: JSON.stringify({
              jobId,
              signatoryType,
              signatoryName: signatoryName.trim(),
              signatoryRole: signatoryRole || null,
              url: publicUrl,
            }),
            actorId: user.id,
            actorName: user.name || user.email,
            actorType: 'user',
            eventDate: signature.signedAt,
          },
        });
      }
    } catch (timelineErr) {
      console.error('[SignaturesAPI] Failed to create timeline entry:', timelineErr);
    }

    return NextResponse.json({ signature, storage: isS3Configured() ? 's3' : 'local' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save signature';
    console.error('[SignaturesAPI] POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

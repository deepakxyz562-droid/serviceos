import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  uploadFile,
  STORAGE_BUCKETS,
  isS3Configured,
} from '@/lib/supabase-storage';
import { randomUUID } from 'crypto';

/**
 * POST /api/marketplace/claim/upload
 * -----------------------------------
 * Upload a verification document (business licence, utility bill, etc.) for
 * a claim request. The document is stored via the shared storage helper
 * (S3 → Supabase → local) and the URL is attached to the ClaimRequest's
 * verificationData.documentUrls[].
 *
 * Phase 14: This endpoint was MISSING — the frontend (claim-business-modal.tsx)
 * referenced /api/marketplace/claim/upload but no backend route existed.
 * Now implemented with proper auth + storage + attachment to the claim.
 *
 * Body: multipart/form-data
 *   - file: the document file (PDF, PNG, JPG — max 10MB)
 *   - claimRequestId?: optional (if uploading after claim creation)
 *   - tenantId: the business being claimed
 *
 * Returns: { url, fileName, size }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const tenantId = formData.get('tenantId') as string;
    const claimRequestId = formData.get('claimRequestId') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, PNG, JPG, WebP.' },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 },
      );
    }

    // Convert File to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique filename
    const ext = file.name.split('.').pop() || 'pdf';
    const uniqueName = `claim_${tenantId}_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;

    // Upload via the shared storage helper (S3 → Supabase → local)
    const { url: publicUrl } = await uploadFile({
      bucket: STORAGE_BUCKETS.jobAttachments,
      file: buffer,
      companyId: tenantId,
      folder: `claim-documents/${tenantId}`,
      fileName: uniqueName,
      contentType: file.type,
    });

    // If a claimRequestId was provided, attach the document URL to the claim
    if (claimRequestId) {
      const claim = await db.claimRequest.findUnique({
        where: { id: claimRequestId },
        select: { verificationData: true },
      });

      if (claim) {
        const data = JSON.parse(claim.verificationData || '{}') as {
          documentUrls?: string[];
        };
        const urls = data.documentUrls ?? [];
        urls.push(publicUrl);
        data.documentUrls = urls;

        await db.claimRequest.update({
          where: { id: claimRequestId },
          data: { verificationData: JSON.stringify(data) },
        });
      }
    }

    // Create a PENDING DOCUMENT VerificationEvidence row
    await db.verificationEvidence.create({
      data: {
        tenantId,
        type: 'DOCUMENT',
        status: 'PENDING',
        target: null,
        metadata: JSON.stringify({
          url: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedById: authUser.id,
        }),
        verifiedById: authUser.id,
      },
    });

    return NextResponse.json(
      {
        url: publicUrl,
        fileName: file.name,
        size: file.size,
        storage: isS3Configured() ? 's3' : 'local',
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload document';
    console.error('[claim/upload]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

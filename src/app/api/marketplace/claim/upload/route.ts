/**
 * POST /api/marketplace/claim/upload
 * -----------------------------------
 * Upload verification documents for a business claim (business license,
 * utility bill, tax document, etc.). Files are stored via the same
 * uploadFile() helper used by the rest of the app (S3 → Supabase → local).
 *
 * This endpoint is used by the ClaimBusinessModal's document upload step.
 * Files are stored in the `crm-files` bucket under a `claim-docs/` folder
 * so they're isolated from other CRM files.
 *
 * Auth: requires authenticated user (the claimant). Anonymous visitors
 * must sign in first — the claim banner gates this behind a sign-in dialog.
 *
 * FormData fields:
 *   - file  (File) — required, the document to upload
 *
 * Returns: { url, name, size, mediaType }
 *
 * Security:
 *   - Max 10 MB per file
 *   - Allowed types: PDF, PNG, JPG, JPEG, WebP, DOC, DOCX (business docs)
 *   - Max 5 documents per claim (enforced client-side in the modal)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided (field name must be "file")' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        {
          error: `File type "${file.type}" not allowed. Allowed: PDF, PNG, JPG, WebP, DOC, DOCX.`,
        },
        { status: 400 },
      );
    }

    // Use the claimant's user ID as the company ID for storage path isolation.
    // Claim documents aren't tied to a tenant yet (the business isn't claimed).
    const companyId = user.id;
    const fileName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;

    const result = await uploadFile({
      bucket: STORAGE_BUCKETS.crmFiles,
      file,
      companyId,
      folder: 'claim-docs',
      fileName,
      contentType: file.type,
    });

    return NextResponse.json(
      {
        url: result.url,
        name: file.name,
        size: file.size,
        mediaType: file.type,
        path: result.path,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[claim/upload] Error:', err);
    return NextResponse.json(
      { error: 'Failed to upload document. Please try again.' },
      { status: 500 },
    );
  }
}

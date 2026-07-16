import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { randomUUID } from 'crypto';
import path from 'path';

/**
 * POST /api/public-hub/upload
 *
 * Accepts multipart/form-data with a `file` field (single image) and an
 * optional `kind` field ("cover" | "gallery"). Uploads via the shared
 * storage helper (S3 → Supabase → local fallback) and returns the public URL.
 *
 * Used by the Public Hub settings tab to let business owners upload a
 * cover image and gallery photos without needing to paste URLs.
 *
 * Auth: any logged-in tenant user (owner/admin role is enforced by the
 * PUT /api/tenants/[id] route when they save; the upload itself is allowed
 * for any tenant member since the file isn't "live" until they hit Save).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const kind = (formData.get('kind') as string) || 'gallery';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ── Validate file type & size ──────────────────────────────────────────
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED.join(', ')}` },
        { status: 400 },
      );
    }

    const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 8 MB.` },
        { status: 400 },
      );
    }

    // ── Build a stable, collision-free filename ────────────────────────────
    const ext = path.extname(file.name).toLowerCase() || `.${(file.type.split('/')[1] || 'jpg')}`;
    const safeBase = randomUUID();
    const fileName = `${safeBase}${ext}`;
    const folder = kind === 'cover' ? 'hub-cover' : 'hub-gallery';

    // ── Upload via shared storage helper ───────────────────────────────────
    // Falls back to local filesystem at /public/uploads/... if no cloud
    // storage is configured (works out of the box in dev).
    const { url } = await uploadFile({
      bucket: STORAGE_BUCKETS.companyAssets,
      file,
      companyId: user.tenantId,
      folder,
      fileName,
      contentType: file.type,
    });

    return NextResponse.json({
      url,
      kind,
      fileName,
      size: file.size,
      mediaType: file.type,
    });
  } catch (error) {
    console.error('[public-hub upload] error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

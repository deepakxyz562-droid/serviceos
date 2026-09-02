import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { invalidateAuthCache } from '@/app/api/auth/me/route';
import { revalidatePublicBusiness } from '@/lib/public-business';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  return 'jpg';
}

/**
 * Simple, defensive SVG sanitizer to strip dangerous script tags and event handlers.
 */
function sanitizeSvg(content: string): string {
  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * POST /api/tenants/[id]/logo
 * Uploads a canonical company logo to S3 and updates Tenant.logo.
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

    const { id: tenantId } = await params;

    // Verify tenant authorization (must be owner/admin of tenant or superadmin)
    const isOwnerOrAdmin =
      user.tenantId === tenantId ||
      user.isSuperAdmin === true ||
      user.role === 'superadmin';

    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update this logo' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: 'No file provided in form-data' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds maximum 10MB limit' },
          { status: 400 }
        );
      }

      mimeType = file.type || 'image/png';
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON payload fallback with dataUrl
      const body = await request.json().catch(() => ({}));
      const dataUrl = body.dataUrl || body.logo;

      if (!dataUrl || typeof dataUrl !== 'string') {
        return NextResponse.json(
          { error: 'Invalid payload. Provide a valid file or base64 dataUrl' },
          { status: 400 }
        );
      }

      const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
      if (!match) {
        return NextResponse.json(
          { error: 'Invalid base64 data URL' },
          { status: 400 }
        );
      }

      mimeType = match[1];
      fileBuffer = Buffer.from(match[2], 'base64');
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds maximum 10MB limit' },
          { status: 400 }
        );
      }
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image format (${mimeType}). Allowed: PNG, JPG, WebP, SVG.` },
        { status: 400 }
      );
    }

    // Sanitize SVG if uploaded
    if (mimeType === 'image/svg+xml') {
      const sanitized = sanitizeSvg(fileBuffer.toString('utf-8'));
      fileBuffer = Buffer.from(sanitized, 'utf-8');
    }

    const ext = extForMime(mimeType);
    const fileName = `${Date.now()}_logo.${ext}`;

    const { url } = await uploadFile({
      bucket: STORAGE_BUCKETS.companyAssets,
      companyId: tenantId,
      folder: 'logo',
      fileName,
      contentType: mimeType,
      file: fileBuffer,
    });

    // Update Tenant.logo in DB
    const updatedTenant = await db.tenant.update({
      where: { id: tenantId },
      data: { logo: url },
    });

    // Also sync BrandKit.logoUrl if a brand kit exists or create one
    try {
      await db.brandKit.upsert({
        where: { tenantId },
        create: {
          tenantId,
          logoUrl: url,
        },
        update: {
          logoUrl: url,
        },
      });
    } catch (bkErr) {
      console.warn('[LogoUpload] BrandKit sync non-fatal warning:', bkErr);
    }

    invalidateAuthCache();
    revalidatePublicBusiness(updatedTenant?.slug || tenantId);
    try {
      revalidatePath('/[companySlug]/[city]/[slug]', 'page');
      revalidatePath('/marketplace', 'page');
    } catch {}

    return NextResponse.json({
      success: true,
      logoUrl: url,
      message: 'Business logo updated successfully.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload logo';
    console.error('[LogoUpload] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/tenants/[id]/logo
 * Removes the company logo from the tenant profile.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;

    const isOwnerOrAdmin =
      user.tenantId === tenantId ||
      user.isSuperAdmin === true ||
      user.role === 'superadmin';

    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const updatedTenant = await db.tenant.update({
      where: { id: tenantId },
      data: { logo: null },
    });

    try {
      await db.brandKit.update({
        where: { tenantId },
        data: { logoUrl: null },
      });
    } catch {}

    invalidateAuthCache();
    revalidatePublicBusiness(updatedTenant?.slug || tenantId);
    try {
      revalidatePath('/[companySlug]/[city]/[slug]', 'page');
      revalidatePath('/marketplace', 'page');
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Logo removed successfully.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove logo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

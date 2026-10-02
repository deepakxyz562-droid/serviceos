import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowUser, getBusinessForUser } from '@/lib/quote-flow-session';
import { uploadFile } from '@/lib/supabase-storage';

/**
 * POST /api/quote-flow/business/logo
 * ─────────────────────────────────────────────────────────────────────────
 * Uploads a business logo to S3/Supabase Storage and updates the
 * AiBusiness.logoUrl field. The logo appears on PDF invoices + quotes.
 *
 * Body: multipart/form-data with a `file` field (image/png, image/jpeg, image/svg+xml)
 * Returns: { logoUrl: string }
 *
 * Auth: any authenticated quote-flow user (owner only).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireQuoteFlowUser(req);
    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: PNG, JPEG, SVG, WebP.` },
        { status: 400 },
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 },
      );
    }

    // Upload to storage
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `logo-${business.id}-${Date.now()}.${ext}`;
    const { url } = await uploadFile({
      bucket: 'public',
      file,
      companyId: business.id,
      folder: 'quote-flow-logos',
      fileName,
      contentType: file.type,
    });

    // Update business logoUrl
    await db.aiBusiness.update({
      where: { id: business.id },
      data: { logoUrl: url },
    });

    return NextResponse.json({ logoUrl: url });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/quote-flow/business/logo] error:', e);
    return NextResponse.json({ error: e.message || 'Failed to upload logo' }, { status: 500 });
  }
}

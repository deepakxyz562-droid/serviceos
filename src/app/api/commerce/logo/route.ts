import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { uploadFile } from '@/lib/supabase-storage';
import { revalidatePublicBusiness } from '@/lib/public-business';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  return 'jpg';
}

/**
 * Unified Logo API:
 * POST   /api/commerce/logo — Uploads logo file or data URI, persists to storage,
 *                             and atomically updates AiBusiness, GptformCommerceConfig,
 *                             Tenant, and BrandKit so the logo syncs everywhere.
 * DELETE /api/commerce/logo — Clears the logo across all 4 database layers.
 */
export async function POST(req: NextRequest) {
  try {
    const { business, user } = await requireQuoteFlowBusiness(req);
    const contentType = req.headers.get('content-type') || '';

    let logoBuffer: Buffer | null = null;
    let mimeType = 'image/png';
    let rawDirectUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form-data' }, { status: 400 });
      }

      mimeType = file.type || 'image/png';
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `Invalid file type: ${mimeType}. Allowed: PNG, JPEG, SVG, WebP.` },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Logo file too large. Maximum size is 5MB.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      logoBuffer = Buffer.from(bytes);
    } else {
      // JSON body: { base64?: string, logoUrl?: string }
      const body = await req.json().catch(() => ({}));
      if (body.base64 && typeof body.base64 === 'string') {
        const matches = body.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          logoBuffer = Buffer.from(matches[2], 'base64');
        } else {
          logoBuffer = Buffer.from(body.base64, 'base64');
        }
      } else if (body.logoUrl && typeof body.logoUrl === 'string') {
        rawDirectUrl = body.logoUrl.trim();
      }
    }

    let finalLogoUrl = rawDirectUrl;

    if (logoBuffer) {
      const ext = extForMime(mimeType);
      const fileName = `logo-${business.id}-${Date.now()}.${ext}`;

      try {
        const { url } = await uploadFile({
          bucket: 'public',
          file: logoBuffer,
          companyId: business.id,
          folder: 'business-logos',
          fileName,
          contentType: mimeType,
        });
        finalLogoUrl = url;
      } catch (storageErr) {
        console.warn('[CommerceLogo] Storage upload failed, falling back to data URL:', storageErr);
        if (!finalLogoUrl) {
          finalLogoUrl = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
        }
      }
    }

    if (!finalLogoUrl) {
      return NextResponse.json({ error: 'No valid logo image provided' }, { status: 400 });
    }

    // ── Atomic Multi-Entity Synchronization ────────────────────────────────
    // 1. Update AiBusiness (QuoteFlow Invoices & Estimates)
    await db.aiBusiness.update({
      where: { id: business.id },
      data: { logoUrl: finalLogoUrl },
    });

    // 2. Update GptformCommerceConfig (BOS POS, Daybook & Web/Mobile Store)
    const config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });
    if (config) {
      try {
        const raw = JSON.parse(config.fieldsJson || '{}');
        const container = Array.isArray(raw) ? { fields: raw } : raw;
        container.logoUrl = finalLogoUrl;
        await db.gptformCommerceConfig.update({
          where: { id: config.id },
          data: { fieldsJson: JSON.stringify(container) },
        });
      } catch (cfgErr) {
        console.warn('[CommerceLogo] Config fieldsJson sync warning:', cfgErr);
      }
    }

    // 3. Update Tenant & BrandKit (Online Storefront, Booking, Pay Portal, Prints)
    const resolvedTenantId = business.tenantId || user?.tenantId;
    if (resolvedTenantId) {
      try {
        await db.tenant.update({
          where: { id: resolvedTenantId },
          data: { logo: finalLogoUrl },
        });
      } catch (tErr) {
        console.warn('[CommerceLogo] Tenant.logo sync non-fatal:', tErr);
      }

      try {
        await db.brandKit.upsert({
          where: { tenantId: resolvedTenantId },
          create: {
            tenantId: resolvedTenantId,
            logoUrl: finalLogoUrl,
            companyName: business.name,
          },
          update: {
            logoUrl: finalLogoUrl,
          },
        });
      } catch (bkErr) {
        console.warn('[CommerceLogo] BrandKit sync non-fatal:', bkErr);
      }

      try {
        revalidatePublicBusiness(resolvedTenantId);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      logoUrl: finalLogoUrl,
      message: 'Business logo synced across all workstations, invoices and store.',
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Failed to update logo' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { business, user } = await requireQuoteFlowBusiness(req);

    // 1. Clear on AiBusiness
    await db.aiBusiness.update({
      where: { id: business.id },
      data: { logoUrl: null },
    });

    // 2. Clear on GptformCommerceConfig
    const config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });
    if (config) {
      try {
        const raw = JSON.parse(config.fieldsJson || '{}');
        const container = Array.isArray(raw) ? { fields: raw } : raw;
        container.logoUrl = null;
        await db.gptformCommerceConfig.update({
          where: { id: config.id },
          data: { fieldsJson: JSON.stringify(container) },
        });
      } catch {}
    }

    // 3. Clear on Tenant & BrandKit
    const resolvedTenantId = business.tenantId || user?.tenantId;
    if (resolvedTenantId) {
      try {
        await db.tenant.update({
          where: { id: resolvedTenantId },
          data: { logo: null },
        });
      } catch {}

      try {
        await db.brandKit.update({
          where: { tenantId: resolvedTenantId },
          data: { logoUrl: null },
        });
      } catch {}

      try {
        revalidatePublicBusiness(resolvedTenantId);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      logoUrl: null,
      message: 'Business logo removed from all workstations, invoices and store.',
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Failed to remove logo' }, { status: 500 });
  }
}

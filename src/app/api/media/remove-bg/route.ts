import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/media/remove-bg
 * Secure Next.js API Gateway for background removal.
 * - Authenticates user session & tenant ID
 * - Clamps max file size (5MB) & validates image MIME type
 * - Forwards securely to internal rembg microservice via private secret header (X-BGOS-API-KEY)
 * - Returns transparent PNG cutout (Base64 data URI or binary buffer)
 */

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let imageBuffer: Buffer | null = null;
    let contentType = 'image/png';

    const reqContentType = request.headers.get('content-type') || '';

    if (reqContentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No image file provided in form-data' }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Image exceeds maximum allowed size of 5MB' }, { status: 413 });
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Unsupported image format: ${file.type}. Please upload JPEG, PNG, or WebP.` }, { status: 400 });
      }
      imageBuffer = Buffer.from(await file.arrayBuffer());
      contentType = file.type;
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.image && typeof body.image === 'string') {
        // Base64 data URI or raw base64
        const matches = body.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches) {
          contentType = matches[1];
          imageBuffer = Buffer.from(matches[2], 'base64');
        } else {
          imageBuffer = Buffer.from(body.image, 'base64');
        }
      } else if (body.imageUrl && typeof body.imageUrl === 'string') {
        // Fetch remote image securely
        const fetchRes = await fetch(body.imageUrl, { signal: AbortSignal.timeout(10000) });
        if (!fetchRes.ok) {
          return NextResponse.json({ error: 'Failed to fetch image from provided URL' }, { status: 400 });
        }
        imageBuffer = Buffer.from(await fetchRes.arrayBuffer());
      }
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json({ error: 'Could not extract valid image data' }, { status: 400 });
    }

    if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image exceeds 5MB limit' }, { status: 413 });
    }

    // ── Forward to Internal Rembg Microservice ──────────────────────────────
    const rembgUrl = process.env.REMBG_SERVICE_URL || 'http://localhost:8008/remove-bg';
    const rembgApiKey = process.env.REMBG_API_KEY || 'bgos-rembg-internal-secret';

    try {
      const workerFormData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: contentType });
      workerFormData.append('file', blob, 'image.png');

      const workerRes = await fetch(rembgUrl, {
        method: 'POST',
        headers: {
          'X-BGOS-API-KEY': rembgApiKey,
        },
        body: workerFormData,
        signal: AbortSignal.timeout(15000), // 15 second processing budget
      });

      if (workerRes.ok) {
        const cutoutBuffer = Buffer.from(await workerRes.arrayBuffer());
        let finalBuffer = cutoutBuffer;
        let bounds = {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          origWidth: 0,
          origHeight: 0,
        };

        const bboxHeader = workerRes.headers.get('x-cutout-bbox');
        const origSizeHeader = workerRes.headers.get('x-cutout-orig-size');
        const croppedSizeHeader = workerRes.headers.get('x-cutout-size');

        if (bboxHeader && origSizeHeader && croppedSizeHeader) {
          const [left, top, right, bottom] = bboxHeader.split(',').map(Number);
          const [origW, origH] = origSizeHeader.split(',').map(Number);
          const [cropW, cropH] = croppedSizeHeader.split(',').map(Number);
          bounds = {
            left: isNaN(left) ? 0 : left,
            top: isNaN(top) ? 0 : top,
            width: isNaN(cropW) ? right - left : cropW,
            height: isNaN(cropH) ? bottom - top : cropH,
            origWidth: isNaN(origW) ? 0 : origW,
            origHeight: isNaN(origH) ? 0 : origH,
          };
        } else {
          // Sharp auto-trim safety fallback
          try {
            const trimmed = await sharp(cutoutBuffer).trim().toBuffer({ resolveWithObject: true });
            finalBuffer = trimmed.data;
            const origMeta = await sharp(cutoutBuffer).metadata();
            bounds = {
              left: Math.abs(trimmed.info.trimOffsetLeft || 0),
              top: Math.abs(trimmed.info.trimOffsetTop || 0),
              width: trimmed.info.width,
              height: trimmed.info.height,
              origWidth: origMeta.width || trimmed.info.width,
              origHeight: origMeta.height || trimmed.info.height,
            };
          } catch {
            // Proceed with raw buffer if trim fails
          }
        }

        const base64DataUri = `data:image/png;base64,${finalBuffer.toString('base64')}`;

        return NextResponse.json({
          success: true,
          mimeType: 'image/png',
          cutoutDataUri: base64DataUri,
          sizeBytes: finalBuffer.length,
          provider: 'self-hosted-rembg',
          bounds,
        });
      }
    } catch (workerErr: unknown) {
      // Microservice is either offline or unreachable — try cloud fallback or graceful response
      console.warn('[remove-bg] Internal rembg microservice unreachable, falling back:', workerErr);
    }

    // Cloud fallback (remove.bg API if configured)
    if (process.env.REMOVE_BG_API_KEY) {
      try {
        const cloudFormData = new FormData();
        const blob = new Blob([new Uint8Array(imageBuffer)], { type: contentType });
        cloudFormData.append('image_file', blob, 'image.png');
        cloudFormData.append('size', 'auto');

        const cloudRes = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
          body: cloudFormData,
          signal: AbortSignal.timeout(10000),
        });

        if (cloudRes.ok) {
          const cutoutBuffer = Buffer.from(await cloudRes.arrayBuffer());
          let finalBuffer = cutoutBuffer;
          let bounds = { left: 0, top: 0, width: 0, height: 0, origWidth: 0, origHeight: 0 };
          try {
            const trimmed = await sharp(cutoutBuffer).trim().toBuffer({ resolveWithObject: true });
            finalBuffer = trimmed.data;
            const origMeta = await sharp(cutoutBuffer).metadata();
            bounds = {
              left: Math.abs(trimmed.info.trimOffsetLeft || 0),
              top: Math.abs(trimmed.info.trimOffsetTop || 0),
              width: trimmed.info.width,
              height: trimmed.info.height,
              origWidth: origMeta.width || trimmed.info.width,
              origHeight: origMeta.height || trimmed.info.height,
            };
          } catch {}

          return NextResponse.json({
            success: true,
            mimeType: 'image/png',
            cutoutDataUri: `data:image/png;base64,${finalBuffer.toString('base64')}`,
            sizeBytes: finalBuffer.length,
            provider: 'cloud-removebg',
            bounds,
          });
        }
      } catch (cloudErr) {
        console.warn('[remove-bg] Cloud fallback failed:', cloudErr);
      }
    }

    // When background removal cannot be completed, return an honest service error
    return NextResponse.json(
      {
        success: false,
        error: 'Background removal service is offline or unavailable. Please ensure rembg worker is running on port 8008.',
        provider: 'none',
      },
      { status: 503 }
    );
  } catch (error: unknown) {
    console.error('Error in remove-bg gateway:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Background removal processing failed' },
      { status: 500 }
    );
  }
}

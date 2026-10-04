import { NextRequest, NextResponse } from 'next/server';
import { isAiConfiguredAsync } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { checkAiQuota, trackAiUsage } from '@/lib/ai-usage-tracker';

/**
 * AI Image Description (form embed) — vision model that describes an uploaded
 * image. Uses the z-ai-web-dev-sdk VLM (vision-language model) which is the
 * sanctioned in-house vision provider.
 *
 * POST /api/forms/ai/image-description
 *   body: { imageBase64: string (without data: prefix), mimeType: string, prompt?: string, formId?: string }
 *   returns: { description: string }
 *
 * Public route (no auth) — tenant resolved from formId for AI quota billing.
 * CORS-open so embedded forms can call it.
 */

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64: string | undefined = body.imageBase64;
    const mimeType: string | undefined = body.mimeType;
    const prompt: string = body.prompt || 'Describe this image in detail. Identify the main subject, key objects, setting, and any visible text. Keep the description to 2-3 sentences.';
    const formId: string | undefined = body.formId;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'imageBase64 and mimeType are required' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!ALLOWED_MIME.includes(mimeType.toLowerCase())) {
      return NextResponse.json({ error: `Unsupported image type: ${mimeType}. Supported: ${ALLOWED_MIME.join(', ')}` }, { status: 400, headers: CORS_HEADERS });
    }

    // Decode to validate size (base64 length ≈ 4/3 * raw bytes).
    const approxBytes = Math.ceil((imageBase64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image exceeds 5 MB limit.' }, { status: 413, headers: CORS_HEADERS });
    }

    const configured = await isAiConfiguredAsync();
    if (!configured) {
      return NextResponse.json(
        { error: 'AI is not configured for this workspace.' },
        { status: 503, headers: CORS_HEADERS },
      );
    }

    // Resolve tenant from formId for quota billing.
    let tenantId: string | null = null;
    if (formId) {
      try {
        const form = await db.form.findUnique({ where: { id: formId }, select: { tenantId: true } });
        tenantId = form?.tenantId || null;
      } catch {
        // ignore
      }
    }

    if (tenantId) {
      try {
        const quota = await checkAiQuota(tenantId);
        if (!quota.ok) {
          return NextResponse.json(
            { error: 'AI usage limit reached for this billing period.' },
            { status: 429, headers: CORS_HEADERS },
          );
        }
      } catch {
        // quota check failed — allow the call (best-effort)
      }
    }

    // Build the data URL for the VLM.
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    // Use the in-house z-ai-web-dev-sdk VLM (vision-language model).
    // This is the sanctioned backend vision provider — never import the SDK
    // in client code.
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.chat.completions.createVision({
      model: 'glm-4v-plus',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const description = response.choices?.[0]?.message?.content || '';

    if (!description) {
      return NextResponse.json(
        { error: 'The vision model returned an empty description. Try a different image.' },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    // Log usage (best-effort).
    if (tenantId) {
      await trackAiUsage(tenantId, {
        feature: 'forms_ai_image_description',
        promptTokens: prompt.length,
        completionTokens: description.length,
      }).catch(() => {});
    }

    return NextResponse.json({ description }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('[forms/ai/image-description POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze the image.' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

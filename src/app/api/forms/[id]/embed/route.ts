import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/forms/[id]/embed ─────────────────────────────────────────────
// Return embed codes (script tag, iframe URL) for a form

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const form = await db.form.findUnique({ where: { id } });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    const embedSlug = form.slug || form.id;
    const formUrl = `${baseUrl}/forms/${embedSlug}`;

    const embedCodes: Record<string, unknown> = {};

    // Script tag embed
    if (form.embedScriptEnabled) {
      embedCodes.script = {
        tag: `<script src="${baseUrl}/embed/form.js" data-form-id="${form.id}" data-slug="${embedSlug}" async></script>`,
        url: `${baseUrl}/embed/form.js?formId=${form.id}`,
      };
    }

    // Iframe embed
    if (form.embedIframeEnabled) {
      embedCodes.iframe = {
        tag: `<iframe src="${formUrl}/embed" width="100%" height="600" frameborder="0" style="border:none;border-radius:8px;" title="${form.name}"></iframe>`,
        url: `${formUrl}/embed`,
      };
    }

    // Direct link
    embedCodes.directLink = {
      url: formUrl,
    };

    // WordPress shortcode
    embedCodes.wordpress = {
      shortcode: `[serviceos_form id="${form.id}" slug="${embedSlug}"]`,
    };

    return NextResponse.json({
      formId: form.id,
      formName: form.name,
      formSlug: form.slug,
      embedCodes,
    });
  } catch (error) {
    console.error('Get embed codes error:', error);
    return NextResponse.json({ error: 'Failed to get embed codes' }, { status: 500 });
  }
}

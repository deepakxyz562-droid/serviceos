import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/forms/[id]/embed-event?type=view&ref=https://...
 *
 * Tracks embed events (views, submissions) for analytics.
 * Called by the GPTForm Embed SDK (embed.js) via navigator.sendBeacon()
 * or Image pixel fallback.
 *
 * Query params:
 *   type — 'js_view', 'iframe_view', 'submission'
 *   ref  — referrer URL (document.referrer)
 *   v    — SDK version
 *
 * Returns a 1x1 transparent pixel or empty JSON.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: formId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'view';
    const referrer = searchParams.get('ref') || '';
    const version = searchParams.get('v') || 'unknown';

    // Verify form exists (don't fail if DB unavailable — analytics is best-effort)
    try {
      const form = await db.form.findFirst({
        where: {
          OR: [{ id: formId }, { slug: formId }],
          status: { not: 'archived' },
        },
        select: { id: true, tenantId: true },
      });

      if (form) {
        // Record the view/submission in the FormView table if it exists.
        // This is best-effort — if the table doesn't exist or DB is down,
        // we silently succeed (analytics should never break the form).
        try {
          await db.formView.create({
            data: {
              formId: form.id,
              source: 'embed',
              referrer: referrer.slice(0, 500),
              metadata: JSON.stringify({ type, version, embed: true }),
            },
          }).catch(() => { /* table may not exist — ignore */ });
        } catch {
          /* noop */
        }

        // Increment submissions counter
        if (type === 'submission') {
          try {
            await db.form.update({
              where: { id: form.id },
              data: { submissions: { increment: 1 } },
            }).catch(() => { /* noop */ });
          } catch {
            /* noop */
          }
        }
      }
    } catch {
      /* DB may be unavailable — analytics is best-effort */
    }

    // Return a 1x1 transparent GIF for Image pixel fallback
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    const response = new NextResponse(gif, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': String(gif.length),
      },
    });
    return response;
  } catch {
    // Never fail on analytics — return empty GIF
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );
    return new NextResponse(gif, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  }
}

/**
 * POST /api/public/forms/[id]/embed-event
 *
 * Alternative to GET for environments where sendBeacon sends POST.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Forward to GET handler
  return GET(request, { params });
}

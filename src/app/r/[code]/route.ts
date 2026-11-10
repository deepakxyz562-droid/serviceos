import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';

function normalizeSafeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Public multi-tenant Google Review short redirector.
 *
 * Allows approved Meta WhatsApp templates to use a fixed canonical URL prefix
 * (`https://fieseros.com/r/{{1}}`) while dynamically routing every customer to
 * the specific business's Google Business Profile review link.
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await ctx.params;
    const cleanCode = decodeURIComponent(code || '').trim();
    if (!cleanCode || cleanCode.length > 128) {
      return NextResponse.json({ error: 'Invalid review link code' }, { status: 400 });
    }

    const tenant = await db.tenant.findFirst({
      where: {
        OR: [{ slug: cleanCode }, { id: cleanCode }],
      },
      select: {
        id: true,
        name: true,
        googlePlaceId: true,
        googleBusinessProfileUrl: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Review link not found' }, { status: 404 });
    }

    let destination = normalizeSafeHttpUrl(tenant.googleBusinessProfileUrl);

    if (!destination && tenant.googlePlaceId) {
      destination = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(tenant.googlePlaceId)}`;
    }

    if (!destination) {
      try {
        const googleAccount = await prepareGoogleAccount(tenant.id);
        const meta = (googleAccount?.metadata || {}) as Record<string, unknown>;
        if (typeof meta.placeId === 'string' && meta.placeId.trim()) {
          destination = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(meta.placeId.trim())}`;
        } else {
          destination = normalizeSafeHttpUrl(meta.mapsUri);
        }
      } catch {
        // Ignore GBP helper lookup failures and fall back below.
      }
    }

    if (!destination && tenant.name && tenant.name.trim()) {
      destination = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.name.trim())}`;
    }

    if (!destination) {
      return NextResponse.json({ error: 'Google review destination is not configured' }, { status: 404 });
    }

    return NextResponse.redirect(destination, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[GET /r/[code]] Redirect error:', error);
    return NextResponse.json({ error: 'Failed to resolve review link' }, { status: 500 });
  }
}

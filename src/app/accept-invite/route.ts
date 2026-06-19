import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Fallback handler for `/accept-invite?token=...` links.
 *
 * The canonical invitation route is `/{companySlug}/accept-invite`, but some
 * invitation links are generated without a slug (when the tenant slug is null
 * or the customer has no workspace). Without this fallback, those links 404.
 *
 * This page looks up the token (in both the Invitation table and the
 * Customer.activationToken field), resolves the tenant slug, and redirects to
 * the canonical `/{slug}/accept-invite?token=...&[mode=reset]` URL.
 *
 * If the token cannot be resolved or the tenant has no slug, we still redirect
 * to `/_/accept-invite` (a literal placeholder) so the existing page can show
 * its "invalid link" state rather than a raw 404.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const mode = searchParams.get('mode');

  if (!token) {
    // No token — redirect to a placeholder slug so the existing page renders
    // its "invalid link" state instead of a 404.
    return NextResponse.redirect(new URL('/_/accept-invite', request.url));
  }

  let slug: string | null = null;

  // 1. Try the Invitation table
  try {
    const invitation = await db.invitation.findUnique({
      where: { token },
      select: {
        tenant: { select: { slug: true } },
      },
    });
    if (invitation?.tenant?.slug) {
      slug = invitation.tenant.slug;
    }
  } catch {
    // Ignore — fall through to customer lookup
  }

  // 2. Try Customer.activationToken
  if (!slug) {
    try {
      const customer = await db.customer.findFirst({
        where: { activationToken: token },
        include: {
          workspace: {
            include: {
              tenant: { select: { slug: true } },
            },
          },
        },
      });
      if (customer?.workspace?.tenant?.slug) {
        slug = customer.workspace.tenant.slug;
      }
    } catch {
      // Ignore — fall through to placeholder
    }
  }

  // Build the redirect URL. If we resolved a slug, use it; otherwise use a
  // literal placeholder "_" so the canonical page renders its error state.
  const resolvedSlug = slug || '_';
  const params = new URLSearchParams({ token });
  if (mode) params.set('mode', mode);
  const redirectUrl = new URL(`/${resolvedSlug}/accept-invite`, request.url);
  redirectUrl.search = params.toString();

  return NextResponse.redirect(redirectUrl);
}

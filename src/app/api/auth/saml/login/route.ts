import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/saml/login?tenant=<tenantId>
 * Redirects to the IdP login URL for SAML SSO.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant parameter is required' }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { samlEnabled: true, samlEntryUrl: true },
  }).catch(() => null);

  if (!tenant?.samlEnabled || !tenant.samlEntryUrl) {
    return NextResponse.json({ error: 'SAML SSO not configured for this tenant' }, { status: 400 });
  }

  // Redirect to IdP with SAMLRequest (simplified — uses redirect binding)
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/saml/callback`;
  const redirectUrl = `${tenant.samlEntryUrl}?RelayState=${encodeURIComponent(tenantId)}&ReturnUrl=${encodeURIComponent(returnUrl)}`;

  return NextResponse.redirect(redirectUrl);
}

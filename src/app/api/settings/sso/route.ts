import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/sso
 * Returns the SSO/SAML configuration status for the current tenant.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        samlEnabled: true,
        samlEntryUrl: true,
        samlIssuer: true,
        samlAttributeEmail: true,
        samlAttributeName: true,
        // Don't expose the cert in GET (security)
        samlCert: true,
        oidcEnabled: true,
        oidcClientId: true,
        oidcDiscoveryUrl: true,
      },
    }).catch(() => null);

    return NextResponse.json({
      saml: {
        enabled: tenant?.samlEnabled || false,
        entryUrl: tenant?.samlEntryUrl || '',
        issuer: tenant?.samlIssuer || '',
        cert: tenant?.samlCert ? '(configured)' : '', // Don't expose raw cert
        attributeEmail: tenant?.samlAttributeEmail || 'email',
        attributeName: tenant?.samlAttributeName || 'name',
        metadataUrl: '/api/auth/saml/metadata',
        loginUrl: `/api/auth/saml/login?tenant=${user.tenantId}`,
      },
      oidc: {
        enabled: tenant?.oidcEnabled || false,
        clientId: tenant?.oidcClientId || '',
        discoveryUrl: tenant?.oidcDiscoveryUrl || '',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SSO settings' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/sso
 * Updates SSO/SAML configuration.
 * Body: { saml: { entryUrl, cert, issuer, attributeEmail, attributeName } }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { saml } = body;

    if (!saml) {
      return NextResponse.json({ error: 'saml config is required' }, { status: 400 });
    }

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        samlEnabled: Boolean(saml.entryUrl && saml.cert),
        samlEntryUrl: saml.entryUrl || null,
        samlCert: saml.cert || null,
        samlIssuer: saml.issuer || null,
        samlAttributeEmail: saml.attributeEmail || 'email',
        samlAttributeName: saml.attributeName || 'name',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update SSO settings' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/sso
 * Disables SSO/SAML.
 */
export async function DELETE() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        samlEnabled: false,
        samlEntryUrl: null,
        samlCert: null,
        samlIssuer: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to disable SSO' },
      { status: 500 },
    );
  }
}

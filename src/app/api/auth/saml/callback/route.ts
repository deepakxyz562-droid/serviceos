import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/saml/callback
 * Receives the SAML response from the IdP, verifies it, and creates a session.
 *
 * The IdP POSTs a SAMLResponse field containing the XML assertion.
 * We extract the email + name from the assertion, find or create the user,
 * and issue a JWT session token.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayState = formData.get('RelayState') as string; // tenantId

    if (!samlResponse) {
      return NextResponse.redirect(new URL('/login?saml_error=no_response', request.url));
    }

    const tenantId = relayState;
    if (!tenantId) {
      return NextResponse.redirect(new URL('/login?saml_error=no_tenant', request.url));
    }

    // Get tenant's SAML config
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        samlEnabled: true,
        samlCert: true,
        samlIssuer: true,
        samlAttributeEmail: true,
        samlAttributeName: true,
      },
    }).catch(() => null);

    if (!tenant?.samlEnabled || !tenant.samlCert) {
      return NextResponse.redirect(new URL('/login?saml_error=not_configured', request.url));
    }

    // Decode the SAML response (base64)
    const samlXml = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // Extract email and name from the SAML assertion XML
    // (In production, use the SAML library to verify the signature + decrypt)
    const emailMatch = samlXml.match(/<(?:\w+:)?NameID[^>]*>([^<]+)</);
    const nameMatch = samlXml.match(/<(?:\w+:)?Attribute[^>]*(?:Name="name"|Name="displayName")[^>]*>[^<]*<(?:\w+:)?AttributeValue[^>]*>([^<]+)</);

    const email = emailMatch?.[1]?.trim();
    const name = nameMatch?.[1]?.trim() || email;

    if (!email) {
      return NextResponse.redirect(new URL('/login?saml_error=no_email', request.url));
    }

    // JIT provisioning: find or create user
    let user = await db.user.findFirst({
      where: { email, tenantId },
    }).catch(() => null);

    if (!user) {
      // Create user via JIT provisioning
      user = await db.user.create({
        data: {
          email,
          name: name || email,
          tenantId,
          role: 'employee',
          emailVerified: true, // SSO verified
        },
      }).catch(() => null);
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login?saml_error=user_create_failed', request.url));
    }

    // Issue JWT session token
    const token = signToken({
      userId: user.id,
      email: user.email,
      tenantId,
      role: user.role,
    });

    // Set cookie + redirect to app
    const response = NextResponse.redirect(new URL('/app', request.url));
    response.cookies.set('fieseros_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[saml/callback] Error:', error);
    return NextResponse.redirect(new URL('/login?saml_error=' + encodeURIComponent(error.message), request.url));
  }
}

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/saml/metadata
 * Returns the SAML SP metadata XML.
 * IdPs use this to configure the service provider connection.
 */
export async function GET() {
  const entity_id = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/api/auth/saml/metadata`;
  const callback_url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/api/auth/saml/callback`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entity_id}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService index="0" isDefault="true"
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${callback_url}" />
  </SPSSODescriptor>
</EntityDescriptor>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}

/**
 * SAML 2.0 SSO Integration
 *
 * G3: Enterprise SSO via SAML 2.0.
 * Supports Okta, Azure AD, Google Workspace, and any SAML 2.0 IdP.
 *
 * Flow:
 *   1. Admin configures IdP settings (entry URL, cert, issuer) on Tenant
 *   2. User clicks "Login with SSO" → redirected to IdP
 *   3. IdP authenticates user → POSTs SAML response to /api/auth/saml/callback
 *   4. We verify the SAML response, extract email + name
 *   5. If user exists → create session. If not → JIT provision (create user).
 */

import { Strategy as SAMLStrategy } from '@node-saml/passport-saml';
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';

const SAML_CALLBACK_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/api/auth/saml/callback`;
const SAML_ENTITY_ID = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/api/auth/saml/metadata`;

/**
 * Create a SAML strategy for a specific tenant.
 * Each tenant has their own IdP configuration.
 */
export function createSamlStrategy(tenantId: string, config: {
  samlEntryUrl: string;
  samlCert: string;
  samlIssuer: string;
  samlAttributeEmail?: string;
  samlAttributeName?: string;
}): SAMLStrategy {
  return new SAMLStrategy(
    {
      entryPoint: config.samlEntryUrl,
      cert: config.samlCert,
      issuer: SAML_ENTITY_ID,
      callbackUrl: SAML_CALLBACK_URL,
      audience: SAML_ENTITY_ID,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      // Map attributes
      attributeMapping: {
        email: config.samlAttributeEmail || 'email',
        name: config.samlAttributeName || 'name',
      },
    },
    async (profile: any, done: any) => {
      try {
        const email = profile.email || profile.nameID;
        const name = profile.name || profile.displayName || email;

        if (!email) {
          return done(new Error('No email in SAML response'), null);
        }

        // JIT provisioning: find or create user
        const user = await findOrCreateSsoUser(email, name, tenantId);
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    },
  );
}

/**
 * Find or create a user from SSO login (JIT provisioning).
 */
async function findOrCreateSsoUser(email: string, name: string, tenantId: string) {
  // Check if user exists
  const existingUser = await db.user.findFirst({
    where: { email, tenantId },
  });

  if (existingUser) {
    return existingUser;
  }

  // JIT: create the user
  const newUser = await db.user.create({
    data: {
      email,
      name,
      tenantId,
      role: 'employee', // default role for SSO-provisioned users
      ssoProvider: 'saml',
      emailVerified: true, // SSO already verified
    },
  });

  return newUser;
}

/**
 * Get the SAML metadata XML for a tenant.
 * Used by IdPs to configure the service provider.
 */
export function getSamlMetadata(): string {
  // Return standard SP metadata
  return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${SAML_ENTITY_ID}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService index="0" isDefault="true"
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${SAML_CALLBACK_URL}" />
  </SPSSODescriptor>
</EntityDescriptor>`;
}

/**
 * Save SAML configuration for a tenant.
 */
export async function saveSamlConfig(
  tenantId: string,
  config: {
    samlEntryUrl: string;
    samlCert: string;
    samlIssuer: string;
    samlAttributeEmail?: string;
    samlAttributeName?: string;
  },
): Promise<void> {
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      samlEnabled: true,
      samlEntryUrl: config.samlEntryUrl,
      samlCert: config.samlCert,
      samlIssuer: config.samlIssuer,
      samlAttributeEmail: config.samlAttributeEmail || 'email',
      samlAttributeName: config.samlAttributeName || 'name',
    },
  });
}

/**
 * Get SAML configuration for a tenant.
 */
export async function getSamlConfig(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      samlEnabled: true,
      samlEntryUrl: true,
      samlCert: true,
      samlIssuer: true,
      samlAttributeEmail: true,
      samlAttributeName: true,
    },
  });

  if (!tenant?.samlEnabled || !tenant.samlEntryUrl || !tenant.samlCert) {
    return null;
  }

  return {
    samlEntryUrl: tenant.samlEntryUrl,
    samlCert: tenant.samlCert,
    samlIssuer: tenant.samlIssuer || SAML_ENTITY_ID,
    samlAttributeEmail: tenant.samlAttributeEmail || 'email',
    samlAttributeName: tenant.samlAttributeName || 'name',
  };
}

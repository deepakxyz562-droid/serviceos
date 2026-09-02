import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/marketplace/claim/anchors/[tenantId]
 * --------------------------------------------------
 * Returns the verification anchors available for an existing marketplace listing.
 *
 * The claimant uses these to choose a verification method (phone OTP, email OTP,
 * Google Business, website). The anchors are MASKED — the full phone/email is
 * never returned to an unverified claimant (security: no enumeration).
 *
 * Response:
 *   {
 *     businessName: "ABC Plumbing",
 *     phone: { available: true, masked: "+91 98******42" },
 *     email: { available: true, masked: "c******@abcplumbing.com" },
 *     website: { available: true, domain: "abcplumbing.com" },
 *     googleBusiness: { available: true }
 *   }
 *
 * Phase 5: This is the core of the anchor-based verification approach.
 * The claim flow verifies control of the listing's EXISTING contact points,
 * not user-supplied ones.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { tenantId } = await params;

    // Fetch the listing's anchor data
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        website: true,
        claimed: true,
        listingTier: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (tenant.claimed) {
      return NextResponse.json(
        { error: 'This business has already been claimed' },
        { status: 409 },
      );
    }

    // Build masked anchors
    const phoneMasked = tenant.phone ? maskPhone(tenant.phone) : null;
    const emailMasked = tenant.email ? maskEmail(tenant.email) : null;
    const websiteDomain = tenant.website ? extractDomain(tenant.website) : null;

    return NextResponse.json({
      businessName: tenant.name,
      phone: {
        available: !!tenant.phone,
        masked: phoneMasked,
      },
      email: {
        available: !!tenant.email,
        masked: emailMasked,
      },
      website: {
        available: !!tenant.website,
        domain: websiteDomain,
      },
      googleBusiness: {
        available: true, // Google OAuth is always available as a method
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch anchors';
    console.error('[claim/anchors]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Mask a phone number: show country code + last 2 digits.
 * "+91 9876543210" → "+91 98******10"
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '******';
  const lastTwo = digits.slice(-2);
  const prefix = phone.slice(0, Math.min(phone.length, 6));
  return `${prefix}******${lastTwo}`;
}

/**
 * Mask an email: show first char + domain.
 * "contact@abcplumbing.com" → "c******@abcplumbing.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '******';
  const firstChar = local.slice(0, 1);
  return `${firstChar}******@${domain}`;
}

/**
 * Extract the domain from a website URL.
 * "https://www.abcplumbing.com/about" → "abcplumbing.com"
 */
function extractDomain(website: string): string {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    // Not a valid URL — return the raw string stripped of protocol
    return website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  sanitizeSubdomain,
  isReservedSubdomain,
  SUBDOMAIN_MIN_LENGTH,
} from '@/lib/subdomain';

/**
 * GET /api/tenant/subdomain-check?subdomain=abc-plumbing
 *
 * Check if a subdomain is available for registration.
 * Used during tenant onboarding / signup to validate the
 * desired subdomain before committing it.
 *
 * Returns:
 *   - { available: true, subdomain: "abc-plumbing" } — go ahead
 *   - { available: false, reason: "..." } — not available
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSubdomain = searchParams.get('subdomain');

    if (!rawSubdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    // Sanitize the input
    const cleanSub = sanitizeSubdomain(rawSubdomain);

    if (!cleanSub) {
      return NextResponse.json({
        available: false,
        reason: `Invalid subdomain. Must be ${SUBDOMAIN_MIN_LENGTH}-63 characters, lowercase letters, numbers, and hyphens only.`,
      });
    }

    if (cleanSub.length < SUBDOMAIN_MIN_LENGTH) {
      return NextResponse.json({
        available: false,
        reason: `Too short (minimum ${SUBDOMAIN_MIN_LENGTH} characters)`,
      });
    }

    // Check reserved subdomains
    if (isReservedSubdomain(cleanSub)) {
      return NextResponse.json({
        available: false,
        reason: 'This subdomain is reserved',
      });
    }

    // Check database — both subdomain and slug columns
    const existing = await db.tenant.findFirst({
      where: {
        OR: [{ subdomain: cleanSub }, { slug: cleanSub }],
      },
      select: { id: true, subdomain: true, slug: true },
    });

    if (existing) {
      return NextResponse.json({
        available: false,
        reason: 'Already taken',
      });
    }

    // Also check custom domains that might conflict
    const customDomainConflict = await db.tenant.findFirst({
      where: { customDomain: cleanSub },
      select: { id: true },
    });

    if (customDomainConflict) {
      return NextResponse.json({
        available: false,
        reason: 'Already taken',
      });
    }

    // Subdomain is available
    return NextResponse.json({
      available: true,
      subdomain: cleanSub,
    });
  } catch (error) {
    console.error('[SubdomainCheck] Error checking subdomain:', error);
    return NextResponse.json(
      { error: 'Failed to check subdomain availability' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/auth/customer/discover
 *
 * Automatic Tenant Discovery — given an email OR phone, return the list of
 * companies (workspaces + tenants) that this customer belongs to.
 *
 * Request body:
 *   { identifier: string }   // email or phone (with or without country code)
 *
 * Response (200):
 *   {
 *     found: boolean,
 *     identifier: string,         // normalized identifier that matched
 *     identifierType: 'email' | 'phone',
 *     needsActivation: boolean,   // true if customer has no password set yet
 *     companies: Array<{
 *       customerId: string,
 *       customerName: string,
 *       workspaceId: string | null,
 *       workspaceName: string | null,
 *       workspaceSlug: string | null,
 *       tenantId: string | null,
 *       tenantName: string | null,
 *       tenantSlug: string | null,
 *       industry: string | null,
 *       logo: string | null,
 *       activated: boolean,        // whether portal account is active
 *     }>
 *   }
 *
 * This is a PUBLIC endpoint — it does not require authentication, because the
 * customer hasn't logged in yet. We only reveal the names of companies the
 * customer is associated with, plus whether the account is activated. We do
 * NOT reveal password hashes, exact phone numbers (only the matched one), etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    const trimmed = identifier.trim();

    // Detect if identifier is an email or phone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    // Normalize phone: strip non-digits
    let normalizedPhone = trimmed.replace(/\D/g, '');
    // If 10 digits, prepend default country code 91 (India)
    if (!isEmail && normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    // Build where clause
    const where = isEmail
      ? { email: trimmed.toLowerCase() }
      : {
          OR: [
            { phone: normalizedPhone },
            // Try alternate phone format (with/without country code)
            ...(normalizedPhone.startsWith('91')
              ? [{ phone: normalizedPhone.slice(2) }]
              : [{ phone: `91${normalizedPhone}` }]),
          ],
        };

    // Find ALL customer records matching this identifier (across all companies)
    const customers = await db.customer.findMany({
      where,
      include: {
        workspace: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (customers.length === 0) {
      return NextResponse.json({
        found: false,
        identifier: trimmed,
        identifierType: isEmail ? 'email' : 'phone',
        needsActivation: false,
        companies: [],
      });
    }

    // Build the list of companies this customer belongs to
    const companies = customers.map((c) => ({
      customerId: c.id,
      customerName: c.name,
      workspaceId: c.workspaceId || null,
      workspaceName: c.workspace?.name || null,
      workspaceSlug: c.workspace?.slug || null,
      tenantId: c.workspace?.tenantId || null,
      tenantName: c.workspace?.tenant?.name || null,
      tenantSlug: c.workspace?.tenant?.slug || null,
      industry: c.workspace?.industry || c.workspace?.tenant?.industry || null,
      logo: c.workspace?.logo || c.workspace?.tenant?.logo || null,
      activated: !!c.passwordHash && !!c.activatedAt,
    }));

    // If any of the matched customer records has no password set, mark as needing activation
    const needsActivation = customers.some((c) => !c.passwordHash);

    return NextResponse.json({
      found: true,
      identifier: trimmed,
      identifierType: isEmail ? 'email' : 'phone',
      needsActivation,
      companies,
    });
  } catch (error) {
    console.error('[Customer Discover Error]', error);
    return NextResponse.json(
      { error: 'Failed to lookup customer. Please try again.' },
      { status: 500 }
    );
  }
}

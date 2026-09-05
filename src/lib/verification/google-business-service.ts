/**
 * GoogleBusinessVerificationService
 * =================================
 *
 * Shared service for Google Business Profile verification. Used by BOTH:
 *   - Settings → Verification & Compliance → "Connect Google Business Profile"
 *   - Marketplace → Claim Business → "Connect Google Business Profile"
 *
 * Architecture:
 *   OAuth proves the user has Google account access.
 *   Google Business APIs prove the user manages specific Business Profile locations.
 *   Matching proves the Google location belongs to the Fieseros business.
 *   VerificationEvidence is the SOLE authoritative record.
 *
 * The service does NOT set `tenant.googleBusinessVerified = true` directly.
 * The verification engine derives it from the evidence row.
 */

import { db } from '@/lib/db';
import { findBestMatch, GOOGLE_MATCH_THRESHOLD, matchGoogleLocation } from '@/lib/marketplace/google-business-matcher';
import type { GoogleLocation, TenantAnchor, MatchResult } from '@/lib/marketplace/google-business-matcher';

// ── Types ───────────────────────────────────────────────────────────────────

export interface GoogleConnection {
  socialAccountId: string;
  locationId: string;
  locationTitle: string;
  accountName: string; // "accounts/123" resource name
  locationName: string; // "accounts/123/locations/456" resource name
  isActive: boolean;
  tokenExpiry: Date | null;
}

export interface GoogleLocationForSelection {
  locationId: string;
  title: string;
  accountName: string;
}

export interface MatchOutcome {
  verified: boolean;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  matchScore: number;
  nameScore: number;
  addressScore: number;
  phoneMatch: boolean;
  websiteMatch: boolean;
  locationId: string;
  locationTitle: string;
  reason?: string;
  message: string;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get all Google Business Profile locations connected to a tenant
 * (via OAuth — stored as SocialAccount rows with platform='googlebusiness').
 *
 * Used by the profile-selection UI to show the user which Google locations
 * they manage, so they can select the one that matches their Fieseros business.
 */
export async function getConnectedLocations(tenantId: string): Promise<GoogleLocationForSelection[]> {
  const accounts = await db.socialAccount.findMany({
    where: {
      tenantId,
      platform: 'googlebusiness',
      isActive: true,
    },
    select: {
      id: true,
      accountId: true,
      accountName: true,
      metadata: true,
    },
  });

  return accounts.map((sa) => {
    const meta = JSON.parse(sa.metadata || '{}') as {
      locationName?: string;
      locationTitle?: string;
    };
    return {
      locationId: sa.accountId,
      title: sa.accountName || meta.locationTitle || meta.locationName || 'Unknown location',
      accountName: meta.accountName || '',
    };
  });
}

/**
 * Check if a tenant has any Google Business Profile connection.
 */
export async function hasGoogleConnection(tenantId: string): Promise<boolean> {
  const count = await db.socialAccount.count({
    where: {
      tenantId,
      platform: 'googlebusiness',
      isActive: true,
    },
  });
  return count > 0;
}

/**
 * Match a specific Google location against the tenant's business details.
 *
 * This is the SERVER-AUTHORITATIVE match. The browser NEVER tells the server
 * "Google says I own this business." The server fetches the stored Google
 * location data + the tenant's business details + runs the match itself.
 *
 * @param tenantId — the Fieseros business being verified
 * @param locationId — the Google location ID the user selected
 * @param verifiedById — the user performing the verification
 * @param claimId — optional: if this is for a claim, link the evidence to it
 */
export async function matchLocation(
  tenantId: string,
  locationId: string,
  verifiedById: string,
  claimId?: string | null,
): Promise<MatchOutcome> {
  // 1. Fetch the tenant's business details
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      country: true,
      phone: true,
      website: true,
    },
  });

  if (!tenant) {
    return {
      verified: false,
      status: 'REJECTED',
      matchScore: 0,
      nameScore: 0,
      addressScore: 0,
      phoneMatch: false,
      websiteMatch: false,
      locationId,
      locationTitle: '',
      reason: 'TENANT_NOT_FOUND',
      message: 'Business not found.',
    };
  }

  // 2. Fetch the Google location from SocialAccount
  const socialAccount = await db.socialAccount.findFirst({
    where: {
      tenantId,
      platform: 'googlebusiness',
      accountId: locationId,
      isActive: true,
    },
    select: {
      id: true,
      accountId: true,
      accountName: true,
      metadata: true,
    },
  });

  if (!socialAccount) {
    return {
      verified: false,
      status: 'REJECTED',
      matchScore: 0,
      nameScore: 0,
      addressScore: 0,
      phoneMatch: false,
      websiteMatch: false,
      locationId,
      locationTitle: '',
      reason: 'LOCATION_NOT_FOUND',
      message: 'The selected Google location was not found. Please reconnect your Google Business Profile.',
    };
  }

  // 3. Build the Google location object for the matcher
  const meta = JSON.parse(socialAccount.metadata || '{}') as {
    locationName?: string;
    locationTitle?: string;
    accountName?: string;
    // Phase 3: access role captured during OAuth
    accessRole?: string;
    admins?: Array<{ adminName: string; role: string }>;
  };

  // Fetch FULL Google location details (address, phone, website) via the
  // Business Information API. The OAuth callback only stored name+title
  // (readMask=name,title in the list call). To get a proper multi-signal
  // match (name 30% + address 30% + phone 20% + website 20%), we need the
  // full location details.
  //
  // GET https://mybusinessbusinessinformation.googleapis.com/v1/{locationName}
  //   ?readMask=name,title,phoneNumbers,websiteUri,storefrontAddress
  //
  // We use the access token stored in the SocialAccount (encrypted — decrypt it).
  // Best-effort: if the API call fails, we fall back to name-only matching.
  let googleLocation: GoogleLocation = {
    locationId: socialAccount.accountId,
    title: socialAccount.accountName || meta.locationTitle || meta.locationName || '',
    address: undefined,
    phone: undefined,
    website: undefined,
  };

  try {
    const { decryptToken } = await import('@/lib/social/crypto');
    const accessToken = decryptToken(socialAccount.accessToken);
    const locationResourceName = meta.locationName || '';
    if (accessToken && locationResourceName) {
      const detailUrl = new URL(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${locationResourceName}`,
      );
      detailUrl.searchParams.set(
        'readMask',
        'name,title,phoneNumbers,websiteUri,storefrontAddress',
      );
      const detailRes = await fetch(detailUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (detailRes.ok) {
        const detail = (await detailRes.json()) as {
          title?: string;
          phoneNumbers?: Array<{ phoneNumber?: string }>;
          websiteUri?: string;
          storefrontAddress?: {
            addressLines?: string[];
            locality?: string;
            administrativeArea?: string;
            country?: string;
          };
        };
        // Build the address from storefrontAddress
        const addrParts: string[] = [];
        if (detail.storefrontAddress?.addressLines) {
          addrParts.push(...detail.storefrontAddress.addressLines);
        }
        if (detail.storefrontAddress?.locality) {
          addrParts.push(detail.storefrontAddress.locality);
        }
        if (detail.storefrontAddress?.administrativeArea) {
          addrParts.push(detail.storefrontAddress.administrativeArea);
        }
        if (detail.storefrontAddress?.country) {
          addrParts.push(detail.storefrontAddress.country);
        }
        googleLocation = {
          locationId: socialAccount.accountId,
          title: detail.title || googleLocation.title,
          address: addrParts.join(', ') || undefined,
          phone: detail.phoneNumbers?.[0]?.phoneNumber || undefined,
          website: detail.websiteUri || undefined,
        };
        console.log('[google-business-service] Fetched full location details:', {
          hasAddress: !!googleLocation.address,
          hasPhone: !!googleLocation.phone,
          hasWebsite: !!googleLocation.website,
        });
      } else {
        console.warn(`[google-business-service] Could not fetch location details (HTTP ${detailRes.status}) — falling back to name-only match`);
      }
    }
  } catch (err) {
    // Non-blocking — fall back to name-only match
    console.warn('[google-business-service] Failed to fetch location details:', err);
  }

  // 4. Run the server-side match
  const tenantAnchor: TenantAnchor = {
    name: tenant.name,
    address: tenant.address,
    city: tenant.city,
    state: tenant.state,
    country: tenant.country,
    phone: tenant.phone,
    website: tenant.website,
  };

  const result = matchGoogleLocation(googleLocation, tenantAnchor);

  // 5. Determine the verification status
  // - Strong match (≥90%) → VERIFIED (auto)
  // - Medium match (75-89%) → PENDING (admin review)
  // - Weak match (<75%) → REJECTED (mismatch)
  const STRONG_THRESHOLD = 0.9;
  const REVIEW_THRESHOLD = 0.75;

  let status: MatchOutcome['status'];
  let verified: boolean;
  let message: string;

  if (result.matchScore >= STRONG_THRESHOLD) {
    status = 'VERIFIED';
    verified = true;
    message = `Strong match (${Math.round(result.matchScore * 100)}%). Google Business Profile verified.`;
  } else if (result.matchScore >= REVIEW_THRESHOLD) {
    status = 'PENDING';
    verified = false;
    message = `Partial match (${Math.round(result.matchScore * 100)}%). Verification submitted for admin review.`;
  } else {
    status = 'REJECTED';
    verified = false;
    message = `Low match (${Math.round(result.matchScore * 100)}%). The Google Business Profile doesn't match this business.`;
  }

  // 6. Create the VerificationEvidence row
  // This is the SOLE authoritative record. The verification engine reads this.
  // We do NOT set tenant.googleBusinessVerified directly.
  const evidence = await db.verificationEvidence.create({
    data: {
      tenantId,
      claimId: claimId || null,
      type: 'GOOGLE_BUSINESS',
      status,
      target: result.title,
      metadata: JSON.stringify({
        googleLocationId: result.locationId,
        googleAccountName: meta.accountName || '',
        matchScore: result.matchScore,
        nameScore: result.nameScore,
        addressScore: result.addressScore,
        phoneMatch: result.phoneMatch,
        websiteMatch: result.websiteMatch,
        socialAccountId: socialAccount.id,
        verifiedBy: 'google_oauth',
        // Phase 3: access role (OWNER / CO_OWNER / MANAGER / etc.)
        accessRole: meta.accessRole || 'UNKNOWN',
      }),
      verifiedAt: verified ? new Date() : null,
      verifiedById,
    },
  });

  return {
    verified,
    status,
    matchScore: result.matchScore,
    nameScore: result.nameScore,
    addressScore: result.addressScore,
    phoneMatch: result.phoneMatch,
    websiteMatch: result.websiteMatch,
    locationId: result.locationId,
    locationTitle: result.title,
    message,
    reason: verified ? undefined : (status === 'PENDING' ? 'REVIEW_REQUIRED' : 'MISMATCH'),
  };
}

/**
 * Get the current Google verification status for a tenant.
 * Reads from VerificationEvidence (authoritative), NOT from tenant.googleBusinessVerified.
 */
export async function getGoogleVerificationStatus(tenantId: string): Promise<{
  hasConnection: boolean;
  isVerified: boolean;
  isPending: boolean;
  evidenceId: string | null;
  locationTitle: string | null;
  matchScore: number | null;
  connectedAt: Date | null;
}> {
  // Check for verified Google evidence
  const evidence = await db.verificationEvidence.findFirst({
    where: {
      tenantId,
      type: 'GOOGLE_BUSINESS',
      status: { in: ['VERIFIED', 'PENDING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      target: true,
      metadata: true,
      createdAt: true,
    },
  });

  const hasConnection = await hasGoogleConnection(tenantId);

  if (!evidence) {
    return {
      hasConnection,
      isVerified: false,
      isPending: false,
      evidenceId: null,
      locationTitle: null,
      matchScore: null,
      connectedAt: null,
    };
  }

  const meta = JSON.parse(evidence.metadata || '{}') as { matchScore?: number };
  return {
    hasConnection,
    isVerified: evidence.status === 'VERIFIED',
    isPending: evidence.status === 'PENDING',
    evidenceId: evidence.id,
    locationTitle: evidence.target,
    matchScore: meta.matchScore ?? null,
    connectedAt: evidence.createdAt,
  };
}

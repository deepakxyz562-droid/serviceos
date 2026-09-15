/**
 * POST /api/marketplace/claim/request
 * ------------------------------------
 * Start a business-claim flow with the new email-link architecture.
 *
 * The claimant submits a single form with:
 *   - businessEmail (required) — where the approval/registration email goes
 *   - Optional: Google Business Profile URL + name + address (auto-approve if ≥80% match)
 *   - Optional: document uploads (admin review path)
 *
 * Flow:
 *   1. If Google data provided AND matchScore ≥ 0.8 → status='auto_approved'
 *      → generate completionToken, mark tenant claimed, send APPROVED email
 *      with registration link `/?claim=complete&token=xxx`.
 *   2. Otherwise → status='pending' (admin review)
 *      → send UNDER_REVIEW email confirming receipt.
 *      → Admin reviews; on approve → APPROVED email with token; on reject → REJECTED email.
 *
 * Auth: requires authenticated user (the claimant). The claim banner gates
 * anonymous visitors behind a sign-in dialog before reaching this endpoint.
 *
 * Request body:
 *   {
 *     tenantId: string,
 *     claimantEmail: string,          // required — business email
 *     google?: { gbpUrl, gbpName, gbpAddress },
 *     documents?: { urls: string[], note?: string }
 *   }
 *
 * Returns: { requestId, status, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  generateClaimToken,
  sendClaimApprovedEmail,
  sendClaimUnderReviewEmail,
  type ClaimEmailContext,
} from '@/lib/claim-emails';
import { computeDomainMatch } from '@/lib/emails/domain-match';

export const dynamic = 'force-dynamic';

/**
 * Naive name+address similarity score (0-1). Used for the Google GBP
 * verification path — if the user's GBP listing name + address closely match
 * our tenant record, we trust Google's verification and auto-approve.
 *
 * NORMALIZATION (Phase: claim-scoring-fix)
 * ----------------------------------------
 * Real-world address strings vary heavily:
 *   "76 Barrette Street" vs "76 Barrette St"
 *   "1405 NW Westgate Ave" vs "1405 Northwest Westgate Avenue"
 *   "Vancouver, WA" vs "Vancouver, Washington"
 *   "US" vs "USA" vs "United States"
 *
 * The raw Jaccard word-overlap score would unfairly penalise these legitimate
 * variations. Before scoring, we normalise:
 *   - lowercase
 *   - strip punctuation (commas, periods, hashes)
 *   - expand common abbreviations (st→street, ave→avenue, blvd→boulevard, etc.)
 *   - normalise country names (us/usa/united states → us)
 *   - normalise canadian province names (ontario→on, british columbia→bc, etc.)
 *   - collapse whitespace
 *
 * This lifts genuinely-matching addresses from ~0-11% (broken) to ~80-95%
 * (realistic), while still penalising genuinely different addresses.
 */
const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  // Street suffixes
  st: 'street',
  str: 'street',
  ave: 'avenue',
  av: 'avenue',
  blvd: 'boulevard',
  Blvd: 'boulevard',
  rd: 'road',
  dr: 'drive',
  ln: 'lane',
  ct: 'court',
  cts: 'courts',
  pl: 'place',
  sq: 'square',
  ter: 'terrace',
  pkwy: 'parkway',
  hwy: 'highway',
  cir: 'circle',
  way: 'way',
  // Directional
  nw: 'northwest',
  ne: 'northeast',
  sw: 'southwest',
  se: 'southeast',
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  // Unit/suite
  ste: 'suite',
  apt: 'apartment',
  fl: 'floor',
  // Country
  usa: 'us',
  'united states': 'us',
  'united states of america': 'us',
  // Canadian provinces (full → abbreviated, both normalised to abbrev)
  ontario: 'on',
  'british columbia': 'bc',
  alberta: 'ab',
  quebec: 'qc',
  'nova scotia': 'ns',
  'new brunswick': 'nb',
  manitoba: 'mb',
  saskatchewan: 'sk',
  'prince edward island': 'pe',
  newfoundland: 'nl',
  'newfoundland and labrador': 'nl',
  // US states (full → abbreviated, both normalised to abbrev)
  alabama: 'al',
  alaska: 'ak',
  arizona: 'az',
  arkansas: 'ar',
  california: 'ca',
  colorado: 'co',
  connecticut: 'ct',
  delaware: 'de',
  florida: 'fl',
  georgia: 'ga',
  hawaii: 'hi',
  idaho: 'id',
  illinois: 'il',
  indiana: 'in',
  iowa: 'ia',
  kansas: 'ks',
  kentucky: 'ky',
  louisiana: 'la',
  maine: 'me',
  maryland: 'md',
  massachusetts: 'ma',
  michigan: 'mi',
  minnesota: 'mn',
  mississippi: 'ms',
  missouri: 'mo',
  montana: 'mt',
  nebraska: 'ne',
  'nevada': 'nv',
  'new hampshire': 'nh',
  'new jersey': 'nj',
  'new mexico': 'nm',
  'new york': 'ny',
  'north carolina': 'nc',
  'north dakota': 'nd',
  ohio: 'oh',
  oklahoma: 'ok',
  oregon: 'or',
  pennsylvania: 'pa',
  'rhode island': 'ri',
  'south carolina': 'sc',
  'south dakota': 'sd',
  tennessee: 'tn',
  texas: 'tx',
  utah: 'ut',
  vermont: 'vt',
  virginia: 'va',
  washington: 'wa',
  'west virginia': 'wv',
  wisconsin: 'wi',
  wyoming: 'wy',
  // Common words
  'on': 'on',
  'canada': 'ca',
};

function normalizeString(s: string): string {
  if (!s) return '';
  let out = s.toLowerCase();
  // Strip punctuation that doesn't carry meaning (commas, periods, hashes)
  out = out.replace(/[.,#]/g, ' ');
  // Collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function normalizeAddress(s: string): string {
  if (!s) return '';
  let normalized = normalizeString(s);
  // Expand abbreviations word-by-word
  const words = normalized.split(' ').map((w) => ABBREVIATION_EXPANSIONS[w] ?? w);
  return words.join(' ');
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aWords = new Set(normalizeString(a).split(/\s+/).filter(Boolean));
  const bWords = new Set(normalizeString(b).split(/\s+/).filter(Boolean));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Address-specific similarity — uses address-normalised comparison
 * (abbreviation expansion) so "76 Barrette St" matches "76 Barrette Street".
 */
function addressSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aWords = new Set(normalizeAddress(a).split(/\s+/).filter(Boolean));
  const bWords = new Set(normalizeAddress(b).split(/\s+/).filter(Boolean));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : intersection / union;
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenantId,
      claimantEmail,
      google,
      documents,
      verificationEvidenceId,
      otpVerified,
    } = body as {
      tenantId: string;
      claimantEmail: string;
      google?: { gbpUrl?: string; gbpName?: string; gbpAddress?: string };
      documents?: { urls?: string[]; note?: string };
      verificationEvidenceId?: string;
      otpVerified?: boolean;
    };

    // ── Validate required fields ──────────────────────────────────────────
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    if (!claimantEmail || !isEmailValid(claimantEmail)) {
      return NextResponse.json(
        { error: 'A valid business email is required' },
        { status: 400 },
      );
    }

    // ── Load the target tenant ────────────────────────────────────────────
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,   // ← used for full-address similarity comparison
        city: true,
        state: true,
        country: true,
        website: true,   // ← used for domain-match signal
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

    // Check if target is an eligible marketplace listing
    const eligibleListingTiers = ['free', 'claimed_free', 'none'];
    if (tenant.listingTier && !eligibleListingTiers.includes(tenant.listingTier)) {
      return NextResponse.json(
        { error: 'This business is not eligible for claiming (not a marketplace listing)' },
        { status: 400 },
      );
    }

    // Check for recent VERIFIED OTP evidence created by this user for this tenant
    const recentOtpEvidence = await db.verificationEvidence.findFirst({
      where: {
        tenantId,
        verifiedById: user.id,
        status: 'VERIFIED',
        type: { in: ['PHONE', 'EMAIL'] },
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) }, // within last 1 hour
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check verification inputs
    const hasOtp = !!recentOtpEvidence || !!otpVerified;
    const hasGoogle = !!(google?.gbpUrl && google.gbpUrl.trim().length > 0);
    const hasDocuments = !!(documents?.urls && documents.urls.length > 0);
    const hasEvidenceId = !!verificationEvidenceId;

    if (!hasOtp && !hasEvidenceId && !hasDocuments && !hasGoogle) {
      return NextResponse.json(
        {
          error:
            'Please verify your business using one of the methods (phone/email code, Google profile, or document upload).',
        },
        { status: 400 },
      );
    }

    // Prevent duplicate pending claims by the same user for the same tenant
    const existingPending = await db.claimRequest.findFirst({
      where: {
        tenantId,
        claimantUserId: user.id,
        status: { in: ['pending', 'auto_approved', 'approved'] },
      },
    });
    if (existingPending) {
      return NextResponse.json(
        {
          error: 'You already have an active claim request for this business',
          requestId: existingPending.id,
        },
        { status: 409 },
      );
    }

    // ── Determine verification method + status ────────────────────────────
    let verificationMethod: string = 'manual';
    let verificationData: Record<string, unknown> = {};
    let status: 'pending' | 'auto_approved' = 'pending';

    if (recentOtpEvidence || (otpVerified && hasOtp)) {
      // ── Method 1: Instant Anchor OTP Verification ──
      const channelType = recentOtpEvidence?.type || 'PHONE';
      verificationMethod = channelType.toLowerCase();
      status = 'auto_approved';
      verificationData = {
        evidenceId: recentOtpEvidence?.id || null,
        channel: channelType,
        verifiedAt: recentOtpEvidence?.verifiedAt?.toISOString() || new Date().toISOString(),
        verifiedById: user.id,
      };
    } else if (verificationEvidenceId) {
      // ── Method 2: Google OAuth / Business Evidence ──
      verificationMethod = 'google';
      const evidence = await db.verificationEvidence.findUnique({
        where: { id: verificationEvidenceId },
        select: {
          id: true,
          tenantId: true,
          type: true,
          status: true,
          target: true,
          metadata: true,
          verifiedById: true,
          createdAt: true,
          verifiedAt: true,
        },
      });

      if (!evidence) {
        return NextResponse.json(
          { error: 'Verification evidence not found. Please complete the Google verification first.' },
          { status: 400 },
        );
      }

      if (evidence.tenantId !== tenantId) {
        return NextResponse.json(
          { error: 'Verification evidence does not belong to this business.' },
          { status: 403 },
        );
      }

      const evidenceMeta = JSON.parse(evidence.metadata || '{}') as {
        matchScore?: number;
        accessRole?: string;
      };

      verificationData = {
        evidenceId: evidence.id,
        matchScore: evidenceMeta.matchScore ?? 0,
        accessRole: evidenceMeta.accessRole ?? 'UNKNOWN',
        googleLocationTitle: evidence.target,
        verifiedAt: evidence.verifiedAt || evidence.createdAt,
      };

      if (evidence.status === 'VERIFIED') {
        status = 'auto_approved';
      } else if (evidence.status === 'PENDING') {
        status = 'pending';
      } else {
        return NextResponse.json(
          { error: `Google verification was not successful (status: ${evidence.status}). Please try again or use document verification.` },
          { status: 400 },
        );
      }
    } else if (hasDocuments) {
      // ── Method 3: Document Upload ──
      verificationMethod = 'document';
      verificationData = {
        documentUrls: documents!.urls,
        note: documents!.note ?? '',
      };
      status = 'pending';
    } else if (hasGoogle) {
      // ── Method 4: Manual Fallback ──
      verificationMethod = 'manual';
      verificationData = {
        note: String(google?.gbpUrl || '').replace(/^MANUAL_VERIFICATION:\s*/, ''),
        type: 'manual_google_fallback',
      };
      status = 'pending';
    }

    // ── Generate completion token (for auto-approved only) ────────────────
    const completionToken = status === 'auto_approved' ? generateClaimToken() : null;

    // ── Create the claim request ──────────────────────────────────────────
    const claimRequest = await db.claimRequest.create({
      data: {
        tenantId,
        claimantUserId: user.id,
        claimantEmail,
        completionToken,
        verificationMethod,
        verificationData: JSON.stringify(verificationData),
        status,
      },
    });

    const appUrl = getAppUrl(request);

    // ── Phase 4.1: DO NOT set tenant.claimed=true at auto-approve time ──
    // Previously this set tenant.claimed=true immediately. If the email was
    // lost or the token expired, the listing was stuck "claimed" with no
    // completed owner account. Now: only set status='auto_approved' + send
    // the email. The tenant is claimed at completion (claim/complete POST).
    if (status === 'auto_approved' && completionToken) {
      // Record the Google Business URL for reference, but DO NOT mark claimed
      if (verificationMethod === 'google') {
        await db.tenant.update({
          where: { id: tenantId },
          data: {
            googleBusinessProfileUrl: String(google!.gbpUrl),
          },
        });
      }

      const emailCtx: ClaimEmailContext = {
        businessName: tenant.name,
        claimantEmail,
        requestId: claimRequest.id,
        completionToken,
        appUrl,
      };
      await sendClaimApprovedEmail(emailCtx);
    } else {
      // ── Pending review path: send "under review" confirmation email ─────
      const emailCtx: ClaimEmailContext = {
        businessName: tenant.name,
        claimantEmail,
        requestId: claimRequest.id,
        appUrl,
      };
      await sendClaimUnderReviewEmail(emailCtx);
    }

    logger.info(
      {
        component: 'claim',
        requestId: claimRequest.id,
        tenantId,
        method: verificationMethod,
        status,
      },
      'Claim request created',
    );

    return NextResponse.json({
      requestId: claimRequest.id,
      status,
      completionToken: completionToken || undefined,
      message:
        status === 'auto_approved'
          ? 'Claim approved! You can now manage your business listing.'
          : 'Your claim has been submitted for review. We sent a confirmation email — you\'ll hear back within 1-2 business days.',
    });
  } catch (err) {
    logger.error({ component: 'claim', err }, 'Claim request failed');
    return NextResponse.json(
      { error: 'Failed to submit claim request' },
      { status: 500 },
    );
  }
}

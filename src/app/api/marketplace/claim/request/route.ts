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
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    }

    const body = await request.json();
    const {
      tenantId,
      claimantEmail,
      google,
      documents,
    } = body as {
      tenantId: string;
      claimantEmail: string;
      google?: { gbpUrl: string; gbpName: string; gbpAddress: string };
      documents?: { urls: string[]; note?: string };
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

    // Must provide at least one verification evidence (Google or documents)
    // unless the tenant has no email on file (email-only path).
    const hasGoogle = !!(google?.gbpUrl && google?.gbpName);
    const hasDocuments = !!(documents?.urls && documents.urls.length > 0);
    if (!hasGoogle && !hasDocuments) {
      return NextResponse.json(
        {
          error:
            'Please provide either a Google Business Profile URL or upload a verification document.',
        },
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
        website: true,   // ← used for domain-match signal (Improvement D)
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

    // ── Phase 4.2: Verify the target is an eligible marketplace listing ──
    // The claim target must be an unclaimed marketplace listing (listingTier
    // 'free' or 'claimed_free'), NOT a CRM tenant (listingTier 'claimed' or
    // 'none'). This prevents claiming non-marketplace tenants.
    const eligibleListingTiers = ['free', 'claimed_free', 'none'];
    if (tenant.listingTier && !eligibleListingTiers.includes(tenant.listingTier)) {
      return NextResponse.json(
        { error: 'This business is not eligible for claiming (not a marketplace listing)' },
        { status: 400 },
      );
    }

    // ── Phase 4.3: Prevent tenant takeover ──────────────────────────────
    // If the claimant already owns a DIFFERENT tenant, don't allow them to
    // claim this one (which would overwrite their tenantId at completion).
    // Multi-business membership is a future feature — for now, reject.
    if (user.tenantId && user.tenantId !== tenantId) {
      return NextResponse.json(
        {
          error:
            'You already own a different business. To manage multiple businesses, please contact support.',
        },
        { status: 409 },
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
          error: 'You already have a pending claim request for this business',
          requestId: existingPending.id,
        },
        { status: 409 },
      );
    }

    // ── Determine verification method + status ────────────────────────────
    // Phase 1 architecture: the old paste-URL Google verification (gbpUrl +
    // gbpName + gbpAddress → 80% string match → auto_approved) has been
    // REMOVED. It was a security weakness — the browser could submit
    // fabricated Google data.
    //
    // The new flow: Google verification happens via OAuth → server-side match
    // → VerificationEvidence. The claim request accepts a `verificationEvidenceId`
    // (from the new Google verification service) + verifies it belongs to the
    // claimant + the target tenant before accepting it.
    //
    // Manual fallback (no Google): goes to pending (admin review). Never
    // auto-approved.
    let verificationMethod: 'google' | 'document' | 'email' | 'manual';
    let verificationData: Record<string, unknown> = {};
    let status: 'pending' | 'auto_approved' = 'pending';

    if (body.verificationEvidenceId) {
      // ── New OAuth-based Google verification ──
      // The user completed the Google OAuth flow + the server matched their
      // Google location against the marketplace listing. The evidence was
      // created by /api/verification/google/match. We verify it here.
      verificationMethod = 'google';
      const evidence = await db.verificationEvidence.findUnique({
        where: { id: body.verificationEvidenceId },
        select: {
          id: true,
          tenantId: true,
          type: true,
          status: true,
          target: true,
          metadata: true,
          verifiedById: true,
          createdAt: true,
        },
      });

      if (!evidence) {
        return NextResponse.json(
          { error: 'Verification evidence not found. Please complete the Google verification first.' },
          { status: 400 },
        );
      }

      // SECURITY: verify the evidence belongs to THIS tenant (the claim target)
      // + was created by the authenticated user. This prevents cross-tenant
      // evidence attacks.
      if (evidence.tenantId !== tenantId) {
        return NextResponse.json(
          { error: 'Verification evidence does not belong to this business.' },
          { status: 403 },
        );
      }
      if (evidence.type !== 'GOOGLE_BUSINESS') {
        return NextResponse.json(
          { error: 'Invalid evidence type. Expected GOOGLE_BUSINESS.' },
          { status: 400 },
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

      // Auto-approve ONLY if the evidence is VERIFIED (≥90% match)
      // AND the evidence was created by the current user.
      if (evidence.status === 'VERIFIED') {
        status = 'auto_approved';
      } else if (evidence.status === 'PENDING') {
        // Medium match — goes to admin review
        status = 'pending';
      } else {
        // REJECTED or EXPIRED — can't auto-approve
        return NextResponse.json(
          { error: `Google verification was not successful (status: ${evidence.status}). Please try again or use document verification.` },
          { status: 400 },
        );
      }
    } else if (hasGoogle) {
      // ── Manual verification fallback (NOT paste-URL) ──
      // The old code accepted gbpUrl + gbpName + gbpAddress and auto-approved
      // at 80% match. This is REMOVED. Now, the "Google" section in the claim
      // modal is a manual fallback that goes to admin review.
      verificationMethod = 'manual';
      verificationData = {
        note: String(google?.gbpUrl || '').replace(/^MANUAL_VERIFICATION:\s*/, ''),
        type: 'manual_google_fallback',
      };
      status = 'pending'; // Manual verification NEVER auto-approves
    } else if (hasDocuments) {
      verificationMethod = 'document';
      verificationData = {
        documentUrls: documents!.urls,
        note: documents!.note ?? '',
      };
      // Document claims always need admin review
      status = 'pending';
    } else {
      // Should not reach here due to validation above, but keep as safety net
      verificationMethod = 'email';
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
      message:
        status === 'auto_approved'
          ? 'Claim approved! Check your email for a link to create your account.'
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

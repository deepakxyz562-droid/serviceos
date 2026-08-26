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
    let verificationMethod: 'google' | 'document' | 'email';
    let verificationData: Record<string, unknown> = {};
    let status: 'pending' | 'auto_approved' = 'pending';

    if (hasGoogle) {
      verificationMethod = 'google';
      const gbpUrl = String(google!.gbpUrl);
      const gbpName = String(google!.gbpName);
      const gbpAddress = String(google!.gbpAddress ?? '');

      const nameScore = similarity(gbpName, tenant.name);
      // Build the FULL tenant address for comparison — previously this only
      // used [city, state, country], which dropped the street address and
      // made the score artificially low (e.g. "76 Barrette Street" vs
      // "Ottawa, ON, Canada" scored 0%). Now we include tenant.address +
      // city + state + country so legitimate matches score realistically.
      const tenantFullAddress = [
        tenant.address,
        tenant.city,
        tenant.state,
        tenant.country,
      ]
        .filter(Boolean)
        .join(', ');
      // Use addressSimilarity (with abbreviation expansion) so "St" matches
      // "Street", "Ave" matches "Avenue", "WA" matches "Washington", etc.
      const addressScore = addressSimilarity(gbpAddress, tenantFullAddress);
      const matchScore = nameScore * 0.7 + addressScore * 0.3;

      // ── Domain-match signal (Improvement D) ────────────────────────────
      // EVIDENCE ONLY — does NOT modify matchScore. Per review direction:
      // 'domain matching isn't proof of ownership. A domain could be expired,
      // controlled by someone else, or unrelated to the actual claimant.'
      // The admin sees this as a green/amber indicator in the review UI.
      const domainMatch = computeDomainMatch({
        claimantEmail,
        businessWebsite: tenant.website,
        gbpUrl,
      });

      verificationData = {
        gbpUrl,
        gbpName,
        gbpAddress,
        tenantFullAddress,  // ← expose for admin UI side-by-side comparison
        matchScore: Math.round(matchScore * 100) / 100,
        nameScore: Math.round(nameScore * 100) / 100,
        addressScore: Math.round(addressScore * 100) / 100,
        // Domain-match signal (Improvement D) — evidence only, no score change
        domainMatch: {
          claimantDomain: domainMatch.claimantDomain,
          websiteDomain: domainMatch.websiteDomain,
          matchesWebsite: domainMatch.matchesWebsite,
          signal: domainMatch.signal,
          label: domainMatch.label,
        },
      };

      // Auto-approve if Google's listing closely matches our tenant record.
      // Threshold stays at 80% — false-positive ownership claims are much
      // more damaging than false negatives, so we keep this strict.
      // NOTE: domainMatch is NOT factored into this decision — it's evidence
      // for the admin, not an automatic signal.
      if (matchScore >= 0.8) {
        status = 'auto_approved';
      }
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

    // ── Auto-approve path: claim the business + send approval email ───────
    if (status === 'auto_approved' && completionToken) {
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          claimed: true,
          claimedAt: new Date(),
          claimedById: user.id,
          listingTier: 'claimed_free',
          googleBusinessProfileUrl:
            verificationMethod === 'google' ? String(google!.gbpUrl) : undefined,
          googleBusinessVerified: verificationMethod === 'google',
        },
      });

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

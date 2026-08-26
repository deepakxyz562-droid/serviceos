/**
 * domain-match.ts
 * ===============
 *
 * Shared domain-match signal for marketplace business-claim verification.
 *
 * PURPOSE
 * -------
 * When a user files a business-claim, we extract the domain from their
 * claimant email (e.g. `hello@pestpass.ca` → `pestpass.ca`) and compare it
 * against the domain of:
 *   1. The business's website (Tenant.website), AND/OR
 *   2. The Google Business Profile URL the claimant submitted
 *
 * If they match, that's a strong supporting signal that the claimant
 * actually owns/controls the business. If they don't match, it's a flag
 * for the admin to investigate (but NOT an automatic rejection — the
 * business might use a different domain for email vs website).
 *
 * IMPORTANT (per review direction):
 * --------------------------------
 * Domain match is SUPPORTING EVIDENCE ONLY. It does NOT modify the matchScore.
 * A matching domain is not proof of ownership — a domain could be expired,
 * controlled by someone else, or unrelated to the actual claimant. The admin
 * should see multiple independent signals (name match, address match, domain
 * match, claim history) and make the final call.
 *
 * SUBDOMAIN HANDLING
 * ------------------
 * `mail.pestpass.ca` and `pestpass.ca` are treated as a match (subdomain of
 * the same registered domain). `pestpass.ca` and `pestpass.com` are NOT a
 * match (different TLDs). `pestpass.ca` and `blog.pestpass.ca` match.
 *
 * USAGE
 * -----
 *   import { computeDomainMatch, extractDomain } from '@/lib/emails/domain-match';
 *
 *   const signal = computeDomainMatch({
 *     claimantEmail: 'hello@pestpass.ca',
 *     businessWebsite: 'https://www.pestpass.ca',
 *     gbpUrl: 'https://maps.google.com/...',
 *   });
 *   // → { claimantDomain: 'pestpass.ca', websiteDomain: 'pestpass.ca',
 *   //    gbpDomain: null, matchesWebsite: true, matchesGbp: null,
 *   //    signal: 'positive' }
 */

export interface DomainMatchInput {
  /** The claimant's email (e.g. 'hello@pestpass.ca'). */
  claimantEmail: string | null | undefined;
  /** The Tenant.website URL (e.g. 'https://www.pestpass.ca'). */
  businessWebsite?: string | null;
  /** The Google Business Profile URL submitted by the claimant. */
  gbpUrl?: string | null;
}

export interface DomainMatchResult {
  /** Domain extracted from claimantEmail (e.g. 'pestpass.ca'), or null. */
  claimantDomain: string | null;
  /** Domain extracted from businessWebsite, or null. */
  websiteDomain: string | null;
  /** Domain extracted from gbpUrl, or null. Google Maps URLs don't carry
   * the business's domain, so this is usually null. */
  gbpDomain: string | null;
  /** True if claimantDomain matches websiteDomain (subdomain-aware). */
  matchesWebsite: boolean;
  /** True if claimantDomain matches gbpDomain (subdomain-aware). Usually
   * false because GBP URLs are google.com/maps... */
  matchesGbp: boolean;
  /** Overall signal: 'positive' (matches website), 'negative' (doesn't match),
   *  'neutral' (no website to compare against). */
  signal: 'positive' | 'negative' | 'neutral';
  /** Human-readable label for the admin UI. */
  label: string;
}

/**
 * Extract the registered domain from a URL or bare domain string.
 * Strips protocol, path, port, and leading 'www.'.
 *
 *   'https://www.pestpass.ca/about' → 'pestpass.ca'
 *   'pestpass.ca'                   → 'pestpass.ca'
 *   'https://mail.pestpass.ca'      → 'mail.pestpass.ca'  (subdomain kept)
 *   'not a url'                     → null
 */
export function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase();
    if (!host) return null;
    // Strip leading www. but keep other subdomains (mail., blog., etc.)
    // so the subdomain-aware match can still detect them.
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return null;
  }
}

/**
 * Extract the domain from an email address.
 *   'hello@pestpass.ca' → 'pestpass.ca'
 *   'not-an-email'      → null
 */
export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return domain || null;
}

/**
 * Check if two domains are a subdomain-aware match.
 *
 *   'pestpass.ca' vs 'pestpass.ca'       → true
 *   'mail.pestpass.ca' vs 'pestpass.ca'  → true  (subdomain of pestpass.ca)
 *   'pestpass.ca' vs 'mail.pestpass.ca'  → true  (reverse direction also matches)
 *   'pestpass.ca' vs 'pestpass.com'      → false (different TLD)
 *   'pestpass.ca' vs 'gmail.com'         → false
 */
export function domainsMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Check if one is a subdomain of the other.
  // 'mail.pestpass.ca'.endsWith('.pestpass.ca') → true
  if (a.endsWith(`.${b}`)) return true;
  if (b.endsWith(`.${a}`)) return true;
  return false;
}

/**
 * Compute the full domain-match signal for a claim.
 *
 * Per review direction: this is EVIDENCE ONLY. The caller MUST NOT use the
 * result to modify the matchScore. The admin UI shows the signal as a
 * green checkmark (positive) or amber warning (negative) so the admin can
 * factor it into their decision.
 */
export function computeDomainMatch(input: DomainMatchInput): DomainMatchResult {
  const claimantDomain = extractEmailDomain(input.claimantEmail);
  const websiteDomain = extractDomain(input.businessWebsite);
  const gbpDomain = extractDomain(input.gbpUrl);

  const matchesWebsite = domainsMatch(claimantDomain, websiteDomain);
  const matchesGbp = domainsMatch(claimantDomain, gbpDomain);

  // Signal is 'positive' only if the claimant domain matches the website.
  // GBP URLs are usually google.com/maps/... so gbpDomain is null and we
  // can't get a meaningful signal from them.
  let signal: 'positive' | 'negative' | 'neutral';
  let label: string;

  if (!websiteDomain) {
    // No website to compare against — can't make a determination.
    signal = 'neutral';
    label = 'No business website on file';
  } else if (matchesWebsite) {
    signal = 'positive';
    label = `Email domain matches business website (${websiteDomain})`;
  } else {
    signal = 'negative';
    label = `Email domain (${claimantDomain}) doesn't match website (${websiteDomain})`;
  }

  return {
    claimantDomain,
    websiteDomain,
    gbpDomain,
    matchesWebsite,
    matchesGbp,
    signal,
    label,
  };
}

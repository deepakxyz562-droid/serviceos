/**
 * Social Publishing — PKCE (Proof Key for Code Exchange) Helpers
 * --------------------------------------------------------------
 *
 * Used by the X (Twitter) OAuth 2.0 flow. PKCE prevents authorization-code
 * interception attacks: the client generates a high-entropy `code_verifier`,
 * sends its SHA-256 hash (`code_challenge`) to the auth server at consent
 * time, then presents the original `code_verifier` at token-exchange time.
 * An attacker who intercepts the auth code can't redeem it without the
 * `code_verifier`, which never left the client.
 *
 * RFC 7636:
 *   - code_verifier: 43-128 chars of [A-Z][a-z][0-9] - . _ ~
 *   - code_challenge: base64url(sha256(code_verifier)) — no padding
 *   - code_challenge_method: "S256" (we don't support "plain")
 *
 * This module is server-only — it imports Node's `crypto`. Don't import
 * from a client component.
 */
import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically-secure PKCE code_verifier.
 *
 * Returns a 96-character string of [A-Z][a-z][0-9] (URL-safe subset of the
 * RFC 7636 unreserved characters). 96 chars > the 43-char minimum and
 * < the 128-char maximum, giving ~574 bits of entropy — far more than the
 * 128-bit minimum recommended for cryptographic randomness.
 *
 * Implementation: take 72 random bytes (576 bits) and base64url-encode them
 * → 96 chars. base64url output is URL-safe so it survives in query strings
 * without further escaping.
 */
export function generatePkceVerifier(): string {
  return randomBytes(72).toString('base64url');
}

/**
 * Compute the PKCE code_challenge from a code_verifier.
 *
 *   code_challenge = base64url( sha256( code_verifier ) )
 *
 * base64url uses `-` and `_` instead of `+` and `/`, with no `=` padding
 * (the RFC requires padding to be stripped).
 */
export function computePkceChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

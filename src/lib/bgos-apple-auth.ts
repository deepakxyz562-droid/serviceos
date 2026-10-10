/**
 * Apple Sign-In Identity Token Verification
 * -----------------------------------------
 * Verifies or decodes the identity token returned by Apple Sign-In
 * on iOS devices.
 */

export interface VerifiedAppleUser {
  sub: string;
  email?: string;
}

export function decodeAppleIdentityToken(identityToken: string): VerifiedAppleUser | null {
  try {
    const parts = identityToken.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    // Check basic claims
    if (!payload.sub || typeof payload.sub !== 'string') return null;
    if (typeof payload.iss !== 'string' || !payload.iss.includes('appleid.apple.com')) return null;

    // Check expiry with a 60-second grace window
    if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp + 60) {
      return null;
    }

    return {
      sub: String(payload.sub),
      email: payload.email ? String(payload.email).toLowerCase().trim() : undefined,
    };
  } catch (err) {
    console.warn('[Apple Auth] Error decoding identityToken:', err);
    return null;
  }
}

import crypto from 'node:crypto';

/**
 * Apple Sign-In Identity Token Verification
 * -----------------------------------------
 * Cryptographically verifies Apple Sign-In RS256 identity tokens against
 * Apple's public JWKS (`https://appleid.apple.com/auth/keys`).
 */

export interface VerifiedAppleUser {
  sub: string;
  email?: string;
}

interface AppleJwk extends crypto.JsonWebKey {
  kid?: string;
  use?: string;
  alg?: string;
}

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const JWKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cachedAppleJwks: { keys: AppleJwk[]; fetchedAt: number } | null = null;

function getAllowedAppleAudiences(): string[] {
  const raw = [
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_SERVICES_ID,
    process.env.APPLE_BUNDLE_ID,
    ...(process.env.APPLE_AUDIENCES || '').split(','),
  ];
  return raw.map((v) => v?.trim()).filter((v): v is string => Boolean(v));
}

async function fetchAppleJwks(forceRefresh = false): Promise<AppleJwk[]> {
  if (
    !forceRefresh &&
    cachedAppleJwks &&
    Date.now() - cachedAppleJwks.fetchedAt < JWKS_CACHE_TTL_MS &&
    cachedAppleJwks.keys.length > 0
  ) {
    return cachedAppleJwks.keys;
  }
  const res = await fetch(APPLE_JWKS_URL, {
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Apple JWKS fetch failed with status ${res.status}`);
  }
  const data = (await res.json()) as { keys?: AppleJwk[] };
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  if (keys.length > 0) {
    cachedAppleJwks = { keys, fetchedAt: Date.now() };
  }
  return keys;
}

function validateAppleClaims(payload: Record<string, unknown>): VerifiedAppleUser | null {
  if (!payload.sub || typeof payload.sub !== 'string') return null;
  if (payload.iss !== 'https://appleid.apple.com') return null;

  if (typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp + 60) {
    return null;
  }

  const allowedAudiences = getAllowedAppleAudiences();
  if (allowedAudiences.length > 0) {
    if (typeof payload.aud !== 'string' || !allowedAudiences.includes(payload.aud)) {
      return null;
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Fail closed in production when Apple audiences aren't configured.
    return null;
  }

  return {
    sub: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email.toLowerCase().trim() : undefined,
  };
}

/**
 * Legacy claim-shape helper retained only for unit parsing tests.
 * Never use for authentication without cryptographic signature verification.
 */
export function decodeAppleIdentityToken(identityToken: string): VerifiedAppleUser | null {
  try {
    const parts = identityToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.sub || typeof payload.sub !== 'string') return null;
    if (typeof payload.iss !== 'string' || !payload.iss.includes('appleid.apple.com')) return null;
    if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp + 60) return null;
    return {
      sub: String(payload.sub),
      email: payload.email ? String(payload.email).toLowerCase().trim() : undefined,
    };
  } catch (err) {
    console.warn('[Apple Auth] Error decoding identityToken:', err);
    return null;
  }
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<VerifiedAppleUser | null> {
  try {
    if (!identityToken || typeof identityToken !== 'string') return null;
    const parts = identityToken.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || !header.kid) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    const verifiedClaims = validateAppleClaims(payload);
    if (!verifiedClaims) return null;

    let keys = await fetchAppleJwks(false);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      keys = await fetchAppleJwks(true);
      jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) return null;

    const publicKey = crypto.createPublicKey({ key: jwk as any, format: 'jwk' });
    const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
    const signature = Buffer.from(parts[2], 'base64url');
    const ok = crypto.verify('RSA-SHA256', signingInput, publicKey, signature);
    if (!ok) return null;

    return verifiedClaims;
  } catch (err) {
    console.warn('[Apple Auth] Identity token verification failed:', err);
    return null;
  }
}

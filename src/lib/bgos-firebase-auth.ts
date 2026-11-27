import crypto from 'node:crypto';

/**
 * Firebase Phone ID Token Verification (BGOS Mobile & Web)
 * --------------------------------------------------------
 * Cryptographically verifies Firebase RS256 ID tokens against Google's official
 * SecureToken JWKS (`securetoken@system.gserviceaccount.com`), validating `iss`,
 * `aud`, `exp`, `sub`, and `phone_number`, with fallback/cross-check via Google
 * Identity Toolkit `accounts:lookup` using the public BGOS client Web API key.
 */

export const DEFAULT_BGOS_FIREBASE_PROJECT_ID = 'fir-rn-49534';
export const DEFAULT_BGOS_FIREBASE_WEB_API_KEY = 'AIzaSyDLMfL0psz7RPx_V9BC0q9nLSV5bj5V930';

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface FirebaseJwk extends crypto.JsonWebKey {
  kid?: string;
  use?: string;
  alg?: string;
}

interface FirebaseLookupUser {
  localId: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
}

interface FirebaseLookupResponse {
  users?: FirebaseLookupUser[];
  error?: { message: string; code: number };
}

export interface VerifiedFirebasePhoneUser {
  uid: string;
  phoneNumber: string;
  email?: string;
}

let cachedFirebaseJwks: { keys: FirebaseJwk[]; fetchedAt: number } | null = null;

export function resetFirebaseJwksCacheForTest(): void {
  cachedFirebaseJwks = null;
}

export function resolveBgosFirebaseConfig(): {
  apiKey: string;
  allowedProjectIds: string[];
} {
  const apiKey = (
    process.env.BGOS_FIREBASE_WEB_API_KEY ||
    process.env.NEXT_PUBLIC_BGOS_FIREBASE_API_KEY ||
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    DEFAULT_BGOS_FIREBASE_WEB_API_KEY
  ).trim();

  const projectCandidates = [
    process.env.BGOS_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_BGOS_FIREBASE_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    DEFAULT_BGOS_FIREBASE_PROJECT_ID,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));

  return {
    apiKey: apiKey || DEFAULT_BGOS_FIREBASE_WEB_API_KEY,
    allowedProjectIds: Array.from(new Set(projectCandidates)),
  };
}

async function fetchFirebaseJwks(forceRefresh = false): Promise<FirebaseJwk[]> {
  if (
    !forceRefresh &&
    cachedFirebaseJwks &&
    Date.now() - cachedFirebaseJwks.fetchedAt < JWKS_CACHE_TTL_MS &&
    cachedFirebaseJwks.keys.length > 0
  ) {
    return cachedFirebaseJwks.keys;
  }

  const res = await fetch(FIREBASE_JWKS_URL, {
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Firebase JWKS fetch failed with status ${res.status}`);
  }
  const data = (await res.json()) as { keys?: FirebaseJwk[] };
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  if (keys.length > 0) {
    cachedFirebaseJwks = { keys, fetchedAt: Date.now() };
  }
  return keys;
}

function verifyRs256Signature(
  signingInput: string,
  encodedSignature: string,
  jwk: FirebaseJwk,
): boolean {
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const signatureBytes = Buffer.from(encodedSignature, 'base64url');
  return crypto.verify('RSA-SHA256', Buffer.from(signingInput, 'utf8'), publicKey, signatureBytes);
}

async function verifyViaGoogleJwks(
  header: { alg?: unknown; kid?: unknown },
  signingInput: string,
  encodedSignature: string,
): Promise<boolean> {
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    return false;
  }

  let keys = await fetchFirebaseJwks(false);
  let matchedKey = keys.find((k) => k.kid === header.kid);
  if (!matchedKey) {
    keys = await fetchFirebaseJwks(true);
    matchedKey = keys.find((k) => k.kid === header.kid);
  }
  if (!matchedKey) {
    return false;
  }

  return verifyRs256Signature(signingInput, encodedSignature, matchedKey);
}

async function lookupViaIdentityToolkit(
  idToken: string,
  apiKey: string,
): Promise<FirebaseLookupUser | null> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.warn('[Firebase Auth] accounts:lookup rejected token:', response.status, errText);
    return null;
  }

  const data = (await response.json()) as FirebaseLookupResponse;
  const user = data.users?.[0];
  return user && user.localId ? user : null;
}

/**
 * Verify Firebase Phone ID token cryptographically (RS256 SecureToken JWKS)
 * with claim checks (`iss`, `aud`, `exp`, `sub`, `phone_number`) and
 * Identity Toolkit `accounts:lookup` verification/fallback.
 */
export async function verifyFirebasePhoneIdToken(
  idToken: string,
): Promise<VerifiedFirebasePhoneUser | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  const parts = idToken.trim().split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;

  let header: { alg?: unknown; kid?: unknown };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
      alg?: unknown;
      kid?: unknown;
    };
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }

  if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') {
    return null;
  }

  const { apiKey, allowedProjectIds } = resolveBgosFirebaseConfig();

  if (typeof payload.aud !== 'string' || !allowedProjectIds.includes(payload.aud)) {
    console.warn('[Firebase Auth] Audience mismatch:', {
      aud: payload.aud,
      allowedProjectIds,
    });
    return null;
  }

  const expectedIssuer = `https://securetoken.google.com/${payload.aud}`;
  if (payload.iss !== expectedIssuer) {
    console.warn('[Firebase Auth] Issuer mismatch:', {
      iss: payload.iss,
      expectedIssuer,
    });
    return null;
  }

  if (typeof payload.sub !== 'string' || !payload.sub.trim() || payload.sub.length > 128) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || nowSeconds > payload.exp + 60) {
    console.warn('[Firebase Auth] Token expired:', { exp: payload.exp, nowSeconds });
    return null;
  }

  // 1. Primary: Cryptographic RS256 verification against Google SecureToken JWKS
  let jwksVerified = false;
  try {
    jwksVerified = await verifyViaGoogleJwks(header, `${parts[0]}.${parts[1]}`, parts[2]);
  } catch (err) {
    console.warn('[Firebase Auth] JWKS check failed, falling back to Identity Toolkit lookup:', err);
  }

  const claimPhone =
    typeof payload.phone_number === 'string' && payload.phone_number.trim()
      ? payload.phone_number.trim()
      : '';
  const claimEmail =
    typeof payload.email === 'string' && payload.email.trim() ? payload.email.trim() : undefined;

  if (jwksVerified && claimPhone) {
    return {
      uid: payload.sub,
      phoneNumber: claimPhone,
      email: claimEmail,
    };
  }

  // 2. Fallback / Phone resolution: Google Identity Toolkit accounts:lookup
  try {
    const lookupUser = await lookupViaIdentityToolkit(idToken.trim(), apiKey);
    if (!lookupUser) return null;

    if (
      lookupUser.localId !== payload.sub ||
      (typeof payload.user_id === 'string' && payload.user_id !== lookupUser.localId)
    ) {
      console.warn('[Firebase Auth] UID mismatch between token claims and lookup');
      return null;
    }

    const verifiedPhone = (lookupUser.phoneNumber || claimPhone || '').trim();
    if (!verifiedPhone) {
      console.warn('[Firebase Auth] No phone number present in token or lookup');
      return null;
    }

    return {
      uid: lookupUser.localId,
      phoneNumber: verifiedPhone,
      email: lookupUser.email || claimEmail,
    };
  } catch (err) {
    console.error('[Firebase Auth] Identity Toolkit verification error:', err);
    return null;
  }
}

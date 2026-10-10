import { createHash, randomBytes } from 'node:crypto';
import { encryptToken, decryptToken } from '@/lib/social/crypto';
import { getAppUrl } from '@/lib/auth';

export const MOBILE_RETURN = 'bgos://auth-callback';
export const MOBILE_COOKIE = 'bgos-mobile-oauth';
const PURPOSE = 'bgos-mobile-google-v1';
export const challengeFor = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
export const randomVerifier = () => randomBytes(32).toString('base64url');
export function callbackUrl() { return `${getAppUrl().replace(/\/+$/, '')}/api/auth/google/callback`; }
export function mobileAuthConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET &&
    (process.env.SOCIAL_CRYPTO_KEY || process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET));
}
export type MobileState = { nonce: string; challenge: string; verifier: string; expires: number; code?: string };
export function sealMobileState(state: MobileState) {
  if (!mobileAuthConfigured()) throw new Error('Google sign-in is not configured');
  return encryptToken(JSON.stringify({ ...state, purpose: PURPOSE }));
}
export function readMobileState(value: string): MobileState | null {
  try {
    if (!mobileAuthConfigured() || value.length > 12000) return null;
    const state = JSON.parse(decryptToken(value));
    if (state.purpose !== PURPOSE || !Number.isFinite(state.expires) || state.expires <= Date.now()
      || !/^[\w-]{43}$/.test(state.challenge) || !/^[\w-]{43}$/.test(state.verifier)
      || !/^[\w-]{43}$/.test(state.nonce)) return null;
    return state;
  } catch { return null; }
}

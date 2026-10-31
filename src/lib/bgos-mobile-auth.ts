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

const HANDOFF_PURPOSE = 'bgos-mobile-handoff-v1';
export type HandoffPayload = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  expires: number;
  nonce: string;
};

export function sealHandoffTicket(payload: { userId: string; tenantId: string; role: string; email: string }): string {
  const nonce = randomBytes(16).toString('hex');
  const expires = Date.now() + 60 * 1000; // 60 seconds single-use TTL
  return encryptToken(JSON.stringify({ ...payload, nonce, expires, purpose: HANDOFF_PURPOSE }));
}

export function verifyHandoffTicket(ticket: string): { userId: string; tenantId: string; role: string; email: string; id: string } | null {
  try {
    if (!ticket || ticket.length > 4096) return null;
    const data = JSON.parse(decryptToken(ticket));
    if (data.purpose !== HANDOFF_PURPOSE || !Number.isFinite(data.expires) || data.expires <= Date.now()) {
      return null;
    }
    if (!data.userId || !data.tenantId) return null;
    return {
      id: data.userId,
      userId: data.userId,
      tenantId: data.tenantId,
      role: data.role || 'owner',
      email: data.email || '',
    };
  } catch {
    return null;
  }
}

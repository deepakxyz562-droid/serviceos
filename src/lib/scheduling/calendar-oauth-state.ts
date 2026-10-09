import { randomBytes, createHash } from 'node:crypto';
import { encryptToken, decryptToken } from '@/lib/social/crypto';
import type { NextRequest, NextResponse } from 'next/server';
export function createCalendarState(userId: string, tenantId: string) {
  if (process.env.NODE_ENV === 'production' && !process.env.SOCIAL_CRYPTO_KEY && !process.env.ENCRYPTION_KEY && !process.env.NEXTAUTH_SECRET) throw new Error('Token encryption must be configured');
  const nonce = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  return { nonce, verifier, challenge: createHash('sha256').update(verifier).digest('base64url'), cookie: encryptToken(JSON.stringify({ nonce, verifier, userId, tenantId, expires: Date.now()+600000 })) };
}
export function setCalendarState(response: NextResponse, provider: string, value: string) {
  response.cookies.set(`bgos-calendar-${provider}`, value, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/api/auth', maxAge:600 });
}
export function verifyCalendarState(request: NextRequest, provider: string, userId: string, tenantId: string) {
  try {
    const cookie = request.cookies.get(`bgos-calendar-${provider}`)?.value;
    if (!cookie) return null;
    const saved = JSON.parse(decryptToken(cookie));
    if (saved.userId !== userId || saved.tenantId !== tenantId || saved.nonce !== request.nextUrl.searchParams.get('state') || saved.expires < Date.now()) return null;
    return saved as { verifier: string };
  } catch { return null; }
}

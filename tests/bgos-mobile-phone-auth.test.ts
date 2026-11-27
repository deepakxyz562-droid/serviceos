import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BGOS_FIREBASE_PROJECT_ID,
  resetFirebaseJwksCacheForTest,
  verifyFirebasePhoneIdToken,
} from '@/lib/bgos-firebase-auth';

function signJwt(
  payload: Record<string, unknown>,
  privateKey: crypto.KeyObject,
  kid = 'fb_key_1',
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${header}.${body}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput, 'utf8'), privateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

describe('BGOS Mobile Firebase Phone Token Verification', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = {
    ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>),
    kid: 'fb_key_1',
    alg: 'RS256',
    use: 'sig',
  };

  beforeEach(() => {
    resetFirebaseJwksCacheForTest();
    vi.restoreAllMocks();
    delete process.env.BGOS_FIREBASE_WEB_API_KEY;
    delete process.env.NEXT_PUBLIC_BGOS_FIREBASE_API_KEY;
    delete process.env.FIREBASE_WEB_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.BGOS_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_BGOS_FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('verifies a valid Firebase phone RS256 ID token in production even with no FIREBASE_* env vars set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes('securetoken@system.gserviceaccount.com')) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: { message: 'unexpected network call' } }), {
          status: 500,
        });
      }),
    );

    const token = signJwt(
      {
        iss: `https://securetoken.google.com/${DEFAULT_BGOS_FIREBASE_PROJECT_ID}`,
        aud: DEFAULT_BGOS_FIREBASE_PROJECT_ID,
        sub: 'fb_uid_12345',
        user_id: 'fb_uid_12345',
        phone_number: '+919876543210',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      privateKey,
    );

    const verified = await verifyFirebasePhoneIdToken(token);
    expect(verified).toEqual({
      uid: 'fb_uid_12345',
      phoneNumber: '+919876543210',
      email: undefined,
    });
  });

  it('rejects tampered signature, wrong audience, and expired Firebase tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes('securetoken@system.gserviceaccount.com')) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: { message: 'INVALID_ID_TOKEN', code: 400 } }), {
          status: 400,
        });
      }),
    );

    const validClaims = {
      iss: `https://securetoken.google.com/${DEFAULT_BGOS_FIREBASE_PROJECT_ID}`,
      aud: DEFAULT_BGOS_FIREBASE_PROJECT_ID,
      sub: 'fb_uid_999',
      phone_number: '+919876543210',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const signed = signJwt(validClaims, privateKey);
    const parts = signed.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...validClaims, phone_number: '+911111111111' }),
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;
    expect(await verifyFirebasePhoneIdToken(tamperedToken)).toBeNull();

    const wrongAudToken = signJwt(
      { ...validClaims, iss: 'https://securetoken.google.com/evil-project', aud: 'evil-project' },
      privateKey,
    );
    expect(await verifyFirebasePhoneIdToken(wrongAudToken)).toBeNull();

    const expiredToken = signJwt(
      { ...validClaims, exp: Math.floor(Date.now() / 1000) - 3600 },
      privateKey,
    );
    expect(await verifyFirebasePhoneIdToken(expiredToken)).toBeNull();
  });

  it('falls back to Google Identity Toolkit accounts:lookup when JWKS fetch is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes('securetoken@system.gserviceaccount.com')) {
          throw new Error('network timeout');
        }
        if (url.includes('identitytoolkit.googleapis.com/v1/accounts:lookup')) {
          return new Response(
            JSON.stringify({
              users: [{ localId: 'fb_uid_lookup', phoneNumber: '+919876543210' }],
            }),
            { status: 200 },
          );
        }
        return new Response(null, { status: 404 });
      }),
    );

    const token = signJwt(
      {
        iss: `https://securetoken.google.com/${DEFAULT_BGOS_FIREBASE_PROJECT_ID}`,
        aud: DEFAULT_BGOS_FIREBASE_PROJECT_ID,
        sub: 'fb_uid_lookup',
        user_id: 'fb_uid_lookup',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      privateKey,
    );

    const verified = await verifyFirebasePhoneIdToken(token);
    expect(verified).toEqual({
      uid: 'fb_uid_lookup',
      phoneNumber: '+919876543210',
      email: undefined,
    });
  });

  it('POST /api/bgos/mobile-auth/phone returns 401 when Firebase token is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 })),
    );
    const { POST } = await import('@/app/api/bgos/mobile-auth/phone/route');
    const req = new NextRequest('http://localhost:3000/api/bgos/mobile-auth/phone', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: 'invalid.jwt.token' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

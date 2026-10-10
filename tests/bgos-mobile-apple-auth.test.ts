import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeAppleIdentityToken } from '@/lib/bgos-apple-auth';

describe('BGOS Apple Auth decoding and validation', () => {
  it('returns null if identityToken is missing or empty', () => {
    expect(decodeAppleIdentityToken('')).toBeNull();
  });

  it('returns null if identityToken does not have 3 parts', () => {
    expect(decodeAppleIdentityToken('abc.def')).toBeNull();
  });

  it('returns null if payload is expired', () => {
    const expiredPayload = {
      iss: 'https://appleid.apple.com',
      sub: 'apple.user.12345',
      email: 'user@privaterelay.appleid.com',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const token = `${header}.${payload}.sig`;

    expect(decodeAppleIdentityToken(token)).toBeNull();
  });

  it('returns null if issuer is not Apple', () => {
    const invalidIssuerPayload = {
      iss: 'https://other-issuer.com',
      sub: 'apple.user.12345',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(invalidIssuerPayload)).toString('base64url');
    const token = `${header}.${payload}.sig`;

    expect(decodeAppleIdentityToken(token)).toBeNull();
  });

  it('successfully decodes valid token payload', () => {
    const validPayload = {
      iss: 'https://appleid.apple.com',
      sub: 'apple.user.98765',
      email: 'alex@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(validPayload)).toString('base64url');
    const token = `${header}.${payload}.sig`;

    const decoded = decodeAppleIdentityToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('apple.user.98765');
    expect(decoded?.email).toBe('alex@example.com');
  });
});

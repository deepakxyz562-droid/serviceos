import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyGoogleToken } from '@/lib/quote-flow-google-auth';
import { canAdminAccessGpsEmployee } from '@/lib/gps-authorization';
import { verifySocialCronAuth } from '@/lib/social/cron-auth';

describe('security hardening regressions', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'approved-client.apps.googleusercontent.com';
    process.env.SOCIAL_PUBLISH_TOKEN = 'social-secret-value';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects a valid Google identity token issued for another application', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      aud: 'attacker-client.apps.googleusercontent.com',
      iss: 'https://accounts.google.com',
      sub: 'google-user-1',
      email: 'owner@example.com',
      email_verified: 'true',
    }), { status: 200 })));

    await expect(verifyGoogleToken('valid-google-token')).resolves.toBeNull();
  });

  it('accepts a verified Google identity token for an approved application', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      aud: 'approved-client.apps.googleusercontent.com',
      iss: 'accounts.google.com',
      sub: 'google-user-1',
      email: 'Owner@Example.com',
      email_verified: true,
      name: 'Owner',
    }), { status: 200 })));

    await expect(verifyGoogleToken('valid-google-token')).resolves.toEqual({
      email: 'owner@example.com',
      name: 'Owner',
      picture: undefined,
      sub: 'google-user-1',
    });
  });

  it('denies GPS access when employee tenant ownership cannot be resolved', async () => {
    const allowed = await canAdminAccessGpsEmployee(
      { isSuperAdmin: false, tenantId: 'tenant-a', workspaceId: null },
      { workspaceId: null, userId: null },
      async () => null,
    );
    expect(allowed).toBe(false);
  });

  it('denies GPS access for a different workspace and permits a platform super-admin', async () => {
    const resolver = vi.fn(async () => 'tenant-a');
    await expect(canAdminAccessGpsEmployee(
      { isSuperAdmin: false, tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      { workspaceId: 'workspace-b', userId: 'employee-user' },
      resolver,
    )).resolves.toBe(false);
    await expect(canAdminAccessGpsEmployee(
      { isSuperAdmin: true, tenantId: null, workspaceId: null },
      { workspaceId: 'workspace-b', userId: 'employee-user' },
      resolver,
    )).resolves.toBe(true);
  });

  it('rejects query-string social cron secrets and accepts header credentials', () => {
    const queryRequest = new NextRequest(
      'http://localhost/api/social/publish-due?token=social-secret-value',
    );
    expect(verifySocialCronAuth(queryRequest)?.status).toBe(401);

    const headerRequest = new NextRequest('http://localhost/api/social/publish-due', {
      headers: { authorization: 'Bearer social-secret-value' },
    });
    expect(verifySocialCronAuth(headerRequest)).toBeNull();
  });

  it('fails closed when the social cron secret is not configured', () => {
    delete process.env.SOCIAL_PUBLISH_TOKEN;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const request = new NextRequest('http://localhost/api/social/publish-due');
    expect(verifySocialCronAuth(request)?.status).toBe(503);
  });
});

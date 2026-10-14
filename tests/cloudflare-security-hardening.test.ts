import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { isMaliciousProbe, proxy } from '@/proxy';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { checkFormSpam } from '@/lib/form-spam-guard';

describe('Cloudflare & Origin Security Hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('isMaliciousProbe', () => {
    it('detects exploit scanners and crawler probes', () => {
      expect(isMaliciousProbe('/.env')).toBe(true);
      expect(isMaliciousProbe('/.env.production')).toBe(true);
      expect(isMaliciousProbe('/.git/config')).toBe(true);
      expect(isMaliciousProbe('/wp-admin/index.php')).toBe(true);
      expect(isMaliciousProbe('/wp-login.php')).toBe(true);
      expect(isMaliciousProbe('/wp-content/themes/exploit.php')).toBe(true);
      expect(isMaliciousProbe('/xmlrpc.php')).toBe(true);
      expect(isMaliciousProbe('/phpmyadmin/index.php')).toBe(true);
      expect(isMaliciousProbe('/actuator/health')).toBe(true);
      expect(isMaliciousProbe('/shell.php')).toBe(true);
      expect(isMaliciousProbe('/admin.asp')).toBe(true);
    });

    it('allows legitimate application routes and static assets', () => {
      expect(isMaliciousProbe('/')).toBe(false);
      expect(isMaliciousProbe('/api/auth/login')).toBe(false);
      expect(isMaliciousProbe('/api/forms/leads')).toBe(false);
      expect(isMaliciousProbe('/dashboard/jobs')).toBe(false);
      expect(isMaliciousProbe('/images/logo.png')).toBe(false);
      expect(isMaliciousProbe('/favicon.ico')).toBe(false);
      // Whitelisted WordPress plugin download for customers
      expect(isMaliciousProbe('/downloads/fieseros-crm-lead-capture.php')).toBe(false);
    });
  });

  describe('proxy middleware defense', () => {
    it('immediately rejects malicious scanner paths with 404', async () => {
      const request = new NextRequest('http://fieseros.com/.env');
      const response = await proxy(request);
      expect(response.status).toBe(404);
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    });

    it('rejects raw IP direct access in production with 403', async () => {
      process.env.NODE_ENV = 'production';
      const request = new NextRequest('http://198.51.100.12/api/health', {
        headers: { host: '198.51.100.12' },
      });
      const response = await proxy(request);
      expect(response.status).toBe(403);
      expect(await response.text()).toContain('Direct IP access forbidden');
    });

    it('enforces Cloudflare proxy header when REQUIRE_CLOUDFLARE_PROXY is enabled in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REQUIRE_CLOUDFLARE_PROXY = 'true';

      // Request without cf-ray header -> rejected
      const directRequest = new NextRequest('http://fieseros.com/api/users', {
        headers: { host: 'fieseros.com' },
      });
      const directResponse = await proxy(directRequest);
      expect(directResponse.status).toBe(403);
      expect(await directResponse.text()).toContain('Direct origin access forbidden');

      // Request WITH cf-ray header -> allowed through
      const cfRequest = new NextRequest('http://fieseros.com/api/users', {
        headers: { host: 'fieseros.com', 'cf-ray': '8cb123456789-DFW' },
      });
      const cfResponse = await proxy(cfRequest);
      expect(cfResponse.status).not.toBe(403);
    });
  });

  describe('verifyTurnstileToken', () => {
    it('gracefully skips when Turnstile secret key is not set', async () => {
      delete process.env.TURNSTILE_SECRET_KEY;
      delete process.env.CF_TURNSTILE_SECRET_KEY;

      const result = await verifyTurnstileToken({ token: 'dummy-token' });
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it('fails when token is missing and secret key is set', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

      const result = await verifyTurnstileToken({ token: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Turnstile token is missing');
    });

    it('validates token with Cloudflare API when secret key is set', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        success: true,
        hostname: 'fieseros.com',
      }), { status: 200 })));

      const result = await verifyTurnstileToken({ token: 'valid-turnstile-token', ip: '1.2.3.4' });
      expect(result.success).toBe(true);
      expect(result.hostname).toBe('fieseros.com');
    });

    it('handles verification rejection by Cloudflare API', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        success: false,
        'error-codes': ['invalid-input-response'],
      }), { status: 200 })));

      const result = await verifyTurnstileToken({ token: 'invalid-token', ip: '1.2.3.4' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid-input-response');
    });
  });

  describe('checkFormSpam integration with Turnstile', () => {
    it('rejects submissions when Turnstile verification fails', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        success: false,
        'error-codes': ['timeout-or-duplicate'],
      }), { status: 200 })));

      const result = await checkFormSpam({
        endpoint: null,
        endpointId: 'test-form',
        payload: { name: 'Bot User', email: 'bot@example.com' },
        turnstileToken: 'expired-token',
        requireTurnstile: true,
        ip: '198.51.100.99',
      });

      expect(result.blocked).toBe(true);
      expect(result.layer).toBe('turnstile');
      expect(result.status).toBe(400);
    });

    it('passes submissions when Turnstile verification succeeds', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        success: true,
      }), { status: 200 })));

      const result = await checkFormSpam({
        endpoint: null,
        endpointId: 'test-form-clean',
        payload: { name: 'Real User', email: 'real@example.com' },
        turnstileToken: 'valid-token',
        requireTurnstile: true,
        ip: '198.51.100.100',
      });

      expect(result.blocked).toBe(false);
      expect(result.layer).toBe('none');
    });
  });
});

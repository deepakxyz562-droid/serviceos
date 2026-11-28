import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WhatsAppConnectPage from '@/app/whatsapp-connect/page';

let mockQueryString = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockQueryString),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('/whatsapp-connect page auth gate & Meta onboarding guidance', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    mockQueryString = '';
    window.history.replaceState(null, '', '/whatsapp-connect');
  });

  it('blocks unauthenticated visitors from launching Meta Embedded Signup and renders Sign In CTA', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: null, authenticated: false }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    render(<WhatsAppConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Sign In Required to Connect WhatsApp')).toBeTruthy();
    });

    const signInLink = screen.getByRole('link', { name: /sign in to bgos/i });
    expect(signInLink.getAttribute('href')).toBe('/?auth=login&returnUrl=%2Fwhatsapp-connect');
    expect(screen.queryByRole('button', { name: /continue with facebook & whatsapp/i })).toBeNull();
    expect(fetchSpy.mock.calls.some(([u]) => String(u).includes('/api/whatsapp/config'))).toBe(false);
  });

  it('blocks customer portal sessions from business WhatsApp onboarding', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/auth/me')) {
        return new Response(
          JSON.stringify({ user: { id: 'cust_1', tenantId: 'ten_1', role: 'customer' } }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 404 });
    });

    render(<WhatsAppConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Business Account Required')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /continue with facebook & whatsapp/i })).toBeNull();
  });

  it('exchanges mobile ?ticket= via PUT /api/bgos/mobile-auth/handoff and passes exchanged bearer token to auth/me, config, and signup', async () => {
    mockQueryString = 'product=bgos&client=mobile&returnUrl=bgos%3A%2F%2Fgbp-callback&ticket=tkt_fresh_1';
    window.history.replaceState(null, '', `/whatsapp-connect?${mockQueryString}`);

    (window as any).FB = {
      init: vi.fn(),
      login: vi.fn((cb: any) => cb({ authResponse: { code: 'wa_code_mobile_1', state: 'st_m1' } })),
    };

    const calls: Array<{ url: string; method: string; body?: string; authHeader?: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';
      const hdrs = new Headers(init?.headers);
      calls.push({
        url,
        method,
        body: typeof init?.body === 'string' ? init.body : undefined,
        authHeader: hdrs.get('authorization') || hdrs.get('Authorization') || undefined,
      });

      if (url.includes('/api/bgos/mobile-auth/handoff')) {
        return new Response(JSON.stringify({ ok: true, token: 'mobile_jwt_fallback_1' }), { status: 200 });
      }
      if (url.includes('/api/auth/me')) {
        return new Response(
          JSON.stringify({ user: { id: 'u_owner_1', tenantId: 'ten_1', role: 'owner' } }),
          { status: 200 },
        );
      }
      if (url.includes('/api/whatsapp/config')) {
        return new Response(
          JSON.stringify({ metaAppId: '2180370786060435', embeddedConfigId: '1726144922272991' }),
          { status: 200 },
        );
      }
      if (url.includes('/api/whatsapp/embedded-signup')) {
        return new Response(
          JSON.stringify({ success: true, phoneNumberId: 'pn_1', wabaId: 'waba_1', coexistenceMode: true }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    });

    render(<WhatsAppConnectPage />);

    const connectBtn = await waitFor(() =>
      screen.getByRole('button', { name: /continue with facebook & whatsapp/i }),
    );
    expect(screen.getByText(/Just 1 popup step:/i)).toBeTruthy();

    expect(calls[0]).toEqual({
      url: '/api/bgos/mobile-auth/handoff',
      method: 'PUT',
      body: JSON.stringify({ ticket: 'tkt_fresh_1' }),
      authHeader: undefined,
    });
    const meCall = calls.find((c) => c.url.includes('/api/auth/me'));
    const cfgCall = calls.find((c) => c.url.includes('/api/whatsapp/config'));
    expect(meCall?.authHeader).toBe('Bearer mobile_jwt_fallback_1');
    expect(cfgCall?.authHeader).toBe('Bearer mobile_jwt_fallback_1');

    fireEvent.click(connectBtn);

    await waitFor(() => {
      const signupCall = calls.find((c) => c.url.includes('/api/whatsapp/embedded-signup'));
      expect(signupCall?.authHeader).toBe('Bearer mobile_jwt_fallback_1');
    });
  });
});

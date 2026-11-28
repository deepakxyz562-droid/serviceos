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
    sessionStorage.clear();
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

  it('exchanges mobile ?ticket=, preserves bearer token in sessionStorage, disables button, and launches Meta dialog/oauth redirect on mobile', async () => {
    mockQueryString = 'product=bgos&client=mobile&returnUrl=bgos%3A%2F%2Fgbp-callback&ticket=tkt_fresh_1';
    window.history.replaceState(null, '', `/whatsapp-connect?${mockQueryString}`);

    const assignMock = vi.fn();
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...origLocation,
        origin: 'https://bgos.site',
        href: `https://bgos.site/whatsapp-connect?${mockQueryString}`,
        pathname: '/whatsapp-connect',
        search: `?${mockQueryString}`,
        assign: assignMock,
      },
    });

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
      return new Response('{}', { status: 200 });
    });

    try {
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
      expect(sessionStorage.getItem('bgos_wa_handoff_token')).toBe('mobile_jwt_fallback_1');

      fireEvent.click(connectBtn);

      await waitFor(() => {
        expect(assignMock).toHaveBeenCalledTimes(1);
      });
      const redirectTarget = new URL(String(assignMock.mock.calls[0][0]));
      expect(redirectTarget.origin + redirectTarget.pathname).toBe(
        'https://www.facebook.com/v21.0/dialog/oauth',
      );
      expect(redirectTarget.searchParams.get('redirect_uri')).toBe(
        'https://bgos.site/whatsapp-connect',
      );
      expect((connectBtn as HTMLButtonElement).disabled).toBe(true);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: origLocation,
      });
    }
  });

  it('auto-submits Meta redirect ?code= with matching redirectUri, deactivates Connect while waiting, and transitions to Connected on refresh', async () => {
    sessionStorage.setItem(
      'bgos_wa_flow_ctx',
      JSON.stringify({ isMobileClient: true, returnUrl: 'bgos://gbp-callback', nextPath: '/integrations' }),
    );
    sessionStorage.setItem(
      'bgos_wa_oauth_pending',
      JSON.stringify({
        state: 'csrf_mobile_1',
        mode: 'coexistence',
        redirectUri: 'https://bgos.site/whatsapp-connect',
      }),
    );
    mockQueryString = 'code=meta_redir_code_9&state=csrf_mobile_1';
    window.history.replaceState(null, '', `/whatsapp-connect?${mockQueryString}`);

    let refreshCount = 0;
    const signupPayloads: any[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/auth/me')) {
        return new Response(
          JSON.stringify({ user: { id: 'u_owner_1', tenantId: 'ten_1', role: 'owner' } }),
          { status: 200 },
        );
      }
      if (url.includes('/api/whatsapp/embedded-signup')) {
        signupPayloads.push(JSON.parse(String(init?.body || '{}')));
        return new Response(
          JSON.stringify({
            success: true,
            pendingActivation: true,
            activationStatus: 'pending',
            phoneNumberId: 'pn_wait_1',
            wabaId: 'waba_wait_1',
            displayPhoneNumber: '+91 82108 83772',
          }),
          { status: 200 },
        );
      }
      if (url.includes('/api/whatsapp/config?refresh=1')) {
        refreshCount += 1;
        return new Response(
          JSON.stringify({
            isConfigured: true,
            mode: 'live',
            activationStatus: 'active',
            source: 'tenant-own',
            phoneNumberId: '****_wait_1',
            displayPhoneNumber: '+91 82108 83772',
            coexistenceMode: true,
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    });

    render(<WhatsAppConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Submitted — Waiting for Meta Activation')).toBeTruthy();
    });

    expect(signupPayloads[0]).toMatchObject({
      code: 'meta_redir_code_9',
      state: 'csrf_mobile_1',
      redirectUri: 'https://bgos.site/whatsapp-connect',
      isCoexistence: true,
    });
    // Connect button is hidden/deactivated while awaiting Meta activation
    expect(screen.queryByRole('button', { name: /continue with facebook & whatsapp/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /check activation status/i }));

    await waitFor(() => {
      expect(screen.getByText('WhatsApp Connected!')).toBeTruthy();
    });
    expect(refreshCount).toBe(1);
  });
});

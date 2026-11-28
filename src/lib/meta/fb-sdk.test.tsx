import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  WA_OAUTH_PENDING_STORAGE_KEY,
  WhatsAppEmbeddedSignupButton,
} from '@/components/whatsapp/whatsapp-embedded-signup-button';
import { MetaOAuthButton } from '@/components/meta/meta-oauth-button';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Meta Facebook JS SDK callback validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes a plain synchronous Function (never AsyncFunction) to FB.login for WhatsApp Embedded Signup', async () => {
    const callbacks: unknown[] = [];
    const fbLoginMock = vi.fn((cb: any, opts: any) => {
      callbacks.push(cb);
      // Mirror Meta JS SDK runtime assertion that rejected async callbacks
      const kind = Object.prototype.toString.call(cb);
      if (kind !== '[object Function]') {
        throw new Error(`Expression is of type ${kind}, not function`);
      }
      expect(opts).toMatchObject({
        config_id: '1726144922272991',
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          version: 'v4',
          sessionInfoVersion: '3',
          featureType: 'whatsapp_business_app_onboarding',
        },
      });
      cb({ authResponse: { code: 'wa_auth_code_1', state: 'st_1' } });
    });

    (window as any).FB = {
      init: vi.fn(),
      login: fbLoginMock,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          phoneNumberId: 'pn_1',
          wabaId: 'waba_1',
          displayPhoneNumber: '+919876543210',
          coexistenceMode: true,
        }),
        { status: 200 },
      ),
    );

    const onSuccess = vi.fn();
    render(
      <WhatsAppEmbeddedSignupButton
        label="Continue with Facebook & WhatsApp"
        mode="coexistence"
        metaAppId="meta_app_1"
        configId="1726144922272991"
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue with facebook & whatsapp/i }));

    expect(fbLoginMock).toHaveBeenCalledTimes(1);
    expect(Object.prototype.toString.call(callbacks[0])).toBe('[object Function]');

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('pn_1', 'waba_1', {
        displayPhoneNumber: '+919876543210',
        coexistenceMode: true,
      });
    });

    const signupCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('/api/whatsapp/embedded-signup'),
    );
    expect(signupCall).toBeTruthy();
    const payload = JSON.parse(String(signupCall?.[1]?.body));
    expect(payload).toMatchObject({
      code: 'wa_auth_code_1',
      isCoexistence: true,
      featureType: 'whatsapp_business_app_onboarding',
    });

    fetchSpy.mockRestore();
  });

  it('passes a plain synchronous Function to FB.login for Instagram / Messenger OAuth', async () => {
    const callbacks: unknown[] = [];
    const fbLoginMock = vi.fn((cb: any) => {
      callbacks.push(cb);
      if (Object.prototype.toString.call(cb) !== '[object Function]') {
        throw new Error('Expression is of type asyncfunction, not function');
      }
      cb({ authResponse: { code: 'ig_code_1' } });
    });

    (window as any).FB = {
      init: vi.fn(),
      login: fbLoginMock,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const onSuccess = vi.fn();

    render(<MetaOAuthButton provider="instagram" onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /connect instagram/i }));

    expect(fbLoginMock).toHaveBeenCalledTimes(1);
    expect(Object.prototype.toString.call(callbacks[0])).toBe('[object Function]');

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    fetchSpy.mockRestore();
  });

  it('uses direct Meta dialog/oauth redirect with redirect_uri when preferRedirectFlow is true on mobile', () => {
    cleanup();
    sessionStorage.clear();
    const assignMock = vi.fn();
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...origLocation,
        origin: 'https://bgos.site',
        assign: assignMock,
      },
    });

    try {
      render(
        <WhatsAppEmbeddedSignupButton
          label="Continue with Facebook & WhatsApp"
          mode="coexistence"
          preferRedirectFlow
          metaAppId="2180370786060435"
          configId="1726144922272991"
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /continue with facebook & whatsapp/i }));

      expect(assignMock).toHaveBeenCalledTimes(1);
      const navUrl = new URL(String(assignMock.mock.calls[0][0]));
      expect(navUrl.origin + navUrl.pathname).toBe('https://www.facebook.com/v21.0/dialog/oauth');
      expect(navUrl.searchParams.get('redirect_uri')).toBe('https://bgos.site/whatsapp-connect');
      expect(navUrl.searchParams.get('config_id')).toBe('1726144922272991');
      expect(navUrl.searchParams.get('response_type')).toBe('code');
      expect(JSON.parse(navUrl.searchParams.get('extras') || '{}')).toMatchObject({
        featureType: 'whatsapp_business_app_onboarding',
        version: 'v4',
      });
      const stored = JSON.parse(sessionStorage.getItem(WA_OAUTH_PENDING_STORAGE_KEY) || '{}');
      expect(stored.state).toBe(navUrl.searchParams.get('state'));
      expect(stored.redirectUri).toBe('https://bgos.site/whatsapp-connect');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: origLocation,
      });
    }
  });
});

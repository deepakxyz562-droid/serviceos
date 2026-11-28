import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WhatsAppEmbeddedSignupButton } from '@/components/whatsapp/whatsapp-embedded-signup-button';
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
        configId="1822859788621036"
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
});

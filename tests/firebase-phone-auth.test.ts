import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFirebaseErrorCode, getFirebaseWebConfig, mapFirebasePhoneError } from '@/lib/firebase-web';

const mocks = vi.hoisted(() => ({
  executionEnvironment: 'storeClient' as string,
  appOwnership: 'expo' as string | null,
  platformOs: 'ios' as 'ios' | 'android' | 'web',
  turboGet: vi.fn<(...args: any[]) => unknown>(() => null),
  latestWebViewProps: null as Record<string, any> | null,
}));

vi.mock('expo-constants', () => ({
  default: {
    get executionEnvironment() {
      return mocks.executionEnvironment;
    },
    get appOwnership() {
      return mocks.appOwnership;
    },
  },
}));

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('./mocks/react-native')>('./mocks/react-native');
  return {
    ...actual,
    Platform: {
      get OS() {
        return mocks.platformOs;
      },
      select: (objs: any) => objs[mocks.platformOs] ?? objs.default,
    },
    TurboModuleRegistry: {
      get: mocks.turboGet,
    },
    NativeModules: {},
    Modal: ({ visible, children }: any) =>
      visible ? React.createElement('div', { 'data-testid': 'mock-modal' }, children) : null,
  };
});

vi.mock('react-native-webview', () => {
  const WebView = (props: any) => {
    mocks.latestWebViewProps = props;
    return React.createElement('div', {
      'data-testid': 'mock-recaptcha-webview',
      'data-base-url': props?.source?.baseUrl || '',
    });
  };
  return { WebView, default: WebView };
});

import {
  FirebaseRecaptchaCancelledError,
  clearPendingNativeOtpSession,
  formatPhoneNumber,
  getMobileFirebaseWebConfig,
  isExpoGoRuntime,
  sendFirebaseOtp,
  setNativeFirebaseBridgeForTesting,
  verifyFirebaseOtp,
} from '../bgosmobile/src/lib/firebase-auth';
import {
  FirebaseRecaptchaModal,
  type FirebaseRecaptchaModalHandle,
  buildFirebaseRecaptchaHtml,
  isAllowedRecaptchaWebViewUrl,
} from '../bgosmobile/src/components/auth/firebase-recaptcha-modal';

describe('Firebase Web SDK config & error mapping (src/lib/firebase-web)', () => {
  it('defaults to the BGOS Firebase project fir-rn-49534', () => {
    const cfg = getFirebaseWebConfig();
    expect(cfg.projectId).toBe('fir-rn-49534');
    expect(cfg.authDomain).toBe('fir-rn-49534.firebaseapp.com');
    expect(cfg.apiKey).toMatch(/^AIza/);
  });

  it('extracts and maps Firebase auth error codes to clear messages', () => {
    expect(getFirebaseErrorCode({ code: 'auth/invalid-verification-code' })).toBe('auth/invalid-verification-code');
    expect(mapFirebasePhoneError({ code: 'auth/invalid-phone-number' })).toMatch(/Invalid mobile number/i);
    expect(mapFirebasePhoneError({ code: 'auth/too-many-requests' })).toMatch(/Too many OTP requests/i);
    expect(mapFirebasePhoneError({ code: 'auth/unauthorized-domain' })).toMatch(/not yet authorized/i);
    expect(mapFirebasePhoneError({ code: 'auth/captcha-check-failed' })).toMatch(/security check/i);
    expect(mapFirebasePhoneError({ code: 'auth/invalid-verification-code' })).toMatch(/6-digit verification code/i);
    expect(mapFirebasePhoneError({ code: 'auth/code-expired' })).toMatch(/expired/i);
  });
});

describe('BGOS Mobile Hybrid Firebase Phone Auth (bgosmobile/src/lib/firebase-auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mocks.latestWebViewProps = null;
    clearPendingNativeOtpSession();
    setNativeFirebaseBridgeForTesting(undefined);
    mocks.executionEnvironment = 'storeClient';
    mocks.appOwnership = 'expo';
    mocks.platformOs = 'ios';
    mocks.turboGet.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    clearPendingNativeOtpSession();
    setNativeFirebaseBridgeForTesting(undefined);
    vi.unstubAllGlobals();
  });

  it('formats 10-digit Indian and explicit E.164 numbers cleanly', () => {
    expect(formatPhoneNumber('9876543210')).toBe('+919876543210');
    expect(formatPhoneNumber('+65 8123 4567')).toBe('+6581234567');
    expect(formatPhoneNumber('+1 (415) 555-2671')).toBe('+14155552671');
  });

  it('detects Expo Go runtime safely', () => {
    mocks.executionEnvironment = 'storeClient';
    expect(isExpoGoRuntime()).toBe(true);

    mocks.executionEnvironment = 'standalone';
    mocks.appOwnership = null;
    expect(isExpoGoRuntime()).toBe(false);
  });

  it('provides consistent mobile Firebase web configuration matching fir-rn-49534', () => {
    const cfg = getMobileFirebaseWebConfig();
    expect(cfg.projectId).toBe('fir-rn-49534');
    expect(cfg.authDomain).toBe('fir-rn-49534.firebaseapp.com');
    expect(cfg.apiKey).toMatch(/^AIza/);
  });

  it('uses in-app reCAPTCHA token requester in Expo Go and calls Identity Toolkit without browser bounce', async () => {
    const requestRecaptchaToken = vi.fn().mockResolvedValue('  rc_tok_in_app_123  ');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sessionInfo: 'rest_session_in_app' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await sendFirebaseOtp('+919876543210', { requestRecaptchaToken });
    expect(res).toEqual({
      success: true,
      sessionInfo: 'rest_session_in_app',
      formattedPhone: '+919876543210',
      channel: 'recaptcha_in_app',
    });

    expect(requestRecaptchaToken).toHaveBeenCalledTimes(1);
    expect(requestRecaptchaToken).toHaveBeenCalledWith('+919876543210');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      phoneNumber: '+919876543210',
      recaptchaToken: 'rc_tok_in_app_123',
    });
  });

  it('handles user cancellation of the in-app reCAPTCHA modal cleanly without calling Identity Toolkit', async () => {
    const requestRecaptchaToken = vi.fn().mockRejectedValue(new FirebaseRecaptchaCancelledError());
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await sendFirebaseOtp('+919876543210', { requestRecaptchaToken });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/cancelled/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when in-app requester is missing or returns an empty token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const noRequester = await sendFirebaseOtp('+919876543210');
    expect(noRequester.success).toBe(false);
    expect(noRequester.error).toMatch(/modal is not ready/i);

    const emptyToken = await sendFirebaseOtp('+919876543210', {
      requestRecaptchaToken: vi.fn().mockResolvedValue('   '),
    });
    expect(emptyToken.success).toBe(false);
    expect(emptyToken.error).toMatch(/did not return a verification token/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses native @react-native-firebase/auth when available without invoking reCAPTCHA modal', async () => {
    const confirmMock = vi.fn().mockResolvedValue({
      user: {
        phoneNumber: '+919876543210',
        getIdToken: vi.fn().mockResolvedValue('native_firebase_id_token'),
      },
    });
    const signInMock = vi.fn().mockResolvedValue({
      verificationId: 'verif_native_1',
      confirm: confirmMock,
    });
    setNativeFirebaseBridgeForTesting({
      getAuth: () => ({ app: 'default' }),
      signInWithPhoneNumber: signInMock,
    });
    const requestRecaptchaToken = vi.fn();

    const sendRes = await sendFirebaseOtp('9876543210', { requestRecaptchaToken });
    expect(sendRes.success).toBe(true);
    expect(sendRes.channel).toBe('native');
    expect(sendRes.sessionInfo).toMatch(/^native:/);
    expect(requestRecaptchaToken).not.toHaveBeenCalled();
    expect(signInMock).toHaveBeenCalledWith({ app: 'default' }, '+919876543210');

    const badLength = await verifyFirebaseOtp(sendRes.sessionInfo!, '1234');
    expect(badLength.success).toBe(false);
    expect(confirmMock).not.toHaveBeenCalled();

    const verifyRes = await verifyFirebaseOtp(sendRes.sessionInfo!, '654321');
    expect(confirmMock).toHaveBeenCalledWith('654321');
    expect(verifyRes).toEqual({
      success: true,
      idToken: 'native_firebase_id_token',
      phoneNumber: '+919876543210',
    });
  });

  it('automatically falls back to in-app reCAPTCHA modal when native fails with missing-client-identifier', async () => {
    setNativeFirebaseBridgeForTesting({
      getAuth: () => ({}),
      signInWithPhoneNumber: vi.fn().mockRejectedValue({
        code: 'auth/missing-client-identifier',
        message: 'MISSING_CLIENT_IDENTIFIER',
      }),
    });
    const requestRecaptchaToken = vi.fn().mockResolvedValue('in_app_fallback_tok');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ sessionInfo: 'rest_fallback_session' }), { status: 200 }),
      ),
    );

    const res = await sendFirebaseOtp('+919876543210', { requestRecaptchaToken });
    expect(res).toEqual({
      success: true,
      sessionInfo: 'rest_fallback_session',
      formattedPhone: '+919876543210',
      channel: 'recaptcha_in_app',
    });
    expect(requestRecaptchaToken).toHaveBeenCalledTimes(1);
  });

  it('does not open in-app reCAPTCHA modal on terminal invalid-phone-number error', async () => {
    setNativeFirebaseBridgeForTesting({
      getAuth: () => ({}),
      signInWithPhoneNumber: vi.fn().mockRejectedValue({
        code: 'auth/invalid-phone-number',
        message: 'INVALID_PHONE_NUMBER',
      }),
    });
    const requestRecaptchaToken = vi.fn();

    const res = await sendFirebaseOtp('+919876543210', { requestRecaptchaToken });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Invalid phone number/i);
    expect(requestRecaptchaToken).not.toHaveBeenCalled();
  });

  it('verifies REST sessionInfo with Identity Toolkit signInWithPhoneNumber', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ idToken: 'rest_id_token_xyz', phoneNumber: '+919876543210' }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await verifyFirebaseOtp('rest_session_abc', '123456');
    expect(res).toEqual({
      success: true,
      idToken: 'rest_id_token_xyz',
      phoneNumber: '+919876543210',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      sessionInfo: 'rest_session_abc',
      code: '123456',
    });
  });
});

describe('BGOS In-App FirebaseRecaptchaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mocks.latestWebViewProps = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('restricts WebView URLs strictly to Firebase & reCAPTCHA endpoints and blocks outbound links', () => {
    const base = 'https://fir-rn-49534.firebaseapp.com';
    expect(isAllowedRecaptchaWebViewUrl('https://fir-rn-49534.firebaseapp.com/', base)).toBe(true);
    expect(isAllowedRecaptchaWebViewUrl('https://www.google.com/recaptcha/api2/bframe?k=123', base)).toBe(true);
    expect(isAllowedRecaptchaWebViewUrl('https://www.recaptcha.net/recaptcha/api2/anchor', base)).toBe(true);
    expect(isAllowedRecaptchaWebViewUrl('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', base)).toBe(true);
    expect(isAllowedRecaptchaWebViewUrl('about:blank', base)).toBe(true);

    // Must block outbound privacy/terms or arbitrary links so user never leaves BGOS
    expect(isAllowedRecaptchaWebViewUrl('https://policies.google.com/privacy', base)).toBe(false);
    expect(isAllowedRecaptchaWebViewUrl('https://www.google.com/search?q=privacy', base)).toBe(false);
    expect(isAllowedRecaptchaWebViewUrl('https://evil.example.com/', base)).toBe(false);
    expect(isAllowedRecaptchaWebViewUrl('http://fir-rn-49534.firebaseapp.com/', base)).toBe(false);
    expect(isAllowedRecaptchaWebViewUrl('bgos://login', base)).toBe(false);
  });

  it('builds invisible-first HTML with bframe visibility detector and safe config JSON', () => {
    const html = buildFirebaseRecaptchaHtml({
      apiKey: 'AIzaTestKey',
      authDomain: 'fir-rn-49534.firebaseapp.com',
      projectId: 'fir-rn-49534',
      mode: 'invisible',
      requestId: 7,
    });
    expect(html).toContain('"authDomain":"fir-rn-49534.firebaseapp.com"');
    expect(html).toContain('var MODE = "invisible"');
    expect(html).toContain('var REQUEST_ID = 7');
    expect(html).toContain('iframe[src*="bframe"]');
  });

  it('stays inside the app modal, ignores mismatched requestId, and resolves on WebView token', async () => {
    const modalRef = React.createRef<FirebaseRecaptchaModalHandle>();
    render(React.createElement(FirebaseRecaptchaModal, { ref: modalRef }));

    expect(screen.queryByTestId('mock-modal')).toBeNull();

    let tokenPromise!: Promise<string>;
    act(() => {
      tokenPromise = modalRef.current!.verify('+919876543210');
    });

    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    expect(screen.getByText('Verifying device & sending OTP…')).toBeInTheDocument();
    expect(screen.getByTestId('mock-recaptcha-webview').getAttribute('data-base-url')).toBe(
      'https://fir-rn-49534.firebaseapp.com',
    );

    // Mismatched requestId is ignored
    act(() => {
      mocks.latestWebViewProps?.onMessage({
        nativeEvent: { data: JSON.stringify({ requestId: 999, type: 'token', token: 'wrong_tok' }) },
      });
    });
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();

    // Valid matching token resolves promise and closes modal cleanly
    act(() => {
      mocks.latestWebViewProps?.onMessage({
        nativeEvent: { data: JSON.stringify({ requestId: 1, type: 'token', token: 'wv_tok_999' }) },
      });
    });

    await expect(tokenPromise).resolves.toBe('wv_tok_999');
    expect(screen.queryByTestId('mock-modal')).toBeNull();
  });

  it('rejects cleanly with FirebaseRecaptchaCancelledError when user taps cancel', async () => {
    const modalRef = React.createRef<FirebaseRecaptchaModalHandle>();
    render(React.createElement(FirebaseRecaptchaModal, { ref: modalRef }));

    let tokenPromise!: Promise<string>;
    act(() => {
      tokenPromise = modalRef.current!.verify('+919876543210');
    });

    const cancelBtn = screen.getByLabelText('Cancel security verification');
    act(() => {
      fireEvent.click(cancelBtn);
    });

    await expect(tokenPromise).rejects.toBeInstanceOf(FirebaseRecaptchaCancelledError);
    expect(screen.queryByTestId('mock-modal')).toBeNull();
  });
});

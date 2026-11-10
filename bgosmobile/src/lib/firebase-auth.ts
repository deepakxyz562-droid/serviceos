/**
 * Hybrid Firebase Phone Authentication for BGOS Mobile
 *
 * Strategy:
 * 1. Native @react-native-firebase/auth (Play Integrity / APNs silent verification)
 *    whenever the native Firebase SDK is linked and configured (EAS/APK/IPA builds).
 * 2. Automatic in-app fallback via FirebaseRecaptchaModal (embedded WebView with
 *    invisible-first Firebase RecaptchaVerifier + in-place escalation if challenged)
 *    + Google Identity Toolkit REST API for Expo Go, iOS without APNs/plist, or
 *    devices/emulators where native attestation fails (MISSING_CLIENT_IDENTIFIER).
 *    Zero external browser pop-outs or app hops.
 */

import Constants from 'expo-constants';
import { Platform, TurboModuleRegistry } from 'react-native';

export function getMobileFirebaseWebConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
} {
  const projectId =
    process.env.EXPO_PUBLIC_BGOS_FIREBASE_PROJECT_ID ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    'fir-rn-49534';
  const apiKey =
    process.env.EXPO_PUBLIC_BGOS_FIREBASE_API_KEY ||
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyDLMfL0psz7RPx_V9BC0q9nLSV5bj5V930';
  const authDomain =
    process.env.EXPO_PUBLIC_BGOS_FIREBASE_AUTH_DOMAIN ||
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    `${projectId}.firebaseapp.com`;

  return { apiKey, authDomain, projectId };
}

const NATIVE_SESSION_PREFIX = 'native:';
const NATIVE_SESSION_TTL_MS = 15 * 60 * 1000;

export class FirebaseRecaptchaCancelledError extends Error {
  readonly code = 'auth/recaptcha-cancelled';

  constructor(message = 'Security verification was cancelled. Please tap Send OTP to receive your code.') {
    super(message);
    this.name = 'FirebaseRecaptchaCancelledError';
  }
}

export interface SendFirebaseOtpOptions {
  requestRecaptchaToken?: (formattedPhone: string) => Promise<string>;
}

export interface SendOtpResult {
  success: boolean;
  sessionInfo?: string;
  formattedPhone?: string;
  channel?: 'native' | 'recaptcha_in_app';
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  idToken?: string;
  phoneNumber?: string;
  error?: string;
}

interface NativeUserCredential {
  user: {
    phoneNumber?: string | null;
    getIdToken: (forceRefresh?: boolean) => Promise<string>;
  } | null;
}

interface NativeConfirmationResult {
  verificationId?: string;
  confirm: (verificationCode: string) => Promise<NativeUserCredential>;
}

interface NativeSessionEntry {
  confirmation: NativeConfirmationResult;
  phoneNumber: string;
  createdAt: number;
}

const nativeSessions = new Map<string, NativeSessionEntry>();
let sessionCounter = 0;

function pruneStaleNativeSessions(): void {
  const cutoff = Date.now() - NATIVE_SESSION_TTL_MS;
  for (const [id, entry] of nativeSessions.entries()) {
    if (entry.createdAt < cutoff) {
      nativeSessions.delete(id);
    }
  }
}

export function clearPendingNativeOtpSession(sessionId?: string | null): void {
  if (!sessionId) {
    nativeSessions.clear();
    return;
  }
  nativeSessions.delete(sessionId);
}

/**
 * Format any user-entered mobile number into standard E.164 (+91XXXXXXXXXX)
 */
export function formatPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (input.trim().startsWith('+')) {
    return `+${digits}`;
  }
  // Default to India (+91) if 10 digits
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length > 10 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function isExpoGoRuntime(): boolean {
  const execEnv = (Constants as { executionEnvironment?: string }).executionEnvironment;
  const ownership = (Constants as { appOwnership?: string | null }).appOwnership;
  return execEnv === 'storeClient' || ownership === 'expo';
}

type NativeFirebasePhoneBridge = {
  getAuth: () => unknown;
  signInWithPhoneNumber: (auth: unknown, phoneNumber: string) => Promise<NativeConfirmationResult>;
};

let nativeFirebaseBridgeOverride: NativeFirebasePhoneBridge | null | undefined;

export function setNativeFirebaseBridgeForTesting(
  bridge: NativeFirebasePhoneBridge | null | undefined,
): void {
  nativeFirebaseBridgeOverride = bridge;
}

function getNativeFirebasePhoneBridge(): NativeFirebasePhoneBridge | null {
  if (nativeFirebaseBridgeOverride !== undefined) {
    return nativeFirebaseBridgeOverride;
  }
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }
  if (isExpoGoRuntime()) {
    return null;
  }

  try {
    const hasAppTurbo = Boolean(TurboModuleRegistry?.get?.('NativeRNFBTurboApp'));
    const hasAuthTurbo = Boolean(TurboModuleRegistry?.get?.('NativeRNFBTurboAuth'));
    if (!hasAppTurbo || !hasAuthTurbo) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appModule = require('@react-native-firebase/app') as { getApps?: () => unknown[] };
    if (!appModule || typeof appModule.getApps !== 'function' || appModule.getApps().length === 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@react-native-firebase/auth') as {
      getAuth?: () => unknown;
      signInWithPhoneNumber?: (auth: unknown, phoneNumber: string) => Promise<NativeConfirmationResult>;
    };
    if (
      !authModule ||
      typeof authModule.getAuth !== 'function' ||
      typeof authModule.signInWithPhoneNumber !== 'function'
    ) {
      return null;
    }

    return {
      getAuth: authModule.getAuth,
      signInWithPhoneNumber: authModule.signInWithPhoneNumber,
    };
  } catch (err) {
    console.warn('[Firebase Auth] Native module unavailable, will use in-app reCAPTCHA:', err);
    return null;
  }
}

function extractErrorCodeAndMessage(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== 'object') {
    return { code: '', message: String(error ?? '') };
  }
  const code = typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : '';
  const message = typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : '';
  return { code, message };
}

function mapTerminalNativeSendError(code: string, message: string): string | null {
  const combined = `${code} ${message}`;
  if (combined.includes('invalid-phone-number') || combined.includes('INVALID_PHONE_NUMBER')) {
    return 'Invalid phone number format. Please check the digits and try again.';
  }
  if (
    combined.includes('too-many-requests') ||
    combined.includes('quota-exceeded') ||
    combined.includes('TOO_MANY_ATTEMPTS') ||
    combined.includes('QUOTA_EXCEEDED')
  ) {
    return 'Too many OTP requests from this number. Please wait a few minutes before trying again.';
  }
  if (combined.includes('operation-not-allowed') || combined.includes('OPERATION_NOT_ALLOWED')) {
    return 'Phone sign-in is not enabled right now. Please sign in with Email or Google.';
  }
  if (combined.includes('network-request-failed')) {
    return 'Network error while contacting Firebase. Please check your internet connection and retry.';
  }
  return null;
}

function mapRestSendError(rawMessage: string): string {
  if (rawMessage.includes('TOO_MANY_ATTEMPTS') || rawMessage.includes('QUOTA_EXCEEDED')) {
    return 'Too many OTP requests from this number. Please wait a few minutes before trying again.';
  }
  if (rawMessage.includes('INVALID_PHONE_NUMBER')) {
    return 'Invalid phone number format. Please check the digits and try again.';
  }
  if (rawMessage.includes('UNAUTHORIZED_DOMAIN')) {
    return 'Verification web domain is not yet authorized in Firebase Authentication settings.';
  }
  if (
    rawMessage.includes('CAPTCHA_CHECK_FAILED') ||
    rawMessage.includes('INVALID_RECAPTCHA_TOKEN') ||
    rawMessage.includes('MISSING_RECAPTCHA_TOKEN') ||
    rawMessage.includes('MISSING_CLIENT_IDENTIFIER')
  ) {
    return 'Security verification check could not be completed. Please tap Send OTP and try again.';
  }
  if (rawMessage.includes('BILLING_NOT_ENABLED')) {
    return 'Unable to send verification SMS right now. Please verify your mobile number or try again in a few moments.';
  }
  return 'Unable to send verification code right now. Please check your number or sign in with Email / Google.';
}

async function sendOtpViaInAppRecaptcha(
  formattedPhone: string,
  requestRecaptchaToken?: (formattedPhone: string) => Promise<string>,
): Promise<SendOtpResult> {
  if (typeof requestRecaptchaToken !== 'function') {
    return {
      success: false,
      error: 'Security verification modal is not ready. Please try again.',
    };
  }

  let recaptchaToken = '';
  try {
    recaptchaToken = (await requestRecaptchaToken(formattedPhone)).trim();
  } catch (err) {
    if (
      err instanceof FirebaseRecaptchaCancelledError ||
      (err && typeof err === 'object' && (err as { code?: unknown }).code === 'auth/recaptcha-cancelled')
    ) {
      return {
        success: false,
        error: 'Security verification was cancelled. Please tap Send OTP to receive your code.',
      };
    }
    return {
      success: false,
      error:
        err instanceof Error && err.message
          ? err.message
          : 'Security verification check could not be completed. Please tap Send OTP and try again.',
    };
  }

  if (!recaptchaToken) {
    return {
      success: false,
      error: 'Security check did not return a verification token. Please try again.',
    };
  }

  const { apiKey } = getMobileFirebaseWebConfig();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        recaptchaToken,
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.sessionInfo) {
    const msg = data.error?.message || '';
    console.warn('[Firebase Auth] sendVerificationCode notice:', msg);
    return {
      success: false,
      error: mapRestSendError(msg),
    };
  }

  return {
    success: true,
    sessionInfo: data.sessionInfo,
    formattedPhone,
    channel: 'recaptcha_in_app',
  };
}

/**
 * Request an OTP from Firebase Authentication (native SDK first, in-app WebView reCAPTCHA fallback)
 */
export async function sendFirebaseOtp(
  phoneNumber: string,
  options?: SendFirebaseOtpOptions,
): Promise<SendOtpResult> {
  const formatted = formatPhoneNumber(phoneNumber);
  const cleanDigits = formatted.replace(/\D/g, '');

  if (cleanDigits.length < 8 || cleanDigits.length > 15) {
    return {
      success: false,
      error: 'Please enter a valid mobile number.',
    };
  }

  try {
    const nativeBridge = getNativeFirebasePhoneBridge();
    if (nativeBridge) {
      try {
        const auth = nativeBridge.getAuth();
        const confirmation = await nativeBridge.signInWithPhoneNumber(auth, formatted);
        pruneStaleNativeSessions();
        sessionCounter += 1;
        const sessionId = `${NATIVE_SESSION_PREFIX}${Date.now()}_${sessionCounter}`;
        nativeSessions.set(sessionId, {
          confirmation,
          phoneNumber: formatted,
          createdAt: Date.now(),
        });

        return {
          success: true,
          sessionInfo: sessionId,
          formattedPhone: formatted,
          channel: 'native',
        };
      } catch (nativeError) {
        const { code, message } = extractErrorCodeAndMessage(nativeError);
        const terminalError = mapTerminalNativeSendError(code, message);
        if (terminalError) {
          return { success: false, error: terminalError };
        }
        console.warn(
          '[Firebase Auth] Native phone verification unavailable, falling back to in-app reCAPTCHA:',
          code || message,
        );
      }
    }

    return await sendOtpViaInAppRecaptcha(formatted, options?.requestRecaptchaToken);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error while contacting Firebase.',
    };
  }
}

/**
 * Verify Firebase 6-digit OTP code and retrieve the Firebase ID token
 */
export async function verifyFirebaseOtp(
  sessionInfo: string,
  otpCode: string,
): Promise<VerifyOtpResult> {
  const cleanCode = otpCode.replace(/\D/g, '');
  if (cleanCode.length !== 6) {
    return {
      success: false,
      error: 'Please enter the 6-digit verification code.',
    };
  }

  if (sessionInfo.startsWith(NATIVE_SESSION_PREFIX)) {
    const entry = nativeSessions.get(sessionInfo);
    if (!entry) {
      return {
        success: false,
        error: 'Verification session expired. Please tap "Resend Code" to get a new code.',
      };
    }

    try {
      const credential = await entry.confirmation.confirm(cleanCode);
      if (!credential?.user) {
        return {
          success: false,
          error: 'Could not complete verification. Please request a new code.',
        };
      }

      const idToken = await credential.user.getIdToken(true);
      nativeSessions.delete(sessionInfo);

      return {
        success: true,
        idToken,
        phoneNumber: credential.user.phoneNumber || entry.phoneNumber,
      };
    } catch (error) {
      const { code, message } = extractErrorCodeAndMessage(error);
      const combined = `${code} ${message}`;

      if (combined.includes('invalid-verification-code') || combined.includes('INVALID_CODE')) {
        return {
          success: false,
          error: 'Invalid verification code. Please check the 6 digits and try again.',
        };
      }
      if (
        combined.includes('code-expired') ||
        combined.includes('session-expired') ||
        combined.includes('SESSION_EXPIRED')
      ) {
        nativeSessions.delete(sessionInfo);
        return {
          success: false,
          error: 'Verification session expired. Please tap "Resend Code" to get a new code.',
        };
      }
      if (combined.includes('too-many-requests') || combined.includes('TOO_MANY_ATTEMPTS')) {
        return {
          success: false,
          error: 'Too many failed attempts. Please wait a few minutes or request a new code.',
        };
      }

      return {
        success: false,
        error: 'Verification failed. Please check the code and try again.',
      };
    }
  }

  try {
    const { apiKey } = getMobileFirebaseWebConfig();
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInfo,
          code: cleanCode,
        }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.idToken) {
      const msg = data.error?.message || '';

      if (msg.includes('INVALID_CODE')) {
        return {
          success: false,
          error: 'Invalid verification code. Please check the 6 digits and try again.',
        };
      }
      if (msg.includes('SESSION_EXPIRED')) {
        return {
          success: false,
          error: 'Verification session expired. Please tap "Resend Code" to get a new code.',
        };
      }

      return {
        success: false,
        error: msg || 'Verification failed. Please check the code and try again.',
      };
    }

    return {
      success: true,
      idToken: data.idToken,
      phoneNumber: data.phoneNumber,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error verifying OTP.',
    };
  }
}

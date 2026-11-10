import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey:
    process.env.NEXT_PUBLIC_BGOS_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyDLMfL0psz7RPx_V9BC0q9nLSV5bj5V930',
  authDomain:
    process.env.NEXT_PUBLIC_BGOS_FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'fir-rn-49534.firebaseapp.com',
  projectId:
    process.env.NEXT_PUBLIC_BGOS_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'fir-rn-49534',
  appId:
    process.env.NEXT_PUBLIC_BGOS_FIREBASE_APP_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    undefined,
};

const BGOS_FIREBASE_APP_NAME = 'bgos-web-auth';

export function getFirebaseWebConfig(): FirebaseOptions {
  return {
    apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: DEFAULT_FIREBASE_CONFIG.projectId,
    ...(DEFAULT_FIREBASE_CONFIG.appId ? { appId: DEFAULT_FIREBASE_CONFIG.appId } : {}),
  };
}

export function getFirebaseWebApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === BGOS_FIREBASE_APP_NAME);
  if (existing) {
    return existing;
  }
  return initializeApp(getFirebaseWebConfig(), BGOS_FIREBASE_APP_NAME);
}

export function getFirebaseWebAuth(): Auth {
  return getAuth(getFirebaseWebApp());
}

export function getFirebaseErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === 'string' && maybeCode) return maybeCode;
  const maybeMessage = (error as { message?: unknown }).message;
  if (typeof maybeMessage === 'string') {
    const match = maybeMessage.match(/\((auth\/[^)]+)\)/);
    if (match?.[1]) return match[1];
    return maybeMessage;
  }
  return '';
}

export function mapFirebasePhoneError(error: unknown): string {
  const code = getFirebaseErrorCode(error);
  if (code.includes('invalid-phone-number') || code.includes('INVALID_PHONE_NUMBER')) {
    return 'Invalid mobile number format. Please include the correct country code and digits.';
  }
  if (code.includes('too-many-requests') || code.includes('quota-exceeded') || code.includes('TOO_MANY_ATTEMPTS') || code.includes('QUOTA_EXCEEDED')) {
    return 'Too many OTP requests for this number. Please wait a few minutes and try again.';
  }
  if (code.includes('unauthorized-domain') || code.includes('UNAUTHORIZED_DOMAIN')) {
    return 'This web domain is not yet authorized in Firebase Authentication settings.';
  }
  if (code.includes('captcha-check-failed') || code.includes('missing-client-identifier') || code.includes('MISSING_CLIENT_IDENTIFIER') || code.includes('app-not-authorized')) {
    return 'Verification check could not be completed. Please retry the security check.';
  }
  if (code.includes('invalid-verification-code') || code.includes('INVALID_CODE')) {
    return 'Invalid 6-digit verification code. Please check the SMS and try again.';
  }
  if (code.includes('code-expired') || code.includes('SESSION_EXPIRED')) {
    return 'Verification code expired. Please request a new code.';
  }
  if (code.includes('network-request-failed')) {
    return 'Network error while contacting verification service. Please check your connection.';
  }
  if (code.includes('operation-not-allowed')) {
    return 'Phone sign-in is not enabled on this Firebase project.';
  }
  return 'Unable to complete phone verification right now. Please try again.';
}

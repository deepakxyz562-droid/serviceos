import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import type { SubscriberUser, SubscriberTenant } from '@/types';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC9qw5RIo0vq4PqWs2wj8ZiROP2SDzyhks',
  authDomain: 'jobplatform-b4f50.firebaseapp.com',
  projectId: 'jobplatform-b4f50',
  storageBucket: 'jobplatform-b4f50.firebasestorage.app',
  messagingSenderId: '317472909457',
  appId: '1:317472909457:android:00da50e83420cd7eee3730',
};

export interface AuthSessionResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: SubscriberUser;
  tenant: SubscriberTenant;
  workspace?: { id: string; productType?: string; name?: string } | null;
  onboardingRequired?: boolean;
  isNewUser?: boolean;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  simulated?: boolean;
  devOtp?: string;
}

/**
 * Normalizes phone number string, prepending India +91 if 10 digits.
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode = '+91'): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    const cleanPrefix = defaultCountryCode.replace(/\D/g, '');
    return `+${cleanPrefix}${digits}`;
  }
  if (rawPhone.startsWith('+')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/**
 * Exchange a verified Firebase ID Token for a native BOS session.
 */
export async function exchangeFirebaseIdToken(idToken: string): Promise<AuthSessionResponse> {
  return await apiRequest<AuthSessionResponse>(API_PATHS.firebaseSession, {
    method: 'POST',
    body: { idToken },
    skipAuth: true,
  });
}

/**
 * Direct phone OTP send request (WhatsApp + SMS)
 */
export async function requestPhoneOtp(phone: string): Promise<SendOtpResponse> {
  const normalized = normalizePhoneNumber(phone);
  return await apiRequest<SendOtpResponse>(API_PATHS.phoneSendOtp, {
    method: 'POST',
    body: { phone: normalized },
    skipAuth: true,
  });
}

/**
 * Direct phone OTP verify request
 */
export async function verifyPhoneOtpCode(phone: string, otpCode: string): Promise<AuthSessionResponse> {
  const normalized = normalizePhoneNumber(phone);
  return await apiRequest<AuthSessionResponse>(API_PATHS.phoneVerifyOtp, {
    method: 'POST',
    body: { phone: normalized, otpCode: otpCode.trim() },
    skipAuth: true,
  });
}

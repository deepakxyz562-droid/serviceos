/**
 * Firebase Phone Authentication for BGOS Mobile
 * Powered by Google Identity Toolkit REST API
 */

const FIREBASE_API_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyDLMfL0psz7RPx_V9BC0q9nLSV5bj5V930';

export interface SendOtpResult {
  success: boolean;
  sessionInfo?: string;
  formattedPhone?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  idToken?: string;
  phoneNumber?: string;
  error?: string;
}

/**
 * Format any user-entered mobile number into standard E.164 (+91XXXXXXXXXX)
 */
export function formatPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '');
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

/**
 * Request an OTP from Firebase Authentication
 */
export async function sendFirebaseOtp(phoneNumber: string): Promise<SendOtpResult> {
  const formatted = formatPhoneNumber(phoneNumber);
  const cleanDigits = formatted.replace(/\D/g, '');

  if (cleanDigits.length < 10 || cleanDigits.length > 15) {
    return {
      success: false,
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formatted }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.sessionInfo) {
      const msg = data.error?.message || '';
      console.warn('[Firebase Auth] sendVerificationCode notice:', msg);

      if (msg.includes('BILLING_NOT_ENABLED') || msg.includes('MISSING_CLIENT_IDENTIFIER')) {
        return {
          success: false,
          error:
            'Unable to send verification SMS right now. Please verify your mobile number or try again in a few moments.',
        };
      }
      if (msg.includes('TOO_MANY_ATTEMPTS') || msg.includes('QUOTA_EXCEEDED')) {
        return {
          success: false,
          error: 'Too many OTP requests from this number. Please wait a few minutes before trying again.',
        };
      }
      if (msg.includes('INVALID_PHONE_NUMBER')) {
        return {
          success: false,
          error: 'Invalid phone number format. Please check the digits and try again.',
        };
      }

      return {
        success: false,
        error: 'Unable to send verification code. Please check your number or sign in with Email / Google.',
      };
    }

    return {
      success: true,
      sessionInfo: data.sessionInfo,
      formattedPhone: formatted,
    };
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
  otpCode: string
): Promise<VerifyOtpResult> {
  const cleanCode = otpCode.replace(/\D/g, '');
  if (cleanCode.length < 4) {
    return {
      success: false,
      error: 'Please enter the 6-digit verification code.',
    };
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInfo,
          code: cleanCode,
        }),
      }
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
          error: 'Verification session expired. Please tap "Resend OTP" to get a new code.',
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

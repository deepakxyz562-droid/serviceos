/**
 * Cloudflare Turnstile Server-Side Verification Helper
 *
 * Validates a client-submitted Turnstile challenge token against the
 * Cloudflare Turnstile API endpoint:
 * https://challenges.cloudflare.com/turnstile/v0/siteverify
 *
 * Environment variables:
 * - TURNSTILE_SECRET_KEY or CF_TURNSTILE_SECRET_KEY
 *
 * If no secret key is configured (local dev, test, or pre-configuration),
 * verification is skipped gracefully so environments without Turnstile
 * credentials do not break.
 */

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
  skipped?: boolean;
  hostname?: string;
}

export async function verifyTurnstileToken(options: {
  token?: string | null;
  ip?: string | null;
}): Promise<TurnstileVerifyResult> {
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.CF_TURNSTILE_SECRET_KEY;

  // Gracefully skip verification if Turnstile secret is not configured
  if (!secretKey) {
    return { success: true, skipped: true };
  }

  const { token, ip } = options;
  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      success: false,
      error: 'Bot verification failed: Turnstile token is missing.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Turnstile verification service returned HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      success: boolean;
      'error-codes'?: string[];
      hostname?: string;
    };

    if (data.success) {
      return { success: true, hostname: data.hostname };
    }

    const errorDetails = data['error-codes']?.join(', ') || 'Validation failed';
    return {
      success: false,
      error: `Bot verification failed: ${errorDetails}`,
    };
  } catch (err) {
    console.error('[Turnstile] Verification error:', err);
    return {
      success: false,
      error: 'Turnstile verification service could not be reached.',
    };
  }
}

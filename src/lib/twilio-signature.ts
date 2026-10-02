import crypto from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Twilio webhook signature verification.
 * ======================================
 * Validates that an inbound request actually came from Twilio by recomputing
 * the X-Twilio-Signature header Twilio attaches to every webhook request.
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Algorithm (per Twilio docs):
 *   1. Build the full URL Twilio called (scheme + host + path + query string).
 *      Behind Caddy/CDN, use the X-Forwarded-* headers to reconstruct the
 *      original URL (Twilio signs the URL it called, not the internal one).
 *   2. Append the raw POST body (form-encoded) to the URL.
 *   3. HMAC-SHA256 the (url + body) with the Twilio AuthToken as the key.
 *   4. Base64-encode the digest.
 *   5. Compare to the X-Twilio-Signature header (timing-safe).
 *
 * If TWILIO_AUTH_TOKEN is not set, this function returns false (fail-closed).
 */

function buildTwilioUrl(request: NextRequest): string {
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (request.nextUrl.protocol.replace(':', '') as 'http' | 'https');
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host;
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  return `${proto}://${host}${path}${search}`;
}

export function verifyTwilioSignature(
  request: NextRequest,
  rawBody: string,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[twilio-signature] TWILIO_AUTH_TOKEN not set — allowing in dev mode');
      return true;
    }
    console.error(
      '[twilio-signature] TWILIO_AUTH_TOKEN not set — REJECTING inbound webhook (fail-closed). ' +
        'Set TWILIO_AUTH_TOKEN in env to accept Twilio webhooks.',
    );
    return false;
  }

  const signature = request.headers.get('x-twilio-signature');
  if (!signature) {
    console.warn('[twilio-signature] Missing X-Twilio-Signature header — rejecting');
    return false;
  }

  const url = buildTwilioUrl(request);

  // Twilio standard algorithm:
  // 1. Parse POST parameters (form-urlencoded)
  // 2. Sort parameter keys alphabetically
  // 3. Append each key and its value to the URL string (with no delimiters)
  // 4. HMAC-SHA1 with the Auth Token, Base64 encoded
  const params = new URLSearchParams(rawBody);
  const sortedKeys = Array.from(params.keys()).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + (params.get(key) || '');
  }

  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) {
      console.warn('[twilio-signature] Signature length mismatch — possible spoofing attempt');
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    console.warn('[twilio-signature] Invalid signature format — rejecting');
    return false;
  }
}

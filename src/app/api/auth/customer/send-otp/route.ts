import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directPrisma } from '@/lib/direct-prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { sendSmsMessage } from '@/lib/sms-send';
import { sendEmail } from '@/lib/email-send';
import { otpLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { BRAND } from '@/lib/brand';

// Rate limiting: track OTP requests per phone number OR per email.
const otpRateLimit = new Map<string, { count: number; lastRequest: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

// Mask an email address for safe display in API responses.
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex < 2) {
    return `***${email.slice(atIndex)}`;
  }
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  return `${local.slice(0, 2)}***@${domain}`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Helper to interact with OtpVerification across db / directPrisma adapters */
async function saveOtpRecord(data: {
  phone: string;
  email?: string | null;
  otpCode: string;
  channel: string;
  expiresAt: Date;
}) {
  try {
    return await (db as any).otpVerification.create({ data });
  } catch {
    return await directPrisma.otpVerification.create({ data });
  }
}

async function findRecentOtp(where: Record<string, unknown>) {
  try {
    return await (db as any).otpVerification.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return await directPrisma.otpVerification.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}

async function invalidateExistingOtps(where: Record<string, unknown>) {
  try {
    return await (db as any).otpVerification.updateMany({
      where,
      data: { expiresAt: new Date() },
    });
  } catch {
    return await directPrisma.otpVerification.updateMany({
      where,
      data: { expiresAt: new Date() },
    });
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(otpLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  try {
    const body = await request.json();
    const { phone, email } = body;

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    // ── Email channel ──────────────────────────────────────────────────────
    if (email) {
      if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Normalize: trim + lowercase
      const normalizedEmail = email.trim().toLowerCase();

      // Rate limiting: max 5 OTP requests per email per hour.
      const rateKey = `email:${normalizedEmail}`;
      const rateInfo = otpRateLimit.get(rateKey);
      const now = Date.now();

      if (rateInfo && now - rateInfo.lastRequest < 3600000 && rateInfo.count >= 5) {
        const waitMinutes = Math.ceil((3600000 - (now - rateInfo.lastRequest)) / 60000);
        return NextResponse.json(
          { error: `Too many OTP requests. Please try again in ${waitMinutes} minutes.` },
          { status: 429 }
        );
      }

      // Update rate limit
      if (rateInfo && now - rateInfo.lastRequest < 3600000) {
        rateInfo.count++;
        rateInfo.lastRequest = now;
      } else {
        otpRateLimit.set(rateKey, { count: 1, lastRequest: now });
      }

      // Check if there's a recent unexpired OTP (within last 30 seconds)
      const recentOtp = await findRecentOtp({
        email: normalizedEmail,
        verified: false,
        expiresAt: { gt: new Date() },
        createdAt: { gt: new Date(Date.now() - 30000) },
      });

      if (recentOtp) {
        return NextResponse.json(
          { error: 'OTP already sent. Please wait 30 seconds before requesting a new one.' },
          { status: 429 }
        );
      }

      // Invalidate any existing unexpired OTPs for this email
      await invalidateExistingOtps({
        email: normalizedEmail,
        verified: false,
        expiresAt: { gt: new Date() },
      });

      // Generate new OTP
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      await saveOtpRecord({
        phone: '',
        email: normalizedEmail,
        otpCode,
        channel: 'email',
        expiresAt,
      });

      // Build email bodies
      const htmlBody = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f7f9; margin: 0; padding: 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <tr>
        <td style="padding: 28px 32px 8px 32px; text-align: center;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">${BRAND.name} Customer Portal</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 32px 4px 32px; text-align: center;">
          <p style="font-size: 15px; color: #374151; margin: 0;">Your verification code</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 32px 8px 32px; text-align: center;">
          <div style="display: inline-block; font-family: 'SF Mono', 'Menlo', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #059669; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px 24px; border-radius: 10px;">${otpCode}</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 32px 4px 32px; text-align: center;">
          <p style="font-size: 14px; color: #6b7280; margin: 0;">This code expires in 5 minutes.</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 32px 28px 32px; text-align: center;">
          <p style="font-size: 13px; color: #9ca3af; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const textBody = `${BRAND.name} Customer Portal

Your verification code is: ${otpCode}

This code expires in 5 minutes.

If you didn't request this code, you can safely ignore this email.`;

      let sendResult = { success: false, simulated: false, error: '' };
      try {
        sendResult = await sendEmail({
          to: normalizedEmail,
          subject: `Your ${BRAND.name} verification code`,
          html: htmlBody,
          text: textBody,
          usageType: 'transactional',
        });
      } catch (err: any) {
        console.warn('[OTP Email Error]', err?.message || err);
        sendResult = { success: false, simulated: false, error: err?.message || 'SMTP delivery failed' };
      }

      console.log(
        `[OTP] Sent to ${normalizedEmail}, Email result:`,
        sendResult.simulated
          ? 'SIMULATED'
          : sendResult.success
            ? 'SENT'
            : `FALLBACK_LOGGED (code: ${otpCode}, reason: ${sendResult.error || 'no provider'})`
      );

      // Always log OTP server-side so it can be verified in testing or if SMTP is offline
      console.log(`[OTP] Active Verification Code for ${normalizedEmail}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        message: sendResult.success && !sendResult.simulated
          ? 'OTP sent via email'
          : 'OTP sent (check email or server logs)',
        simulated: sendResult.simulated || !sendResult.success,
        email: maskEmail(normalizedEmail),
      });
    }

    // ── Phone channel ──────────────────────────────────────────────────────
    let normalizedPhone = phone.replace(/\D/g, '');

    // Auto-prepend India country code only if exactly 10 digits
    if (normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateKey = normalizedPhone;
    const rateInfo = otpRateLimit.get(rateKey);
    const now = Date.now();

    if (rateInfo && now - rateInfo.lastRequest < 3600000 && rateInfo.count >= 5) {
      const waitMinutes = Math.ceil((3600000 - (now - rateInfo.lastRequest)) / 60000);
      return NextResponse.json(
        { error: `Too many OTP requests. Please try again in ${waitMinutes} minutes.` },
        { status: 429 }
      );
    }

    if (rateInfo && now - rateInfo.lastRequest < 3600000) {
      rateInfo.count++;
      rateInfo.lastRequest = now;
    } else {
      otpRateLimit.set(rateKey, { count: 1, lastRequest: now });
    }

    // Check recent OTP
    const recentOtp = await findRecentOtp({
      phone: normalizedPhone,
      verified: false,
      expiresAt: { gt: new Date() },
      createdAt: { gt: new Date(Date.now() - 30000) },
    });

    if (recentOtp) {
      return NextResponse.json(
        { error: 'OTP already sent. Please wait 30 seconds before requesting a new one.' },
        { status: 429 }
      );
    }

    // Invalidate existing
    await invalidateExistingOtps({
      phone: normalizedPhone,
      verified: false,
      expiresAt: { gt: new Date() },
    });

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await saveOtpRecord({
      phone: normalizedPhone,
      otpCode,
      channel: 'whatsapp',
      expiresAt,
    });

    const otpMessage = `🔐 *Your ${BRAND.name} verification code is: ${otpCode}*\n\nThis code expires in 5 minutes.\n\n_Do not share this code with anyone._`;

    // Try WhatsApp first
    let sendResult = await sendWhatsAppMessage({
      to: normalizedPhone,
      message: otpMessage,
    });

    // If WhatsApp failed, try SMS
    if (!sendResult.success && !sendResult.simulated) {
      try {
        const smsResult = await sendSmsMessage({
          to: normalizedPhone,
          message: `Your ${BRAND.name} verification code is: ${otpCode}. Valid for 5 minutes.`,
        });
        if (smsResult.success) {
          sendResult = { success: true, simulated: smsResult.simulated };
        }
      } catch {}
    }

    console.log(`[OTP] Active Verification Code for phone ${normalizedPhone}: ${otpCode}`);

    return NextResponse.json({
      success: true,
      message: sendResult.success && !sendResult.simulated
        ? 'OTP sent successfully'
        : 'OTP sent (check messages or server logs)',
      simulated: sendResult.simulated || !sendResult.success,
      phone: formatPhoneForDisplay(normalizedPhone),
    });
  } catch (error) {
    console.error('[Send OTP Error]', error);
    return NextResponse.json(
      { error: 'Failed to process OTP request. Please try again.' },
      { status: 500 }
    );
  }
}

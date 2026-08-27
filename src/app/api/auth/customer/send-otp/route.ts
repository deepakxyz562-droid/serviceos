import { NextRequest, NextResponse } from 'next/server';
import { directPrisma } from '@/lib/direct-prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { sendEmail } from '@/lib/email-send';
import { otpLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';

// Rate limiting: track OTP requests per phone number OR per email.
// Phone keys are pure digit strings; email keys are prefixed with `email:`
// to avoid collision with phone keys.
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
// Shows the first 2 chars of the local part + `***@` + domain.
// e.g. "john.doe@example.com" → "jo***@example.com"
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex < 2) {
    // Local part too short to mask meaningfully — return a generic mask.
    return `***${email.slice(atIndex)}`;
  }
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  return `${local.slice(0, 2)}***@${domain}`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(otpLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  try {
    const body = await request.json();
    const { phone, email } = body;

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email is required' },
        { status: 400 }
      );
    }

    // ── Email channel ──────────────────────────────────────────────────────
    // When `email` is present, prefer it (even if `phone` is also present).
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
      // Prefix with `email:` to avoid collision with phone digit keys.
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
      const recentOtp = await directPrisma.otpVerification.findFirst({
        where: {
          email: normalizedEmail,
          verified: false,
          expiresAt: { gt: new Date() },
          createdAt: { gt: new Date(Date.now() - 30000) },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentOtp) {
        return NextResponse.json(
          { error: 'OTP already sent. Please wait 30 seconds before requesting a new one.' },
          { status: 429 }
        );
      }

      // Invalidate any existing unexpired OTPs for this email
      await directPrisma.otpVerification.updateMany({
        where: {
          email: normalizedEmail,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        data: { expiresAt: new Date() }, // Expire them immediately
      });

      // Generate new OTP
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database.
      // The `phone` column is non-nullable in the schema; use '' as a sentinel
      // for the email channel. `email` is the lookup key for verify-otp.
      await directPrisma.otpVerification.create({
        data: {
          phone: '',
          email: normalizedEmail,
          otpCode,
          channel: 'email',
          expiresAt,
        },
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
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">Fieseros</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 32px 4px 32px; text-align: center;">
          <p style="font-size: 15px; color: #374151; margin: 0;">Your verification code</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 32px 8px 32px; text-align: center;">
          <div style="display: inline-block; font-family: 'SF Mono', 'Menlo', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827; background-color: #f3f4f6; padding: 16px 24px; border-radius: 10px;">${otpCode}</div>
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

      const textBody = `Fieseros

Your verification code is: ${otpCode}

This code expires in 5 minutes.

If you didn't request this code, you can safely ignore this email.`;

      const sendResult = await sendEmail({
        to: normalizedEmail,
        subject: 'Your Fieseros verification code',
        html: htmlBody,
        text: textBody,
        usageType: 'transactional',
      });

      console.log(
        `[OTP] Sent to ${normalizedEmail}, Email result:`,
        sendResult.simulated
          ? 'SIMULATED'
          : sendResult.success
            ? 'SENT'
            : `FAILED: ${sendResult.error || 'unknown error'}`
      );

      // In demo/simulated mode, also log the code server-side so it can be
      // retrieved for testing. SECURITY: never return the code in the response.
      if (sendResult.simulated) {
        console.log(`[OTP] Demo mode — code for ${normalizedEmail}: ${otpCode}`);
      }

      // If a real send was attempted and FAILED, surface the error to the
      // client (mirrors the WhatsApp error-handling pattern).
      if (!sendResult.simulated && !sendResult.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              sendResult.error ||
              'Failed to send OTP email. Please try again.',
            simulated: false,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: sendResult.simulated
          ? 'OTP sent (demo mode) — check server logs for the code'
          : 'OTP sent via email',
        simulated: sendResult.simulated || false,
        // SECURITY: Never return the OTP code in the API response.
        // In demo mode, the code is logged server-side for testing.
        email: maskEmail(normalizedEmail),
      });
    }

    // ── Phone / WhatsApp channel (existing path — unchanged) ───────────────
    // Normalize phone number - extract digits
    let normalizedPhone = phone.replace(/\D/g, '');

    // Auto-prepend India country code if 10 digits
    if (normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Rate limiting: max 5 OTP requests per phone per hour
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

    // Update rate limit
    if (rateInfo && now - rateInfo.lastRequest < 3600000) {
      rateInfo.count++;
      rateInfo.lastRequest = now;
    } else {
      otpRateLimit.set(rateKey, { count: 1, lastRequest: now });
    }

    // Check if there's a recent unexpired OTP (within last 30 seconds)
    const recentOtp = await directPrisma.otpVerification.findFirst({
      where: {
        phone: normalizedPhone,
        verified: false,
        expiresAt: { gt: new Date() },
        createdAt: { gt: new Date(Date.now() - 30000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      return NextResponse.json(
        { error: 'OTP already sent. Please wait 30 seconds before requesting a new one.' },
        { status: 429 }
      );
    }

    // Invalidate any existing unexpired OTPs for this phone
    await directPrisma.otpVerification.updateMany({
      where: {
        phone: normalizedPhone,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() }, // Expire them immediately
    });

    // Generate new OTP
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database
    await directPrisma.otpVerification.create({
      data: {
        phone: normalizedPhone,
        otpCode,
        channel: 'whatsapp',
        expiresAt,
      },
    });

    // Send OTP via WhatsApp
    const otpMessage = `🔐 *Your Fieseros verification code is: ${otpCode}*

This code expires in 5 minutes.

_Do not share this code with anyone._`;

    const sendResult = await sendWhatsAppMessage({
      to: normalizedPhone,
      message: otpMessage,
    });

    console.log(
      `[OTP] Sent to ${normalizedPhone}, WhatsApp result:`,
      sendResult.simulated
        ? 'SIMULATED'
        : sendResult.success
          ? 'SENT'
          : `FAILED: ${sendResult.error || 'unknown error'}`
    );

    // If a real send was attempted and FAILED, surface the error to the client
    // instead of falsely reporting success. This is critical so the UI can tell
    // the user the message was NOT delivered (e.g. recipient not in Meta test
    // number allow-list, invalid token, etc.).
    if (!sendResult.simulated && !sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            sendResult.error ||
            'Failed to send WhatsApp message. Please try again.',
          simulated: false,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: sendResult.simulated
        ? 'OTP sent (demo mode) — check server logs for the code'
        : 'OTP sent via WhatsApp',
      simulated: sendResult.simulated || false,
      // SECURITY: Never return the OTP code in the API response.
      // In demo mode, the code is logged server-side for testing.
      phone: formatPhoneForDisplay(normalizedPhone),
    });
  } catch (error) {
    console.error('[Send OTP Error]', error);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}

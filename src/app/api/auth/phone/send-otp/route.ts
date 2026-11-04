import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directPrisma } from '@/lib/direct-prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { sendSmsMessage } from '@/lib/sms-send';
import { otpLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { BRAND } from '@/lib/brand';

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

/**
 * POST /api/auth/phone/send-otp
 *
 * Sends a 6-digit verification code to a merchant via WhatsApp or SMS.
 */
export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(otpLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  try {
    const body = await request.json().catch(() => ({}));
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number.' },
        { status: 400 }
      );
    }

    // Rate limiting: max 5 requests per hour
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

    // Check 30s resend cooldown
    const recentOtp = await findRecentOtp({
      phone: normalizedPhone,
      verified: false,
      expiresAt: { gt: new Date() },
      createdAt: { gt: new Date(Date.now() - 30000) },
    });

    if (recentOtp) {
      return NextResponse.json(
        { error: 'OTP already sent. Please wait 30 seconds before requesting a new code.' },
        { status: 429 }
      );
    }

    // Invalidate prior active OTPs
    await invalidateExistingOtps({
      phone: normalizedPhone,
      verified: false,
      expiresAt: { gt: new Date() },
    });

    // Special case for Firebase/Dev test phone numbers (e.g. 919999999999)
    const isTestNumber = normalizedPhone.endsWith('9999999999') || normalizedPhone.endsWith('1234567890');
    const otpCode = isTestNumber ? '123456' : generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await saveOtpRecord({
      phone: normalizedPhone,
      otpCode,
      channel: 'whatsapp',
      expiresAt,
    });

    const otpMessage = `🔐 *Your ${BRAND.name} Merchant verification code is: ${otpCode}*\n\nValid for 5 minutes. Do not share this code with anyone.`;

    let sendResult = { success: false, simulated: false };

    if (!isTestNumber) {
      // 1. Try WhatsApp
      try {
        sendResult = await sendWhatsAppMessage({
          to: normalizedPhone,
          message: otpMessage,
        });
      } catch {}

      // 2. If WhatsApp failed, fallback to SMS
      if (!sendResult.success && !sendResult.simulated) {
        try {
          const smsResult = await sendSmsMessage({
            to: normalizedPhone,
            message: `Your ${BRAND.name} verification code is: ${otpCode}. Valid for 5 minutes.`,
          });
          if (smsResult.success) {
            sendResult = { success: true, simulated: smsResult.simulated || false };
          }
        } catch {}
      }
    } else {
      sendResult = { success: true, simulated: true };
    }

    console.log(`[Merchant OTP] Code for ${normalizedPhone}: ${otpCode}`);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully.',
      simulated: sendResult.simulated || !sendResult.success,
      phone: formatPhoneForDisplay(normalizedPhone),
      ...(process.env.NODE_ENV !== 'production' || isTestNumber ? { devOtp: otpCode } : {}),
    });
  } catch (error) {
    console.error('[Merchant Send OTP Error]', error);
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { directPrisma } from '@/lib/direct-prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';

// Rate limiting: track OTP requests per phone number
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

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
    const otpMessage = `🔐 *Your ServiceOS verification code is: ${otpCode}*

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
        ? `OTP sent (demo mode). Code: ${otpCode}`
        : 'OTP sent via WhatsApp',
      simulated: sendResult.simulated || false,
      // In demo/simulated mode, return the OTP so the user can test
      ...(sendResult.simulated ? { otpCode } : {}),
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

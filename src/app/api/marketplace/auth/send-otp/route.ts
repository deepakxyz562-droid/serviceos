import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendSmsMessage } from '@/lib/sms-send';
import { sendEmail } from '@/lib/email-send';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/auth/send-otp
 *
 * Sends a 6-digit OTP to the customer's phone or email.
 * Creates a MarketplaceCustomer record if it doesn't exist (marked otpVerified=false).
 *
 * Body: { phone?: string, email?: string, name?: string }
 * At least one of phone/email is required.
 *
 * Returns: { success: true, maskedContact: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, email, name } = body;

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone or email is required' },
        { status: 400 },
      );
    }

    // Normalize phone (strip non-digits, keep +)
    const normalizedPhone = phone ? phone.replace(/[^\d+]/g, '') : null;
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    // Find or create MarketplaceCustomer
    let customer = null;
    if (normalizedPhone) {
      customer = await db.marketplaceCustomer.findUnique({
        where: { phone: normalizedPhone },
      });
    } else if (normalizedEmail) {
      customer = await db.marketplaceCustomer.findUnique({
        where: { email: normalizedEmail },
      });
    }

    if (!customer) {
      customer = await db.marketplaceCustomer.create({
        data: {
          phone: normalizedPhone || `unknown-${Date.now()}`,
          email: normalizedEmail,
          name: name || null,
          otpVerified: false,
        },
      });
      // If phone was unknown placeholder, update it
      if (!normalizedPhone && customer.phone.startsWith('unknown-')) {
        // Keep as-is — email-only customer
      }
    } else {
      // Update name if provided
      if (name && !customer.name) {
        await db.marketplaceCustomer.update({
          where: { id: customer.id },
          data: { name },
        });
      }
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Save OTP on the customer record
    await db.marketplaceCustomer.update({
      where: { id: customer.id },
      data: { otpCode, otpExpiresAt },
    });

    // Send OTP via SMS or email
    const maskedContact: string[] = [];
    if (normalizedPhone && customer.phone !== `unknown-${Date.now()}`) {
      try {
        await sendSmsMessage(normalizedPhone, `Your Fieseros verification code is: ${otpCode}`);
        maskedContact.push(`SMS sent to ${normalizedPhone.slice(-4).padStart(normalizedPhone.length, '*')}`);
      } catch {
        maskedContact.push('SMS failed — check your number');
      }
    }
    if (normalizedEmail) {
      try {
        await sendEmail({
          to: normalizedEmail,
          subject: 'Your Fieseros verification code',
          text: `Your Fieseros verification code is: ${otpCode}`,
          html: `<p>Your Fieseros verification code is: <strong>${otpCode}</strong></p>`,
        });
        const atIndex = normalizedEmail.indexOf('@');
        const masked = atIndex > 2
          ? `${normalizedEmail.slice(0, 2)}***${normalizedEmail.slice(atIndex)}`
          : `***${normalizedEmail.slice(atIndex)}`;
        maskedContact.push(`Email sent to ${masked}`);
      } catch {
        maskedContact.push('Email failed — check your address');
      }
    }

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      maskedContact: maskedContact.join(', '),
    });
  } catch (error: any) {
    console.error('[marketplace/auth/send-otp]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 },
    );
  }
}

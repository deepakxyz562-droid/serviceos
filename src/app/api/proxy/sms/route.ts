import { NextRequest, NextResponse } from 'next/server';
import { recordMeteredUsage } from '@/lib/wallet/usage-wallet';

// In-memory verification code store (in production can use Redis/DB)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// POST /api/proxy/sms - Send or Verify SMS OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    const phone = (body.phone || body.to || '').trim();
    const code = body.code;
    const tenantId = body.tenantId || 'default';

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '');

    // Action 1: Send OTP
    if (action === 'send' || action === 'send_otp') {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanPhone, { code: generatedCode, expiresAt });

      // If Twilio credentials exist in env, send real SMS
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

      let sentRealSms = false;
      if (twilioSid && twilioAuth && twilioFrom) {
        try {
          const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          
          const params = new URLSearchParams();
          params.append('To', cleanPhone);
          params.append('From', twilioFrom);
          params.append('Body', `Your verification code is: ${generatedCode}. It will expire in 10 minutes.`);

          const twilioRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          });

          if (twilioRes.ok) {
            sentRealSms = true;
            if (tenantId) {
              await recordMeteredUsage(tenantId, 'sms.otp');
            }
          }
        } catch (smsErr) {
          console.error('Twilio sending failed:', smsErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: sentRealSms
          ? `Verification code sent to ${cleanPhone}`
          : `[Dev Mode] Verification code generated for ${cleanPhone}`,
        devCode: !sentRealSms ? generatedCode : undefined,
      });
    }

    // Action 2: Verify OTP
    if (action === 'verify' || action === 'verify_otp') {
      if (!code) {
        return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
      }

      const stored = otpStore.get(cleanPhone);
      if (!stored) {
        return NextResponse.json({ valid: false, error: 'No verification code was sent to this phone' }, { status: 400 });
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(cleanPhone);
        return NextResponse.json({ valid: false, error: 'Verification code has expired' }, { status: 400 });
      }

      if (stored.code !== code.trim()) {
        return NextResponse.json({ valid: false, error: 'Invalid verification code' }, { status: 400 });
      }

      // Valid!
      otpStore.delete(cleanPhone);
      return NextResponse.json({ valid: true, message: 'Phone verified successfully' });
    }

    return NextResponse.json({ error: 'Invalid action. Expected "send" or "verify"' }, { status: 400 });
  } catch (error) {
    console.error('SMS proxy error:', error);
    return NextResponse.json({ error: 'SMS service error' }, { status: 500 });
  }
}

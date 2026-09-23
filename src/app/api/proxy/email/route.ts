import { NextRequest, NextResponse } from 'next/server';
import { recordMeteredUsage } from '@/lib/wallet/usage-wallet';

// In-memory verification code store (in production can use Redis/DB)
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

/**
 * POST /api/proxy/email — Send or Verify Email OTP
 *
 * Actions:
 *  - send_otp: generates a code, stores it, and sends via email
 *  - verify_otp: checks the code against the stored value
 *
 * Email sending uses the platform's existing email infrastructure
 * (RESEND_API_KEY or SMTP). Falls back to dev mode (returns the code
 * in the response) when no email credentials are configured.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    const email = (body.email || '').trim().toLowerCase();
    const code = body.code;
    const tenantId = body.tenantId || 'default';
    const codeLength = Math.max(4, Math.min(10, Number(body.codeLength ?? 6)));
    const senderName = body.senderName || 'Fieseros Security';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    // Action 1: Send OTP
    if (action === 'send' || action === 'send_otp') {
      const generatedCode = Array.from({ length: codeLength }, () =>
        Math.floor(Math.random() * 10),
      ).join('');
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      otpStore.set(email, { code: generatedCode, expiresAt, attempts: 0 });

      // Try to send real email via Resend
      const resendApiKey = process.env.RESEND_API_KEY;
      let sentRealEmail = false;

      if (resendApiKey) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${senderName} <noreply@fieseros.com>`,
              to: email,
              subject: `Your verification code: ${generatedCode}`,
              html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h2 style="color: #059669; margin-bottom: 16px;">Email Verification</h2>
                  <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
                    Your verification code is:
                  </p>
                  <div style="text-align: center; padding: 24px; background: #f0fdf4; border-radius: 12px; margin-bottom: 24px;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #059669; font-family: monospace;">
                      ${generatedCode}
                    </span>
                  </div>
                  <p style="font-size: 12px; color: #94a3b8;">
                    This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
                  </p>
                </div>
              `,
            }),
          });

          if (resendRes.ok) {
            sentRealEmail = true;
            if (tenantId) {
              await recordMeteredUsage(tenantId, 'email.otp').catch(() => {});
            }
          }
        } catch (emailErr) {
          console.error('[proxy/email] Resend sending failed:', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: sentRealEmail
          ? `Verification code sent to ${email}`
          : `[Dev Mode] Verification code generated for ${email}`,
        devCode: !sentRealEmail ? generatedCode : undefined,
      });
    }

    // Action 2: Verify OTP
    if (action === 'verify' || action === 'verify_otp') {
      if (!code) {
        return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
      }

      const stored = otpStore.get(email);

      if (!stored) {
        return NextResponse.json({ error: 'No code sent to this email. Please request a new code.' }, { status: 400 });
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return NextResponse.json({ error: 'Code expired. Please request a new code.' }, { status: 400 });
      }

      stored.attempts++;

      if (stored.attempts > 5) {
        otpStore.delete(email);
        return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
      }

      if (code !== stored.code) {
        return NextResponse.json({
          success: false,
          verified: false,
          error: 'Invalid code',
          attemptsLeft: 5 - stored.attempts,
        }, { status: 200 });
      }

      // Code is correct — clean up
      otpStore.delete(email);

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Email verified successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use send_otp or verify_otp.' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[proxy/email] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process email OTP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

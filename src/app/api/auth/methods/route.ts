import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/auth/methods — Public endpoint to check which auth methods are available
// Query params: tenantSlug (optional — if not provided, returns platform-level only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug');

    // Get platform-level auth settings
    const platformSettings = await db.platformAuthSettings.findUnique({
      where: { id: 'platform' },
    });

    const result = {
      // Email + Password is always available
      emailPassword: true,
      // WhatsApp OTP — platform must enable it first
      whatsappOtp: platformSettings?.whatsappOtpEnabled ?? false,
      // Google OAuth
      google: platformSettings?.googleEnabled ?? false,
      // SMS OTP
      smsOtp: platformSettings?.smsOtpEnabled ?? false,
      // 2FA
      twoFactor: platformSettings?.twoFactorEnabled ?? false,
      // Per-tenant overrides (only if tenantSlug provided)
      tenantWhatsappOtp: {
        customer: false,
        employee: false,
        employee2fa: false,
      },
    };

    // If tenant slug provided, check tenant-level settings
    if (tenantSlug) {
      const tenant = await db.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { settingsJson: true },
      });

      if (tenant) {
        const settings = JSON.parse(tenant.settingsJson || '{}');
        result.tenantWhatsappOtp = {
          customer: settings.allowCustomerWhatsappOtp ?? false,
          employee: settings.allowEmployeeWhatsappOtp ?? false,
          employee2fa: settings.allowEmployee2faWhatsapp ?? false,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get auth methods error:', error);
    return NextResponse.json({
      emailPassword: true,
      whatsappOtp: false,
      google: false,
      smsOtp: false,
      twoFactor: false,
      tenantWhatsappOtp: { customer: false, employee: false, employee2fa: false },
    });
  }
}
